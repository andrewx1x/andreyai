import { ChannelStats } from '../hooks/useDashboardData';

interface Props {
  channels: {
    search: ChannelStats;
    rsya: ChannelStats;
    maps: ChannelStats;
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU');
}

function formatMoney(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '₽';
}

export default function ComparisonTable({ channels }: Props) {
  const rows = [
    { label: 'Показы', values: [channels.search.impressions, channels.rsya.impressions, channels.maps.impressions], format: formatNumber },
    { label: 'Клики', values: [channels.search.clicks, channels.rsya.clicks, channels.maps.clicks], format: formatNumber },
    { label: 'CTR', values: [channels.search.ctr, channels.rsya.ctr, channels.maps.ctr], format: (n: number) => n.toFixed(2) + '%' },
    { label: 'Расход', values: [channels.search.cost, channels.rsya.cost, channels.maps.cost], format: formatMoney },
    { label: 'Ср. цена клика', values: [channels.search.avgCpc, channels.rsya.avgCpc, channels.maps.avgCpc], format: formatMoney },
    { label: 'Конверсии', values: [channels.search.conversions, channels.rsya.conversions, channels.maps.conversions], format: formatNumber },
    { label: 'Цена цели', values: [channels.search.cpa, channels.rsya.cpa, channels.maps.cpa], format: formatMoney },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Показатель</th>
            <th className="text-right">Поиск</th>
            <th className="text-right">РСЯ</th>
            <th className="text-right">Карты</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="font-medium">{row.label}</td>
              <td className="text-right">{row.format(row.values[0])}</td>
              <td className="text-right">{row.format(row.values[1])}</td>
              <td className="text-right">{row.format(row.values[2])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
