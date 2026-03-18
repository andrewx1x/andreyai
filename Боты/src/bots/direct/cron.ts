// Cron tasks for Direct bot - scheduled reports and alerts

import type { Env, DirectSettings } from '../../env';
import type { StorageAdapter } from '../../shared/db';
import { sendWithRetry, sendBatch } from '../../shared/telegram';
import { decryptToken } from '../../shared/crypto';
import { formatDateShort, divider } from '../../shared/format';
import { formatReport, checkAlert, type ReportData } from './reports';
import {
  getStats,
  getCampaignStats,
  formatDateForApi,
  getDateRange,
  type ReportParams,
} from './api';
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

  console.log(`[Direct Cron] Sending reports for ${time}, day ${dayOfWeek}`);

  // Get all users with matching schedule
  const reports = await storage.getScheduledReports(time, dayOfWeek);
  const directReports = reports.filter((r) => r.bot_type === 'direct');

  console.log(`[Direct Cron] Found ${directReports.length} reports to send`);

  if (directReports.length === 0) return;

  // Process each report
  await sendBatch(
    directReports,
    async (report) => {
      try {
        await sendReportToUser(report.user_id, env, storage);
        return { ok: true };
      } catch (error) {
        console.error(`[Direct Cron] Failed to send report to ${report.user_id}:`, error);
        return { ok: false };
      }
    },
    (report, error) => {
      console.error(`[Direct Cron] Error sending to ${report.user_id}:`, error);
    }
  );
}

async function sendReportToUser(
  userId: string,
  env: Env,
  storage: StorageAdapter
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN_DIRECT;

  // Get user's chat
  const user = await storage.getUserById(userId);
  if (!user) {
    console.log(`[Direct Cron] User not found: ${userId}`);
    return;
  }

  const chat = await storage.getChat('direct', user.telegram_id);
  if (!chat) {
    console.log(`[Direct Cron] Chat not found for user: ${userId}`);
    return;
  }

  // Fetch and send report
  const reportResult = await fetchReportData(userId, env, storage);
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
      `[Direct Cron] Failed to fetch report data for: ${userId}. ${reportResult.error || ''}`
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

  console.log(`[Direct Cron] Report sent to user: ${userId}`);
}

// ═══════════════════════════════════════════
// CHECK ALERTS
// ═══════════════════════════════════════════

export async function checkAlerts(
  env: Env,
  storage: StorageAdapter
): Promise<void> {
  console.log('[Direct Cron] Checking alerts...');

  const alerts = await storage.getActiveAlerts();
  const directAlerts = alerts.filter((a) => a.bot_type === 'direct');

  console.log(`[Direct Cron] Found ${directAlerts.length} active alerts`);

  // Group alerts by user
  const userAlerts = new Map<string, typeof directAlerts>();
  for (const alert of directAlerts) {
    const existing = userAlerts.get(alert.user_id) || [];
    existing.push(alert);
    userAlerts.set(alert.user_id, existing);
  }

  // Check alerts for each user
  for (const [userId, userAlertsList] of userAlerts) {
    try {
      await checkUserAlerts(userId, userAlertsList, env, storage);
    } catch (error) {
      console.error(`[Direct Cron] Failed to check alerts for ${userId}:`, error);
    }
  }
}

async function checkUserAlerts(
  userId: string,
  alerts: Array<{ alert_type: string; threshold: number }>,
  env: Env,
  storage: StorageAdapter
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN_DIRECT;

  // Get user's chat
  const user = await storage.getUserById(userId);
  if (!user) return;

  const chat = await storage.getChat('direct', user.telegram_id);
  if (!chat) return;

  // Fetch report data
  const reportResult = await fetchReportData(userId, env, storage);
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
      const lastSent = await storage.getLastAlertTime(userId, 'direct', alert.alert_type);
      if (lastSent) {
        const hoursSince = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          console.log(`[Direct Cron] Alert ${alert.alert_type} for ${userId} on cooldown (${hoursSince.toFixed(1)}h)`);
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
      await storage.setAlertSent(userId, 'direct', alert.alert_type);

      console.log(`[Direct Cron] Alert sent to ${userId}: ${alert.alert_type}`);
    }
  }
}

function formatAlertMessage(alertMessage: string, data: ReportData): string {
  const { settings, dateFrom, dateTo, compareDateFrom, compareDateTo } = data;

  return `${alertMessage}

📅 ${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)} vs ${formatDateShort(compareDateFrom)} – ${formatDateShort(compareDateTo)}
👤 ${settings.login}

${divider}
Проверьте показатели и примите меры.

[📊 Посмотреть отчёт]`;
}

// ═══════════════════════════════════════════
// FETCH REPORT DATA
// ═══════════════════════════════════════════

interface FetchResult {
  ok: boolean;
  data?: ReportData;
  error?: string;
  errorCode?: number;
}

async function fetchReportData(
  userId: string,
  env: Env,
  storage: StorageAdapter
): Promise<FetchResult> {
  // Get settings
  const settings = await storage.getSettings<DirectSettings>(userId, 'direct');
  if (!settings) return { ok: false, error: 'No settings' };

  // Get token
  const encryptedToken = await storage.getToken(userId, 'direct');
  if (!encryptedToken) return { ok: false, error: 'No token' };

  const apiToken = await decryptToken(encryptedToken, env.ENCRYPTION_KEY);

  // Get date ranges
  const currentRange = getDateRange(settings.compare_period, 0);
  const prevRange = getDateRange(settings.compare_period, 1);

  const campaignIds =
    settings.campaigns === 'all' ? undefined : settings.campaigns;
  const includeConversions = settings.metrics.includes('conversions');

  const currentParams: ReportParams = {
    dateFrom: formatDateForApi(currentRange.from),
    dateTo: formatDateForApi(currentRange.to),
    campaignIds,
    includeConversions,
  };

  const currentResult = await getStats(apiToken, settings.login, currentParams);
  if (!currentResult.ok || !currentResult.data) {
    return { ok: false, error: currentResult.error, errorCode: currentResult.errorCode };
  }

  const prevParams: ReportParams = {
    dateFrom: formatDateForApi(prevRange.from),
    dateTo: formatDateForApi(prevRange.to),
    campaignIds,
    includeConversions,
  };

  const prevResult = await getStats(apiToken, settings.login, prevParams);
  if (!prevResult.ok || !prevResult.data) {
    return { ok: false, error: prevResult.error, errorCode: prevResult.errorCode };
  }

  // Get campaign stats
  let campaigns;
  const campResult = await getCampaignStats(apiToken, settings.login, currentParams);
  if (campResult.ok && campResult.data) {
    campaigns = campResult.data.sort((a, b) => b.cost - a.cost).slice(0, 5);
  }

  return {
    ok: true,
    data: {
      current: currentResult.data,
      previous: prevResult.data,
      campaigns,
      settings,
      dateFrom: currentRange.from,
      dateTo: currentRange.to,
      compareDateFrom: prevRange.from,
      compareDateTo: prevRange.to,
    },
  };
}
