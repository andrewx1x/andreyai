import { redirect } from "next/navigation";
import { auth, getSessionUserId } from "@/lib/auth";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { getDecryptedToken } from "@/lib/db/queries/tokens";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { getScreenAccess } from "@/lib/subscription";
import { getStats as getMetrikaStats, formatDateForApi, getYesterday, getBaselineRange } from "@/lib/engine/metrika/api";
import { extractSignals as extractMetrikaSignals } from "@/lib/engine/metrika/signals";
import { getStats as getDirectStats, formatDateForApi as formatDirectDate, getDateRange } from "@/lib/engine/direct/api";
import { extractSignals as extractDirectSignals } from "@/lib/engine/direct/signals";
import { buildCockpit } from "@/lib/engine/insights";
import type { MetrikaSettings, DirectSettings, Signal } from "@/lib/engine/types";
import { OverviewContent } from "@/components/dashboard/overview-content";
import { PaywallOverlay } from "@/components/shared/paywall-overlay";

export default async function OverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session)!;

  const subscription = await getSubscription(userId);
  const access = getScreenAccess(
    subscription?.plan || null,
    subscription?.status || null,
    subscription?.trialEndsAt || null
  );

  // ── Access guard: don't load paid data without access ──
  if (!access.overview) {
    return (
      <div className="relative">
        <PaywallOverlay planName="Сводка.Всё" price="1 490" />
        <div className="space-y-10">
          <h1 className="text-[26px] font-bold tracking-tight">Обзор</h1>
          <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const projects = await getProjectsByUser(userId);
  const metrikaProject = projects.find((p) => p.type === "metrika");
  const directProject = projects.find((p) => p.type === "direct");
  const token = await getDecryptedToken(userId);

  let metrikaSignals: Signal[] = [];
  let directSignals: Signal[] = [];

  // ── Fetch Metrika data ──
  if (metrikaProject && token) {
    const settings = JSON.parse(metrikaProject.settingsJson) as MetrikaSettings;
    const yesterday = getYesterday();
    const baseline = getBaselineRange(yesterday);

    const [currentResult, prevResult] = await Promise.all([
      getMetrikaStats(token, {
        counterId: settings.counter_id,
        date1: formatDateForApi(yesterday),
        date2: formatDateForApi(yesterday),
        metrics: settings.metrics,
        goalIds: settings.goals.map((g) => g.id),
      }),
      getMetrikaStats(token, {
        counterId: settings.counter_id,
        date1: formatDateForApi(baseline.from),
        date2: formatDateForApi(baseline.to),
        metrics: settings.metrics,
        goalIds: settings.goals.map((g) => g.id),
      }),
    ]);

    if (currentResult.ok && currentResult.data && prevResult.data) {
      const current = currentResult.data;
      const prev = {
        ...prevResult.data,
        visits: Math.round(prevResult.data.visits / 7),
        users: Math.round(prevResult.data.users / 7),
      };

      const sources: { source: string; visits: number }[] = [];
      metrikaSignals = extractMetrikaSignals(current, prev, settings.alerts?.thresholds, sources);
    }
  }

  // ── Fetch Direct data ──
  if (directProject && token) {
    const settings = JSON.parse(directProject.settingsJson) as DirectSettings;
    const period = settings.compare_period || "day";
    const currentRange = getDateRange(period, 0);
    const previousRange = getDateRange(period, 1);
    const campaignIds = settings.campaigns === "all" ? undefined : settings.campaigns;

    const [currentResult, previousResult] = await Promise.all([
      getDirectStats(token, settings.login, {
        dateFrom: formatDirectDate(currentRange.from),
        dateTo: formatDirectDate(currentRange.to),
        campaignIds,
        includeConversions: true,
      }),
      getDirectStats(token, settings.login, {
        dateFrom: formatDirectDate(previousRange.from),
        dateTo: formatDirectDate(previousRange.to),
        campaignIds,
        includeConversions: true,
      }),
    ]);

    if (currentResult.ok && currentResult.data) {
      const current = currentResult.data;
      const prev = previousResult.data || current;

      directSignals = extractDirectSignals(current, prev, settings.alerts?.thresholds);
    }
  }

  // ── Build cockpit ──
  const cockpit = buildCockpit(metrikaSignals, directSignals);

  return (
    <div className="space-y-10">
      <h1 className="text-[26px] font-bold tracking-tight">Обзор</h1>
      <OverviewContent
        status={cockpit.status}
        problems={cockpit.problems}
        actions={cockpit.actions}
        insight={cockpit.insight}
      />
    </div>
  );
}
