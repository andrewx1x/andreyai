import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, tokens, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptToken } from "@/lib/engine/crypto";
import { getStats as getMetrikaStats, formatDateForApi, getYesterday, getWeekAgo } from "@/lib/engine/metrika/api";
import { getStats as getDirectStats, formatDateForApi as formatDirectDate, getDateRange } from "@/lib/engine/direct/api";
import { extractSignals as extractMetrikaSignals } from "@/lib/engine/metrika/signals";
import { extractSignals as extractDirectSignals } from "@/lib/engine/direct/signals";
import { canSendAlert, markAlertSent } from "@/lib/db/queries/alerts";
import { saveSignalsAsEvents } from "@/lib/db/queries/events";
import { sendAlertEmail } from "@/lib/email";
import { buildAlertEmailHtml } from "@/lib/email/templates/alert";
import { log } from "@/lib/logger";
import type { MetrikaSettings, DirectSettings, Signal } from "@/lib/engine/types";

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://svodka.app";

export async function GET(request: Request) {
  // --- Auth ---
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      log.warn("cron.alerts", "Unauthorized attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    log.error("cron.alerts", "ENCRYPTION_KEY not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const allProjects = await db.query.projects.findMany({
    where: eq(projects.isActive, true),
  });

  log.info("cron.alerts", "Starting alert check", { totalProjects: allProjects.length });

  let alertsSent = 0;
  let signalsFound = 0;
  let skipped = 0;
  let errors = 0;

  for (const project of allProjects) {
    // --- Per-project isolation ---
    try {
      // 1. Parse settings safely
      let settings: MetrikaSettings | DirectSettings;
      try {
        settings = JSON.parse(project.settingsJson);
      } catch {
        log.error("cron.alerts", "Invalid settingsJson", { projectId: project.id });
        errors++;
        continue;
      }

      // 2. Check if alerts enabled for this project
      if (!(settings as any).alerts?.enabled) {
        skipped++;
        continue;
      }

      // 3. Check cooldown BEFORE API calls to save resources
      const canSend = await canSendAlert(project.userId, project.id, "daily_alert");
      if (!canSend) {
        log.info("cron.alerts", "Cooldown active, skipping API calls", { projectId: project.id });
        skipped++;
        continue;
      }

      // 4. Get and validate token
      const tokenRecord = await db.query.tokens.findFirst({
        where: eq(tokens.userId, project.userId),
      });

      if (!tokenRecord) {
        log.warn("cron.alerts", "No token found", { projectId: project.id, userId: project.userId });
        skipped++;
        continue;
      }

      if (tokenRecord.expiresAt && Date.now() > new Date(tokenRecord.expiresAt).getTime()) {
        log.warn("cron.alerts", "Token expired", { projectId: project.id, expiresAt: tokenRecord.expiresAt });
        skipped++;
        continue;
      }

      let token: string;
      try {
        token = await decryptToken(tokenRecord.encryptedToken, encryptionKey);
      } catch (decryptError) {
        log.error("cron.alerts", "Token decryption failed", {
          projectId: project.id,
          error: decryptError instanceof Error ? decryptError.message : "Unknown",
        });
        errors++;
        continue;
      }

      // 5. Extract signals based on project type
      let signals: Signal[] = [];

      if (project.type === "metrika") {
        const ms = settings as MetrikaSettings;
        const yesterday = getYesterday();
        const weekAgo = getWeekAgo(yesterday);

        const [currentResult, prevResult] = await Promise.all([
          getMetrikaStats(token, {
            counterId: ms.counter_id,
            date1: formatDateForApi(yesterday),
            date2: formatDateForApi(yesterday),
            metrics: ms.metrics,
            goalIds: ms.goals?.map((g) => g.id) || [],
          }),
          getMetrikaStats(token, {
            counterId: ms.counter_id,
            date1: formatDateForApi(weekAgo),
            date2: formatDateForApi(yesterday),
            metrics: ms.metrics,
            goalIds: ms.goals?.map((g) => g.id) || [],
          }),
        ]);

        if (!currentResult.ok || !currentResult.data) {
          log.error("cron.alerts", "Metrika current data fetch failed", {
            projectId: project.id,
            error: currentResult.error,
            errorCode: currentResult.errorCode,
          });
          errors++;
          continue;
        }

        if (!prevResult.ok || !prevResult.data) {
          log.warn("cron.alerts", "Metrika previous data fetch failed, using current as baseline", {
            projectId: project.id,
          });
        }

        const prev = prevResult.data
          ? {
              ...prevResult.data,
              visits: Math.round(prevResult.data.visits / 7),
              users: Math.round(prevResult.data.users / 7),
              pageviews: Math.round(prevResult.data.pageviews / 7),
            }
          : currentResult.data;

        signals = extractMetrikaSignals(currentResult.data, prev, ms.alerts?.thresholds);
      } else if (project.type === "direct") {
        const ds = settings as DirectSettings;
        const currentRange = getDateRange(ds.compare_period || "day", 0);
        const previousRange = getDateRange(ds.compare_period || "day", 1);
        const campaignIds = ds.campaigns === "all" ? undefined : ds.campaigns;

        const [currentResult, previousResult] = await Promise.all([
          getDirectStats(token, ds.login, {
            dateFrom: formatDirectDate(currentRange.from),
            dateTo: formatDirectDate(currentRange.to),
            campaignIds,
            includeConversions: true,
          }),
          getDirectStats(token, ds.login, {
            dateFrom: formatDirectDate(previousRange.from),
            dateTo: formatDirectDate(previousRange.to),
            campaignIds,
            includeConversions: true,
          }),
        ]);

        if (!currentResult.ok || !currentResult.data) {
          log.error("cron.alerts", "Direct current data fetch failed", {
            projectId: project.id,
            error: currentResult.error,
            errorCode: currentResult.errorCode,
          });
          errors++;
          continue;
        }

        if (!previousResult.ok || !previousResult.data) {
          log.warn("cron.alerts", "Direct previous data fetch failed, using current as baseline", {
            projectId: project.id,
          });
        }

        signals = extractDirectSignals(
          currentResult.data,
          previousResult.data || currentResult.data,
          ds.alerts?.thresholds
        );
      }

      // 6. Save all signals as events (audit trail)
      if (signals.length > 0) {
        await saveSignalsAsEvents(project.id, signals);
        signalsFound += signals.length;
      }

      // 7. Only email for warning/critical
      const criticalSignals = signals.filter((s) => s.severity === "warning" || s.severity === "critical");
      if (criticalSignals.length === 0) continue;

      // 8. Get user email
      const user = await db.query.users.findFirst({
        where: eq(users.id, project.userId),
      });

      if (!user?.email) {
        log.warn("cron.alerts", "User has no email, cannot send alert", {
          projectId: project.id,
          userId: project.userId,
        });
        continue;
      }

      // 9. Send email
      const screenPath = project.type === "metrika" ? "/site" : "/ads";
      const html = buildAlertEmailHtml(project.name, criticalSignals, `${APP_URL}${screenPath}`);

      try {
        await sendAlertEmail(user.email, `Сводка: алерт по ${project.name}`, html);
        await markAlertSent(project.userId, project.id, "daily_alert");
        alertsSent++;
        log.info("cron.alerts", "Alert email sent", {
          projectId: project.id,
          userId: project.userId,
          signals: criticalSignals.length,
        });
      } catch (emailError) {
        log.error("cron.alerts", "Failed to send alert email", {
          projectId: project.id,
          error: emailError instanceof Error ? emailError.message : "Unknown",
        });
        errors++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      log.error("cron.alerts", "Unexpected error for project", { projectId: project.id, error: msg });
      errors++;
    }
  }

  const summary = { alertsSent, signalsFound, skipped, errors, total: allProjects.length };
  log.info("cron.alerts", "Alert check complete", summary);

  return NextResponse.json({ ok: true, ...summary });
}
