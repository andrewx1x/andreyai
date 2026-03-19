"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

interface KpiCardProps {
  label: string;
  value: string;
  change?: number;
  suffix?: string;
  invertColors?: boolean;
  sparklineData?: number[];
  sparklineColor?: string;
}

export function KpiCard({
  label,
  value,
  change,
  suffix,
  invertColors,
  sparklineData,
  sparklineColor,
}: KpiCardProps) {
  const isPositive = invertColors ? (change ?? 0) < 0 : (change ?? 0) > 0;
  const isNegative = invertColors ? (change ?? 0) > 0 : (change ?? 0) < 0;

  const chartData = sparklineData?.map((v, i) => ({ v, i }));
  const color = sparklineColor || (isNegative ? "#e11d48" : isPositive ? "#059669" : "#6366f1");

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="relative px-5 py-4">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>

        <div className="mt-2 flex items-end justify-between">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="tabular-nums text-[28px] font-bold leading-none tracking-tight">
                {value}{suffix && <span className="text-[15px] font-normal text-muted-foreground">{suffix}</span>}
              </span>
            </div>

            {change !== undefined && change !== 0 && (
              <div
                className={cn(
                  "mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold",
                  isPositive && "bg-emerald-50 text-emerald-700",
                  isNegative && "bg-rose-50 text-rose-700",
                  !isPositive && !isNegative && "bg-muted text-muted-foreground"
                )}
              >
                {change > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : change < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                {change > 0 ? "+" : ""}
                {change.toFixed(1)}%
              </div>
            )}
          </div>

          {/* Sparkline */}
          {chartData && chartData.length > 0 && (
            <div className="h-10 w-20 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#spark-${label})`}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
