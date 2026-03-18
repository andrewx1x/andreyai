import { useState } from 'react';
import { DashboardData, ChannelStats, DetailRow } from '../hooks/useDashboardData';
import KpiCards from '../components/KpiCards';
import DataTable from '../components/DataTable';

type Channel = 'search' | 'rsya' | 'maps';

const CHANNEL_NAMES: Record<Channel, string> = {
  search: 'Поиск',
  rsya: 'РСЯ',
  maps: 'Яндекс Карты',
};

interface Props {
  data: DashboardData;
}

export default function CampaignStats({ data }: Props) {
  const [channel, setChannel] = useState<Channel>('search');

  const stats = data.channels[channel];
  const details = data.details[channel];

  return (
    <div>
      {/* Channel Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(Object.keys(CHANNEL_NAMES) as Channel[]).map((ch) => (
          <button
            key={ch}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              channel === ch
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
            onClick={() => setChannel(ch)}
          >
            {CHANNEL_NAMES[ch]}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <KpiCards stats={stats} />

      {/* Data Table */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">
          Детализация по {CHANNEL_NAMES[channel]}
        </h3>
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <DataTable rows={details} channel={channel} />
        </div>
      </div>
    </div>
  );
}
