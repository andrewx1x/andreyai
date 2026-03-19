"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";

// ── Mock data ──

const spendByDay = [
  { day: "Пн", spend: 6120, label: "12 мар" },
  { day: "Вт", spend: 6840, label: "13 мар" },
  { day: "Ср", spend: 7210, label: "14 мар" },
  { day: "Чт", spend: 6450, label: "15 мар" },
  { day: "Пт", spend: 6930, label: "16 мар" },
  { day: "Сб", spend: 5890, label: "17 мар" },
  { day: "Вс", spend: 5790, label: "18 мар" },
];

const cpaTrend = [
  { period: "2 нед. назад", value: 395 },
  { period: "Нед. назад", value: 409 },
  { period: "3 дня", value: 445 },
  { period: "Вчера", value: 487 },
  { period: "Сегодня", value: 508 },
];

const ctrTrend = [
  { period: "2 нед. назад", value: 3.0 },
  { period: "Нед. назад", value: 2.8 },
  { period: "3 дня", value: 2.5 },
  { period: "Вчера", value: 2.3 },
  { period: "Сегодня", value: 2.1 },
];

const campaigns = [
  { name: "Бренд-запросы", status: "active", spend: 8420, clicks: 1240, ctr: 8.5, cpa: 421, conversions: 20, trend: "down" as const },
  { name: "Каталог — РСЯ", status: "active", spend: 12350, clicks: 3420, ctr: 1.2, cpa: 544, conversions: 23, trend: "stable" as const },
  { name: "Ретаргетинг", status: "active", spend: 6780, clicks: 890, ctr: 3.4, cpa: 387, conversions: 18, trend: "up" as const },
  { name: "Весна-2026", status: "active", spend: 9850, clicks: 2180, ctr: 2.1, cpa: 563, conversions: 17, trend: "down" as const },
  { name: "Акция выходного дня", status: "paused", spend: 7830, clicks: 1560, ctr: 2.8, cpa: 475, conversions: 11, trend: "stable" as const },
];

const budgetUsed = 45230;
const budgetTotal = 60000;
const budgetPercent = Math.round((budgetUsed / budgetTotal) * 100);

const spendSparkline = [6120, 6840, 7210, 6450, 6930, 5890, 5790];
const clicksSparkline = [1250, 1380, 1410, 1280, 1370, 1210, 1190];
const cpaSparkline = [395, 409, 445, 456, 487, 498, 508];
const conversionsSparkline = [16, 15, 14, 13, 13, 11, 89 / 7];

function SpendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-[13px] shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="tabular-nums text-muted-foreground">{payload[0].value.toLocaleString("ru-RU")} ₽</p>
    </div>
  );
}

function CpaTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-[13px] shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="tabular-nums text-muted-foreground">{payload[0].value} ₽</p>
    </div>
  );
}

function CtrTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-[13px] shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="tabular-nums text-muted-foreground">{payload[0].value}%</p>
    </div>
  );
}

export default function DemoAdsPage() {
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">Реклама</h1>
        <Badge variant="outline" className="text-[13px] font-medium">
          Яндекс Директ
        </Badge>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <KpiCard
          label="Расход за неделю"
          value="45 230"
          suffix=" ₽"
          change={8.7}
          invertColors
          sparklineData={spendSparkline}
        />
        <KpiCard
          label="Клики"
          value="9 290"
          change={5.4}
          sparklineData={clicksSparkline}
        />
        <KpiCard
          label="Стоимость заявки"
          value="508"
          suffix=" ₽"
          change={24.1}
          invertColors
          sparklineData={cpaSparkline}
        />
        <KpiCard
          label="Конверсии"
          value="89"
          change={-12.4}
          sparklineData={conversionsSparkline}
        />
      </div>

      {/* ── Spend chart ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[16px]">Расход по дням</CardTitle>
            <span className="tabular-nums text-[14px] font-semibold text-muted-foreground">
              Итого: {budgetUsed.toLocaleString("ru-RU")} ₽
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendByDay} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: "#94a3b8" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(v: number) => (v / 1000).toFixed(0) + "к"}
                />
                <Tooltip content={<SpendTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
                  {spendByDay.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.spend > 7000 ? "#f59e0b" : "#fbbf24"}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Budget utilization ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Использование бюджета</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-center">
              <div className="tabular-nums text-[48px] font-bold leading-none tracking-tight text-amber-600">
                {budgetPercent}%
              </div>
              <p className="mt-2 tabular-nums text-[14px] text-muted-foreground">
                {budgetUsed.toLocaleString("ru-RU")} ₽ из {budgetTotal.toLocaleString("ru-RU")} ₽
              </p>
            </div>
            <div className="h-3 rounded-full bg-muted">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <p className="text-center text-[13px] text-muted-foreground">
              При текущем темпе бюджет закончится за 2 дня до конца периода
            </p>
          </CardContent>
        </Card>

        {/* ── CPA trend ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[16px]">Тренд стоимости заявки</CardTitle>
              <Badge variant="outline" className="bg-rose-50 text-[11px] text-rose-700 border-rose-200">
                Рост
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpaTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="period"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    domain={[350, 550]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <Tooltip content={<CpaTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#e11d48", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── CTR trend ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[16px]">Тренд кликабельности</CardTitle>
              <Badge variant="outline" className="bg-amber-50 text-[11px] text-amber-700 border-amber-200">
                Снижение
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ctrTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="period"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    domain={[1.5, 3.5]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v: number) => v + "%"}
                  />
                  <Tooltip content={<CtrTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Campaign table ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[16px]">Кампании</CardTitle>
            <span className="text-[13px] text-muted-foreground">{campaigns.length} кампаний</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Кампания
                  </th>
                  <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Расход
                  </th>
                  <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Клики
                  </th>
                  <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    CTR
                  </th>
                  <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Конв.
                  </th>
                  <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ст. заявки
                  </th>
                  <th className="px-5 py-3 text-center text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Тренд
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaigns.map((c) => (
                  <tr key={c.name} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            c.status === "active" ? "bg-emerald-500" : "bg-gray-300"
                          }`}
                        />
                        <span className="text-[14px] font-medium">{c.name}</span>
                        {c.status === "paused" && (
                          <Badge variant="outline" className="text-[11px]">
                            Пауза
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[14px] font-medium">
                      {c.spend.toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[14px]">
                      {c.clicks.toLocaleString("ru-RU")}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[14px]">{c.ctr}%</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[14px] font-medium">
                      {c.conversions}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums ${
                          c.cpa > 500
                            ? "bg-rose-50 text-rose-700"
                            : c.cpa > 450
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {c.cpa} ₽
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {c.trend === "up" && (
                        <div className="inline-flex items-center gap-1 text-emerald-600">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                      )}
                      {c.trend === "down" && (
                        <div className="inline-flex items-center gap-1 text-rose-600">
                          <TrendingDown className="h-4 w-4" />
                        </div>
                      )}
                      {c.trend === "stable" && (
                        <span className="text-[13px] text-muted-foreground">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
