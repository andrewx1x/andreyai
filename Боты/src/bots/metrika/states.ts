// State machine for Metrika bot wizard

import type { MetrikaState, MetrikaSettings, Chat } from '../../env';

// ═══════════════════════════════════════════
// STATE DATA TYPES
// ═══════════════════════════════════════════

export interface StateData {
  // Token step
  token?: string;

  // Counter selection
  counters?: Array<{ id: number; name: string; site: string }>;
  selectedCounter?: { id: number; name: string };

  // Goals selection
  goals?: Array<{ id: number; name: string }>;
  selectedGoals?: Array<{ id: number; name: string }>;
  primaryGoalId?: number;

  // Metrics selection
  selectedMetrics?: MetricFlags;

  // Schedule
  frequency?: 'daily' | 'weekly';
  times?: string[];
  timezone?: number;
  weekday?: number;

  // Alerts
  alertsEnabled?: boolean;
  alertRules?: AlertRule[];

  // Navigation history
  history?: MetrikaState[];
}

export interface MetricFlags {
  visits: boolean;
  users: boolean;
  bounceRate: boolean;
  pageDepth: boolean;
  avgDuration: boolean;
  pageviews: boolean;
  goals: boolean;
  conversionRate: boolean;
  sources: boolean;
  topPages: boolean;
}

export interface AlertRule {
  metric: 'visits' | 'primary_goal' | 'bounceRate';
  condition: 'drop' | 'rise';
  threshold: number;
}

// ═══════════════════════════════════════════
// STATE TRANSITIONS
// ═══════════════════════════════════════════

export type Action =
  | { type: 'START_SETUP' }
  | { type: 'TOKEN_RECEIVED'; token: string }
  | { type: 'COUNTER_SELECTED'; counter: { id: number; name: string } }
  | { type: 'GOALS_SELECTED'; goals: Array<{ id: number; name: string }> }
  | { type: 'PRIMARY_GOAL_SELECTED'; goalId: number }
  | { type: 'METRICS_SELECTED'; metrics: MetricFlags }
  | { type: 'FREQUENCY_SELECTED'; frequency: 'daily' | 'weekly' }
  | { type: 'TIME_SELECTED'; times: string[] }
  | { type: 'TIMEZONE_SELECTED'; timezone: number }
  | { type: 'WEEKDAY_SELECTED'; weekday: number }
  | { type: 'ALERTS_ENABLED'; enabled: boolean }
  | { type: 'ALERT_RULES_SELECTED'; rules: AlertRule[] }
  | { type: 'CONFIRM' }
  | { type: 'BACK' }
  | { type: 'EDIT_STEP'; step: MetrikaState };

export interface TransitionResult {
  nextState: MetrikaState;
  data: StateData;
}

// ═══════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════

export function transition(
  currentState: MetrikaState,
  currentData: StateData,
  action: Action
): TransitionResult {
  const data = { ...currentData };

  // Handle BACK action for any state
  if (action.type === 'BACK') {
    const history = data.history || [];
    if (history.length > 0) {
      const prevState = history.pop()!;
      data.history = history;
      return { nextState: prevState, data };
    }
    return { nextState: 'idle', data };
  }

  // Handle EDIT_STEP action (from confirmation screen)
  if (action.type === 'EDIT_STEP') {
    // Don't add to history when editing
    return { nextState: action.step, data };
  }

  // Helper to add current state to history
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
        addToHistory();
        data.token = action.token;
        return { nextState: 'selecting_counter', data };
      }
      break;

    case 'selecting_counter':
      if (action.type === 'COUNTER_SELECTED') {
        addToHistory();
        data.selectedCounter = action.counter;
        return { nextState: 'selecting_goals', data };
      }
      break;

    case 'selecting_goals':
      if (action.type === 'GOALS_SELECTED') {
        data.selectedGoals = action.goals;
        // If only one goal, auto-select as primary
        if (action.goals.length === 1) {
          data.primaryGoalId = action.goals[0].id;
          addToHistory();
          return { nextState: 'selecting_metrics', data };
        }
        // Otherwise, stay in same state to select primary
        return { nextState: 'selecting_goals', data };
      }
      if (action.type === 'PRIMARY_GOAL_SELECTED') {
        addToHistory();
        data.primaryGoalId = action.goalId;
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
      if (action.type === 'FREQUENCY_SELECTED') {
        data.frequency = action.frequency;
        return { nextState: 'selecting_schedule', data };
      }
      if (action.type === 'TIME_SELECTED') {
        data.times = action.times;
        return { nextState: 'selecting_schedule', data };
      }
      if (action.type === 'TIMEZONE_SELECTED') {
        data.timezone = action.timezone;
        if ((data.times || []).length === 0) {
          return { nextState: 'selecting_schedule', data };
        }
        if (data.frequency === 'weekly' && !data.weekday) {
          return { nextState: 'selecting_schedule', data };
        }
        addToHistory();
        return { nextState: 'selecting_alerts', data };
      }
      if (action.type === 'WEEKDAY_SELECTED') {
        data.weekday = action.weekday;
        if ((data.times || []).length > 0 && data.timezone !== undefined) {
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

  // No transition, stay in current state
  return { nextState: currentState, data };
}

// ═══════════════════════════════════════════
// BUILD SETTINGS FROM STATE DATA
// ═══════════════════════════════════════════

export function buildSettings(data: StateData): MetrikaSettings | null {
  if (
    !data.selectedCounter ||
    !data.selectedGoals ||
    !data.primaryGoalId ||
    !data.selectedMetrics ||
    !data.frequency ||
    !data.times ||
    data.times.length === 0 ||
    data.timezone === undefined
  ) {
    return null;
  }

  const goals = data.selectedGoals.map((g) => ({
    id: g.id,
    name: g.name,
    is_primary: g.id === data.primaryGoalId,
  }));

  const schedule: MetrikaSettings['schedule'] = {
    enabled: true,
    time: data.times[0],
    times: data.times,
    days:
      data.frequency === 'daily'
        ? [1, 2, 3, 4, 5, 6, 0] // All days
        : [data.weekday || 1], // Specific day
  };

  const alerts: MetrikaSettings['alerts'] = {
    enabled: data.alertsEnabled || false,
    thresholds: {
      traffic_drop: 0,
      bounce_increase: 0,
      conversion_drop: 0,
    },
  };

  // Map alert rules to thresholds
  if (data.alertRules) {
    for (const rule of data.alertRules) {
      if (rule.metric === 'visits' && rule.condition === 'drop') {
        alerts.thresholds.traffic_drop = rule.threshold;
      }
      if (rule.metric === 'bounceRate' && rule.condition === 'rise') {
        alerts.thresholds.bounce_increase = rule.threshold;
      }
      if (rule.metric === 'primary_goal' && rule.condition === 'drop') {
        alerts.thresholds.conversion_drop = rule.threshold;
      }
    }
  }

  return {
    counter_id: data.selectedCounter.id,
    counter_name: data.selectedCounter.name,
    goals,
    metrics: [
      data.selectedMetrics.visits ? 'visits' : '',
      data.selectedMetrics.users ? 'users' : '',
      data.selectedMetrics.bounceRate ? 'bounceRate' : '',
      data.selectedMetrics.pageDepth ? 'pageDepth' : '',
      data.selectedMetrics.avgDuration ? 'avgDuration' : '',
      data.selectedMetrics.pageviews ? 'pageviews' : '',
      data.selectedMetrics.goals ? 'goals' : '',
      data.selectedMetrics.conversionRate ? 'conversionRate' : '',
      data.selectedMetrics.sources ? 'sources' : '',
    ].filter(Boolean),
    schedule,
    alerts,
  };
}

// ═══════════════════════════════════════════
// PARSE STATE DATA FROM JSON
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
// DEFAULT METRICS
// ═══════════════════════════════════════════

export const DEFAULT_METRICS: MetricFlags = {
  visits: true,
  users: true,
  bounceRate: true,
  pageDepth: false,
  avgDuration: false,
  pageviews: false,
  goals: true,
  conversionRate: true,
  sources: false,
  topPages: false,
};

// ═══════════════════════════════════════════
// STEP INFO
// ═══════════════════════════════════════════

export const STEP_INFO: Record<MetrikaState, { number: number; total: number; name: string }> = {
  idle: { number: 0, total: 7, name: '' },
  awaiting_token: { number: 1, total: 7, name: 'ТОКЕН' },
  selecting_counter: { number: 2, total: 7, name: 'СЧЁТЧИК' },
  selecting_goals: { number: 3, total: 7, name: 'ЦЕЛИ' },
  selecting_metrics: { number: 4, total: 7, name: 'ПОКАЗАТЕЛИ' },
  selecting_schedule: { number: 5, total: 7, name: 'РАСПИСАНИЕ' },
  selecting_alerts: { number: 6, total: 7, name: 'АЛЕРТЫ' },
  confirmation: { number: 7, total: 7, name: 'ПОДТВЕРЖДЕНИЕ' },
  active: { number: 0, total: 0, name: '' },
};

export function getStepHeader(state: MetrikaState): string {
  const info = STEP_INFO[state];
  if (!info.number) return '';
  return `═══ ШАГ ${info.number} ИЗ ${info.total}: ${info.name} ═══`;
}
