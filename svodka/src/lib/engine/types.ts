// Shared types for the analytics engine

// ── Settings ──

export interface MetrikaSettings {
  counter_id: number;
  counter_name: string;
  goals: Array<{ id: number; name: string }>;
  metrics: string[];
  alerts: {
    enabled: boolean;
    thresholds: {
      traffic_drop: number;
      bounce_increase: number;
      conversion_drop: number;
    };
  };
}

export interface DirectSettings {
  login: string;
  campaigns: "all" | number[];
  metrics: string[];
  compare_period: "day" | "week" | "month";
  alerts: {
    enabled: boolean;
    thresholds: {
      cpa_increase: number;
      ctr_drop: number;
      spend_limit: number;
    };
  };
}

// ── Signal Layer ──

export interface Signal {
  type: "growth" | "drop" | "spike" | "anomaly";
  metric: string;
  metricLabel: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  severity: "info" | "warning" | "critical";
  message: string;
  /** Что привело к этому сигналу */
  cause?: string;
  /** Канал: сайт или реклама */
  channel: "site" | "ads";
  /** Числовой вес для ранжирования (больше = важнее) */
  impact: number;
}

// ── Problem Layer ──

export type ProblemPriority = "critical" | "high" | "medium" | "low";

export interface Problem {
  id: string;
  priority: ProblemPriority;
  title: string;
  description: string;
  cause: string;
  /** Какие сигналы привели к этой проблеме */
  relatedSignals: Signal[];
  /** Канал или кросс-канальная */
  channel: "site" | "ads" | "cross";
}

// ── Action Layer ──

export type ActionUrgency = "urgent" | "high" | "medium" | "low";

export interface Action {
  id: string;
  urgency: ActionUrgency;
  title: string;
  description: string;
  /** К какой проблеме относится */
  problemId?: string;
  /** Экран, на который перейти для детализации */
  screen?: "site" | "ads" | "settings";
}

// ── Insight Layer ──

export interface InsightData {
  status: "positive" | "warning" | "neutral";
  message: string;
  cause?: string;
  recommendation?: string;
}

// ── Cockpit ──

export type BusinessStatus = "healthy" | "attention" | "critical";

export interface CockpitData {
  status: BusinessStatus;
  statusLabel: string;
  /** Топ-3 проблемы, ранжированные по приоритету */
  problems: Problem[];
  /** Топ-3 действия на сегодня */
  actions: Action[];
  /** Кросс-канальный инсайт */
  insight: InsightData;
  /** Все сигналы, отсортированные по impact */
  signals: Signal[];
}

// ── API ──

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  errorCode?: number;
}
