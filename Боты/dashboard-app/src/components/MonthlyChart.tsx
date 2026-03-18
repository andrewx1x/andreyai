import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MonthlyStats } from '../hooks/useDashboardData';

interface Props {
  stats: MonthlyStats[];
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Янв',
  '02': 'Фев',
  '03': 'Мар',
  '04': 'Апр',
  '05': 'Май',
  '06': 'Июн',
  '07': 'Июл',
  '08': 'Авг',
  '09': 'Сен',
  '10': 'Окт',
  '11': 'Ноя',
  '12': 'Дек',
};

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return `${MONTH_NAMES[month] || month} ${year.slice(2)}`;
}

export default function MonthlyChart({ stats }: Props) {
  const costData = stats.map((s) => ({
    name: formatMonth(s.month),
    'Поиск': s.cost.search,
    'РСЯ': s.cost.rsya,
    'Карты': s.cost.maps,
  }));

  const convData = stats.map((s) => ({
    name: formatMonth(s.month),
    'Поиск': s.conversions.search,
    'РСЯ': s.conversions.rsya,
    'Карты': s.conversions.maps,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Cost Chart */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2">Расход по месяцам</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + '₽'} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Поиск" fill="#8B0000" />
            <Bar dataKey="РСЯ" fill="#4169E1" />
            <Bar dataKey="Карты" fill="#FF69B4" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversions Chart */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2">Конверсии по месяцам</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={convData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Поиск" fill="#8B0000" />
            <Bar dataKey="РСЯ" fill="#4169E1" />
            <Bar dataKey="Карты" fill="#FF69B4" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
