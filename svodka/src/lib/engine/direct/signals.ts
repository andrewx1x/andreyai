// Signal layer for Direct data
// Detects anomalies, diagnoses causes from campaign context, assigns impact weights

import type { DirectStats, CampaignStats } from "./api";
import type { Signal, InsightData, DirectSettings } from "../types";
import { calcChange } from "../format";

export function extractSignals(
  current: DirectStats,
  previous: DirectStats,
  thresholds?: DirectSettings["alerts"]["thresholds"],
  campaigns?: CampaignStats[],
  previousCampaigns?: CampaignStats[]
): Signal[] {
  const signals: Signal[] = [];
  const t = thresholds || { cost_spike: 30, ctr_drop: 20, cpa_spike: 30 };

  // ── CPA ──
  if (current.costPerConversion > 0 && previous.costPerConversion > 0) {
    const cpaChange = calcChange(current.costPerConversion, previous.costPerConversion);
    if (Math.abs(cpaChange) > 15) {
      const isCritical = cpaChange > t.cpa_spike * 1.5;
      const isWarning = cpaChange > t.cpa_spike;

      let cause: string | undefined;
      if (cpaChange > 30) {
        const convChange = calcChange(current.conversions, previous.conversions);
        const costChange = calcChange(current.cost, previous.cost);

        if (convChange < -20 && costChange > -5) {
          cause = "Конверсии падают при стабильном расходе — проблема на стороне сайта или в качестве трафика.";
        } else if (costChange > 20 && convChange > -5) {
          cause = "Расход растёт без роста конверсий — ставки завышены или конкуренция выросла.";
        } else if (convChange < -20 && costChange > 20) {
          cause = "Двойной удар: расход растёт + конверсии падают. Нужна срочная оптимизация.";
        }

        // Campaign-level diagnosis
        if (!cause && campaigns && campaigns.length > 0) {
          cause = diagnoseCpaByCampaigns(campaigns, previousCampaigns);
        }
      }

      if (cpaChange > 0) {
        signals.push({
          type: "growth",
          metric: "cpa",
          metricLabel: "Стоимость заявки",
          currentValue: current.costPerConversion,
          previousValue: previous.costPerConversion,
          changePercent: cpaChange,
          severity: isCritical ? "critical" : isWarning ? "warning" : "info",
          message: `Стоимость заявки выросла на ${Math.round(cpaChange)}% (${Math.round(current.costPerConversion)} ₽)`,
          cause,
          channel: "ads",
          impact: computeImpact(cpaChange, isCritical ? "critical" : isWarning ? "warning" : "info"),
        });
      }
    }
  }

  // ── CTR ──
  if (previous.ctr > 0) {
    const ctrChange = calcChange(current.ctr, previous.ctr);
    if (ctrChange < -10) {
      const isCritical = ctrChange < -t.ctr_drop * 1.5;
      const isWarning = ctrChange < -t.ctr_drop;

      let cause: string | undefined;
      if (ctrChange < -20) {
        cause = "Возможные причины: выгорание объявлений, рост конкуренции, потеря позиций показа.";
        if (campaigns && campaigns.length > 0) {
          const worstCtr = [...campaigns].sort((a, b) => a.ctr - b.ctr);
          if (worstCtr[0] && worstCtr[0].ctr < current.ctr * 0.5) {
            cause = `Главный провал CTR — кампания «${worstCtr[0].campaignName}» (${worstCtr[0].ctr.toFixed(2)}%). Рассмотрите обновление объявлений.`;
          }
        }
      }

      signals.push({
        type: "drop",
        metric: "ctr",
        metricLabel: "CTR",
        currentValue: current.ctr,
        previousValue: previous.ctr,
        changePercent: ctrChange,
        severity: isCritical ? "critical" : isWarning ? "warning" : "info",
        message: `CTR упал на ${Math.round(Math.abs(ctrChange))}% (${current.ctr.toFixed(2)}%)`,
        cause,
        channel: "ads",
        impact: computeImpact(ctrChange, isCritical ? "critical" : isWarning ? "warning" : "info"),
      });
    }
  }

  // ── Cost ──
  const costChange = calcChange(current.cost, previous.cost);
  if (costChange > 20) {
    const isCritical = costChange > t.cost_spike * 1.5;
    const isWarning = costChange > t.cost_spike;

    let cause: string | undefined;
    const clicksChange = calcChange(current.clicks, previous.clicks);
    if (costChange > 30 && clicksChange < 10) {
      cause = "Расход растёт без роста кликов — средняя цена клика выросла. Проверьте ставки.";
    } else if (costChange > 30 && clicksChange > 20) {
      cause = "Расход растёт вместе с кликами — бюджет расходуется быстрее. Проверьте дневные лимиты.";
    }

    if (!cause && campaigns) {
      const topCost = [...campaigns].sort((a, b) => b.cost - a.cost)[0];
      if (topCost && topCost.cost > current.cost * 0.5) {
        cause = `Более 50% расхода приходится на «${topCost.campaignName}». Проверьте эффективность.`;
      }
    }

    signals.push({
      type: "spike",
      metric: "cost",
      metricLabel: "Расход",
      currentValue: current.cost,
      previousValue: previous.cost,
      changePercent: costChange,
      severity: isCritical ? "critical" : isWarning ? "warning" : "info",
      message: `Расход вырос на ${Math.round(costChange)}%`,
      cause,
      channel: "ads",
      impact: computeImpact(costChange, isCritical ? "critical" : isWarning ? "warning" : "info"),
    });
  }

  // ── Clicks ──
  const clicksChange = calcChange(current.clicks, previous.clicks);
  if (clicksChange < -20) {
    signals.push({
      type: "drop",
      metric: "clicks",
      metricLabel: "Клики",
      currentValue: current.clicks,
      previousValue: previous.clicks,
      changePercent: clicksChange,
      severity: clicksChange < -50 ? "critical" : "warning",
      message: `Клики упали на ${Math.round(Math.abs(clicksChange))}%`,
      cause: clicksChange < -40
        ? "Возможно, кампании остановлены, бюджет исчерпан или ставки слишком низкие."
        : "Проверьте статус кампаний и настройки таргетинга.",
      channel: "ads",
      impact: computeImpact(clicksChange, clicksChange < -50 ? "critical" : "warning"),
    });
  }

  // ── Conversions ──
  if (current.conversions > 0 || previous.conversions > 0) {
    const convChange = calcChange(current.conversions, previous.conversions);
    if (convChange < -20) {
      let cause: string | undefined;
      if (clicksChange > -5) {
        cause = "Клики стабильны, но конверсии падают — проблема на стороне сайта (формы, скорость, контент).";
      } else {
        cause = "Конверсии падают вместе с кликами — трафика стало меньше.";
      }

      signals.push({
        type: "drop",
        metric: "conversions",
        metricLabel: "Конверсии",
        currentValue: current.conversions,
        previousValue: previous.conversions,
        changePercent: convChange,
        severity: convChange < -50 ? "critical" : "warning",
        message: `Конверсии упали на ${Math.round(Math.abs(convChange))}%`,
        cause,
        channel: "ads",
        impact: computeImpact(convChange, convChange < -50 ? "critical" : "warning"),
      });
    }
  }

  signals.sort((a, b) => b.impact - a.impact);
  return signals;
}

/** Находит кампанию-виновника роста CPA */
function diagnoseCpaByCampaigns(
  campaigns: CampaignStats[],
  previousCampaigns?: CampaignStats[]
): string | undefined {
  if (!previousCampaigns || previousCampaigns.length === 0) {
    const top = [...campaigns].sort((a, b) => b.cost - a.cost)[0];
    return top ? `Основной расход: «${top.campaignName}» (${Math.round(top.cost)} ₽).` : undefined;
  }

  const prevMap = new Map(previousCampaigns.map((c) => [c.campaignId, c]));
  const degraded: Array<{ name: string; cpaDelta: number }> = [];

  for (const c of campaigns) {
    const prev = prevMap.get(c.campaignId);
    if (prev && prev.costPerConversion > 0 && c.costPerConversion > 0) {
      const delta = c.costPerConversion - prev.costPerConversion;
      if (delta > prev.costPerConversion * 0.3) {
        degraded.push({ name: c.campaignName, cpaDelta: delta });
      }
    }
  }

  degraded.sort((a, b) => b.cpaDelta - a.cpaDelta);

  if (degraded.length === 0) return undefined;
  if (degraded.length === 1) {
    return `Рост стоимости заявки из-за кампании «${degraded[0].name}» (+${Math.round(degraded[0].cpaDelta)} ₽).`;
  }
  return `Рост стоимости заявки в кампаниях: ${degraded.slice(0, 3).map((d) => `«${d.name}»`).join(", ")}.`;
}

function computeImpact(changePercent: number, severity: "info" | "warning" | "critical"): number {
  const weights = { critical: 3, warning: 2, info: 1 };
  return weights[severity] * Math.abs(changePercent);
}

export function generateInsight(
  current: DirectStats,
  previous: DirectStats,
  signals: Signal[],
  campaigns?: CampaignStats[]
): InsightData {
  if (signals.length === 0) {
    return {
      status: "positive",
      message: "Показатели рекламы стабильны, значительных отклонений нет.",
    };
  }

  const criticalSignals = signals.filter((s) => s.severity === "critical");
  if (criticalSignals.length > 0) {
    const main = criticalSignals[0];
    return {
      status: "warning",
      message: main.message + ".",
      cause: main.cause || "Требуется детальный анализ кампаний.",
      recommendation: getRecommendation(main),
    };
  }

  const warningSignals = signals.filter((s) => s.severity === "warning");
  if (warningSignals.length > 0) {
    const main = warningSignals[0];
    return {
      status: "warning",
      message: main.message + ".",
      cause: main.cause,
      recommendation: getRecommendation(main),
    };
  }

  return { status: "neutral", message: "Незначительные изменения в рекламных показателях." };
}

function getRecommendation(signal: Signal): string {
  switch (signal.metric) {
    case "cpa":
      return "Проверьте конверсию сайта и ставки. Отключите неэффективные кампании.";
    case "ctr":
      return "Обновите тексты объявлений. Проверьте ключевые слова и релевантность.";
    case "cost":
      return "Проверьте дневные бюджеты и ставки. Оцените ROI по кампаниям.";
    case "clicks":
      return "Проверьте статус кампаний, бюджеты и ставки.";
    case "conversions":
      return "Проверьте работу сайта, формы заявок и отслеживание конверсий.";
    default:
      return "Следите за динамикой в ближайшие дни.";
  }
}
