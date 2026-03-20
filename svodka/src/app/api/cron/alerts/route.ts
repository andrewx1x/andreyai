import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, tokens, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptToken } from "@/lib/engine/crypto";
import { getStats as getMetrikaStats, formatDateForApi, getYesterday, getBaselineRange } from "@/lib/engine/metrika/api";
import { getStats as getDirectStats, formatDateForApi as formatDirectDate, getDateRange } from "@/lib/engine/direct/api";
import { extractSignals as extractMetrikaSignals } from "@/lib/engine/metrika/signals";
import { extractSignals as extractDirectSignals } from "@/lib/engine/direct/signals";
import { buildCockpit } from "@/lib/engine/insights";
import { canSendAlert, markAlertSent } from "@/lib/db/queries/alerts";
import { saveSignalsAsEvents } from "@/lib/db/queries/events";
import { sendAlertEmail } from "@/lib/email";
import { buildAlertEmailHtml, buildAlertSubject } from "@/lib/email/templates/alert";
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

  // Group projects by userId
  const projectsByUser = new Map<number, typeof allProjects>();
  for (const project of allProjects) {
    const list = projectsByUser.get(project.userId) || [];
    list.push(project);
    projectsByUser.set(project.userId, list);
  }

  log.info("cron.alerts", "Starting alert check", {
    totalProjects: allProjects.length,
    totalUsers: projectsByUser.size,
  });

  let alertsSent = 0;
  let signalsFound = 0;
  let skipped = 0;
  let errors = 0;

  for (const [userId, userProjects] of projectsByUser) {
    try {
      // Check if ANY project has alerts enabled
      const hasAlertsEnabled = userProjects.some((p) => {
        try {
          const s = JSON.parse(p.settingsJson);
          return s.alerts?.enabled;
        } catch {
          return false;
        }
      });

      if (!hasAlertsEnabled) {
        skipped += userProjects.length;
        continue;
      }

      // Check user-level cooldown BEFORE API calls
      const canSend = await canSendAlert(userId, 0, "user_alert");
      if (!canSend) {
        log.info("cron.alerts", "User cooldown active", { userId });
        skipped += userProjects.length;
        continue;
      }

      // Get and validate token
      const tokenRecord = await db.query.tokens.findFirst({
        where: eq(tokens.userId, userId),
      });

      if (!tokenRecord) {
        log.warn("cron.alerts", "No token found", { userId });
        skipped += userProjects.length;
        continue;
      }

      if (tokenRecord.expiresAt) {
        const tokenExpiresAt = new Date(tokenRecord.expiresAt).getTime();
        if (Date.now() > tokenExpiresAt) {
          log.warn("cron.alerts", "Token expired", { userId, expiresAt: tokenRecord.expiresAt });
          for (const project of userProjects) {
            await saveSignalsAsEvents(project.id, [{
              type: "anomaly",
              metric: "token",
              metricLabel: "OAuth-токен",
              currentValue: 0,
              previousValue: 1,
              changePercent: -100,
              severity: "critical",
              message: "Доступ к Яндексу истёк. Данные не обновляются. Переподключитесь в настройках.",
              channel: project.type === "metrika" ? "site" : "ads",
              impact: 999,
            }]);
          }
          skipped += userProjects.length;
          continue;
        }
        if (tokenExpiresAt - Date.now() < 24 * 60 * 60 * 1000) {
          log.warn("cron.alerts", "Token expiring soon", { userId, expiresAt: tokenRecord.expiresAt });
        }
      }

      let token: string;
      try {
        token = await decryptToken(tokenRecord.encryptedToken, encryptionKey);
      } catch (decryptError) {
        log.error("cron.alerts", "Token decryption failed", {
          userId,
          error: decryptError instanceof Error ? decryptError.message : "Unknown",
        });
        errors += userProjects.length;
        continue;
      }

      // Collect signals from ALL user projects
      const metrikaSignals: Signal[] = [];
      const directSignals: Signal[] = [];

      for (const project of userProjects) {
        try {
          let settings: MetrikaSettings | DirectSettings;
          try {
            settings = JSON.parse(project.settingsJson);
          } catch {
            log.error("cron.alerts", "Invalid settingsJson", { projectId: project.id });
            errors++;
            continue;
          }

          if (!settings.alerts?.enabled) {
            skipped++;
            continue;
          }

          let projectSignals: Signal[] = [];

          if (project.type === "metrika") {
            const ms = settings as MetrikaSettings;
            const yesterday = getYesterday();
            const baseline = getBaselineRange(yesterday);

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
                date1: formatDateForApi(baseline.from),
                date2: formatDateForApi(baseline.to),
                metrics: ms.metrics,
                goalIds: ms.goals?.map((g) => g.id) || [],
              }),
            ]);

            if (!currentResult.ok || !currentResult.data) {
              log.error("cron.alerts", "Metrika fetch failed", { projectId: project.id, error: currentResult.error });
              errors++;
              continue;
            }

            const prev = prevResult.data
              ? {
                  ...prevResult.data,
                  visits: Math.round(prevResult.data.visits / 7),
                  users: Math.round(prevResult.data.users / 7),
                  pageviews: Math.round(prevResult.data.pageviews / 7),
                }
              : currentResult.data;

            projectSignals = extractMetrikaSignals(currentResult.data, prev, ms.alerts?.thresholds);
            metrikaSignals.push(...projectSignals);
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
              log.error("cron.alerts", "Direct fetch failed", { projectId: project.id, error: currentResult.error });
              errors++;
              continue;
            }

            projectSignals = extractDirectSignals(
              currentResult.data,
              previousResult.data || currentResult.data,
              ds.alerts?.thresholds
            );
            directSignals.push(...projectSignals);
          }

          // Save per-project signals as events (audit trail)
          if (projectSignals.length > 0) {
            await saveSignalsAsEvents(project.id, projectSignals);
            signalsFound += projectSignals.length;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          log.error("cron.alerts", "Error processing project", { projectId: project.id, error: msg });
          errors++;
        }
      }

      // Build cross-channel cockpit for this user
      const cockpit = buildCockpit(metrikaSignals, directSignals);

      // Only send email if there are problems (variant B: only on problems)
      const actionableProblems = cockpit.problems.filter(
        (p) => p.priority === "critical" || p.priority === "high"
      );

      if (actionableProblems.length === 0) continue;

      // Get user email
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user?.email) {
        log.warn("cron.alerts", "User has no email", { userId });
        continue;
      }

      // Send problem-based email
      const subject = buildAlertSubject(actionableProblems);
      const html = buildAlertEmailHtml(
        user.name || "",
        cockpit.status,
        actionableProblems,
        cockpit.actions,
        APP_URL
      );

      try {
        await sendAlertEmail(user.email, subject, html);
        await markAlertSent(userId, 0, "user_alert");
        alertsSent++;
        log.info("cron.alerts", "Alert email sent", {
          userId,
          problems: actionableProblems.length,
          status: cockpit.status,
        });
      } catch (emailError) {
        log.error("cron.alerts", "Failed to send alert email", {
          userId,
          error: emailError instanceof Error ? emailError.message : "Unknown",
        });
        errors++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      log.error("cron.alerts", "Unexpected error for user", { userId, error: msg });
      errors++;
    }
  }

  const summary = { alertsSent, signalsFound, skipped, errors, totalUsers: projectsByUser.size };
  log.info("cron.alerts", "Alert check complete", summary);

  return NextResponse.json({ ok: true, ...summary });
}
