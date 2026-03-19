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

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Реклама</h1>
          <p className="text-sm text-muted-foreground">
            {settings.login} — текущий vs предыдущий период
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
            label="CTR"
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
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Сигналы</h2>
            {signals.map((signal, i) => (
              <SignalBadge key={i} signal={signal} />
            ))}
          </div>
        )}

        {/* Insight */}
        <InsightCard insight={insight} />

        {/* Campaigns Table */}
        {campaigns.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Кампании (топ по расходу)
            </h2>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Кампания</th>
                    <th className="px-4 py-2.5 text-right font-medium">Расход</th>
                    <th className="px-4 py-2.5 text-right font-medium">Клики</th>
                    <th className="px-4 py-2.5 text-right font-medium">CTR</th>
                    <th className="px-4 py-2.5 text-right font-medium">Ст. заявки</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns
                    .sort((a, b) => b.cost - a.cost)
                    .slice(0, 10)
                    .map((c) => (
                      <tr key={c.campaignId} className="border-t">
                        <td className="max-w-[200px] truncate px-4 py-2.5">
                          {c.campaignName}
                        </td>
                        <td className="px-4 py-2.5 text-right">{formatMoney(c.cost)}</td>
                        <td className="px-4 py-2.5 text-right">{formatNumber(c.clicks)}</td>
                        <td className="px-4 py-2.5 text-right">{formatPercent(c.ctr)}</td>
                        <td className="px-4 py-2.5 text-right">
                          {c.costPerConversion > 0 ? formatMoney(c.costPerConversion) : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
