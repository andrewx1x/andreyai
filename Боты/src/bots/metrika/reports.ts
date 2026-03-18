// Report formatting for Metrika bot

import type { Env, MetrikaSettings, InsightData } from '../../env';
import type { StorageAdapter } from '../../shared/db';
import {
  h1,
  h2,
  divider,
  metric,
  formatPercent,
  formatDateShort,
  buildMessage,
  formatInsight,
} from '../../shared/format';
import { decryptToken } from '../../shared/crypto';
import {
  getStats,
  buildMetricsList,
  formatDateForApi,
  getYesterday,
  getDayBefore,
  getWeekAgo,
  getTopTrafficSources,
  getErrorMessage,
  type MetrikaStats,
  type StatsParams,
  type TrafficSource,
} from './api';

export interface ReportData {
  current: MetrikaStats;
  previous: MetrikaStats;
  settings: MetrikaSettings;
  date: Date;
  compareStartDate: Date;
  compareEndDate: Date;
  topSources: TrafficSource[];
}

export interface ReportFetchResult {
  ok: boolean;
  data?: ReportData;
  error?: string;
  errorCode?: number;
}

export interface FormattedReportResult {
  text: string;
  tokenExpired: boolean;
}

export async function fetchAndFormatReport(
  userId: string,
  env: Env,
  storage: StorageAdapter
): Promise<FormattedReportResult> {
  const reportResult = await fetchReportDataForUser(userId, env, storage);
  if (!reportResult.ok || !reportResult.data) {
    if (reportResult.errorCode === 401) {
      return {
        text: tokenExpiredText(),
        tokenExpired: true,
      };
    }
    return {
      text: `❌ ${reportResult.error || 'Не удалось собрать отчёт.'}`,
      tokenExpired: false,
    };
  }

  return {
    text: formatReport(reportResult.data),
    tokenExpired: false,
  };
}

export async function fetchReportDataForUser(
  userId: string,
  env: Env,
  storage: StorageAdapter
): Promise<ReportFetchResult> {
  const settings = await storage.getSettings<MetrikaSettings>(userId, 'metrika');
  if (!settings) {
    return {
      ok: false,
      error: 'Настройки не найдены. Пожалуйста, настройте бота заново.',
    };
  }

  const encryptedToken = await storage.getToken(userId, 'metrika');
  if (!encryptedToken) {
    return {
      ok: false,
      error: 'Токен не найден. Пожалуйста, добавьте токен заново.',
    };
  }

  const token = await decryptToken(encryptedToken, env.ENCRYPTION_KEY);
  return fetchReportDataByToken(token, settings);
}

export async function fetchReportDataByToken(
  token: string,
  settings: MetrikaSettings
): Promise<ReportFetchResult> {
  const yesterday = getYesterday();
  const dayBefore = getDayBefore(yesterday);
  const weekAgo = getWeekAgo(yesterday);

  const metricFlags = {
    visits: settings.metrics.includes('visits'),
    users: settings.metrics.includes('users'),
    bounceRate: settings.metrics.includes('bounceRate'),
    pageDepth: settings.metrics.includes('pageDepth'),
    avgDuration: settings.metrics.includes('avgDuration'),
    pageviews: settings.metrics.includes('pageviews'),
  };

  const metricsList = buildMetricsList(metricFlags);
  const goalIds = settings.goals.map((g) => g.id);

  const currentParams: StatsParams = {
    counterId: settings.counter_id,
    date1: formatDateForApi(yesterday),
    date2: formatDateForApi(yesterday),
    metrics: metricsList,
    goalIds,
  };

  const currentResult = await getStats(token, currentParams);
  if (!currentResult.ok || !currentResult.data) {
    return {
      ok: false,
      error: getErrorMessage(currentResult.errorCode),
      errorCode: currentResult.errorCode,
    };
  }

  const baselineParams: StatsParams = {
    ...currentParams,
    date1: formatDateForApi(weekAgo),
    date2: formatDateForApi(dayBefore),
  };

  const baselineResult = await getStats(token, baselineParams);
  if (!baselineResult.ok || !baselineResult.data) {
    return {
      ok: false,
      error: getErrorMessage(baselineResult.errorCode),
      errorCode: baselineResult.errorCode,
    };
  }

  let topSources: TrafficSource[] = [];
  if (settings.metrics.includes('sources')) {
    const sourcesResult = await getTopTrafficSources(
      token,
      settings.counter_id,
      formatDateForApi(yesterday),
      formatDateForApi(yesterday),
      5
    );
    if (!sourcesResult.ok) {
      return {
        ok: false,
        error: getErrorMessage(sourcesResult.errorCode),
        errorCode: sourcesResult.errorCode,
      };
    }
    topSources = sourcesResult.data || [];
  }

  return {
    ok: true,
    data: {
      current: currentResult.data,
      previous: normalizeToDailyAverage(baselineResult.data, 7, goalIds),
      settings,
      date: yesterday,
      compareStartDate: weekAgo,
      compareEndDate: dayBefore,
      topSources,
    },
  };
}

export function formatReport(data: ReportData): string {
  const { current, previous, settings, date, compareStartDate, compareEndDate, topSources } = data;
  const parts: string[] = [];

  parts.push(h1('ОТЧЁТ СВОДКА.ТРАФИК'));
  parts.push(
    `📅 ${formatDateShort(date)} vs ср. за 7д (${formatDateShort(compareStartDate)} - ${formatDateShort(compareEndDate)})\n🌐 ${settings.counter_name}\nℹ️ Данные предоставлены системой Яндекс.Метрика`
  );

  if (settings.metrics.some((m) => ['visits', 'users', 'bounceRate', 'pageDepth'].includes(m))) {
    const basicMetrics: string[] = [];

    if (settings.metrics.includes('visits')) {
      basicMetrics.push(
        metric({
          label: 'Визиты',
          value: current.visits,
          change: calcChange(current.visits, previous.visits),
        })
      );
    }

    if (settings.metrics.includes('users')) {
      basicMetrics.push(
        metric({
          label: 'Посетители',
          value: current.users,
          change: calcChange(current.users, previous.users),
        })
      );
    }

    if (settings.metrics.includes('bounceRate')) {
      basicMetrics.push(
        metric({
          label: 'Отказы',
          value: formatPercent(current.bounceRate),
          change: calcChange(current.bounceRate, previous.bounceRate),
          precision: 1,
        })
      );
    }

    if (settings.metrics.includes('pageDepth')) {
      basicMetrics.push(
        metric({
          label: 'Глубина',
          value: current.pageDepth.toFixed(1),
          change: calcChange(current.pageDepth, previous.pageDepth),
          precision: 1,
        })
      );
    }

    parts.push(`${h2('ОСНОВНЫЕ ПОКАЗАТЕЛИ')}\n${divider}\n${basicMetrics.join('\n')}`);
  }

  if (settings.metrics.includes('goals') && settings.goals.length > 0) {
    const goalMetrics: string[] = [];
    const primaryGoal = settings.goals.find((g) => g.is_primary);

    for (const goal of settings.goals) {
      const currentGoal = current.goals[goal.id];
      const prevGoal = previous.goals[goal.id];

      if (currentGoal) {
        const isPrimary = goal.id === primaryGoal?.id;
        const prefix = isPrimary ? '⭐ ' : '';
        const reaches = currentGoal.reaches;
        const prevReaches = prevGoal?.reaches || 0;

        goalMetrics.push(
          `${prefix}${metric({
            label: goal.name,
            value: reaches,
            change: calcChange(reaches, prevReaches),
          })}`
        );

        if (settings.metrics.includes('conversionRate')) {
          const conv = currentGoal.conversionRate;
          const prevConv = prevGoal?.conversionRate || 0;
          goalMetrics.push(
            `   ${metric({
              label: 'Конверсия',
              value: formatPercent(conv),
              change: calcChange(conv, prevConv),
              precision: 1,
            })}`
          );
        }
      }
    }

    parts.push(`${h2('ЦЕЛИ')}\n${divider}\n${goalMetrics.join('\n')}`);
  }

  if (settings.metrics.includes('sources') && topSources.length > 0) {
    const sourcesLines = topSources.map((source, idx) => `${idx + 1}. ${source.source} — ${source.visits}`);
    parts.push(`${h2('ИСТОЧНИКИ ТРАФИКА (ТОП-5)')}\n${divider}\n${sourcesLines.join('\n')}`);
  }

  const insight = generateInsight(data);
  parts.push(formatInsight(insight));

  return buildMessage(...parts);
}

export interface AlertCheckResult {
  triggered: boolean;
  alertType: string;
  message: string;
  change: number;
}

export function checkAlert(
  data: ReportData,
  alertType: string,
  threshold: number
): AlertCheckResult {
  const { current, previous, settings } = data;

  switch (alertType) {
    case 'traffic_drop': {
      const change = calcChange(current.visits, previous.visits);
      if (change < -threshold) {
        return {
          triggered: true,
          alertType,
          message: `🚨 АЛЕРТ: Трафик упал на ${Math.abs(change).toFixed(0)}%`,
          change,
        };
      }
      break;
    }

    case 'bounce_increase': {
      const change = calcChange(current.bounceRate, previous.bounceRate);
      if (change > threshold) {
        return {
          triggered: true,
          alertType,
          message: `🚨 АЛЕРТ: Отказы выросли на ${change.toFixed(0)}%`,
          change,
        };
      }
      break;
    }

    case 'conversion_drop': {
      const primaryGoal = settings.goals.find((g) => g.is_primary);
      if (primaryGoal) {
        const currentGoal = current.goals[primaryGoal.id];
        const prevGoal = previous.goals[primaryGoal.id];
        if (currentGoal && prevGoal) {
          const change = calcChange(currentGoal.reaches, prevGoal.reaches);
          if (change < -threshold) {
            return {
              triggered: true,
              alertType,
              message: `🚨 АЛЕРТ: Главная цель «${primaryGoal.name}» упала на ${Math.abs(change).toFixed(0)}%`,
              change,
            };
          }
        }
      }
      break;
    }
  }

  return { triggered: false, alertType, message: '', change: 0 };
}

function generateInsight(data: ReportData): InsightData {
  const { current, previous, settings } = data;
  const visitsChange = calcChange(current.visits, previous.visits);
  const bounceChange = calcChange(current.bounceRate, previous.bounceRate);

  const primaryGoal = settings.goals.find((g) => g.is_primary);
  let primaryGoalChange = 0;
  let primaryGoalName = '';

  if (primaryGoal) {
    const currentGoal = current.goals[primaryGoal.id];
    const prevGoal = previous.goals[primaryGoal.id];
    if (currentGoal && prevGoal) {
      primaryGoalChange = calcChange(currentGoal.reaches, prevGoal.reaches);
      primaryGoalName = primaryGoal.name;
    }
  }

  const trafficUp = visitsChange > 5;
  const trafficDown = visitsChange < -10;
  const goalsUp = primaryGoalChange > 5;
  const goalsDown = primaryGoalChange < -10;
  const bounceUp = bounceChange > 5;

  if (trafficUp && goalsUp) {
    return {
      status: 'positive',
      message: 'Трафик и заявки растут относительно среднего за 7 дней.',
    };
  }

  if (trafficUp && goalsDown) {
    return {
      status: 'warning',
      message: `Трафик растёт (+${visitsChange.toFixed(0)}%), но конверсии падают.`,
      cause: 'Возможно, качество трафика ухудшилось.',
      recommendation: 'Проверьте источники трафика и целевые страницы.',
    };
  }

  if (trafficDown && goalsUp) {
    return {
      status: 'neutral',
      message: `Трафик снизился (${visitsChange.toFixed(0)}%), но конверсия выросла.`,
      recommendation: 'Качество аудитории улучшилось. Проверьте источники.',
    };
  }

  if (trafficDown && goalsDown) {
    return {
      status: 'warning',
      message: 'Трафик и конверсии снижаются относительно среднего за 7 дней.',
      recommendation: 'Требуется анализ источников трафика и работы сайта.',
    };
  }

  if (bounceUp) {
    return {
      status: 'warning',
      message: `Отказы выросли на ${bounceChange.toFixed(0)}%.`,
      recommendation: 'Проверьте скорость загрузки и мобильную версию.',
    };
  }

  if (primaryGoalChange < -15) {
    return {
      status: 'warning',
      message: `Главная цель «${primaryGoalName}» упала на ${Math.abs(primaryGoalChange).toFixed(0)}%.`,
      recommendation: 'Проверьте воронку и работу форм.',
    };
  }

  return {
    status: 'neutral',
    message: 'Показатели без существенных изменений.',
  };
}

function normalizeToDailyAverage(stats: MetrikaStats, days: number, goalIds: number[]): MetrikaStats {
  const normalizedGoals: Record<number, { reaches: number; conversionRate: number }> = {};
  for (const goalId of goalIds) {
    const goal = stats.goals[goalId] || { reaches: 0, conversionRate: 0 };
    normalizedGoals[goalId] = {
      reaches: goal.reaches / days,
      conversionRate: goal.conversionRate,
    };
  }

  return {
    visits: stats.visits / days,
    users: stats.users / days,
    bounceRate: stats.bounceRate,
    pageDepth: stats.pageDepth,
    avgVisitDuration: stats.avgVisitDuration,
    pageviews: stats.pageviews / days,
    goals: normalizedGoals,
  };
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function tokenExpiredText(): string {
  return '⚠️ Токен истёк, обновите доступ за 30 секунд.';
}
