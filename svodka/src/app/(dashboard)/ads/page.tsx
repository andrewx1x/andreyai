import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectsByType } from "@/lib/db/queries/projects";
import { getDecryptedToken } from "@/lib/db/queries/tokens";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { getScreenAccess } from "@/lib/subscription";
import { getStats, getCampaignStats, formatDateForApi, getDateRange } from "@/lib/engine/direct/api";
import { extractSignals, generateInsight } from "@/lib/engine/direct/signals";
import { formatNumber, formatMoney, formatPercent, calcChange } from "@/lib/engine/format";
import type { DirectSettings } from "@/lib/engine/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SignalBadge } from "@/components/dashboard/signal-badge";
import { InsightCard } from "@/components/dashboard/insight-card";
import { PaywallOverlay } from "@/components/shared/paywall-overlay";

export default async function AdsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session as any).userId as number;

  const subscription = await getSubscription(userId);
  const access = getScreenAccess(
    subscription?.plan || null,
    subscription?.status || null,
    subscription?.trialEndsAt || null
  );

  const projects = await getProjectsByType(userId, "direct");
  const project = projects[0];

  if (!project) {
    return (
      <div className="relative">
        {!access.ads && <PaywallOverlay planName="Сводка.Реклама" price="990" />}
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Реклама</h1>
          <p className="text-muted-foreground">
            Нет подключённых аккаунтов Директа. Добавьте в настройках.
          </p>
        </div>
      </div>
    );
  }

  const token = await getDecryptedToken(userId);
  if (!token) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Реклама</h1>
        <p className="text-destructive">Ошибка доступа к Яндексу. Попробуйте войти заново.</p>
      </div>
    );
  }

  const settings = JSON.parse(project.settingsJson) as DirectSettings;
  const period = settings.compare_period || "day";
  const currentRange = getDateRange(period, 0);
  const previousRange = getDateRange(period, 1);

  const campaignIds = settings.campaigns === "all" ? undefined : settings.campaigns;

  const [currentResult, previousResult, campaignResult] = await Promise.all([
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
  ]);

  if (!currentResult.ok || !currentResult.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Реклама</h1>
        <p className="text-destructive">Ошибка загрузки данных: {currentResult.error}</p>
      </div>
    );
  }

  const current = currentResult.data;
  const prev = previousResult.data || current;
  const campaigns = campaignResult.data || [];

  const signals = extractSignals(current, prev, settings.alerts?.thresholds, campaigns);
  const insight = generateInsight(current, prev, signals, campaigns);

  return (
    <div className="relative">
      {!access.ads && <PaywallOverlay planName="Сводка.Реклама" price="990" />}

      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-bold tracking-tight">Реклама</h1>
          <span className="text-[13px] text-muted-foreground">
            {settings.login} — текущий vs предыдущий период
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <KpiCard
            label="Расход"
            value={formatMoney(current.cost)}
            change={calcChange(current.cost, prev.cost)}
            invertColors
          />
          <KpiCard
            label="Клики"
            value={formatNumber(current.clicks)}
            change={calcChange(current.clicks, prev.clicks)}
          />
          <KpiCard
            label="Кликабельность"
            value={formatPercent(current.ctr)}
            change={calcChange(current.ctr, prev.ctr)}
          />
          <KpiCard
            label="Стоимость заявки"
            value={current.costPerConversion > 0 ? formatMoney(current.costPerConversion) : "—"}
            change={current.costPerConversion > 0 && prev.costPerConversion > 0
              ? calcChange(current.costPerConversion, prev.costPerConversion)
              : undefined}
            invertColors
          />
        </div>

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
