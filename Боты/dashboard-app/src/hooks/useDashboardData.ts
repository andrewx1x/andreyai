import { useState, useEffect } from 'react';

export interface DashboardData {
  period: {
    from: string;
    to: string;
    label: string;
  };
  budgets: {
    search: { daily?: number; weekly?: number };
    rsya: { daily?: number; weekly?: number };
    maps: { daily?: number; weekly?: number };
  };
  channels: {
    search: ChannelStats;
    rsya: ChannelStats;
    maps: ChannelStats;
  };
  details: {
    search: DetailRow[];
    rsya: DetailRow[];
    maps: DetailRow[];
  };
  comparison: {
    previous_period: { from: string; to: string };
    cost_change: number;
    conversions_change: number;
    cpa_change: number;
  };
  monthly_stats: MonthlyStats[];
  expert_analysis: {
    summary: string;
    best_channel: string;
    warnings: string[];
  };
}

export interface ChannelStats {
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  avgCpc: number;
  conversions: number;
  cpa: number;
}

export interface DetailRow {
  keyword: string;
  group: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: {
    phone_click: number;
    forms: number;
    messenger: number;
  };
}

export interface MonthlyStats {
  month: string;
  cost: { search: number; rsya: number; maps: number };
  conversions: { search: number; rsya: number; maps: number };
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get token from URL params
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
          // Use demo data if no token
          setData(getDemoData());
          setLoading(false);
          return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/dashboard/data?token=${token}`);

        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        // Fallback to demo data on error
        setData(getDemoData());
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}

function getDemoData(): DashboardData {
  return {
    period: {
      from: '2026-01-01',
      to: '2026-01-31',
      label: 'Январь 2026',
    },
    budgets: {
      search: { daily: 4000 },
      rsya: { weekly: 15000 },
      maps: { weekly: 10000 },
    },
    channels: {
      search: {
        impressions: 19458,
        clicks: 1379,
        ctr: 7.09,
        cost: 123818.99,
        avgCpc: 89.79,
        conversions: 26,
        cpa: 4762.27,
      },
      rsya: {
        impressions: 232049,
        clicks: 1911,
        ctr: 0.82,
        cost: 7320.0,
        avgCpc: 3.83,
        conversions: 9,
        cpa: 813.33,
      },
      maps: {
        impressions: 42221,
        clicks: 56,
        ctr: 0.13,
        cost: 1220.0,
        avgCpc: 21.79,
        conversions: 2,
        cpa: 610.0,
      },
    },
    details: {
      search: [
        {
          keyword: 'Купить форму Юнармии',
          group: 'Общая',
          impressions: 1004,
          clicks: 136,
          ctr: 13.55,
          cost: 18173.16,
          conversions: { phone_click: 0, forms: 3, messenger: 0 },
        },
        {
          keyword: 'Форма Юнармии цена',
          group: 'Общая',
          impressions: 1927,
          clicks: 184,
          ctr: 9.55,
          cost: 17400.78,
          conversions: { phone_click: 0, forms: 6, messenger: 1 },
        },
        {
          keyword: 'Магазин Юнармия',
          group: 'Общая',
          impressions: 474,
          clicks: 74,
          ctr: 15.61,
          cost: 7569.57,
          conversions: { phone_click: 1, forms: 3, messenger: 0 },
        },
      ],
      rsya: [
        {
          keyword: 'Ретаргетинг',
          group: 'Ретаргетинг',
          impressions: 150000,
          clicks: 1200,
          ctr: 0.8,
          cost: 5000,
          conversions: { phone_click: 0, forms: 7, messenger: 0 },
        },
      ],
      maps: [
        {
          keyword: 'Карты основной',
          group: 'Карты',
          impressions: 42221,
          clicks: 56,
          ctr: 0.13,
          cost: 1220,
          conversions: { phone_click: 1, forms: 1, messenger: 0 },
        },
      ],
    },
    comparison: {
      previous_period: { from: '2025-12-01', to: '2025-12-31' },
      cost_change: -6666,
      conversions_change: -2,
      cpa_change: 12.52,
    },
    monthly_stats: [
      {
        month: '2025-09',
        cost: { search: 150000, rsya: 8000, maps: 1500 },
        conversions: { search: 35, rsya: 10, maps: 2 },
      },
      {
        month: '2025-10',
        cost: { search: 145000, rsya: 7500, maps: 1400 },
        conversions: { search: 38, rsya: 11, maps: 3 },
      },
      {
        month: '2025-11',
        cost: { search: 140000, rsya: 7200, maps: 1300 },
        conversions: { search: 40, rsya: 12, maps: 2 },
      },
      {
        month: '2025-12',
        cost: { search: 139025, rsya: 7000, maps: 1200 },
        conversions: { search: 39, rsya: 10, maps: 2 },
      },
      {
        month: '2026-01',
        cost: { search: 123819, rsya: 7320, maps: 1220 },
        conversions: { search: 26, rsya: 9, maps: 2 },
      },
    ],
    expert_analysis: {
      summary:
        'Январь vs Декабрь: расход 139 025 → 132 359₽ (-6 666₽), конверсии 39 → 37 (-2). Средняя цена цели стабильна: 3 577₽.',
      best_channel: 'maps',
      warnings: ['Бюджет близок к лимиту: Поиск 3 994₽/день при лимите 4 000₽'],
    },
  };
}
