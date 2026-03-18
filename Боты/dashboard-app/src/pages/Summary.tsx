import { DashboardData } from '../hooks/useDashboardData';
import ComparisonTable from '../components/ComparisonTable';
import ExpertAnalysis from '../components/ExpertAnalysis';
import MonthlyChart from '../components/MonthlyChart';

interface Props {
  data: DashboardData;
}

export default function Summary({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Period Header */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-bold text-gray-800">Сводная статистика</h2>
        <p className="text-sm text-gray-600">
          Период: {data.period.from} — {data.period.to} ({data.period.label})
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Ограничение бюджета: Поиск — {data.budgets.search.daily}₽/день | РСЯ — {data.budgets.rsya.weekly}₽/неделя | Карты — {data.budgets.maps.weekly}₽/неделя
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Сравнение каналов</h3>
        <ComparisonTable channels={data.channels} />
      </div>

      {/* Expert Analysis */}
      <ExpertAnalysis analysis={data.expert_analysis} comparison={data.comparison} />

      {/* Monthly Charts */}
      {data.monthly_stats.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Динамика по месяцам</h3>
          <MonthlyChart stats={data.monthly_stats} />
        </div>
      )}
    </div>
  );
}
