import { redirect } from "next/navigation";
import { auth, getSessionUserId } from "@/lib/auth";
import { getProjectsByType } from "@/lib/db/queries/projects";
import { getDecryptedToken } from "@/lib/db/queries/tokens";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { getScreenAccess } from "@/lib/subscription";
import { getStats, getCampaignStats, getDailyStats, formatDateForApi, getDateRange } from "@/lib/engine/direct/api";
import { extractSignals, generateInsight } from "@/lib/engine/direct/signals";
import { formatNumber, formatMoney, formatPercent, calcChange } from "@/lib/engine/format";
import type { DirectSettings } from "@/lib/engine/types";
import { DEFAULT_DIRECT_KPIS } from "@/lib/engine/types";
import { getVerdict } from "@/lib/engine/verdict";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { InsightCard } from "@/components/dashboard/insight-card";
import { PaywallOverlay } from "@/components/shared/paywall-overlay";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { AdsCharts } from "@/components/dashboard/ads-charts";

export default async function AdsPage() {
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
  if (!access.ads) {
    return (
      <div className="relative">
        <PaywallOverlay planName="Сводка.Реклама" price="990" />
        <div className="space-y-10">
          <h1 className="text-[26px] font-bold tracking-tight">Реклама</h1>
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

  const projects = await getProjectsByType(userId, "direct");
  const project = projects[0];

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-[26px] font-bold tracking-tight">Реклама</h1>
        <p className="text-muted-foreground">
          Нет подключённых аккаунтов Директа. Добавьте в настройках.
        </p>
      </div>
    );
  }

  const token = await getDecryptedToken(userId);
  if (!token) {
    return (
      <div className="space-y-6">
        <h1 className="text-[26px] font-bold tracking-tight">Реклама</h1>
        <p className="text-destructive">Ошибка доступа к Яндексу. Попробуйте войти заново.</p>
      </div>
    );
  }

  const settings = JSON.parse(project.settingsJson) as DirectSettings;
  const period = settings.compare_period || "day";
  const currentRange = getDateRange(period, 0);
  const previousRange = getDateRange(period, 1);

  // Visible KPIs
  const visibleKpis = settings.visible_kpis || DEFAULT_DIRECT_KPIS;

  const campaignIds = settings.campaigns === "all" ? undefined : settings.campaigns;

  // Date range for daily chart: last 14 days
  const dailyTo = new Date();
  dailyTo.setDate(dailyTo.getDate() - 1);
  const dailyFrom = new Date(dailyTo);
  dailyFrom.setDate(dailyFrom.getDate() - 13);

  const [currentResult, previousResult, campaignResult, dailyResult] = await Promise.all([
    getStats(token, settings.login, {
      dateFrom: formatDateForApi(currentRange.from),
      dateTo: formatDateForApi(currentRange.to),
      campaignIds,
      includeConversions: true,
    }),
    getStats(token, settings.login, {
      dateFrom: formatDateForApi(previousRange.from),
      dateTo: formatDateForApi(previousRange.to),
      campaignIds,
      includeConversions: true,
    }),
    getCampaignStats(token, settings.login, {
      dateFrom: formatDateForApi(currentRange.from),
      dateTo: formatDateForApi(currentRange.to),
      campaignIds,
      includeConversions: true,
    }),
    getDailyStats(token, settings.login, {
      dateFrom: formatDateForApi(dailyFrom),
      dateTo: formatDateForApi(dailyTo),
      campaignIds,
      includeConversions: true,
    }),
  ]);

  if (!currentResult.ok || !currentResult.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-[26px] font-bold tracking-tight">Реклама</h1>
        <p className="text-destructive">Ошибка загрузки данных: {currentResult.error}</p>
      </div>
    );
  }

  const current = currentResult.data;
  const prev = previousResult.data || current;
  const campaigns = campaignResult.data || [];
  const dailyData = dailyResult.data || [];

  const signals = extractSignals(current, prev, settings.alerts?.thresholds, campaigns);
  const insight = generateInsight(current, prev, signals, campaigns);

  // Build KPI cards dynamically
  const kpiMap: Record<string, { label: string; value: string; change?: number; invertColors?: boolean }> = {
    cost: { label: "Расход", value: formatMoney(current.cost), change: calcChange(current.cost, prev.cost), invertColors: true },
    clicks: { label: "Клики", value: formatNumber(current.clicks), change: calcChange(current.clicks, prev.clicks) },
    ctr: { label: "Кликабельность", value: formatPercent(current.ctr), change: calcChange(current.ctr, prev.ctr) },
    costPerConversion: {
      label: "Стоимость заявки",
      value: current.costPerConversion > 0 ? formatMoney(current.costPerConversion) : "—",
      change: current.costPerConversion > 0 && prev.costPerConversion > 0 ? calcChange(current.costPerConversion, prev.costPerConversion) : undefined,
      invertColors: true,
    },
    conversions: { label: "Конверсии", value: formatNumber(current.conversions || 0), change: calcChange(current.conversions || 0, prev.conversions || 0) },
    impressions: { label: "Показы", value: formatNumber(current.impressions || 0), change: calcChange(current.impressions || 0, prev.impressions || 0) },
  };

  const kpiCards = visibleKpis.filter((k) => kpiMap[k]).map((k) => {
    const kpi = kpiMap[k];
    return { key: k, ...kpi, verdict: kpi.change !== undefined ? getVerdict(kpi.change, !!kpi.invertColors) : undefined };
  });

  return (
    <div className="relative">
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight">Реклама</h1>
            <Badge variant="outline" className="text-[13px] font-medium">
              {settings.login}
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

        {/* KPI Cards — dynamic */}
        <div className={`grid grid-cols-2 gap-5 ${kpiCards.length <= 4 ? 'lg:grid-cols-4' : kpiCards.length <= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-3'}`}>
          {kpiCards.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              change={kpi.change}
              invertColors={kpi.invertColors}
              verdict={kpi.verdict}
            />
          ))}
        </div>

        {/* Daily Charts */}
        <AdsCharts dailyData={dailyData} />

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

        {/* Campaigns Table */}
        {campaigns.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="inline-block h-1 w-4 rounded-full bg-blue-400" />
              Кампании ({campaigns.length})
            </h2>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Кампания</th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Расход</th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Клики</th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">CTR</th>
                    <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Ст. заявки</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns
                    .sort((a, b) => b.cost - a.cost)
                    .slice(0, 10)
                    .map((c) => (
                      <tr key={c.campaignId} className="transition-colors hover:bg-muted/30">
                        <td className="max-w-[240px] truncate px-5 py-3.5 text-[14px] font-medium">
                          {c.campaignName}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-[14px] font-medium">{formatMoney(c.cost)}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-[14px]">{formatNumber(c.clicks)}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-[14px]">{formatPercent(c.ctr)}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-[14px]">
                          {c.costPerConversion > 0 ? formatMoney(c.costPerConversion) : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
