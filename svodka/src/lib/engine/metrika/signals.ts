// Signal layer for Metrika data
// Detects anomalies, diagnoses causes, assigns impact weights

import type { MetrikaStats, TrafficSource } from "./api";
import type { Signal, InsightData, MetrikaSettings } from "../types";
import { calcChange } from "../format";

interface ExtractSignalsOptions {
  current: MetrikaStats;
  previous: MetrikaStats;
  thresholds?: MetrikaSettings["alerts"]["thresholds"];
  sources?: TrafficSource[];
  previousSources?: TrafficSource[];
}

export function extractSignals(
  current: MetrikaStats,
  previous: MetrikaStats,
  thresholds?: MetrikaSettings["alerts"]["thresholds"],
  sources?: TrafficSource[],
  previousSources?: TrafficSource[]
): Signal[] {
  const signals: Signal[] = [];
  const t = thresholds || { traffic_drop: 20, bounce_increase: 20, conversion_drop: 20 };

  // ── Traffic ──
  const visitChange = calcChange(current.visits, previous.visits);
  if (Math.abs(visitChange) > 5) {
    const isCritical = visitChange < -t.traffic_drop;
    const isWarning = visitChange < -10 || visitChange > 30;

    // Diagnose cause from traffic sources
    let cause: string | undefined;
    if (visitChange < -10 && sources && previousSources) {
      cause = diagnoseTrafficDrop(sources, previousSources);
    } else if (visitChange < -10) {
      cause = "Проверьте Яндекс.Вебмастер, доступность сайта и рекламные кампании.";
    }

    signals.push({
      type: visitChange > 0 ? "growth" : "drop",
      metric: "visits",
      metricLabel: "Визиты",
      currentValue: current.visits,
      previousValue: previous.visits,
      changePercent: visitChange,
      severity: isCritical ? "critical" : isWarning ? "warning" : "info",
      message: visitChange > 0
        ? `Трафик вырос на ${Math.round(Math.abs(visitChange))}%`
        : `Трафик упал на ${Math.round(Math.abs(visitChange))}%`,
      cause,
      channel: "site",
      impact: computeImpact(visitChange, isCritical ? "critical" : isWarning ? "warning" : "info"),
    });
  }

  // ── Bounce rate ──
  const bounceChange = calcChange(current.bounceRate, previous.bounceRate);
  if (bounceChange > 5) {
    const isCritical = bounceChange > t.bounce_increase * 1.5;
    const isWarning = bounceChange > t.bounce_increase;

    let cause: string | undefined;
    if (bounceChange > 15 && visitChange > 10) {
      cause = "Рост некачественного трафика. Отказы растут вместе с визитами — вероятно, новый трафик нерелевантен.";
    } else if (bounceChange > 15) {
      cause = "Возможные проблемы: медленная загрузка, нерелевантный контент, технические ошибки на лендинге.";
    }

    signals.push({
      type: "growth",
      metric: "bounceRate",
      metricLabel: "Отказы",
      currentValue: current.bounceRate,
      previousValue: previous.bounceRate,
      changePercent: bounceChange,
      severity: isCritical ? "critical" : isWarning ? "warning" : "info",
      message: `Отказы выросли на ${Math.round(bounceChange)}% (${current.bounceRate.toFixed(1)}%)`,
      cause,
      channel: "site",
      impact: computeImpact(bounceChange, isCritical ? "critical" : isWarning ? "warning" : "info"),
    });
  }

  // ── Users ──
  const usersChange = calcChange(current.users, previous.users);
  if (Math.abs(usersChange) > 10) {
    const severity = Math.abs(usersChange) > 30 ? "warning" as const : "info" as const;
    signals.push({
      type: usersChange > 0 ? "growth" : "drop",
      metric: "users",
      metricLabel: "Посетители",
      currentValue: current.users,
      previousValue: previous.users,
      changePercent: usersChange,
      severity,
      message: usersChange > 0
        ? `Посетители: +${Math.round(usersChange)}%`
        : `Посетители: ${Math.round(usersChange)}%`,
      channel: "site",
      impact: computeImpact(usersChange, severity),
    });
  }

  // ── Page depth ──
  const depthChange = calcChange(current.pageDepth, previous.pageDepth);
  if (depthChange < -15) {
    signals.push({
      type: "drop",
      metric: "pageDepth",
      metricLabel: "Глубина просмотра",
      currentValue: current.pageDepth,
      previousValue: previous.pageDepth,
      changePercent: depthChange,
      severity: depthChange < -25 ? "warning" : "info",
      message: `Глубина просмотра упала на ${Math.round(Math.abs(depthChange))}%`,
      cause: "Пользователи смотрят меньше страниц. Проверьте навигацию и релевантность контента.",
      channel: "site",
      impact: computeImpact(depthChange, depthChange < -25 ? "warning" : "info"),
    });
  }

  // ── Goal conversions ──
  for (const [goalId, goalData] of Object.entries(current.goals)) {
    const prevGoal = previous.goals[Number(goalId)];
    if (!prevGoal || prevGoal.reaches === 0) continue;

    const reachesChange = calcChange(goalData.reaches, prevGoal.reaches);
    if (Math.abs(reachesChange) > 10) {
      const isCritical = reachesChange < -t.conversion_drop * 1.5;
      const isWarning = reachesChange < -t.conversion_drop;
      const isDrop = reachesChange < 0;

      let cause: string | undefined;
      if (isDrop && bounceChange > 10) {
        cause = "Конверсия падает на фоне роста отказов — проблема с качеством трафика или посадочной.";
      } else if (isDrop && visitChange < -10) {
        cause = "Конверсия падает вместе с трафиком — меньше визитов, меньше заявок.";
      } else if (isDrop) {
        cause = "Трафик стабилен, но конверсия упала. Проверьте формы, CTA и работоспособность сайта.";
      }

      signals.push({
        type: isDrop ? "drop" : "growth",
        metric: `goal_${goalId}`,
        metricLabel: `Цель #${goalId}`,
        currentValue: goalData.reaches,
        previousValue: prevGoal.reaches,
        changePercent: reachesChange,
        severity: isCritical ? "critical" : isWarning ? "warning" : "info",
        message: isDrop
          ? `Конверсия цели #${goalId} упала на ${Math.round(Math.abs(reachesChange))}%`
          : `Конверсия цели #${goalId} выросла на ${Math.round(reachesChange)}%`,
        cause,
        channel: "site",
        impact: computeImpact(reachesChange, isCritical ? "critical" : isWarning ? "warning" : "info"),
      });
    }
  }

  // Sort by impact descending
  signals.sort((a, b) => b.impact - a.impact);
  return signals;
}

/** Определяет какой источник трафика вызвал просадку */
function diagnoseTrafficDrop(
  current: TrafficSource[],
  previous: TrafficSource[]
): string {
  const prevMap = new Map(previous.map((s) => [s.source, s.visits]));
  const drops: Array<{ source: string; drop: number; dropPct: number }> = [];

  for (const src of current) {
    const prevVisits = prevMap.get(src.source) || 0;
    if (prevVisits > 0) {
      const drop = prevVisits - src.visits;
      const dropPct = (drop / prevVisits) * 100;
      if (drop > 0 && dropPct > 10) {
        drops.push({ source: src.source, drop, dropPct });
      }
    }
  }

  // Also check sources that disappeared
  for (const [source, visits] of prevMap) {
    if (!current.find((s) => s.source === source) && visits > 5) {
      drops.push({ source, drop: visits, dropPct: 100 });
    }
  }

  drops.sort((a, b) => b.drop - a.drop);

  if (drops.length === 0) return "Равномерное снижение по всем источникам.";

  const top = drops[0];
  if (drops.length === 1) {
    return `Основная причина — падение из «${top.source}» (−${Math.round(top.dropPct)}%).`;
  }

  return `Основные источники просадки: ${drops
    .slice(0, 3)
    .map((d) => `«${d.source}» −${Math.round(d.dropPct)}%`)
    .join(", ")}.`;
}

/** Impact = severity_weight * abs(changePercent) — для ранжирования */
function computeImpact(changePercent: number, severity: "info" | "warning" | "critical"): number {
  const weights = { critical: 3, warning: 2, info: 1 };
  return weights[severity] * Math.abs(changePercent);
}

export function generateInsight(
  current: MetrikaStats,
  previous: MetrikaStats,
  signals: Signal[]
): InsightData {
  if (signals.length === 0) {
    return {
      status: "positive",
      message: "Показатели сайта стабильны, значительных отклонений нет.",
    };
  }

  const criticalSignals = signals.filter((s) => s.severity === "critical");
  const warningSignals = signals.filter((s) => s.severity === "warning");

  if (criticalSignals.length > 0) {
    const main = criticalSignals[0];
    return {
      status: "warning",
      message: main.message + ".",
      cause: main.cause || "Требуется анализ.",
      recommendation: getRecommendation(main),
    };
  }

  if (warningSignals.length > 0) {
    const main = warningSignals[0];
    return {
      status: "warning",
      message: main.message + ".",
      cause: main.cause,
      recommendation: getRecommendation(main),
    };
  }

  const positiveSignals = signals.filter((s) => s.type === "growth" && s.metric !== "bounceRate");
  if (positiveSignals.length > 0) {
    return {
      status: "positive",
      message: `Положительная динамика: ${positiveSignals.map((s) => s.message.toLowerCase()).join(", ")}.`,
    };
  }

  return { status: "neutral", message: "Незначительные изменения в показателях." };
}

function getRecommendation(signal: Signal): string {
  switch (signal.metric) {
    case "visits":
      return signal.type === "drop"
        ? "Проверьте доступность сайта и Яндекс.Вебмастер. Если запущена реклама — проверьте статус кампаний."
        : "Убедитесь, что новый трафик качественный — смотрите отказы и конверсию.";
    case "bounceRate":
      return "Проверьте скорость загрузки сайта, релевантность контента и качество трафика по источникам.";
    case "pageDepth":
      return "Проверьте навигацию, внутреннюю перелинковку и актуальность контента.";
    default:
      if (signal.metric.startsWith("goal_")) {
        return "Проверьте работу форм, кнопок CTA и воронку конверсии.";
      }
      return "Следите за динамикой в ближайшие дни.";
  }
}
