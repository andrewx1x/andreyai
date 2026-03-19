import type { Signal, Problem, Action, InsightData } from "@/lib/engine/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProblemCard } from "@/components/dashboard/problem-card";
import { DemoActionCard } from "./demo-action-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Info, Activity } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Mock Signals ──

const signals: Signal[] = [
  {
    type: "drop",
    metric: "conversions",
    metricLabel: "Конверсии",
    currentValue: 89,
    previousValue: 102,
    changePercent: -12.4,
    severity: "critical",
    message: "Конверсии снизились на 12.4% (89 вместо 102)",
    cause: "Рост отказов с мобильных устройств, форма заявки может быть недоступна",
    channel: "site",
    impact: 95,
  },
  {
    type: "growth",
    metric: "cpa",
    metricLabel: "CPA",
    currentValue: 508,
    previousValue: 409,
    changePercent: 24.1,
    severity: "critical",
    message: "CPA вырос на 24% — стоимость привлечения клиента растёт",
    cause: "Падение конверсий при стабильном расходе на рекламу",
    channel: "ads",
    impact: 90,
  },
  {
    type: "growth",
    metric: "bounceRate",
    metricLabel: "Отказы",
    currentValue: 34.2,
    previousValue: 32.5,
    changePercent: 5.1,
    severity: "warning",
    message: "Отказы выросли до 34.2% (+5.1%)",
    cause: "Bounce rate на мобильных устройствах вырос до 48%",
    channel: "site",
    impact: 75,
  },
  {
    type: "drop",
    metric: "ctr",
    metricLabel: "CTR",
    currentValue: 8.5,
    previousValue: 12.0,
    changePercent: -29.2,
    severity: "warning",
    message: "CTR кампании \u00ABБренд-запросы\u00BB снизился с 12% до 8.5%",
    cause: "Конкуренты могут показывать рекламу по вашим брендовым запросам",
    channel: "ads",
    impact: 65,
  },
  {
    type: "growth",
    metric: "cost",
    metricLabel: "Расход",
    currentValue: 45230,
    previousValue: 41600,
    changePercent: 8.7,
    severity: "warning",
    message: "Расход на рекламу вырос на 8.7% (45 230 \u20BD)",
    cause: "Увеличение ставок по высокочастотным запросам",
    channel: "ads",
    impact: 55,
  },
  {
    type: "growth",
    metric: "visits",
    metricLabel: "Визиты",
    currentValue: 12847,
    previousValue: 12449,
    changePercent: 3.2,
    severity: "info",
    message: "Трафик на сайт вырос на 3.2% — 12 847 визитов",
    cause: "Рост переходов из органического поиска",
    channel: "site",
    impact: 30,
  },
  {
    type: "spike",
    metric: "mobileBounce",
    metricLabel: "Отказы (мобильные)",
    currentValue: 48,
    previousValue: 35,
    changePercent: 37.1,
    severity: "critical",
    message: "Отказы с мобильных выросли до 48% (было 35%)",
    cause: "Возможная проблема со скоростью загрузки или формой на мобильных",
    channel: "site",
    impact: 85,
  },
  {
    type: "anomaly",
    metric: "avgSessionDuration",
    metricLabel: "Время на сайте",
    currentValue: 1.8,
    previousValue: 2.4,
    changePercent: -25.0,
    severity: "warning",
    message: "Среднее время на сайте снизилось на 25% (1м 48с)",
    cause: "Пользователи уходят, не дождавшись загрузки страницы",
    channel: "site",
    impact: 60,
  },
];

// ── Mock Problems ──

const problems: Problem[] = [
  {
    id: "prob-1",
    priority: "critical",
    channel: "cross",
    title: "CPA растёт из-за падения конверсий на сайте",
    description:
      "CPA вырос на 24% за последние 3 дня. При этом CTR рекламы стабилен — проблема не в объявлениях, а в посадочной странице.",
    cause: "Конверсии на сайте снизились на 12%, отказы выросли на 5%",
    relatedSignals: [signals[0], signals[1]],
  },
  {
    id: "prob-2",
    priority: "high",
    channel: "site",
    title: "Рост отказов с мобильных устройств",
    description:
      "Bounce rate на мобильных вырос до 48% (было 35%). Десктоп стабилен.",
    cause: "Возможные причины: скорость загрузки или поломка мобильной версии",
    relatedSignals: [signals[2], signals[6]],
  },
  {
    id: "prob-3",
    priority: "medium",
    channel: "ads",
    title: "Кампания \u00ABБренд-запросы\u00BB теряет CTR",
    description: "CTR снизился с 12% до 8.5% за неделю.",
    cause: "Конкуренты могут показывать рекламу по вашим брендовым запросам",
    relatedSignals: [signals[3]],
  },
];

// ── Mock Actions ──

const actions: Action[] = [
  {
    id: "act-1",
    urgency: "urgent",
    title: "Проверить посадочную страницу",
    description:
      "Откройте страницу с мобильного — проверьте форму заявки и скорость загрузки",
    problemId: "prob-2",
    screen: "site",
  },
  {
    id: "act-2",
    urgency: "high",
    title: "Обновить объявления в \u00ABБренд-запросы\u00BB",
    description: "Добавьте УТП в заголовки, обновите быстрые ссылки",
    problemId: "prob-3",
    screen: "ads",
  },
  {
    id: "act-3",
    urgency: "medium",
    title: "Настроить алерт на CPA",
    description:
      "Установите порог CPA 600\u20BD — получите уведомление до того, как ситуация станет критической",
    problemId: "prob-1",
    screen: "settings",
  },
];

// ── Mock Insight ──

const insight: InsightData = {
  status: "warning",
  message:
    "Рекламный бюджет расходуется эффективно, но конверсии на сайте падают. Это временно увеличивает стоимость привлечения клиента.",
  cause: "Корневая причина — в посадочной странице, не в рекламе",
  recommendation:
    "Сфокусируйтесь на UX мобильной версии сайта. Это даст максимальный эффект при текущем бюджете.",
};

// ── Mock Events ──

const recentEvents = [
  { id: 1, severity: "critical" as const, message: "CPA превысил 500\u20BD — порог алерта", source: "Директ", date: "18 мар" },
  { id: 2, severity: "critical" as const, message: "Отказы с мобильных выросли до 48%", source: "Метрика", date: "18 мар" },
  { id: 3, severity: "warning" as const, message: "Конверсии снизились на 12.4%", source: "Метрика", date: "17 мар" },
  { id: 4, severity: "warning" as const, message: "CTR кампании \u00ABБренд-запросы\u00BB ниже 10%", source: "Директ", date: "17 мар" },
  { id: 5, severity: "info" as const, message: "Трафик вырос на 3.2% за сутки", source: "Метрика", date: "16 мар" },
  { id: 6, severity: "info" as const, message: "Новая кампания \u00ABВесна-2026\u00BB запущена", source: "Директ", date: "15 мар" },
];

// ── Status config ──

const statusConfig = {
  healthy: { label: "Всё в порядке", color: "bg-emerald-500", textColor: "text-emerald-700" },
  attention: { label: "Требует внимания", color: "bg-amber-500", textColor: "text-amber-700" },
  critical: { label: "Есть проблемы", color: "bg-rose-500", textColor: "text-rose-700" },
};

// ── Sparkline data ──
const visitsSparkline = [1640, 1890, 2010, 1750, 1920, 1580, 1320];
const bounceSparkline = [31.2, 29.8, 30.5, 32.1, 33.4, 36.8, 34.2];
const conversionsSparkline = [18, 16, 15, 14, 12, 10, 89 / 7];
const spendSparkline = [6120, 6840, 7210, 6450, 6930, 5890, 5790];
const cpaSparkline = [395, 409, 445, 456, 487, 498, 508];

export default function DemoOverviewPage() {
  const status = "attention" as const;

  const severityIcon = {
    critical: <AlertCircle className="h-4 w-4 text-rose-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    info: <Info className="h-4 w-4 text-blue-500" />,
  };

  const criticalCount = signals.filter((s) => s.severity === "critical").length;
  const warningCount = signals.filter((s) => s.severity === "warning").length;

  return (
    <div className="space-y-10">
      {/* ── Status header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-[26px] font-bold tracking-tight">Обзор</h1>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white",
              statusConfig[status].color
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            {statusConfig[status].label}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="flex items-center gap-1.5 text-rose-600">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
            {criticalCount} критич.
          </span>
          <span className="flex items-center gap-1.5 text-amber-600">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            {warningCount} внимание
          </span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
        <KpiCard
          label="Визиты"
          value="12 847"
          change={3.2}
          sparklineData={visitsSparkline}
        />
        <KpiCard
          label="Отказы"
          value="34.2%"
          change={5.1}
          invertColors
          sparklineData={bounceSparkline}
        />
        <KpiCard
          label="Конверсии"
          value="89"
          change={-12.4}
          sparklineData={conversionsSparkline}
        />
        <KpiCard
          label="Расход"
          value="45 230"
          suffix=" \u20BD"
          change={8.7}
          invertColors
          sparklineData={spendSparkline}
        />
        <KpiCard
          label="CPA"
          value="508"
          suffix=" \u20BD"
          change={24.1}
          invertColors
          sparklineData={cpaSparkline}
        />
      </div>

      {/* ── Problems: Что не так ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="inline-block h-1 w-4 rounded-full bg-rose-400" />
          Что не так
        </h2>
        <div className="space-y-3">
          {problems.map((problem, i) => (
            <ProblemCard key={problem.id} problem={problem} index={i} />
          ))}
        </div>
      </section>

      {/* ── Actions: Что делать ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="inline-block h-1 w-4 rounded-full bg-indigo-400" />
          Что делать сегодня
        </h2>
        <div className="space-y-3">
          {actions.map((action, i) => (
            <DemoActionCard key={action.id} action={action} index={i} />
          ))}
        </div>
      </section>

      {/* ── Insight ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="inline-block h-1 w-4 rounded-full bg-amber-400" />
          Инсайт
        </h2>
        <InsightCard insight={insight} />
      </section>

      {/* ── Signals ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="inline-block h-1 w-4 rounded-full bg-blue-400" />
          Все сигналы ({signals.length})
        </h2>
        <div className="space-y-2">
          {signals.map((signal, i) => (
            <SignalBadge key={i} signal={signal} />
          ))}
        </div>
      </section>

      {/* ── Recent events ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="inline-block h-1 w-4 rounded-full bg-gray-400" />
            Последние события
          </h2>
          <Link
            href="/demo/events"
            className="text-[13px] font-medium text-primary hover:underline"
          >
            Все события &rarr;
          </Link>
        </div>
        <Card>
          <CardContent className="divide-y p-0">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30"
              >
                {severityIcon[event.severity]}
                <span className="flex-1 truncate text-[14px]">{event.message}</span>
                <Badge variant="outline" className="shrink-0 text-[11px]">
                  {event.source}
                </Badge>
                <span className="shrink-0 tabular-nums text-[13px] text-muted-foreground">
                  {event.date}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
