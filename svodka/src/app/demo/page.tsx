import type { Signal, Problem, Action, InsightData } from "@/lib/engine/types";
import { OverviewContent } from "@/components/dashboard/overview-content";

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
    metricLabel: "Стоимость заявки",
    currentValue: 508,
    previousValue: 409,
    changePercent: 24.1,
    severity: "critical",
    message: "Стоимость заявки выросла на 24% — привлечение клиента дорожает",
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
    message: "Расход на рекламу вырос на 8.7% (45 230 ₽)",
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
    title: "Стоимость заявки растёт из-за падения конверсий на сайте",
    description:
      "Стоимость заявки выросла на 24% за последние 3 дня. При этом кликабельность рекламы стабильна — проблема не в объявлениях, а в посадочной странице.",
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
    title: "Настроить алерт на стоимость заявки",
    description:
      "Установите порог 600₽ за заявку — получите уведомление до того, как ситуация станет критической",
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

export default function DemoOverviewPage() {
  return (
    <div className="space-y-10">
      <h1 className="text-[26px] font-bold tracking-tight">Обзор</h1>
      <OverviewContent
        status="attention"
        problems={problems}
        actions={actions}
        insight={insight}
      />
    </div>
  );
}
