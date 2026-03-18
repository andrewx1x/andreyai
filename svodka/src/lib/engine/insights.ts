// Cross-channel decision engine
// Combines site + ads signals into Problems, Actions, and CockpitData

import type {
  Signal,
  InsightData,
  Problem,
  ProblemPriority,
  Action,
  ActionUrgency,
  BusinessStatus,
  CockpitData,
} from "./types";

// ── Main entry point ──

export function buildCockpit(
  metrikaSignals: Signal[],
  directSignals: Signal[]
): CockpitData {
  const allSignals = [...metrikaSignals, ...directSignals].sort((a, b) => b.impact - a.impact);
  const problems = detectProblems(metrikaSignals, directSignals);
  const actions = generateActions(problems, allSignals);
  const status = computeBusinessStatus(problems);
  const insight = generateCombinedInsight(metrikaSignals, directSignals, problems);

  return {
    status,
    statusLabel: statusLabels[status],
    problems: problems.slice(0, 3),
    actions: actions.slice(0, 3),
    insight,
    signals: allSignals,
  };
}

const statusLabels: Record<BusinessStatus, string> = {
  healthy: "Всё в порядке",
  attention: "Требует внимания",
  critical: "Есть проблемы",
};

// ── Problem detection ──

function detectProblems(
  metrikaSignals: Signal[],
  directSignals: Signal[]
): Problem[] {
  const problems: Problem[] = [];
  let id = 0;

  const find = (signals: Signal[], metric: string, type?: string) =>
    signals.find((s) => s.metric === metric && (!type || s.type === type));

  const trafficDrop = find(metrikaSignals, "visits", "drop");
  const trafficGrowth = find(metrikaSignals, "visits", "growth");
  const bounceGrowth = find(metrikaSignals, "bounceRate", "growth");
  const cpaGrowth = find(directSignals, "cpa", "growth");
  const ctrDrop = find(directSignals, "ctr", "drop");
  const costSpike = find(directSignals, "cost", "spike");
  const clicksDrop = find(directSignals, "clicks", "drop");
  const convDrop = find(directSignals, "conversions", "drop");
  const goalDrops = metrikaSignals.filter((s) => s.metric.startsWith("goal_") && s.type === "drop");

  // ── Cross-channel: трафик вырос, конверсии нет ──
  if (trafficGrowth && (cpaGrowth || convDrop || goalDrops.length > 0)) {
    const relatedSignals = [trafficGrowth, cpaGrowth, convDrop, ...goalDrops].filter(Boolean) as Signal[];
    problems.push({
      id: `problem_${id++}`,
      priority: "critical",
      title: "Трафик растёт, а заявки — нет",
      description: "Сайт получает больше визитов, но конверсия или заявки не растут. Деньги расходуются неэффективно.",
      cause: "Некачественный трафик: реклама приводит нерелевантную аудиторию, или посадочная страница не соответствует ожиданиям.",
      relatedSignals,
      channel: "cross",
    });
  }

  // ── Cross-channel: расход вырос, сайт хуже конвертирует ──
  if (costSpike && bounceGrowth) {
    problems.push({
      id: `problem_${id++}`,
      priority: "critical",
      title: "Расход растёт, а сайт хуже конвертирует",
      description: "Рекламный бюджет увеличился, но отказы на сайте тоже выросли. ROI снижается.",
      cause: "Несоответствие рекламного обещания и содержания сайта. Или техническая деградация посадочной.",
      relatedSignals: [costSpike, bounceGrowth],
      channel: "cross",
    });
  }

  // ── Cross-channel: CPA вырос — из-за рекламы или из-за сайта? ──
  if (cpaGrowth && !problems.some((p) => p.relatedSignals.includes(cpaGrowth))) {
    const isSiteProblem = bounceGrowth || goalDrops.length > 0;
    const isAdProblem = ctrDrop || clicksDrop;

    if (isSiteProblem && !isAdProblem) {
      problems.push({
        id: `problem_${id++}`,
        priority: "high",
        title: "CPA вырос из-за проблем на сайте",
        description: "Стоимость привлечения растёт, потому что сайт хуже конвертирует трафик.",
        cause: bounceGrowth
          ? "Отказы выросли — посетители уходят, не оставляя заявок."
          : "Конверсия цели упала при стабильном трафике.",
        relatedSignals: [cpaGrowth, bounceGrowth, ...goalDrops].filter(Boolean) as Signal[],
        channel: "cross",
      });
    } else if (isAdProblem && !isSiteProblem) {
      problems.push({
        id: `problem_${id++}`,
        priority: "high",
        title: "CPA вырос из-за проблем в рекламе",
        description: "Стоимость привлечения растёт из-за снижения эффективности рекламных кампаний.",
        cause: ctrDrop
          ? "CTR упал — объявления привлекают меньше кликов."
          : "Клики упали — кампании теряют охват.",
        relatedSignals: [cpaGrowth, ctrDrop, clicksDrop].filter(Boolean) as Signal[],
        channel: "ads",
      });
    } else {
      problems.push({
        id: `problem_${id++}`,
        priority: "critical",
        title: "CPA вырос — проблемы и в рекламе, и на сайте",
        description: "Стоимость привлечения растёт одновременно из-за ухудшения рекламы и конверсии сайта.",
        cause: "Двойной удар: реклама менее эффективна + сайт хуже конвертирует.",
        relatedSignals: [cpaGrowth, ctrDrop, clicksDrop, bounceGrowth, ...goalDrops].filter(Boolean) as Signal[],
        channel: "cross",
      });
    }
  }

  // ── Cross-channel: bounce+CTR = несоответствие объявления и лендинга ──
  if (bounceGrowth && ctrDrop && !problems.some((p) => p.relatedSignals.includes(bounceGrowth) && p.relatedSignals.includes(ctrDrop))) {
    problems.push({
      id: `problem_${id++}`,
      priority: "high",
      title: "Несоответствие рекламы и посадочной",
      description: "CTR в рекламе падает, а отказы на сайте растут — аудитория не находит то, что обещала реклама.",
      cause: "Текст объявлений не соответствует содержанию посадочной страницы.",
      relatedSignals: [bounceGrowth, ctrDrop],
      channel: "cross",
    });
  }

  // ── Site-only: значительное падение трафика ──
  if (trafficDrop && trafficDrop.severity !== "info" && !problems.some((p) => p.relatedSignals.includes(trafficDrop))) {
    problems.push({
      id: `problem_${id++}`,
      priority: trafficDrop.severity === "critical" ? "critical" : "high",
      title: "Трафик на сайте упал",
      description: `Визиты снизились на ${Math.round(Math.abs(trafficDrop.changePercent))}%.`,
      cause: trafficDrop.cause || "Проверьте источники трафика, доступность сайта и рекламные кампании.",
      relatedSignals: [trafficDrop],
      channel: "site",
    });
  }

  // ── Ads-only: расход без отдачи ──
  if (costSpike && !problems.some((p) => p.relatedSignals.includes(costSpike))) {
    const hasMoreClicks = !clicksDrop;
    problems.push({
      id: `problem_${id++}`,
      priority: costSpike.severity === "critical" ? "critical" : "high",
      title: "Расход на рекламу вырос",
      description: `Бюджет увеличился на ${Math.round(costSpike.changePercent)}%${hasMoreClicks ? "" : " без роста кликов"}.`,
      cause: costSpike.cause || "Проверьте ставки и конкуренцию в аукционе.",
      relatedSignals: [costSpike, clicksDrop].filter(Boolean) as Signal[],
      channel: "ads",
    });
  }

  // ── Standalone signals as low-priority problems ──
  const coveredSignals = new Set(problems.flatMap((p) => p.relatedSignals));
  const uncovered = [...metrikaSignals, ...directSignals]
    .filter((s) => !coveredSignals.has(s) && (s.severity === "warning" || s.severity === "critical"));

  for (const signal of uncovered.slice(0, 2)) {
    problems.push({
      id: `problem_${id++}`,
      priority: signal.severity === "critical" ? "high" : "medium",
      title: signal.message,
      description: signal.cause || signal.message,
      cause: signal.cause || "Следите за динамикой.",
      relatedSignals: [signal],
      channel: signal.channel,
    });
  }

  // Sort by priority
  const priorityOrder: Record<ProblemPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  problems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return problems;
}

// ── Action generation ──

function generateActions(problems: Problem[], allSignals: Signal[]): Action[] {
  const actions: Action[] = [];
  let id = 0;

  for (const problem of problems.slice(0, 5)) {
    const urgency = problemToUrgency(problem.priority);

    switch (true) {
      // Cross-channel: traffic quality issue
      case problem.channel === "cross" && problem.title.includes("заявки"): {
        actions.push({
          id: `action_${id++}`,
          urgency,
          title: "Проверить качество трафика по источникам",
          description: "Откройте раздел Сайт → Источники трафика. Найдите источник с высокими отказами и низкой конверсией.",
          problemId: problem.id,
          screen: "site",
        });
        actions.push({
          id: `action_${id++}`,
          urgency: "high",
          title: "Проверить релевантность посадочных",
          description: "Убедитесь, что рекламное объявление ведёт на релевантную страницу с понятным CTA.",
          problemId: problem.id,
          screen: "ads",
        });
        break;
      }

      // Cross-channel: ad/landing mismatch
      case problem.title.includes("Несоответствие"): {
        actions.push({
          id: `action_${id++}`,
          urgency,
          title: "Сопоставить объявления и посадочные",
          description: "Проверьте, что заголовок и текст объявления соответствуют содержимому страницы, на которую ведёт ссылка.",
          problemId: problem.id,
          screen: "ads",
        });
        break;
      }

      // CPA from site
      case problem.title.includes("CPA") && problem.title.includes("сайте"): {
        actions.push({
          id: `action_${id++}`,
          urgency,
          title: "Проверить конверсию сайта",
          description: "Откройте Яндекс.Метрику → Конверсии. Проверьте работу форм, скорость загрузки и мобильную версию.",
          problemId: problem.id,
          screen: "site",
        });
        break;
      }

      // CPA from ads
      case problem.title.includes("CPA") && problem.title.includes("рекламе"): {
        actions.push({
          id: `action_${id++}`,
          urgency,
          title: "Оптимизировать рекламные кампании",
          description: "Пересмотрите ставки, отключите неэффективные ключевые слова, обновите объявления.",
          problemId: problem.id,
          screen: "ads",
        });
        break;
      }

      // Traffic drop
      case problem.title.includes("Трафик") && problem.title.includes("упал"): {
        actions.push({
          id: `action_${id++}`,
          urgency,
          title: "Проверить доступность сайта",
          description: "Убедитесь, что сайт доступен, нет ошибок 5xx, и скорость загрузки в норме.",
          problemId: problem.id,
          screen: "site",
        });
        break;
      }

      // Cost spike
      case problem.title.includes("Расход"): {
        actions.push({
          id: `action_${id++}`,
          urgency,
          title: "Проверить ставки и бюджеты",
          description: "Откройте Директ → Кампании. Проверьте дневные лимиты и стратегии назначения ставок.",
          problemId: problem.id,
          screen: "ads",
        });
        break;
      }

      default: {
        // Generic action from signal cause
        const signal = problem.relatedSignals[0];
        if (signal?.cause) {
          actions.push({
            id: `action_${id++}`,
            urgency,
            title: signal.message,
            description: signal.cause,
            problemId: problem.id,
            screen: signal.channel === "site" ? "site" : "ads",
          });
        }
      }
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  const urgencyOrder: Record<ActionUrgency, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  unique.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return unique;
}

function problemToUrgency(priority: ProblemPriority): ActionUrgency {
  switch (priority) {
    case "critical": return "urgent";
    case "high": return "high";
    case "medium": return "medium";
    default: return "low";
  }
}

// ── Business status ──

function computeBusinessStatus(problems: Problem[]): BusinessStatus {
  if (problems.some((p) => p.priority === "critical")) return "critical";
  if (problems.some((p) => p.priority === "high")) return "attention";
  return "healthy";
}

// ── Combined insight (legacy compat + cockpit) ──

function generateCombinedInsight(
  metrikaSignals: Signal[],
  directSignals: Signal[],
  problems: Problem[]
): InsightData {
  if (problems.length === 0 && metrikaSignals.length === 0 && directSignals.length === 0) {
    return {
      status: "positive",
      message: "Реклама и сайт работают стабильно. Значительных отклонений нет.",
    };
  }

  if (problems.length === 0) {
    const allSignals = [...metrikaSignals, ...directSignals];
    const positive = allSignals.filter(
      (s) => s.type === "growth" && s.metric !== "bounceRate" && s.metric !== "cpa" && s.metric !== "cost"
    );
    if (positive.length > 0) {
      return {
        status: "positive",
        message: positive.map((s) => s.message).join(". ") + ".",
      };
    }
    return { status: "neutral", message: "Незначительные изменения." };
  }

  const main = problems[0];
  return {
    status: main.priority === "critical" ? "warning" : "warning",
    message: main.title,
    cause: main.cause,
    recommendation: main.channel === "cross"
      ? "Проблема затрагивает и рекламу, и сайт — нужно смотреть оба канала."
      : main.channel === "site"
      ? "Начните с анализа данных сайта."
      : "Начните с анализа рекламных кампаний.",
  };
}

// ── Legacy exports for backward compat ──

export { buildCockpit as generateCockpitData };

export function getBusinessStatus(
  metrikaSignals: Signal[],
  directSignals: Signal[]
): BusinessStatus {
  const problems = detectProblems(metrikaSignals, directSignals);
  return computeBusinessStatus(problems);
}

export function generateCombinedInsightLegacy(
  metrikaSignals: Signal[],
  directSignals: Signal[]
): InsightData {
  const problems = detectProblems(metrikaSignals, directSignals);
  return generateCombinedInsight(metrikaSignals, directSignals, problems);
}
