"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from "recharts";

// ── Mock data ──

const trafficByDay = [
  { day: "Пн", visits: 1640, label: "12 мар" },
  { day: "Вт", visits: 1890, label: "13 мар" },
  { day: "Ср", visits: 2010, label: "14 мар" },
  { day: "Чт", visits: 1750, label: "15 мар" },
  { day: "Пт", visits: 1920, label: "16 мар" },
  { day: "Сб", visits: 1580, label: "17 мар" },
  { day: "Вс", visits: 1320, label: "18 мар" },
];

const trafficSources = [
  { name: "Поиск (органика)", visits: 5420, percent: 42.2, color: "#6366f1" },
  { name: "Реклама (Директ)", visits: 3850, percent: 30.0, color: "#f59e0b" },
  { name: "Прямые заходы", visits: 1920, percent: 14.9, color: "#10b981" },
  { name: "Соцсети", visits: 980, percent: 7.6, color: "#8b5cf6" },
  { name: "Рассылки", visits: 450, percent: 3.5, color: "#ec4899" },
  { name: "Другие", visits: 227, percent: 1.8, color: "#94a3b8" },
];

const topPages = [
  { url: "/", title: "Главная", visits: 4230, bounce: 28.1 },
  { url: "/catalog", title: "Каталог", visits: 2850, bounce: 22.4 },
  { url: "/product/premium-plan", title: "Премиум тариф", visits: 1640, bounce: 18.7 },
  { url: "/pricing", title: "Цены", visits: 1280, bounce: 31.5 },
  { url: "/about", title: "О компании", visits: 890, bounce: 45.2 },
  { url: "/blog/seo-tips", title: "Блог: SEO советы", visits: 720, bounce: 52.3 },
  { url: "/contact", title: "Контакты", visits: 540, bounce: 38.9 },
];

const bounceByDay = [
  { day: "Пн", rate: 31.2 },
  { day: "Вт", rate: 29.8 },
  { day: "Ср", rate: 30.5 },
  { day: "Чт", rate: 32.1 },
  { day: "Пт", rate: 33.4 },
  { day: "Сб", rate: 36.8 },
  { day: "Вс", rate: 34.2 },
];

const visitsSparkline = [1640, 1890, 2010, 1750, 1920, 1580, 1320];
const visitorsSparkline = [1180, 1360, 1450, 1260, 1380, 1140, 950];
const depthSparkline = [2.3, 2.4, 2.5, 2.4, 2.4, 2.3, 2.4];
const timeSparkline = [2.4, 2.3, 2.1, 2.0, 1.9, 1.8, 1.8];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-[13px] shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="tabular-nums text-muted-foreground">{payload[0].value.toLocaleString("ru-RU")}</p>
    </div>
  );
}

function BounceTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-[13px] shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="tabular-nums text-muted-foreground">{payload[0].value}%</p>
    </div>
  );
}

export default function DemoSitePage() {
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">Сайт</h1>
        <Badge variant="outline" className="text-[13px] font-medium">
          Яндекс Метрика
        </Badge>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <KpiCard
          label="Визиты за неделю"
          value="12 847"
          change={3.2}
          sparklineData={visitsSparkline}
        />
        <KpiCard
          label="Посетители"
          value="9 214"
          change={1.8}
          sparklineData={visitorsSparkline}
        />
        <KpiCard
          label="Глубина просмотра"
          value="2.4"
          suffix=" стр."
          change={0}
          sparklineData={depthSparkline}
          sparklineColor="#6366f1"
        />
        <KpiCard
          label="Ср. время на сайте"
          value="1м 48с"
          change={-25.0}
          invertColors
          sparklineData={timeSparkline}
        />
      </div>

      {/* ── Traffic chart ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px]">Визиты за неделю</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficByDay} barCategoryGap="20%">
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
                  tickFormatter={(v: number) => (v / 1000).toFixed(1) + "к"}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="visits" radius={[6, 6, 0, 0]}>
                  {trafficByDay.map((_, index) => (
                    <Cell
                      key={index}
                      fill={index === trafficByDay.length - 1 ? "#818cf8" : "#6366f1"}
                      fillOpacity={index === trafficByDay.length - 1 ? 0.6 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Traffic sources ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Источники трафика</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trafficSources.map((src) => (
              <div key={src.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-[14px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: src.color }}
                    />
                    <span>{src.name}</span>
                  </div>
                  <span className="tabular-nums font-semibold">
                    {src.visits.toLocaleString("ru-RU")}
                    <span className="ml-1 font-normal text-muted-foreground">({src.percent}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${src.percent}%`, backgroundColor: src.color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Bounce rate trend ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[16px]">Отказы за неделю</CardTitle>
              <Badge variant="outline" className="bg-rose-50 text-[11px] text-rose-700 border-rose-200">
                Тренд: рост
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bounceByDay}>
                  <defs>
                    <linearGradient id="bounceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 13, fill: "#94a3b8" }}
                  />
                  <YAxis
                    domain={[25, 45]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={(v: number) => v + "%"}
                  />
                  <Tooltip content={<BounceTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="url(#bounceGrad)"
                    dot={{ r: 3, fill: "#f43f5e", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#f43f5e", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">
              Отказы на мобильных устройствах:{" "}
              <span className="font-semibold text-rose-600">48%</span>{" "}
              (десктоп: 22%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Top pages ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px]">Популярные страницы</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Страница
                  </th>
                  <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Визиты
                  </th>
                  <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Отказы
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topPages.map((page) => (
                  <tr key={page.url} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3.5">
                      <div className="text-[14px] font-medium">{page.title}</div>
                      <div className="text-[12px] text-muted-foreground">{page.url}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[14px] font-semibold">
                      {page.visits.toLocaleString("ru-RU")}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums ${
                          page.bounce > 40
                            ? "bg-rose-50 text-rose-700"
                            : page.bounce > 30
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {page.bounce}%
                      </span>
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
