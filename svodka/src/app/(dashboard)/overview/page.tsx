import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { getDecryptedToken } from "@/lib/db/queries/tokens";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { getScreenAccess } from "@/lib/subscription";
import { getStats as getMetrikaStats, getTopTrafficSources, formatDateForApi, getYesterday, getWeekAgo } from "@/lib/engine/metrika/api";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function OverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session as any).userId as number;

  const subscription = await getSubscription(userId);
  const access = getScreenAccess(
    subscription?.plan || null,
    subscription?.status || null,
    subscription?.trialEndsAt || null
  );

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
    const weekAgo = getWeekAgo(yesterday);

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
        date1: formatDateForApi(weekAgo),
        date2: formatDateForApi(yesterday),
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
    healthy: { label: "Всё в порядке", color: "bg-green-500", textColor: "text-green-700 dark:text-green-400" },
    attention: { label: "Требует внимания", color: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-400" },
    critical: { label: "Есть проблемы", color: "bg-red-500", textColor: "text-red-700 dark:text-red-400" },
  };

  return (
    <div className="relative">
      {!access.overview && <PaywallOverlay planName="Сводка.Всё" price="1 490" />}

      <div className="space-y-8">
        {/* ── Status header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Обзор</h1>
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white",
              statusConfig[cockpit.status].color
            )}>
              {statusConfig[cockpit.status].label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Состояние бизнеса за 30 секунд
          </p>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
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
            label="CPA"
            value={directKpis.cpa > 0 ? formatMoney(directKpis.cpa) : "—"}
            invertColors
          />
        </div>

        {/* ── Problems: Что не так ── */}
        {cockpit.problems.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Что делать сегодня
            </h2>
            <div className="space-y-2">
              {cockpit.actions.map((action, i) => (
                <ActionCard key={action.id} action={action} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Insight ── */}
        <InsightCard insight={cockpit.insight} />

        {/* ── Signals (collapsed) ── */}
        {cockpit.signals.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Последние события
              </h2>
              <Link href="/events" className="text-xs text-primary hover:underline">
                Все события
              </Link>
            </div>
            <Card>
              <CardContent className="divide-y p-0">
                {recentEvents.map((event) => {
                  const severityIcon = {
                    critical: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
                    warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
                    info: <Info className="h-3.5 w-3.5 text-blue-500" />,
                  };
                  return (
                    <div key={event.id} className="flex items-center gap-3 px-4 py-3">
                      {severityIcon[event.severity]}
                      <span className="flex-1 truncate text-sm">{event.message}</span>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {event.project?.name || ""}
                      </Badge>
                      <span className="shrink-0 text-xs text-muted-foreground">
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
            <CardContent className="py-12 text-center">
              <div className="text-4xl">✓</div>
              <h3 className="mt-4 text-lg font-semibold">Всё хорошо</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Значительных отклонений не обнаружено. Реклама и сайт работают стабильно.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
