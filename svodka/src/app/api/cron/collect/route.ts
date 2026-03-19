import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, tokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptToken } from "@/lib/engine/crypto";
import { getStats as getMetrikaStats, formatDateForApi, getYesterday } from "@/lib/engine/metrika/api";
import { getStats as getDirectStats, formatDateForApi as formatDirectDate, getDateRange } from "@/lib/engine/direct/api";
import { saveSnapshot } from "@/lib/db/queries/snapshots";
import { log } from "@/lib/logger";
import type { MetrikaSettings, DirectSettings } from "@/lib/engine/types";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // --- Auth ---
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      log.warn("cron.collect", "Unauthorized attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    log.error("cron.collect", "ENCRYPTION_KEY not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const allProjects = await db.query.projects.findMany({
    where: eq(projects.isActive, true),
  });

  log.info("cron.collect", "Starting collection", { totalProjects: allProjects.length });

  let collected = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: Array<{ projectId: number; error: string }> = [];

  for (const project of allProjects) {
    // --- Per-project isolation: each project in its own try-catch ---
    try {
      // 1. Get token
      const tokenRecord = await db.query.tokens.findFirst({
        where: eq(tokens.userId, project.userId),
      });

      if (!tokenRecord) {
        log.warn("cron.collect", "No token found, skipping", { projectId: project.id, userId: project.userId });
        skipped++;
        continue;
      }

      // 2. Check token expiry
      if (tokenRecord.expiresAt) {
        const expiresAt = new Date(tokenRecord.expiresAt).getTime();
        if (Date.now() > expiresAt) {
          log.warn("cron.collect", "Token expired, skipping", {
            projectId: project.id,
            userId: project.userId,
            expiresAt: tokenRecord.expiresAt,
          });
          skipped++;
          continue;
        }
      }

      // 3. Decrypt token (can throw on corrupted data)
      let token: string;
      try {
        token = await decryptToken(tokenRecord.encryptedToken, encryptionKey);
      } catch (decryptError) {
        log.error("cron.collect", "Token decryption failed", {
          projectId: project.id,
          userId: project.userId,
          error: decryptError instanceof Error ? decryptError.message : "Unknown decrypt error",
        });
        errors++;
        errorDetails.push({ projectId: project.id, error: "decrypt_failed" });
        continue;
      }

      // 4. Parse settings (can throw on corrupted JSON)
      let settings: MetrikaSettings | DirectSettings;
      try {
        settings = JSON.parse(project.settingsJson);
      } catch {
        log.error("cron.collect", "Invalid settingsJson", { projectId: project.id });
        errors++;
        errorDetails.push({ projectId: project.id, error: "invalid_settings" });
        continue;
      }

      // 5. Fetch data by project type
      if (project.type === "metrika") {
        const ms = settings as MetrikaSettings;
        const yesterday = getYesterday();
        const dateStr = formatDateForApi(yesterday);

        const result = await getMetrikaStats(token, {
          counterId: ms.counter_id,
          date1: dateStr,
          date2: dateStr,
          metrics: ms.metrics,
          goalIds: ms.goals?.map((g) => g.id) || [],
        });

        if (result.ok && result.data) {
          await saveSnapshot(project.id, dateStr, JSON.stringify(result.data));
          collected++;
          log.info("cron.collect", "Metrika snapshot saved", { projectId: project.id, date: dateStr });
        } else {
          log.error("cron.collect", "Metrika API failed", {
            projectId: project.id,
            error: result.error,
            errorCode: result.errorCode,
          });
          errors++;
          errorDetails.push({ projectId: project.id, error: `metrika_api:${result.errorCode || result.error}` });
        }
      } else if (project.type === "direct") {
        const ds = settings as DirectSettings;
        const range = getDateRange("day", 0);
        const dateFrom = formatDirectDate(range.from);
        const dateTo = formatDirectDate(range.to);
        const campaignIds = ds.campaigns === "all" ? undefined : ds.campaigns;

        const result = await getDirectStats(token, ds.login, {
          dateFrom,
          dateTo,
          campaignIds,
          includeConversions: true,
        });

        if (result.ok && result.data) {
          await saveSnapshot(project.id, dateFrom, JSON.stringify(result.data));
          collected++;
          log.info("cron.collect", "Direct snapshot saved", { projectId: project.id, date: dateFrom });
        } else {
          log.error("cron.collect", "Direct API failed", {
            projectId: project.id,
            error: result.error,
            errorCode: result.errorCode,
          });
          errors++;
          errorDetails.push({ projectId: project.id, error: `direct_api:${result.errorCode || result.error}` });
        }
      }
    } catch (error) {
      // Catch-all: unexpected errors (DB failure, network, etc.)
      const msg = error instanceof Error ? error.message : "Unknown error";
      log.error("cron.collect", "Unexpected error for project", { projectId: project.id, error: msg });
      errors++;
      errorDetails.push({ projectId: project.id, error: msg });
    }
  }

  const summary = { collected, skipped, errors, total: allProjects.length };
  log.info("cron.collect", "Collection complete", { ...summary, errorDetails: errorDetails.length > 0 ? errorDetails : undefined });

  return NextResponse.json({ ok: true, ...summary });
}
