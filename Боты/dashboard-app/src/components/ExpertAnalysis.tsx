interface Props {
  analysis: {
    summary: string;
    best_channel: string;
    warnings: string[];
  };
  comparison: {
    cost_change: number;
    conversions_change: number;
    cpa_change: number;
  };
}

const CHANNEL_NAMES: Record<string, string> = {
  search: 'Поиск',
  rsya: 'РСЯ',
  maps: 'Карты',
};

export default function ExpertAnalysis({ analysis, comparison }: Props) {
  const costDir = comparison.cost_change > 0 ? '↑' : '↓';
  const convDir = comparison.conversions_change > 0 ? '↑' : '↓';

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg shadow">
      <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
        <span>💡</span> Экспертный анализ
      </h3>

      <div className="space-y-3 text-sm">
        {/* Summary */}
        <p className="text-gray-700">{analysis.summary}</p>

        {/* Changes */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className={`px-2 py-1 rounded ${comparison.cost_change > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            Расход: {costDir} {Math.abs(comparison.cost_change).toLocaleString('ru-RU')}₽
          </div>
          <div className={`px-2 py-1 rounded ${comparison.conversions_change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Конверсии: {convDir} {Math.abs(comparison.conversions_change)}
          </div>
        </div>

        {/* Best Channel */}
        <p className="text-gray-700">
          <span className="font-medium">Лучший канал по CPA:</span>{' '}
          <span className="text-green-600 font-medium">{CHANNEL_NAMES[analysis.best_channel] || analysis.best_channel}</span>
        </p>

        {/* Warnings */}
        {analysis.warnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {analysis.warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-2 text-amber-700 bg-amber-100 p-2 rounded">
                <span>⚠️</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
