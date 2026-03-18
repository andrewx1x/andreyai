import { useState, useEffect } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import CampaignStats from './pages/CampaignStats';
import Summary from './pages/Summary';

type Page = 'campaigns' | 'summary';

function App() {
  const [page, setPage] = useState<Page>('campaigns');
  const { data, loading, error } = useDashboardData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="text-center">
          <p className="text-red-600 text-lg">Ошибка загрузки</p>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white p-4">
        <h1 className="text-lg font-bold">AdsRadar — Дашборд</h1>
        {data && (
          <p className="text-sm opacity-80">{data.period.label}</p>
        )}
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b flex">
        <button
          className={`tab-button flex-1 ${page === 'campaigns' ? 'active' : ''}`}
          onClick={() => setPage('campaigns')}
        >
          Статистика
        </button>
        <button
          className={`tab-button flex-1 ${page === 'summary' ? 'active' : ''}`}
          onClick={() => setPage('summary')}
        >
          Сводка
        </button>
      </nav>

      {/* Content */}
      <main className="p-4">
        {page === 'campaigns' && data && <CampaignStats data={data} />}
        {page === 'summary' && data && <Summary data={data} />}
      </main>
    </div>
  );
}

export default App;
