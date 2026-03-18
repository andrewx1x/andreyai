// Yandex.Metrika API client

const METRIKA_API = 'https://api-metrika.yandex.net';

export interface MetrikaCounter {
  id: number;
  name: string;
  site: string;
  status: string;
}

export interface MetrikaGoal {
  id: number;
  name: string;
  type: string;
}

export interface MetrikaStats {
  visits: number;
  users: number;
  bounceRate: number;
  pageDepth: number;
  avgVisitDuration: number;
  pageviews: number;
  goals: Record<number, { reaches: number; conversionRate: number }>;
}

export interface TrafficSource {
  source: string;
  visits: number;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  errorCode?: number;
}

async function metrikaRequest<T>(
  endpoint: string,
  token: string,
  params?: Record<string, string>
): Promise<ApiResponse<T>> {
  const url = new URL(endpoint, METRIKA_API);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `OAuth ${token}`,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `API error: ${response.status}`,
        errorCode: response.status,
      };
    }

    const data = await response.json();
    return { ok: true, data: data as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════
// VALIDATE TOKEN & GET COUNTERS
// ═══════════════════════════════════════════

interface CountersResponse {
  counters: MetrikaCounter[];
}

export async function validateToken(
  token: string
): Promise<ApiResponse<MetrikaCounter[]>> {
  const result = await metrikaRequest<CountersResponse>(
    '/management/v1/counters',
    token
  );

  if (!result.ok) {
    return { ok: false, error: result.error, errorCode: result.errorCode };
  }

  return { ok: true, data: result.data?.counters || [] };
}

export async function getCounters(
  token: string
): Promise<ApiResponse<MetrikaCounter[]>> {
  return validateToken(token);
}

// ═══════════════════════════════════════════
// GET GOALS
// ═══════════════════════════════════════════

interface GoalsResponse {
  goals: MetrikaGoal[];
}

export async function getGoals(
  token: string,
  counterId: number
): Promise<ApiResponse<MetrikaGoal[]>> {
  const result = await metrikaRequest<GoalsResponse>(
    `/management/v1/counter/${counterId}/goals`,
    token
  );

  if (!result.ok) {
    return { ok: false, error: result.error, errorCode: result.errorCode };
  }

  return { ok: true, data: result.data?.goals || [] };
}

// ═══════════════════════════════════════════
// GET STATISTICS
// ═══════════════════════════════════════════

interface StatsResponse {
  data: Array<{
    metrics: number[];
  }>;
  totals: number[];
}

interface SourcesResponse {
  data?: Array<{
    dimensions?: Array<{ name?: string }>;
    metrics?: number[];
  }>;
}

export interface StatsParams {
  counterId: number;
  date1: string; // YYYY-MM-DD
  date2: string;
  metrics: string[];
  goalIds?: number[];
}

export async function getStats(
  token: string,
  params: StatsParams
): Promise<ApiResponse<MetrikaStats>> {
  // Build metrics list
  const metricsList = [...params.metrics];

  // Add goal metrics
  if (params.goalIds) {
    for (const goalId of params.goalIds) {
      metricsList.push(`ym:s:goal${goalId}reaches`);
      metricsList.push(`ym:s:goal${goalId}conversionRate`);
    }
  }

  const result = await metrikaRequest<StatsResponse>('/stat/v1/data', token, {
    ids: params.counterId.toString(),
    metrics: metricsList.join(','),
    date1: params.date1,
    date2: params.date2,
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error, errorCode: result.errorCode };
  }

  // Parse response into stats object
  const totals = result.data.totals || [];
  const stats: MetrikaStats = {
    visits: 0,
    users: 0,
    bounceRate: 0,
    pageDepth: 0,
    avgVisitDuration: 0,
    pageviews: 0,
    goals: {},
  };

  // Map metrics to values
  let idx = 0;
  for (const metric of params.metrics) {
    const value = totals[idx] || 0;
    switch (metric) {
      case 'ym:s:visits':
        stats.visits = Math.round(value);
        break;
      case 'ym:s:users':
        stats.users = Math.round(value);
        break;
      case 'ym:s:bounceRate':
        stats.bounceRate = value;
        break;
      case 'ym:s:pageDepth':
        stats.pageDepth = value;
        break;
      case 'ym:s:avgVisitDurationSeconds':
        stats.avgVisitDuration = value;
        break;
      case 'ym:s:pageviews':
        stats.pageviews = Math.round(value);
        break;
    }
    idx++;
  }

  // Parse goal metrics
  if (params.goalIds) {
    for (const goalId of params.goalIds) {
      stats.goals[goalId] = {
        reaches: Math.round(totals[idx] || 0),
        conversionRate: totals[idx + 1] || 0,
      };
      idx += 2;
    }
  }

  return { ok: true, data: stats };
}

export async function getTopTrafficSources(
  token: string,
  counterId: number,
  date1: string,
  date2: string,
  limit: number = 5
): Promise<ApiResponse<TrafficSource[]>> {
  const result = await metrikaRequest<SourcesResponse>('/stat/v1/data', token, {
    ids: counterId.toString(),
    dimensions: 'ym:s:lastTrafficSource',
    metrics: 'ym:s:visits',
    sort: '-ym:s:visits',
    limit: limit.toString(),
    date1,
    date2,
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error, errorCode: result.errorCode };
  }

  const rows = result.data.data || [];
  const sources: TrafficSource[] = rows.map((row) => ({
    source: row.dimensions?.[0]?.name || 'Неизвестный источник',
    visits: Math.round(row.metrics?.[0] || 0),
  }));

  return { ok: true, data: sources };
}

// ═══════════════════════════════════════════
// HELPER: Build metrics list from settings
// ═══════════════════════════════════════════

export interface MetricFlags {
  visits: boolean;
  users: boolean;
  bounceRate: boolean;
  pageDepth: boolean;
  avgDuration: boolean;
  pageviews: boolean;
}

export function buildMetricsList(flags: MetricFlags): string[] {
  const metrics: string[] = [];

  if (flags.visits) metrics.push('ym:s:visits');
  if (flags.users) metrics.push('ym:s:users');
  if (flags.bounceRate) metrics.push('ym:s:bounceRate');
  if (flags.pageDepth) metrics.push('ym:s:pageDepth');
  if (flags.avgDuration) metrics.push('ym:s:avgVisitDurationSeconds');
  if (flags.pageviews) metrics.push('ym:s:pageviews');

  return metrics;
}

// ═══════════════════════════════════════════
// HELPER: Date formatting
// ═══════════════════════════════════════════

export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getYesterday(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}

export function getDayBefore(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - 1);
  return result;
}

export function getWeekAgo(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - 7);
  return result;
}

// ═══════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════

export function getErrorMessage(errorCode?: number): string {
  switch (errorCode) {
    case 401:
      return 'Токен недействителен. Пожалуйста, получите новый токен.';
    case 403:
      return 'Нет доступа к этому счётчику. Проверьте права доступа.';
    case 429:
      return 'Слишком много запросов. Попробуйте через минуту.';
    case 500:
    case 502:
    case 503:
      return 'Сервер Яндекс.Метрики временно недоступен. Попробуйте позже.';
    default:
      return 'Произошла ошибка при запросе к API. Попробуйте позже.';
  }
}
