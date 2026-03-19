"use client";

import { DailyChart } from "./daily-chart";
import { formatNumber, formatPercent, formatDuration } from "@/lib/engine/format";

interface DailyPoint {
  date: string;
  visits: number;
  users: number;
  bounceRate: number;
  pageDepth: number;
  avgVisitDuration: number;
  pageviews: number;
}

interface SiteChartsProps {
  dailyData: DailyPoint[];
}

export function SiteCharts({ dailyData }: SiteChartsProps) {
  if (!dailyData || dailyData.length === 0) return null;

  return (
    <section className="space-y-6">
      <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
        <span className="inline-block h-1 w-4 rounded-full bg-emerald-400" />
        Динамика
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <DailyChart
          title="Визиты"
          data={dailyData}
          dataKey="visits"
          color="#6366f1"
          formatValue={(v) => formatNumber(v)}
        />
        <DailyChart
          title="Отказы"
          data={dailyData}
          dataKey="bounceRate"
          color="#f43f5e"
          formatValue={(v) => formatPercent(v)}
        />
      </div>
    </section>
  );
}
