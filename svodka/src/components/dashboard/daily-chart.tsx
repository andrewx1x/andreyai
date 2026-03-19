"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface DailyChartProps {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  dataKey: string;
  color?: string;
  formatValue?: (value: number) => string;
  formatDate?: (date: string) => string;
  height?: number;
}

function defaultFormatDate(dateStr: string): string {
  if (!dateStr) return "";
  // "YYYY-MM-DD" or "2024-01-15" → "15 янв"
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10) - 1;
  return `${day} ${months[month] || ""}`;
}

function defaultFormatValue(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v * 100) / 100);
}

interface TooltipPayload {
  value?: number;
  payload?: Record<string, unknown>;
}

function CustomTooltip({
  active,
  payload,
  label,
  formatValue,
  formatDate,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  formatValue: (v: number) => string;
  formatDate: (d: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md">
      <p className="text-[12px] text-muted-foreground">{formatDate(label || "")}</p>
      <p className="text-[15px] font-bold tabular-nums">{formatValue(payload[0].value || 0)}</p>
    </div>
  );
}

export function DailyChart({
  title,
  data,
  dataKey,
  color = "#6366f1",
  formatValue = defaultFormatValue,
  formatDate = defaultFormatDate,
  height = 240,
}: DailyChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <Card>
      <CardContent className="px-5 py-6">
        <h3 className="mb-4 text-[14px] font-semibold text-muted-foreground">{title}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => defaultFormatValue(v)}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={
                <CustomTooltip formatValue={formatValue} formatDate={formatDate} />
              }
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${dataKey})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
