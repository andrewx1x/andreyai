import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectsByType } from "@/lib/db/queries/projects";
import { getDecryptedToken } from "@/lib/db/queries/tokens";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { getScreenAccess } from "@/lib/subscription";
import { getStats, getTopTrafficSources, formatDateForApi, getYesterday, getWeekAgo } from "@/lib/engine/metrika/api";
import { extractSignals, generateInsight } from "@/lib/engine/metrika/signals";
import { formatNumber, formatPercent, calcChange } from "@/lib/engine/format";
import type { MetrikaSettings } from "@/lib/engine/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { InsightCard } from "@/components/dashboard/insight-card";
import { PaywallOverlay } from "@/components/shared/paywall-overlay";

export default async function SitePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session as any).userId as number;

  // Check access
  const subscription = await getSubscription(userId);
  const access = getScreenAccess(
    subscription?.plan || null,
    subscription?.status || null,
    subscription?.trialEndsAt || null
  );

  const projects = await getProjectsByType(userId, "metrika");
  const project = projects[0]; // Use first metrika project

  if (!project) {
    return (
      <div className="relative">
        {!access.site && <PaywallOverlay planName="Сводка.Сайт" price="990" />}
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Сайт</h1>
          <p className="text-muted-foreground">
            Нет подключённых счётчиков Метрики. Добавьте в настройках.
          </p>
        </div>
      </div>
    );
  }

  const token = await getDecryptedToken(userId);
  if (!token) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Сайт</h1>
        <p className="text-destructive">Ошибка доступа к Яндексу. Попробуйте войти заново.</p>
      </div>
    );
  }

  const settings = JSON.parse(project.settingsJson) as MetrikaSettings;
  const yesterday = getYesterday();
  const weekAgo = getWeekAgo(yesterday);

  // Fetch current and previous data
  const [currentResult, previousResult, sourcesResult] = await Promise.all([
    getStats(token, {
      counterId: settings.counter_id,
      date1: formatDateForApi(yesterday),
      date2: formatDateForApi(yesterday),
      metrics: settings.metrics,
      goalIds: settings.goals.map((g) => g.id),
    }),
    getStats(token, {
      counterId: settings.counter_id,
      date1: formatDateForApi(weekAgo),
      date2: formatDateForApi(yesterday),
      metrics: settings.metrics,
      goalIds: settings.goals.map((g) => g.id),
    }),
    getTopTrafficSources(token, settings.counter_id, formatDateForApi(yesterday), formatDateForApi(yesterday)),
  ]);

  if (!currentResult.ok || !currentResult.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Сайт</h1>
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
  const signals = extractSignals(current, prev, settings.alerts?.thresholds, sources);
  const insight = generateInsight(current, prev, signals);

  return (
    <div className="relative">
      {!access.site && <PaywallOverlay planName="Сводка.Сайт" price="990" />}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Сайт</h1>
          <p className="text-sm text-muted-foreground">
            {project.name} — вчера vs среднее за 7 дней
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Визиты"
            value={formatNumber(current.visits)}
            change={calcChange(current.visits, prev.visits)}
          />
          <KpiCard
            label="Посетители"
            value={formatNumber(current.users)}
            change={calcChange(current.users, prev.users)}
          />
          <KpiCard
            label="Отказы"
            value={formatPercent(current.bounceRate)}
            change={calcChange(current.bounceRate, prev.bounceRate)}
            invertColors
          />
          <KpiCard
            label="Глубина"
            value={current.pageDepth.toFixed(1)}
            change={calcChange(current.pageDepth, prev.pageDepth)}
          />
        </div>

        {/* Signals */}
        {signals.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Сигналы</h2>
            {signals.map((signal, i) => (
              <SignalBadge key={i} signal={signal} />
            ))}
          </div>
        )}

        {/* Insight */}
        <InsightCard insight={insight} />

        {/* Traffic Sources */}
        {sources.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Источники трафика
            </h2>
            <div className="space-y-2">
              {sources.map((source, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">{source.source}</span>
                  <span className="font-medium">{formatNumber(source.visits)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
