// Cron tasks for Metrika bot - scheduled reports and alerts

import type { Env } from '../../env';
import type { StorageAdapter } from '../../shared/db';
import { sendWithRetry, sendBatch } from '../../shared/telegram';
import { formatDateShort, divider } from '../../shared/format';
import {
  formatReport,
  checkAlert,
  fetchReportDataForUser,
  type ReportData,
} from './reports';
import * as msg from './messages';

// ═══════════════════════════════════════════
// SEND SCHEDULED REPORTS
// ═══════════════════════════════════════════

export async function sendScheduledReports(
  env: Env,
  storage: StorageAdapter,
  time: string
): Promise<void> {
  const now = new Date();
  const dayOfWeek = now.getDay();

  console.log(`[Metrika Cron] Sending reports for ${time}, day ${dayOfWeek}`);

  // Get all users with matching schedule
  const reports = await storage.getScheduledReports(time, dayOfWeek);
  const metrikaReports = reports.filter((r) => r.bot_type === 'metrika');

  console.log(`[Metrika Cron] Found ${metrikaReports.length} reports to send`);

  if (metrikaReports.length === 0) return;

  // Process each report
  await sendBatch(
    metrikaReports,
    async (report) => {
      try {
        await sendReportToUser(report.user_id, env, storage);
        return { ok: true };
      } catch (error) {
        console.error(`[Metrika Cron] Failed to send report to ${report.user_id}:`, error);
        return { ok: false };
      }
    },
    (report, error) => {
      console.error(`[Metrika Cron] Error sending to ${report.user_id}:`, error);
    }
  );
}

async function sendReportToUser(
  userId: string,
  env: Env,
  storage: StorageAdapter
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN_METRIKA;

  // Get user's chat
  const user = await storage.getUserById(userId);
  if (!user) {
    console.log(`[Metrika Cron] User not found: ${userId}`);
    return;
  }

  const chat = await storage.getChat('metrika', user.telegram_id);
  if (!chat) {
    console.log(`[Metrika Cron] Chat not found for user: ${userId}`);
    return;
  }

  // Fetch and send report
  const reportResult = await fetchReportDataForUser(userId, env, storage);
  if (!reportResult.ok || !reportResult.data) {
    if (reportResult.errorCode === 401) {
      await sendWithRetry(
        token,
        chat.telegram_chat_id,
        msg.tokenExpiredMessage(),
        { keyboard: msg.tokenExpiredKeyboard() }
      );
    }
    console.log(
      `[Metrika Cron] Failed to fetch report data for: ${userId}. ${reportResult.error || ''}`
    );
    return;
  }

  const reportText = formatReport(reportResult.data);

  await sendWithRetry(
    token,
    chat.telegram_chat_id,
    reportText,
    { keyboard: msg.mainMenuKeyboard() }
  );

  console.log(`[Metrika Cron] Report sent to user: ${userId}`);
}

// ═══════════════════════════════════════════
// CHECK ALERTS
// ═══════════════════════════════════════════

export async function checkAlerts(
  env: Env,
  storage: StorageAdapter
): Promise<void> {
  console.log('[Metrika Cron] Checking alerts...');

  const alerts = await storage.getActiveAlerts();
  const metrikaAlerts = alerts.filter((a) => a.bot_type === 'metrika');

  console.log(`[Metrika Cron] Found ${metrikaAlerts.length} active alerts`);

  // Group alerts by user
  const userAlerts = new Map<string, typeof metrikaAlerts>();
  for (const alert of metrikaAlerts) {
    const existing = userAlerts.get(alert.user_id) || [];
    existing.push(alert);
    userAlerts.set(alert.user_id, existing);
  }

  // Check alerts for each user
  for (const [userId, userAlertsList] of userAlerts) {
    try {
      await checkUserAlerts(userId, userAlertsList, env, storage);
    } catch (error) {
      console.error(`[Metrika Cron] Failed to check alerts for ${userId}:`, error);
    }
  }
}

async function checkUserAlerts(
  userId: string,
  alerts: Array<{ alert_type: string; threshold: number }>,
  env: Env,
  storage: StorageAdapter
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN_METRIKA;

  // Get user's chat
  const user = await storage.getUserById(userId);
  if (!user) return;

  const chat = await storage.getChat('metrika', user.telegram_id);
  if (!chat) return;

  // Fetch report data
  const reportResult = await fetchReportDataForUser(userId, env, storage);
  if (!reportResult.ok || !reportResult.data) {
    if (reportResult.errorCode === 401) {
      await sendWithRetry(
        token,
        chat.telegram_chat_id,
        msg.tokenExpiredMessage(),
        { keyboard: msg.tokenExpiredKeyboard() }
      );
    }
    return;
  }
  const reportData = reportResult.data;

  // Check each alert
  for (const alert of alerts) {
    const result = checkAlert(reportData, alert.alert_type, alert.threshold);

    if (result.triggered) {
      // Check cooldown (24 hours since last alert of this type)
      const lastSent = await storage.getLastAlertTime(userId, 'metrika', alert.alert_type);
      if (lastSent) {
        const hoursSince = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          console.log(`[Metrika Cron] Alert ${alert.alert_type} for ${userId} on cooldown (${hoursSince.toFixed(1)}h)`);
          continue;
        }
      }

      // Send alert
      const alertText = formatAlertMessage(result.message, reportData);
      await sendWithRetry(
        token,
        chat.telegram_chat_id,
        alertText,
        { keyboard: msg.mainMenuKeyboard() }
      );

      // Update cooldown timestamp
      await storage.setAlertSent(userId, 'metrika', alert.alert_type);

      console.log(`[Metrika Cron] Alert sent to ${userId}: ${alert.alert_type}`);
    }
  }
}

function formatAlertMessage(alertMessage: string, data: ReportData): string {
  const { settings, date, compareStartDate, compareEndDate } = data;

  return `${alertMessage}

📅 ${formatDateShort(date)} vs ср. за 7д (${formatDateShort(compareStartDate)} - ${formatDateShort(compareEndDate)})
🌐 ${settings.counter_name}

${divider}
Проверьте показатели и примите меры.

[📊 Посмотреть отчёт]`;
}
