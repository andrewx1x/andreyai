// Dashboard API handler

import type { Env, DirectSettings } from '../env';
import { decryptToken } from '../shared/crypto';
import { SessionStorage, getCorsHeaders, validateTelegramWebAppData } from './session';
import {
  getStats,
  getCampaignStats,
  formatDateForApi,
  getDateRange,
  type ReportParams,
  type DirectStats,
  type CampaignStats,
} from '../bots/direct/api';

// ═══════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════

export interface DashboardData {
  period: {
    from: string;
    to: string;
    label: string;
  };
  budgets: {
    search: { daily?: number; weekly?: number };
    rsya: { daily?: number; weekly?: number };
    maps: { daily?: number; weekly?: number };
  };
  channels: {
    search: ChannelStats;
    rsya: ChannelStats;
    maps: ChannelStats;
  };
  details: {
    search: DetailRow[];
    rsya: DetailRow[];
    maps: DetailRow[];
  };
  comparison: {
    previous_period: { from: string; to: string };
    cost_change: number;
    conversions_change: number;
    cpa_change: number;
  };
  monthly_stats: MonthlyStats[];
  expert_analysis: {
    summary: string;
    best_channel: string;
    warnings: string[];
  };
}

interface ChannelStats {
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  avgCpc: number;
  conversions: number;
  cpa: number;
}

interface DetailRow {
  keyword: string;
  group: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: {
    phone_click: number;
    forms: number;
    messenger: number;
  };
}

interface MonthlyStats {
  month: string;
  cost: { search: number; rsya: number; maps: number };
  conversions: { search: number; rsya: number; maps: number };
}

// ═══════════════════════════════════════════
// MAIN API HANDLER
// ═══════════════════════════════════════════

export async function handleDashboardApi(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  // Validate session
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || url.searchParams.get('token');

  if (!token) {
    return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const sessionStorage = new SessionStorage(env.DB);
  const session = await sessionStorage.validateSession(token);

  if (!session) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401, corsHeaders);
  }

  // Route to appropriate handler
  const path = url.pathname;

  try {
    if (path === '/api/dashboard/data') {
      const period = url.searchParams.get('period') || 'month';
      const dateFrom = url.searchParams.get('date_from');
      const dateTo = url.searchParams.get('date_to');

      const data = await fetchDashboardData(session.user_id, env, { period, dateFrom, dateTo });
      return jsonResponse(data, 200, corsHeaders);
    }

    if (path === '/api/dashboard/session') {
      // Return session info
      return jsonResponse({
        valid: true,
        expires_at: session.expires_at,
      }, 200, corsHeaders);
    }

    return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
  }
}

// ═══════════════════════════════════════════
// CREATE SESSION ENDPOINT
// ═══════════════════════════════════════════

export async function createDashboardSession(
  userId: string,
  env: Env
): Promise<string> {
  const sessionStorage = new SessionStorage(env.DB);
  return sessionStorage.createSession(userId, 30); // 30 min TTL
}

// ═══════════════════════════════════════════
// FETCH DASHBOARD DATA
// ═══════════════════════════════════════════

interface FetchOptions {
  period: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}

async function fetchDashboardData(
  userId: string,
  env: Env,
  options: FetchOptions
): Promise<DashboardData> {
  // Get user settings
  const settingsResult = await env.DB
    .prepare('SELECT settings_json FROM bot_settings WHERE user_id = ? AND bot_type = ?')
    .bind(userId, 'direct')
    .first<{ settings_json: string }>();

  if (!settingsResult) {
    throw new Error('Settings not found');
  }

  const settings: DirectSettings = JSON.parse(settingsResult.settings_json);

  // Get encrypted token
  const tokenResult = await env.DB
    .prepare('SELECT encrypted_token FROM tokens WHERE user_id = ? AND bot_type = ?')
    .bind(userId, 'direct')
    .first<{ encrypted_token: string }>();

  if (!tokenResult) {
    throw new Error('Token not found');
  }

  const apiToken = await decryptToken(tokenResult.encrypted_token, env.ENCRYPTION_KEY);

  // Calculate date range
  const { from, to } = calculateDateRange(options);

  // Fetch data from Yandex.Direct API
  const currentStats = await fetchChannelStats(apiToken, settings.login, from, to);
  const prevRange = getPreviousPeriod(from, to);
  const prevStats = await fetchChannelStats(apiToken, settings.login, prevRange.from, prevRange.to);

  // Build response
  return buildDashboardResponse(currentStats, prevStats, settings, from, to, prevRange);
}

function calculateDateRange(options: FetchOptions): { from: Date; to: Date } {
  if (options.dateFrom && options.dateTo) {
    return {
      from: new Date(options.dateFrom),
      to: new Date(options.dateTo),
    };
  }

  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let from: Date;
  switch (options.period) {
    case 'week':
      from = new Date(to);
      from.setDate(from.getDate() - 7);
      break;
    case 'month':
    default:
      from = new Date(to.getFullYear(), to.getMonth(), 1);
      break;
  }

  return { from, to };
}

function getPreviousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const duration = to.getTime() - from.getTime();
  return {
    from: new Date(from.getTime() - duration),
    to: new Date(to.getTime() - duration),
  };
}

async function fetchChannelStats(
  token: string,
  login: string,
  from: Date,
  to: Date
): Promise<{ total: DirectStats; campaigns: CampaignStats[] }> {
  const params: ReportParams = {
    dateFrom: formatDateForApi(from),
    dateTo: formatDateForApi(to),
    includeConversions: true,
  };

  const totalResult = await getStats(token, login, params);
  const campaignsResult = await getCampaignStats(token, login, params);

  return {
    total: totalResult.data || createEmptyStats(),
    campaigns: campaignsResult.data || [],
  };
}

function createEmptyStats(): DirectStats {
  return {
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cost: 0,
    avgCpc: 0,
    conversions: 0,
    costPerConversion: 0,
  };
}

function buildDashboardResponse(
  current: { total: DirectStats; campaigns: CampaignStats[] },
  previous: { total: DirectStats; campaigns: CampaignStats[] },
  settings: DirectSettings,
  from: Date,
  to: Date,
  prevRange: { from: Date; to: Date }
): DashboardData {
  const periodLabel = formatPeriodLabel(from, to);

  // Split campaigns by channel (simplified - in real app would use campaign type)
  const searchCampaigns = current.campaigns.filter((c) =>
    c.campaignName.toLowerCase().includes('поиск') || c.campaignName.toLowerCase().includes('search')
  );
  const rsyaCampaigns = current.campaigns.filter((c) =>
    c.campaignName.toLowerCase().includes('рся') || c.campaignName.toLowerCase().includes('rsya') || c.campaignName.toLowerCase().includes('сеть')
  );
  const mapsCampaigns = current.campaigns.filter((c) =>
    c.campaignName.toLowerCase().includes('карт') || c.campaignName.toLowerCase().includes('maps')
  );

  const aggregateChannel = (campaigns: CampaignStats[]): ChannelStats => {
    if (campaigns.length === 0) {
      return { impressions: 0, clicks: 0, ctr: 0, cost: 0, avgCpc: 0, conversions: 0, cpa: 0 };
    }

    const total = campaigns.reduce(
      (acc, c) => ({
        impressions: acc.impressions + c.impressions,
        clicks: acc.clicks + c.clicks,
        cost: acc.cost + c.cost,
        conversions: acc.conversions + c.conversions,
      }),
      { impressions: 0, clicks: 0, cost: 0, conversions: 0 }
    );

    return {
      impressions: total.impressions,
      clicks: total.clicks,
      ctr: total.impressions > 0 ? (total.clicks / total.impressions) * 100 : 0,
      cost: total.cost,
      avgCpc: total.clicks > 0 ? total.cost / total.clicks : 0,
      conversions: total.conversions,
      cpa: total.conversions > 0 ? total.cost / total.conversions : 0,
    };
  };

  const costChange = current.total.cost - previous.total.cost;
  const convChange = current.total.conversions - previous.total.conversions;
  const currentCpa = current.total.conversions > 0 ? current.total.cost / current.total.conversions : 0;
  const prevCpa = previous.total.conversions > 0 ? previous.total.cost / previous.total.conversions : 0;
  const cpaChange = currentCpa - prevCpa;

  // Find best channel
  const channels = [
    { name: 'search', stats: aggregateChannel(searchCampaigns) },
    { name: 'rsya', stats: aggregateChannel(rsyaCampaigns) },
    { name: 'maps', stats: aggregateChannel(mapsCampaigns) },
  ].filter((c) => c.stats.conversions > 0);

  const bestChannel = channels.length > 0
    ? channels.sort((a, b) => a.stats.cpa - b.stats.cpa)[0].name
    : 'search';

  // Build warnings
  const warnings: string[] = [];
  if (cpaChange > 0 && cpaChange / prevCpa > 0.2) {
    warnings.push(`CPA вырос на ${((cpaChange / prevCpa) * 100).toFixed(0)}%`);
  }
  if (convChange < 0 && Math.abs(convChange / previous.total.conversions) > 0.2) {
    warnings.push(`Конверсии снизились на ${Math.abs(convChange)}`);
  }

  return {
    period: {
      from: formatDateForApi(from),
      to: formatDateForApi(to),
      label: periodLabel,
    },
    budgets: {
      search: { daily: 4000 },
      rsya: { weekly: 15000 },
      maps: { weekly: 10000 },
    },
    channels: {
      search: aggregateChannel(searchCampaigns),
      rsya: aggregateChannel(rsyaCampaigns),
      maps: aggregateChannel(mapsCampaigns),
    },
    details: {
      search: campaignsToDetails(searchCampaigns),
      rsya: campaignsToDetails(rsyaCampaigns),
      maps: campaignsToDetails(mapsCampaigns),
    },
    comparison: {
      previous_period: {
        from: formatDateForApi(prevRange.from),
        to: formatDateForApi(prevRange.to),
      },
      cost_change: costChange,
      conversions_change: convChange,
      cpa_change: cpaChange,
    },
    monthly_stats: [], // Would need historical data
    expert_analysis: {
      summary: generateAnalysisSummary(current.total, previous.total, costChange, convChange),
      best_channel: bestChannel,
      warnings,
    },
  };
}

function campaignsToDetails(campaigns: CampaignStats[]): DetailRow[] {
  return campaigns.map((c) => ({
    keyword: c.campaignName,
    group: 'Общая',
    impressions: c.impressions,
    clicks: c.clicks,
    ctr: c.ctr,
    cost: c.cost,
    conversions: {
      phone_click: 0,
      forms: c.conversions,
      messenger: 0,
    },
  }));
}

function formatPeriodLabel(from: Date, to: Date): string {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];

  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${months[from.getMonth()]} ${from.getFullYear()}`;
  }

  return `${formatDateForApi(from)} — ${formatDateForApi(to)}`;
}

function generateAnalysisSummary(
  current: DirectStats,
  previous: DirectStats,
  costChange: number,
  convChange: number
): string {
  const costDir = costChange > 0 ? 'вырос' : 'снизился';
  const convDir = convChange > 0 ? 'выросли' : 'снизились';

  return `Расход ${costDir} на ${Math.abs(costChange).toFixed(0)}₽, конверсии ${convDir} на ${Math.abs(convChange)}.`;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function jsonResponse(data: object, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
