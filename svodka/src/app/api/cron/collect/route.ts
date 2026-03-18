import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, tokens, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptToken } from "@/lib/engine/crypto";
import { getStats as getMetrikaStats, formatDateForApi, getYesterday } from "@/lib/engine/metrika/api";
import { getStats as getDirectStats, formatDateForApi as formatDirectDate, getDateRange } from "@/lib/engine/direct/api";
import { saveSnapshot } from "@/lib/db/queries/snapshots";
import type { MetrikaSettings, DirectSettings } from "@/lib/engine/types";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify cron secret (Vercel Cron or manual trigger)
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const allProjects = await db.query.projects.findMany({
    where: eq(projects.isActive, true),
  });

  let collected = 0;
  let errors = 0;

  for (const project of allProjects) {
    try {
      // Get user token
      const tokenRecord = await db.query.tokens.findFirst({
        where: eq(tokens.userId, project.userId),
      });
      if (!tokenRecord) continue;

      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) continue;

      const token = await decryptToken(tokenRecord.encryptedToken, encryptionKey);
      const yesterday = getYesterday();

      if (project.type === "metrika") {
        const settings = JSON.parse(project.settingsJson) as MetrikaSettings;
        const result = await getMetrikaStats(token, {
          counterId: settings.counter_id,
          date1: formatDateForApi(yesterday),
          date2: formatDateForApi(yesterday),
          metrics: settings.metrics,
          goalIds: settings.goals.map((g) => g.id),
        });

        if (result.ok && result.data) {
          await saveSnapshot(project.id, formatDateForApi(yesterday), JSON.stringify(result.data));
          collected++;
        }
      } else if (project.type === "direct") {
        const settings = JSON.parse(project.settingsJson) as DirectSettings;
        const range = getDateRange("day", 0);
        const campaignIds = settings.campaigns === "all" ? undefined : settings.campaigns;

        const result = await getDirectStats(token, settings.login, {
          dateFrom: formatDirectDate(range.from),
          dateTo: formatDirectDate(range.to),
          campaignIds,
          includeConversions: true,
        });

        if (result.ok && result.data) {
          await saveSnapshot(project.id, formatDirectDate(range.from), JSON.stringify(result.data));
          collected++;
        }
      }
    } catch (error) {
      console.error(`[Cron/Collect] Error for project ${project.id}:`, error);
      errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    collected,
    errors,
    total: allProjects.length,
  });
}
