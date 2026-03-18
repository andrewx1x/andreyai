import { ChannelStats } from '../hooks/useDashboardData';

interface Props {
  stats: ChannelStats;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString('ru-RU');
}

function formatMoney(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '₽';
}

function formatPercent(n: number): string {
  return n.toFixed(2) + '%';
}

export default function KpiCards({ stats }: Props) {
  const kpis = [
    { value: formatNumber(stats.impressions), label: 'Показы' },
    { value: formatNumber(stats.clicks), label: 'Клики' },
    { value: formatPercent(stats.ctr), label: 'CTR' },
    { value: formatMoney(stats.cost), label: 'Расход' },
    { value: formatMoney(stats.avgCpc), label: 'Ср. цена клика' },
    { value: stats.conversions.toString(), label: 'Конверсии' },
    { value: formatMoney(stats.cpa), label: 'Цена цели' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {kpis.map((kpi, index) => (
        <div key={index} className="kpi-card">
          <div className="kpi-value text-base sm:text-lg">{kpi.value}</div>
          <div className="kpi-label">{kpi.label}</div>
        </div>
      ))}
    </div>
  );
}
