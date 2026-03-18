// Report formatting for Direct bot

import type { Env, DirectSettings, InsightData } from '../../env';
import type { StorageAdapter } from '../../shared/db';
import {
  h1,
  h2,
  divider,
  metric,
  formatMoney,
  formatPercent,
  formatDateShort,
  buildMessage,
  formatInsight,
} from '../../shared/format';
import { decryptToken } from '../../shared/crypto';
import {
  getStats,
  getCampaignStats,
  formatDateForApi,
  getDateRange,
  type DirectStats,
  type CampaignStats,
  type ReportParams,
} from './api';

// ═══════════════════════════════════════════
// REPORT DATA
// ═══════════════════════════════════════════

export interface ReportData {
  current: DirectStats;
  previous: DirectStats;
  campaigns?: CampaignStats[];
  settings: DirectSettings;
  dateFrom: Date;
  dateTo: Date;
  compareDateFrom: Date;
  compareDateTo: Date;
}

// ═══════════════════════════════════════════
// FETCH AND FORMAT REPORT
// ═══════════════════════════════════════════

export async function fetchAndFormatReport(
  userId: string,
  env: Env,
  storage: StorageAdapter
): Promise<string> {
  const settings = await storage.getSettings<DirectSettings>(userId, 'direct');
  if (!settings) {
    return '❌ Настройки не найдены. Пожалуйста, настройте бота заново.';
  }

  const encryptedToken = await storage.getToken(userId, 'direct');
  if (!encryptedToken) {
    return '❌ Токен не найден. Пожалуйста, добавьте токен заново.';
  }

  const token = await decryptToken(encryptedToken, env.ENCRYPTION_KEY);

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

  const currentResult = await getStats(token, settings.login, currentParams);
  if (!currentResult.ok || !currentResult.data) {
    return `❌ Ошибка получения статистики: ${currentResult.error}`;
  }

  const prevParams: ReportParams = {
    dateFrom: formatDateForApi(prevRange.from),
    dateTo: formatDateForApi(prevRange.to),
    campaignIds,
    includeConversions,
  };

  const prevResult = await getStats(token, settings.login, prevParams);
  if (!prevResult.ok || !prevResult.data) {
    return `❌ Ошибка получения статистики: ${prevResult.error}`;
  }

  // Get campaign breakdown
  let campaigns: CampaignStats[] | undefined;
  if (settings.campaigns !== 'all' || true) {
    // Always get top campaigns
    const campResult = await getCampaignStats(token, settings.login, currentParams);
    if (campResult.ok && campResult.data) {
      campaigns = campResult.data.sort((a, b) => b.cost - a.cost).slice(0, 5);
    }
  }

  return formatReport({
    current: currentResult.data,
    previous: prevResult.data,
    campaigns,
    settings,
    dateFrom: currentRange.from,
    dateTo: currentRange.to,
    compareDateFrom: prevRange.from,
    compareDateTo: prevRange.to,
  });
}

// ═══════════════════════════════════════════
// FORMAT REPORT
// ═══════════════════════════════════════════

export function formatReport(data: ReportData): string {
  const { current, previous, campaigns, settings, dateFrom, dateTo, compareDateFrom, compareDateTo } =
    data;

  const parts: string[] = [];

  // Header
  parts.push(h1('ОТЧЁТ СВОДКА.РЕКЛАМА'));
  parts.push(
    `📅 ${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)} vs ${formatDateShort(compareDateFrom)} – ${formatDateShort(compareDateTo)}\n👤 ${settings.login}\nℹ️ Данные предоставлены системой Яндекс.Директ`
  );

  // Basic metrics
  const basicMetrics: string[] = [];

  if (settings.metrics.includes('impressions')) {
    basicMetrics.push(
      metric({
        label: 'Показы',
        value: current.impressions,
        change: calcChange(current.impressions, previous.impressions),
      })
    );
  }

  if (settings.metrics.includes('clicks')) {
    basicMetrics.push(
      metric({
        label: 'Клики',
        value: current.clicks,
        change: calcChange(current.clicks, previous.clicks),
      })
    );
  }

  if (settings.metrics.includes('ctr')) {
    basicMetrics.push(
      metric({
        label: 'CTR',
        value: formatPercent(current.ctr),
        change: calcChange(current.ctr, previous.ctr),
        precision: 1,
      })
    );
  }

  if (settings.metrics.includes('cost')) {
    basicMetrics.push(
      metric({
        label: 'Расход',
        value: formatMoney(current.cost),
        change: calcChange(current.cost, previous.cost),
      })
    );
  }

  if (settings.metrics.includes('avgCpc')) {
    basicMetrics.push(
      metric({
        label: 'CPC',
        value: formatMoney(current.avgCpc),
        change: calcChange(current.avgCpc, previous.avgCpc),
      })
    );
  }

  if (basicMetrics.length > 0) {
    parts.push(`${h2('ОБЩАЯ СТАТИСТИКА')}\n${divider}\n${basicMetrics.join('\n')}`);
  }

  // Conversions
  if (settings.metrics.includes('conversions') || settings.metrics.includes('costPerConversion')) {
    const convMetrics: string[] = [];

    if (settings.metrics.includes('conversions')) {
      convMetrics.push(
        metric({
          label: 'Конверсии',
          value: current.conversions,
          change: calcChange(current.conversions, previous.conversions),
        })
      );
    }

    if (settings.metrics.includes('costPerConversion') && current.conversions > 0) {
      convMetrics.push(
        metric({
          label: 'CPA',
          value: formatMoney(current.costPerConversion),
          change: calcChange(current.costPerConversion, previous.costPerConversion),
        })
      );
    }

    if (convMetrics.length > 0) {
      parts.push(`${h2('КОНВЕРСИИ')}\n${divider}\n${convMetrics.join('\n')}`);
    }
  }

  // Top campaigns
  if (campaigns && campaigns.length > 0) {
    const campLines = campaigns
      .slice(0, 3)
      .map(
        (c, i) =>
          `${i + 1}. ${c.campaignName}\n   Расход: ${formatMoney(c.cost)} | Conv: ${c.conversions}`
      );

    parts.push(`${h2('ТОП КАМПАНИИ ПО РАСХОДУ')}\n${divider}\n${campLines.join('\n')}`);
  }

  // Insight
  const insight = generateInsight(data);
  parts.push(formatInsight(insight));

  return buildMessage(...parts);
}

// ═══════════════════════════════════════════
// INSIGHT GENERATION
// ═══════════════════════════════════════════

function generateInsight(data: ReportData): InsightData {
  const { current, previous, campaigns } = data;

  const costChange = calcChange(current.cost, previous.cost);
  const convChange = calcChange(current.conversions, previous.conversions);
  const cpaChange =
    current.conversions > 0 && previous.conversions > 0
      ? calcChange(current.costPerConversion, previous.costPerConversion)
      : 0;
  const ctrChange = calcChange(current.ctr, previous.ctr);

  // Find worst campaign by CPA
  let worstCampaign: CampaignStats | null = null;
  if (campaigns && campaigns.length > 0) {
    const avgCpa = current.costPerConversion;
    const badCampaigns = campaigns.filter(
      (c) => c.conversions > 0 && c.costPerConversion > avgCpa * 1.5
    );
    if (badCampaigns.length > 0) {
      worstCampaign = badCampaigns.sort(
        (a, b) => b.costPerConversion - a.costPerConversion
      )[0];
    }
  }

  // Critical: CPA increased >50% or conversions dropped >30%
  if (cpaChange > 50) {
    const cause = worstCampaign
      ? `Основная причина — кампания «${worstCampaign.campaignName}»: высокий расход, мало конверсий.`
      : undefined;

    return {
      status: 'warning',
      message: `CPA вырос на ${cpaChange.toFixed(0)}% при ${convChange < 0 ? 'падении' : 'росте'} конверсий на ${Math.abs(convChange).toFixed(0)}%.`,
      cause,
      recommendation: 'Проверьте ставки и ключи в этой кампании первым делом.',
    };
  }

  if (convChange < -30) {
    return {
      status: 'warning',
      message: `Конверсии упали на ${Math.abs(convChange).toFixed(0)}%.`,
      recommendation: 'Проверьте кампании и сайт.',
    };
  }

  // Warning: cost up + conv down
  if (costChange > 20 && convChange < -10) {
    return {
      status: 'warning',
      message: 'Расход растёт, конверсии падают. Нужна оптимизация.',
      recommendation: 'Проверьте минус-слова и площадки РСЯ.',
    };
  }

  // Warning: CTR drop
  if (ctrChange < -20) {
    return {
      status: 'warning',
      message: `CTR снизился на ${Math.abs(ctrChange).toFixed(0)}%.`,
      recommendation: 'Обновите тексты объявлений.',
    };
  }

  // Positive: CPA down or conversions up
  if (cpaChange < -10) {
    return {
      status: 'positive',
      message: `CPA снизился на ${Math.abs(cpaChange).toFixed(0)}%. Эффективность выросла.`,
    };
  }

  if (convChange > 15) {
    return {
      status: 'positive',
      message: `Конверсии выросли на ${convChange.toFixed(0)}%. Отличный результат!`,
    };
  }

  // Neutral
  return {
    status: 'neutral',
    message: 'Показатели без существенных изменений.',
  };
}

// ═══════════════════════════════════════════
// ALERT CHECK
// ═══════════════════════════════════════════

export interface AlertCheckResult {
  triggered: boolean;
  alertType: string;
  message: string;
  change: number;
  currentValue: number;
  previousValue: number;
}

export function checkAlert(
  data: ReportData,
  alertType: string,
  threshold: number
): AlertCheckResult {
  const { current, previous } = data;

  const makeResult = (
    triggered: boolean,
    message: string,
    change: number,
    currentValue: number,
    previousValue: number
  ): AlertCheckResult => ({
    triggered,
    alertType,
    message,
    change,
    currentValue,
    previousValue,
  });

  switch (alertType) {
    case 'spend_limit': {
      const change = calcChange(current.cost, previous.cost);
      if (change > threshold) {
        return makeResult(
          true,
          `🚨 АЛЕРТ: Рост расхода > ${threshold}%`,
          change,
          current.cost,
          previous.cost
        );
      }
      break;
    }

    case 'ctr_drop': {
      const change = calcChange(current.ctr, previous.ctr);
      if (change < -threshold) {
        return makeResult(
          true,
          `🚨 АЛЕРТ: Падение CTR > ${threshold}%`,
          change,
          current.ctr,
          previous.ctr
        );
      }
      break;
    }

    case 'cpa_increase': {
      if (current.conversions > 0 && previous.conversions > 0) {
        const change = calcChange(current.costPerConversion, previous.costPerConversion);
        if (change > threshold) {
          return makeResult(
            true,
            `🚨 АЛЕРТ: Рост CPA > ${threshold}%`,
            change,
            current.costPerConversion,
            previous.costPerConversion
          );
        }
      }
      break;
    }
  }

  return makeResult(false, '', 0, 0, 0);
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
