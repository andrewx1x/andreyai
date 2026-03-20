// Shared types for the analytics engine

// ── Settings ──

export interface MetrikaSettings {
  counter_id: number;
  counter_name: string;
  goals: Array<{ id: number; name: string }>;
  metrics: string[];
  /** Какие KPI показывать на дашборде (если не задано — все) */
  visible_kpis?: string[];
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
  /** Какие KPI показывать на дашборде (если не задано — все) */
  visible_kpis?: string[];
  alerts: {
    enabled: boolean;
    thresholds: {
      cost_spike: number;
      ctr_drop: number;
      cpa_spike: number;
    };
  };
}

// ── Available metrics catalog ──

export const METRIKA_KPI_CATALOG = [
  { key: "visits", label: "Визиты", description: "Количество визитов за период" },
  { key: "users", label: "Посетители", description: "Уникальные посетители" },
  { key: "bounceRate", label: "Отказы", description: "Процент отказов", invertColors: true },
  { key: "pageDepth", label: "Глубина просмотра", description: "Среднее кол-во страниц за визит" },
  { key: "avgSessionDuration", label: "Время на сайте", description: "Среднее время сессии" },
  { key: "pageviews", label: "Просмотры страниц", description: "Общее число просмотров" },
] as const;

export const DIRECT_KPI_CATALOG = [
  { key: "cost", label: "Расход", description: "Потрачено на рекламу", invertColors: true },
  { key: "clicks", label: "Клики", description: "Количество кликов по объявлениям" },
  { key: "ctr", label: "Кликабельность", description: "Процент кликов от показов" },
  { key: "costPerConversion", label: "Стоимость заявки", description: "Средняя цена одной конверсии", invertColors: true },
  { key: "conversions", label: "Конверсии", description: "Количество целевых действий" },
  { key: "impressions", label: "Показы", description: "Сколько раз показали объявления" },
] as const;

export const DEFAULT_METRIKA_KPIS = ["visits", "users", "bounceRate", "pageDepth"];
export const DEFAULT_DIRECT_KPIS = ["cost", "clicks", "ctr", "costPerConversion"];

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
