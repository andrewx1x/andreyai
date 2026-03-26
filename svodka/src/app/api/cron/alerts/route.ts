import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, tokens, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptToken } from "@/lib/engine/crypto";
import { collectProjectSignals } from "@/lib/engine/collect";
import { buildCockpit } from "@/lib/engine/insights";
import { canSendAlert, markAlertSent } from "@/lib/db/queries/alerts";
import { saveSignalsAsEvents } from "@/lib/db/queries/events";
import { sendAlertEmail } from "@/lib/email";
import { buildAlertEmailHtml, buildAlertSubject } from "@/lib/email/templates/alert";
import { log } from "@/lib/logger";
import type { Signal } from "@/lib/engine/types";

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.andreyai.ru";

export async function GET(request: Request) {
  // --- Auth (fail-closed: CRON_SECRET must be set) ---
  if (!CRON_SECRET) {
    log.error("cron.alerts", "CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    log.warn("cron.alerts", "Unauthorized attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

      // Collect signals from ALL user projects using shared collect module
      const metrikaSignals: Signal[] = [];
      const directSignals: Signal[] = [];

      for (const project of userProjects) {
        try {
          const settings = JSON.parse(project.settingsJson);
          if (!settings.alerts?.enabled) {
            skipped++;
            continue;
          }

          const result = await collectProjectSignals(token, project);

          if (result.error) {
            log.error("cron.alerts", result.error, { projectId: project.id });
            errors++;
            continue;
          }

          if (result.channel === "site") {
            metrikaSignals.push(...result.signals);
          } else {
            directSignals.push(...result.signals);
          }

          // Save per-project signals as events (audit trail)
          if (result.signals.length > 0) {
            await saveSignalsAsEvents(project.id, result.signals);
            signalsFound += result.signals.length;
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
