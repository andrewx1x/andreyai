import { redirect } from "next/navigation";
import { auth, getSessionUserId } from "@/lib/auth";
import { getProjectsByType } from "@/lib/db/queries/projects";
import { getDecryptedToken } from "@/lib/db/queries/tokens";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { getScreenAccess } from "@/lib/subscription";
import { getStats, getTopTrafficSources, getDailyStats, formatDateForApi, getYesterday, getBaselineRange } from "@/lib/engine/metrika/api";
import { extractSignals, generateInsight } from "@/lib/engine/metrika/signals";
import { formatNumber, formatPercent, formatDuration, calcChange } from "@/lib/engine/format";
import type { MetrikaSettings } from "@/lib/engine/types";
import { DEFAULT_METRIKA_KPIS } from "@/lib/engine/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { InsightCard } from "@/components/dashboard/insight-card";
import { PaywallOverlay } from "@/components/shared/paywall-overlay";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { SiteCharts } from "@/components/dashboard/site-charts";

export default async function SitePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session)!;

  // Check access
  const subscription = await getSubscription(userId);
  const access = getScreenAccess(
    subscription?.plan || null,
    subscription?.status || null,
    subscription?.trialEndsAt || null
  );

  // ── Access guard: don't load paid data without access ──
  if (!access.site) {
    return (
      <div className="relative">
        <PaywallOverlay planName="Сводка.Сайт" price="990" />
        <div className="space-y-10">
          <h1 className="text-[26px] font-bold tracking-tight">Сайт</h1>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      </div>
    );
  }

  const projects = await getProjectsByType(userId, "metrika");
  const project = projects[0]; // Use first metrika project

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-[26px] font-bold tracking-tight">Сайт</h1>
        <p className="text-muted-foreground">
          Нет подключённых счётчиков Метрики. Добавьте в настройках.
        </p>
      </div>
    );
  }

  const token = await getDecryptedToken(userId);
  if (!token) {
    return (
      <div className="space-y-6">
        <h1 className="text-[26px] font-bold tracking-tight">Сайт</h1>
        <p className="text-destructive">Ошибка доступа к Яндексу. Попробуйте войти заново.</p>
      </div>
    );
  }

  const settings = JSON.parse(project.settingsJson) as MetrikaSettings;
  const yesterday = getYesterday();
  const baseline = getBaselineRange(yesterday);

  // Visible KPIs
  const visibleKpis = settings.visible_kpis || DEFAULT_METRIKA_KPIS;

  // Fetch current and previous data
  // Date range for daily chart: last 14 days
  const twoWeeksAgo = new Date(yesterday);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);

  const [currentResult, previousResult, sourcesResult, dailyResult] = await Promise.all([
    getStats(token, {
      counterId: settings.counter_id,
      date1: formatDateForApi(yesterday),
      date2: formatDateForApi(yesterday),
      metrics: settings.metrics,
      goalIds: settings.goals.map((g) => g.id),
    }),
    getStats(token, {
      counterId: settings.counter_id,
      date1: formatDateForApi(baseline.from),
      date2: formatDateForApi(baseline.to),
      metrics: settings.metrics,
      goalIds: settings.goals.map((g) => g.id),
    }),
    getTopTrafficSources(token, settings.counter_id, formatDateForApi(yesterday), formatDateForApi(yesterday)),
    getDailyStats(token, settings.counter_id, formatDateForApi(twoWeeksAgo), formatDateForApi(yesterday)),
  ]);

  if (!currentResult.ok || !currentResult.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-[26px] font-bold tracking-tight">Сайт</h1>
        <p className="text-destructive">Ошибка загрузки данных: {currentResult.error}</p>
      </div>
    );
  }

  const current = currentResult.data;
  // Normalize 7-day data to daily average
  const prev = previousResult.data
    ? {
        ...previousResult.data,
        visits: Math.round(previousResult.data.visits / 7),
        users: Math.round(previousResult.data.users / 7),
        pageviews: Math.round(previousResult.data.pageviews / 7),
      }
    : current;

  const sources = sourcesResult.data || [];
  const dailyData = dailyResult.data || [];
  const signals = extractSignals(current, prev, settings.alerts?.thresholds, sources);
  const insight = generateInsight(current, prev, signals);

  // Build KPI cards dynamically based on visible_kpis
  const kpiMap: Record<string, { label: string; value: string; change: number; invertColors?: boolean; suffix?: string }> = {
    visits: { label: "Визиты", value: formatNumber(current.visits), change: calcChange(current.visits, prev.visits) },
    users: { label: "Посетители", value: formatNumber(current.users), change: calcChange(current.users, prev.users) },
    bounceRate: { label: "Отказы", value: formatPercent(current.bounceRate), change: calcChange(current.bounceRate, prev.bounceRate), invertColors: true },
    pageDepth: { label: "Глубина просмотра", value: current.pageDepth.toFixed(1), suffix: " стр.", change: calcChange(current.pageDepth, prev.pageDepth) },
    avgSessionDuration: { label: "Время на сайте", value: formatDuration(current.avgVisitDuration || 0), change: calcChange(current.avgVisitDuration || 0, prev.avgVisitDuration || 0) },
    pageviews: { label: "Просмотры", value: formatNumber(current.pageviews), change: calcChange(current.pageviews, prev.pageviews) },
  };

  const kpiCards = visibleKpis.filter((k) => kpiMap[k]).map((k) => ({ key: k, ...kpiMap[k] }));

  return (
    <div className="relative">
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight">Сайт</h1>
            <Badge variant="outline" className="text-[13px] font-medium">
              {project.name}
            </Badge>
          </div>
          <Link
            href="/settings/metrics"
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Настроить показатели
          </Link>
        </div>

        {/* KPI Cards — dynamic based on user selection */}
        <div className={`grid grid-cols-2 gap-5 ${kpiCards.length <= 4 ? 'lg:grid-cols-4' : kpiCards.length <= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-3'}`}>
          {kpiCards.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              change={kpi.change}
              suffix={kpi.suffix}
              invertColors={kpi.invertColors}
            />
          ))}
        </div>

        {/* Daily Charts */}
        <SiteCharts dailyData={dailyData} />

        {/* Signals */}
        {signals.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="inline-block h-1 w-4 rounded-full bg-amber-400" />
              Сигналы
            </h2>
            <div className="space-y-2">
              {signals.map((signal, i) => (
                <SignalBadge key={i} signal={signal} />
              ))}
            </div>
          </section>
        )}

        {/* Insight */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="inline-block h-1 w-4 rounded-full bg-indigo-400" />
            Инсайт
          </h2>
          <InsightCard insight={insight} />
        </section>

        {/* Traffic Sources */}
        {sources.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="inline-block h-1 w-4 rounded-full bg-blue-400" />
              Источники трафика
            </h2>
            <div className="space-y-3">
              {sources.map((source, i) => {
                const total = sources.reduce((sum, s) => sum + s.visits, 0);
                const pct = total > 0 ? Math.round((source.visits / total) * 100) : 0;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[14px]">
                      <span>{source.source}</span>
                      <span className="tabular-nums font-semibold">
                        {formatNumber(source.visits)}
                        <span className="ml-1 font-normal text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
