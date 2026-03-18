// State machine for Direct bot wizard

import type { DirectState, DirectSettings } from '../../env';

// ═══════════════════════════════════════════
// STATE DATA TYPES
// ═══════════════════════════════════════════

export interface StateData {
  // Auth step
  token?: string;
  login?: string;

  // Campaign selection
  campaigns?: Array<{ id: number; name: string; status: string }>;
  campaignMode?: 'all' | 'selected';
  selectedCampaignIds?: number[];
  campaignGrouping?: 'total' | 'separate' | 'both';

  // Goals selection
  goals?: Array<{ id: number; name: string; counterId: number }>;
  selectedGoals?: Array<{ id: number; name: string; counterId: number }>;

  // Metrics selection
  selectedMetrics?: MetricFlags;

  // Schedule
  comparePeriod?: 'day' | 'week' | 'month';
  frequency?: 'daily' | 'weekly' | 'monthly';
  time?: string;
  timezone?: number;
  weekday?: number;
  monthday?: number;

  // Alerts
  alertsEnabled?: boolean;
  alertRules?: AlertRule[];

  // Navigation history
  history?: DirectState[];
}

export interface MetricFlags {
  impressions: boolean;
  clicks: boolean;
  ctr: boolean;
  cost: boolean;
  avgCpc: boolean;
  conversions: boolean;
  costPerConversion: boolean;
}

export interface AlertRule {
  metric: 'cost' | 'clicks' | 'ctr' | 'avgCpc' | 'conversions' | 'costPerConversion';
  condition: 'rise' | 'drop';
  threshold: number;
}

// ═══════════════════════════════════════════
// STATE TRANSITIONS
// ═══════════════════════════════════════════

export type Action =
  | { type: 'START_SETUP' }
  | { type: 'TOKEN_RECEIVED'; token: string }
  | { type: 'LOGIN_RECEIVED'; login: string }
  | { type: 'CAMPAIGN_MODE_SELECTED'; mode: 'all' | 'selected' }
  | { type: 'CAMPAIGNS_SELECTED'; ids: number[] }
  | { type: 'CAMPAIGN_GROUPING_SELECTED'; grouping: 'total' | 'separate' | 'both' }
  | { type: 'GOALS_SELECTED'; goals: Array<{ id: number; name: string; counterId: number }> }
  | { type: 'GOALS_SKIPPED' }
  | { type: 'METRICS_SELECTED'; metrics: MetricFlags }
  | { type: 'COMPARE_PERIOD_SELECTED'; period: 'day' | 'week' | 'month' }
  | { type: 'FREQUENCY_SELECTED'; frequency: 'daily' | 'weekly' | 'monthly' }
  | { type: 'TIME_SELECTED'; time: string }
  | { type: 'TIMEZONE_SELECTED'; timezone: number }
  | { type: 'WEEKDAY_SELECTED'; weekday: number }
  | { type: 'ALERTS_ENABLED'; enabled: boolean }
  | { type: 'ALERT_RULES_SELECTED'; rules: AlertRule[] }
  | { type: 'CONFIRM' }
  | { type: 'BACK' }
  | { type: 'EDIT_STEP'; step: DirectState };

export interface TransitionResult {
  nextState: DirectState;
  data: StateData;
}

// ═══════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════

export function transition(
  currentState: DirectState,
  currentData: StateData,
  action: Action
): TransitionResult {
  const data = { ...currentData };

  // Handle BACK action
  if (action.type === 'BACK') {
    const history = data.history || [];
    if (history.length > 0) {
      const prevState = history.pop()!;
      data.history = history;
      return { nextState: prevState, data };
    }
    return { nextState: 'idle', data };
  }

  // Handle EDIT_STEP action
  if (action.type === 'EDIT_STEP') {
    return { nextState: action.step, data };
  }

  const addToHistory = () => {
    data.history = [...(data.history || []), currentState];
  };

  switch (currentState) {
    case 'idle':
      if (action.type === 'START_SETUP') {
        addToHistory();
        return { nextState: 'awaiting_token', data };
      }
      break;

    case 'awaiting_token':
      if (action.type === 'TOKEN_RECEIVED') {
        data.token = action.token;
        // Stay in awaiting_token to get login
        return { nextState: 'awaiting_token', data };
      }
      if (action.type === 'LOGIN_RECEIVED') {
        addToHistory();
        data.login = action.login;
        return { nextState: 'selecting_campaigns', data };
      }
      break;

    case 'selecting_campaigns':
      if (action.type === 'CAMPAIGN_MODE_SELECTED') {
        data.campaignMode = action.mode;
        if (action.mode === 'all') {
          addToHistory();
          return { nextState: 'selecting_metrics', data };
        }
        // Stay to select specific campaigns
        return { nextState: 'selecting_campaigns', data };
      }
      if (action.type === 'CAMPAIGNS_SELECTED') {
        data.selectedCampaignIds = action.ids;
        // Ask for grouping
        return { nextState: 'selecting_campaigns', data };
      }
      if (action.type === 'CAMPAIGN_GROUPING_SELECTED') {
        addToHistory();
        data.campaignGrouping = action.grouping;
        return { nextState: 'selecting_metrics', data };
      }
      break;

    case 'selecting_metrics':
      if (action.type === 'METRICS_SELECTED') {
        addToHistory();
        data.selectedMetrics = action.metrics;
        return { nextState: 'selecting_schedule', data };
      }
      break;

    case 'selecting_schedule':
      if (action.type === 'COMPARE_PERIOD_SELECTED') {
        data.comparePeriod = action.period;
        return { nextState: 'selecting_schedule', data };
      }
      if (action.type === 'FREQUENCY_SELECTED') {
        data.frequency = action.frequency;
        return { nextState: 'selecting_schedule', data };
      }
      if (action.type === 'TIME_SELECTED') {
        data.time = action.time;
        return { nextState: 'selecting_schedule', data };
      }
      if (action.type === 'TIMEZONE_SELECTED') {
        data.timezone = action.timezone;
        if (data.frequency === 'weekly' && !data.weekday) {
          return { nextState: 'selecting_schedule', data };
        }
        addToHistory();
        return { nextState: 'selecting_alerts', data };
      }
      if (action.type === 'WEEKDAY_SELECTED') {
        data.weekday = action.weekday;
        if (data.time && data.timezone !== undefined) {
          addToHistory();
          return { nextState: 'selecting_alerts', data };
        }
        return { nextState: 'selecting_schedule', data };
      }
      break;

    case 'selecting_alerts':
      if (action.type === 'ALERTS_ENABLED') {
        data.alertsEnabled = action.enabled;
        if (!action.enabled) {
          data.alertRules = [];
          addToHistory();
          return { nextState: 'confirmation', data };
        }
        return { nextState: 'selecting_alerts', data };
      }
      if (action.type === 'ALERT_RULES_SELECTED') {
        addToHistory();
        data.alertRules = action.rules;
        return { nextState: 'confirmation', data };
      }
      break;

    case 'confirmation':
      if (action.type === 'CONFIRM') {
        return { nextState: 'active', data };
      }
      break;
  }

  return { nextState: currentState, data };
}

// ═══════════════════════════════════════════
// BUILD SETTINGS FROM STATE DATA
// ═══════════════════════════════════════════

export function buildSettings(data: StateData): DirectSettings | null {
  if (
    !data.login ||
    !data.selectedMetrics ||
    !data.comparePeriod ||
    !data.frequency ||
    !data.time ||
    data.timezone === undefined
  ) {
    return null;
  }

  const schedule: DirectSettings['schedule'] = {
    enabled: true,
    time: data.time,
    days:
      data.frequency === 'daily'
        ? [1, 2, 3, 4, 5, 6, 0]
        : data.frequency === 'weekly'
          ? [data.weekday || 1]
          : [1], // Monthly - placeholder
  };

  const alerts: DirectSettings['alerts'] = {
    enabled: data.alertsEnabled || false,
    thresholds: {
      cpa_increase: 0,
      ctr_drop: 0,
      spend_limit: 0,
    },
  };

  // Map alert rules to thresholds
  if (data.alertRules) {
    for (const rule of data.alertRules) {
      if (rule.metric === 'costPerConversion' && rule.condition === 'rise') {
        alerts.thresholds.cpa_increase = rule.threshold;
      }
      if (rule.metric === 'ctr' && rule.condition === 'drop') {
        alerts.thresholds.ctr_drop = rule.threshold;
      }
      if (rule.metric === 'cost' && rule.condition === 'rise') {
        alerts.thresholds.spend_limit = rule.threshold;
      }
    }
  }

  return {
    login: data.login,
    campaigns: data.campaignMode === 'all' ? 'all' : (data.selectedCampaignIds || []),
    metrics: [
      data.selectedMetrics.impressions ? 'impressions' : '',
      data.selectedMetrics.clicks ? 'clicks' : '',
      data.selectedMetrics.ctr ? 'ctr' : '',
      data.selectedMetrics.cost ? 'cost' : '',
      data.selectedMetrics.avgCpc ? 'avgCpc' : '',
      data.selectedMetrics.conversions ? 'conversions' : '',
      data.selectedMetrics.costPerConversion ? 'costPerConversion' : '',
    ].filter(Boolean),
    compare_period: data.comparePeriod,
    schedule,
    alerts,
  };
}

// ═══════════════════════════════════════════
// PARSE STATE DATA
// ═══════════════════════════════════════════

export function parseStateData(json: string | null): StateData {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// ═══════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════

export const DEFAULT_METRICS: MetricFlags = {
  impressions: true,
  clicks: true,
  ctr: true,
  cost: true,
  avgCpc: true,
  conversions: true,
  costPerConversion: true,
};

export const STEP_INFO: Record<DirectState, { number: number; total: number; name: string }> = {
  idle: { number: 0, total: 7, name: '' },
  awaiting_token: { number: 1, total: 7, name: 'АВТОРИЗАЦИЯ' },
  selecting_campaigns: { number: 2, total: 7, name: 'КАМПАНИИ' },
  selecting_metrics: { number: 4, total: 7, name: 'ПОКАЗАТЕЛИ' },
  selecting_schedule: { number: 5, total: 7, name: 'РАСПИСАНИЕ' },
  selecting_alerts: { number: 6, total: 7, name: 'АЛЕРТЫ' },
  confirmation: { number: 7, total: 7, name: 'ПОДТВЕРЖДЕНИЕ' },
  active: { number: 0, total: 0, name: '' },
};

export function getStepHeader(state: DirectState): string {
  const info = STEP_INFO[state];
  if (!info.number) return '';
  return `═══ ШАГ ${info.number} ИЗ ${info.total}: ${info.name} ═══`;
}
