import { redirect } from "next/navigation";
import { auth, getSessionUserId } from "@/lib/auth";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { getDecryptedToken } from "@/lib/db/queries/tokens";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { getScreenAccess } from "@/lib/subscription";
import { getStats as getMetrikaStats, getTopTrafficSources, formatDateForApi, getYesterday, getBaselineRange } from "@/lib/engine/metrika/api";
import { extractSignals as extractMetrikaSignals } from "@/lib/engine/metrika/signals";
import { getStats as getDirectStats, getCampaignStats, formatDateForApi as formatDirectDate, getDateRange } from "@/lib/engine/direct/api";
import { extractSignals as extractDirectSignals } from "@/lib/engine/direct/signals";
import { buildCockpit } from "@/lib/engine/insights";
import { getEventsByUser } from "@/lib/db/queries/events";
import { formatNumber, formatMoney, formatPercent, calcChange } from "@/lib/engine/format";
import type { MetrikaSettings, DirectSettings, Signal } from "@/lib/engine/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProblemCard } from "@/components/dashboard/problem-card";
import { ActionCard } from "@/components/dashboard/action-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { PaywallOverlay } from "@/components/shared/paywall-overlay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
          <div className="flex items-center gap-4">
            <h1 className="text-[26px] font-bold tracking-tight">Обзор</h1>
          </div>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
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
  let metrikaKpis = { visits: 0, users: 0, bounceRate: 0, visitChange: 0, usersChange: 0 };
  let directKpis = { cost: 0, clicks: 0, ctr: 0, cpa: 0, costChange: 0 };

  // ── Fetch Metrika data ──
  if (metrikaProject && token) {
    const settings = JSON.parse(metrikaProject.settingsJson) as MetrikaSettings;
    const yesterday = getYesterday();
    const baseline = getBaselineRange(yesterday);

    const [currentResult, prevResult, sourcesResult] = await Promise.all([
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
      getTopTrafficSources(token, settings.counter_id, formatDateForApi(yesterday), formatDateForApi(yesterday)),
    ]);

    if (currentResult.ok && currentResult.data && prevResult.data) {
      const current = currentResult.data;
      const prev = {
        ...prevResult.data,
        visits: Math.round(prevResult.data.visits / 7),
        users: Math.round(prevResult.data.users / 7),
      };

      const sources = sourcesResult.data || [];
      metrikaSignals = extractMetrikaSignals(current, prev, settings.alerts?.thresholds, sources);
      metrikaKpis = {
        visits: current.visits,
        users: current.users,
        bounceRate: current.bounceRate,
        visitChange: calcChange(current.visits, prev.visits),
        usersChange: calcChange(current.users, prev.users),
      };
    }
  }

  // ── Fetch Direct data ──
  if (directProject && token) {
    const settings = JSON.parse(directProject.settingsJson) as DirectSettings;
    const period = settings.compare_period || "day";
    const currentRange = getDateRange(period, 0);
    const previousRange = getDateRange(period, 1);
    const campaignIds = settings.campaigns === "all" ? undefined : settings.campaigns;

    const [currentResult, previousResult, campaignResult] = await Promise.all([
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
      getCampaignStats(token, settings.login, {
        dateFrom: formatDirectDate(currentRange.from),
        dateTo: formatDirectDate(currentRange.to),
        campaignIds,
        includeConversions: true,
      }),
    ]);

    if (currentResult.ok && currentResult.data) {
      const current = currentResult.data;
      const prev = previousResult.data || current;
      const campaigns = campaignResult.data || [];

      directSignals = extractDirectSignals(current, prev, settings.alerts?.thresholds, campaigns);
      directKpis = {
        cost: current.cost,
        clicks: current.clicks,
        ctr: current.ctr,
        cpa: current.costPerConversion,
        costChange: calcChange(current.cost, prev.cost),
      };
    }
  }

  // ── Build cockpit ──
  const cockpit = buildCockpit(metrikaSignals, directSignals);

  // ── Recent events ──
  const recentEvents = await getEventsByUser(userId, 5);

  const statusConfig = {
    healthy: { label: "Всё в порядке", color: "bg-emerald-500" },
    attention: { label: "Требует внимания", color: "bg-amber-500" },
    critical: { label: "Есть проблемы", color: "bg-rose-500" },
  };

  const criticalCount = cockpit.signals.filter((s) => s.severity === "critical").length;
  const warningCount = cockpit.signals.filter((s) => s.severity === "warning").length;

  return (
    <div className="relative">
      <div className="space-y-10">
        {/* ── Status header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-[26px] font-bold tracking-tight">Обзор</h1>
            <div className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white",
              statusConfig[cockpit.status].color
            )}>
              {statusConfig[cockpit.status].label}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[13px]">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                {criticalCount} критич.
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                {warningCount} внимание
              </span>
            )}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
          <KpiCard
            label="Визиты"
            value={formatNumber(metrikaKpis.visits)}
            change={metrikaKpis.visitChange}
          />
          <KpiCard
            label="Посетители"
            value={formatNumber(metrikaKpis.users)}
            change={metrikaKpis.usersChange}
          />
          <KpiCard
            label="Отказы"
            value={formatPercent(metrikaKpis.bounceRate)}
            invertColors
          />
          <KpiCard
            label="Расход"
            value={directKpis.cost > 0 ? formatMoney(directKpis.cost) : "—"}
            change={directKpis.cost > 0 ? directKpis.costChange : undefined}
            invertColors
          />
          <KpiCard
            label="Стоимость заявки"
            value={directKpis.cpa > 0 ? formatMoney(directKpis.cpa) : "—"}
            invertColors
          />
        </div>

        {/* ── Problems: Что не так ── */}
        {cockpit.problems.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="inline-block h-1 w-4 rounded-full bg-rose-400" />
              Что не так
            </h2>
            <div className="space-y-3">
              {cockpit.problems.map((problem, i) => (
                <ProblemCard key={problem.id} problem={problem} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Actions: Что делать ── */}
        {cockpit.actions.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="inline-block h-1 w-4 rounded-full bg-indigo-400" />
              Что делать сегодня
            </h2>
            <div className="space-y-3">
              {cockpit.actions.map((action, i) => (
                <ActionCard key={action.id} action={action} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Insight ── */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="inline-block h-1 w-4 rounded-full bg-amber-400" />
            Инсайт
          </h2>
          <InsightCard insight={cockpit.insight} />
        </section>

        {/* ── Signals ── */}
        {cockpit.signals.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="inline-block h-1 w-4 rounded-full bg-blue-400" />
              Все сигналы ({cockpit.signals.length})
            </h2>
            <div className="space-y-2">
              {cockpit.signals.slice(0, 8).map((signal, i) => (
                <SignalBadge key={i} signal={signal} />
              ))}
            </div>
          </section>
        )}

        {/* ── Recent events ── */}
        {recentEvents.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="inline-block h-1 w-4 rounded-full bg-gray-400" />
                Последние события
              </h2>
              <Link href="/events" className="text-[13px] font-medium text-primary hover:underline">
                Все события &rarr;
              </Link>
            </div>
            <Card>
              <CardContent className="divide-y p-0">
                {recentEvents.map((event) => {
                  const severityIcon = {
                    critical: <AlertCircle className="h-4 w-4 text-rose-500" />,
                    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                    info: <Info className="h-4 w-4 text-blue-500" />,
                  };
                  return (
                    <div key={event.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30">
                      {severityIcon[event.severity]}
                      <span className="flex-1 truncate text-[14px]">{event.message}</span>
                      <Badge variant="outline" className="shrink-0 text-[11px]">
                        {event.project?.name || ""}
                      </Badge>
                      <span className="shrink-0 tabular-nums text-[13px] text-muted-foreground">
                        {new Date(event.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── No data state ── */}
        {cockpit.problems.length === 0 && cockpit.signals.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
                ✓
              </div>
              <h3 className="mt-5 text-[18px] font-semibold">Всё хорошо</h3>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                Значительных отклонений не обнаружено. Реклама и сайт работают стабильно.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
