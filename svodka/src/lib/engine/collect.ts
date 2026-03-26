// Shared data collection: fetches Metrika + Direct signals for a user's projects
// Used by overview page (live) and cron/alerts

import { getStats as getMetrikaStats, formatDateForApi, getYesterday } from "@/lib/engine/metrika/api";
import { extractSignals as extractMetrikaSignals } from "@/lib/engine/metrika/signals";
import { getStats as getDirectStats, formatDateForApi as formatDirectDate, getDateRange } from "@/lib/engine/direct/api";
import { extractSignals as extractDirectSignals } from "@/lib/engine/direct/signals";
import { buildCockpit } from "@/lib/engine/insights";
import type { MetrikaSettings, DirectSettings, Signal, CockpitData } from "@/lib/engine/types";

export interface ProjectRecord {
  id: number;
  type: string;
  settingsJson: string;
}

export interface CollectResult {
  metrikaSignals: Signal[];
  directSignals: Signal[];
  cockpit: CockpitData;
  errors: string[];
}

/**
 * Fetch signals from a single project (Metrika or Direct).
 */
export async function collectProjectSignals(
  token: string,
  project: ProjectRecord
): Promise<{ signals: Signal[]; channel: "site" | "ads"; error?: string }> {
  let settings: MetrikaSettings | DirectSettings;
  try {
    settings = JSON.parse(project.settingsJson);
  } catch {
    return { signals: [], channel: "site", error: `Invalid settingsJson for project ${project.id}` };
  }

  if (project.type === "metrika") {
    const ms = settings as MetrikaSettings;
    const yesterday = getYesterday();
    // Current: last 7 completed days
    const currentFrom = new Date(yesterday);
    currentFrom.setDate(currentFrom.getDate() - 6);
    // Previous: 7 days before that
    const prevTo = new Date(currentFrom);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - 6);

    const [currentResult, prevResult] = await Promise.all([
      getMetrikaStats(token, {
        counterId: ms.counter_id,
        date1: formatDateForApi(currentFrom),
        date2: formatDateForApi(yesterday),
        metrics: ms.metrics,
        goalIds: ms.goals?.map((g) => g.id) || [],
      }),
      getMetrikaStats(token, {
        counterId: ms.counter_id,
        date1: formatDateForApi(prevFrom),
        date2: formatDateForApi(prevTo),
        metrics: ms.metrics,
        goalIds: ms.goals?.map((g) => g.id) || [],
      }),
    ]);

    if (!currentResult.ok || !currentResult.data) {
      return { signals: [], channel: "site", error: `Metrika fetch failed: ${currentResult.error}` };
    }

    const prev = prevResult.data || currentResult.data;

    const sources: { source: string; visits: number }[] = [];
    const signals = extractMetrikaSignals(currentResult.data, prev, ms.alerts?.thresholds, sources);
    return { signals, channel: "site" };
  }

  if (project.type === "direct") {
    const ds = settings as DirectSettings;
    const period = ds.compare_period || "week";
    const currentRange = getDateRange(period, 0);
    const previousRange = getDateRange(period, 1);
    const campaignIds = ds.campaigns === "all" ? undefined : ds.campaigns;

    const [currentResult, previousResult] = await Promise.all([
      getDirectStats(token, ds.login, {
        dateFrom: formatDirectDate(currentRange.from),
        dateTo: formatDirectDate(currentRange.to),
        campaignIds,
        includeConversions: true,
      }),
      getDirectStats(token, ds.login, {
        dateFrom: formatDirectDate(previousRange.from),
        dateTo: formatDirectDate(previousRange.to),
        campaignIds,
        includeConversions: true,
      }),
    ]);

    if (!currentResult.ok || !currentResult.data) {
      return { signals: [], channel: "ads", error: `Direct fetch failed: ${currentResult.error}` };
    }

    const signals = extractDirectSignals(
      currentResult.data,
      previousResult.data || currentResult.data,
      ds.alerts?.thresholds
    );
    return { signals, channel: "ads" };
  }

  return { signals: [], channel: "site", error: `Unknown project type: ${project.type}` };
}

/**
 * Collect signals from ALL user projects and build a cockpit.
 */
export async function collectUserCockpit(
  token: string,
  projects: ProjectRecord[]
): Promise<CollectResult> {
  const metrikaSignals: Signal[] = [];
  const directSignals: Signal[] = [];
  const errors: string[] = [];

  // Fetch all projects in parallel
  const results = await Promise.allSettled(
    projects.map((p) => collectProjectSignals(token, p))
  );

  for (const result of results) {
    if (result.status === "rejected") {
      errors.push(String(result.reason));
      continue;
    }
    const { signals, channel, error } = result.value;
    if (error) {
      errors.push(error);
      continue;
    }
    if (channel === "site") {
      metrikaSignals.push(...signals);
    } else {
      directSignals.push(...signals);
    }
  }

  const cockpit = buildCockpit(metrikaSignals, directSignals);

  return { metrikaSignals, directSignals, cockpit, errors };
}
