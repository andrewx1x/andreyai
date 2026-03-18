import { DetailRow } from '../hooks/useDashboardData';

interface Props {
  rows: DetailRow[];
  channel: 'search' | 'rsya' | 'maps';
}

function formatMoney(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '₽';
}

export default function DataTable({ rows, channel }: Props) {
  if (rows.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Нет данных для отображения
      </div>
    );
  }

  const isSearch = channel === 'search' || channel === 'rsya';

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Условие показа</th>
          <th>Группа</th>
          <th className="text-right">Показы</th>
          <th className="text-right">Клики</th>
          <th className="text-right">CTR</th>
          <th className="text-right">Расход</th>
          {isSearch ? (
            <>
              <th className="text-right">Клик по номеру</th>
              <th className="text-right">Все формы</th>
              <th className="text-right">Мессенджер</th>
            </>
          ) : (
            <>
              <th className="text-right">Номер (Карты)</th>
              <th className="text-right">Мессенджер (Карты)</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td className="max-w-[200px] truncate" title={row.keyword}>
              {row.keyword}
            </td>
            <td>{row.group}</td>
            <td className="text-right">{row.impressions.toLocaleString('ru-RU')}</td>
            <td className="text-right">{row.clicks.toLocaleString('ru-RU')}</td>
            <td className="text-right">{row.ctr.toFixed(2)}%</td>
            <td className="text-right">{formatMoney(row.cost)}</td>
            {isSearch ? (
              <>
                <td className="text-right">{row.conversions.phone_click}</td>
                <td className="text-right">{row.conversions.forms}</td>
                <td className="text-right">{row.conversions.messenger}</td>
              </>
            ) : (
              <>
                <td className="text-right">{row.conversions.phone_click}</td>
                <td className="text-right">{row.conversions.messenger}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
