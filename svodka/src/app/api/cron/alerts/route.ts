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
import { calcChange } from "@/lib/engine/format";
import type { MetrikaSettings, DirectSettings, Signal } from "@/lib/engine/types";

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://svodka.app";

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const allProjects = await db.query.projects.findMany({
    where: eq(projects.isActive, true),
  });

  let alertsSent = 0;
  let errors = 0;

  for (const project of allProjects) {
    try {
      const settings = JSON.parse(project.settingsJson);
      if (!settings.alerts?.enabled) continue;

      const tokenRecord = await db.query.tokens.findFirst({
        where: eq(tokens.userId, project.userId),
      });
      if (!tokenRecord) continue;

      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) continue;

      const token = await decryptToken(tokenRecord.encryptedToken, encryptionKey);
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
            goalIds: ms.goals.map((g) => g.id),
          }),
          getMetrikaStats(token, {
            counterId: ms.counter_id,
            date1: formatDateForApi(weekAgo),
            date2: formatDateForApi(yesterday),
            metrics: ms.metrics,
            goalIds: ms.goals.map((g) => g.id),
          }),
        ]);

        if (currentResult.ok && currentResult.data && prevResult.data) {
          const prev = {
            ...prevResult.data,
            visits: Math.round(prevResult.data.visits / 7),
            users: Math.round(prevResult.data.users / 7),
          };
          signals = extractMetrikaSignals(currentResult.data, prev, ms.alerts?.thresholds);
        }
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

        if (currentResult.ok && currentResult.data && previousResult.data) {
          signals = extractDirectSignals(currentResult.data, previousResult.data, ds.alerts?.thresholds);
        }
      }

      // Save all signals as events (journal)
      await saveSignalsAsEvents(project.id, signals);

      // Only send email for warning/critical signals
      const criticalSignals = signals.filter((s) => s.severity === "warning" || s.severity === "critical");
      if (criticalSignals.length === 0) continue;

      // Check cooldown
      const canSend = await canSendAlert(project.userId, project.id, "daily_alert");
      if (!canSend) continue;

      // Get user email
      const user = await db.query.users.findFirst({
        where: eq(users.id, project.userId),
      });
      if (!user?.email) continue;

      const screenPath = project.type === "metrika" ? "/site" : "/ads";
      const html = buildAlertEmailHtml(project.name, criticalSignals, `${APP_URL}${screenPath}`);
      await sendAlertEmail(user.email, `Сводка: алерт по ${project.name}`, html);
      await markAlertSent(project.userId, project.id, "daily_alert");
      alertsSent++;
    } catch (error) {
      console.error(`[Cron/Alerts] Error for project ${project.id}:`, error);
      errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    alertsSent,
    errors,
    total: allProjects.length,
  });
}
