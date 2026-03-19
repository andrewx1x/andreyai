"use client";

import { DailyChart } from "./daily-chart";
import { formatNumber, formatMoney } from "@/lib/engine/format";

interface DailyPoint {
  date: string;
  cost: number;
  clicks: number;
  impressions: number;
  ctr: number;
  conversions: number;
  costPerConversion: number;
}

interface AdsChartsProps {
  dailyData: DailyPoint[];
}

export function AdsCharts({ dailyData }: AdsChartsProps) {
  if (!dailyData || dailyData.length === 0) return null;

  return (
    <section className="space-y-6">
      <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
        <span className="inline-block h-1 w-4 rounded-full bg-emerald-400" />
        Динамика
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <DailyChart
          title="Расход"
          data={dailyData}
          dataKey="cost"
          color="#f59e0b"
          formatValue={(v) => formatMoney(v)}
        />
        <DailyChart
          title="Клики"
          data={dailyData}
          dataKey="clicks"
          color="#6366f1"
          formatValue={(v) => formatNumber(v)}
        />
      </div>
    </section>
  );
}
