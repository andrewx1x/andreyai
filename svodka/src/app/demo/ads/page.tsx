import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

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

const maxSpend = Math.max(...spendByDay.map((d) => d.spend));
const totalSpend = spendByDay.reduce((sum, d) => sum + d.spend, 0);

const campaigns = [
  {
    name: "Бренд-запросы",
    status: "active",
    spend: 8420,
    clicks: 1240,
    ctr: 8.5,
    cpa: 421,
    conversions: 20,
    trend: "down" as const,
  },
  {
    name: "Каталог — РСЯ",
    status: "active",
    spend: 12350,
    clicks: 3420,
    ctr: 1.2,
    cpa: 544,
    conversions: 23,
    trend: "stable" as const,
  },
  {
    name: "Ретаргетинг",
    status: "active",
    spend: 6780,
    clicks: 890,
    ctr: 3.4,
    cpa: 387,
    conversions: 18,
    trend: "up" as const,
  },
  {
    name: "Весна-2026",
    status: "active",
    spend: 9850,
    clicks: 2180,
    ctr: 2.1,
    cpa: 563,
    conversions: 17,
    trend: "down" as const,
  },
  {
    name: "Акция выходного дня",
    status: "paused",
    spend: 7830,
    clicks: 1560,
    ctr: 2.8,
    cpa: 475,
    conversions: 11,
    trend: "stable" as const,
  },
];

const budgetUsed = 45230;
const budgetTotal = 60000;
const budgetPercent = Math.round((budgetUsed / budgetTotal) * 100);

export default function DemoAdsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Реклама</h1>
        <p className="text-sm text-muted-foreground">Данные Яндекс Директ</p>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Расход за неделю</div>
            <div className="mt-1 text-2xl font-bold">45 230 &#8381;</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
              <TrendingUp className="h-3 w-3" /> +8.7%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Клики</div>
            <div className="mt-1 text-2xl font-bold">9 290</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" /> +5.4%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">CPA</div>
            <div className="mt-1 text-2xl font-bold">508 &#8381;</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
              <TrendingUp className="h-3 w-3" /> +24.1%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Конверсии</div>
            <div className="mt-1 text-2xl font-bold">89</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
              <TrendingDown className="h-3 w-3" /> -12.4%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Spend chart ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Расход по дням</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2" style={{ height: 180 }}>
            {spendByDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {(d.spend / 1000).toFixed(1)}к
                </span>
                <div
                  className="w-full rounded-t bg-amber-500/80"
                  style={{ height: `${(d.spend / maxSpend) * 140}px` }}
                />
                <span className="text-xs text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Budget utilization ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Использование бюджета</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold">{budgetPercent}%</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {budgetUsed.toLocaleString("ru-RU")} &#8381; из {budgetTotal.toLocaleString("ru-RU")} &#8381;
              </p>
            </div>
            <div className="h-3 rounded-full bg-muted">
              <div
                className="h-3 rounded-full bg-amber-500"
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              При текущем темпе бюджет закончится через 2 дня до конца периода
            </p>
          </CardContent>
        </Card>

        {/* ── CPA trend ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Тренд CPA</CardTitle>
              <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                Рост
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { period: "Сегодня", value: 508 },
              { period: "Вчера", value: 487 },
              { period: "3 дня назад", value: 445 },
              { period: "Неделю назад", value: 409 },
              { period: "2 недели назад", value: 395 },
            ].map((item) => (
              <div key={item.period} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.period}</span>
                <span className="font-medium">{item.value} &#8381;</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── CTR trend ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Тренд CTR</CardTitle>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                Снижение
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { period: "Сегодня", value: "2.1%" },
              { period: "Вчера", value: "2.3%" },
              { period: "3 дня назад", value: "2.5%" },
              { period: "Неделю назад", value: "2.8%" },
              { period: "2 недели назад", value: "3.0%" },
            ].map((item) => (
              <div key={item.period} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.period}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Campaign table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Кампании</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Кампания</th>
                  <th className="px-4 py-2.5 font-medium text-right">Расход</th>
                  <th className="px-4 py-2.5 font-medium text-right">Клики</th>
                  <th className="px-4 py-2.5 font-medium text-right">CTR</th>
                  <th className="px-4 py-2.5 font-medium text-right">Конверсии</th>
                  <th className="px-4 py-2.5 font-medium text-right">CPA</th>
                  <th className="px-4 py-2.5 font-medium text-center">Тренд</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaigns.map((c) => (
                  <tr key={c.name} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        {c.status === "paused" && (
                          <Badge variant="outline" className="text-xs">
                            Пауза
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {c.spend.toLocaleString("ru-RU")} &#8381;
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {c.clicks.toLocaleString("ru-RU")}
                    </td>
                    <td className="px-4 py-2.5 text-right">{c.ctr}%</td>
                    <td className="px-4 py-2.5 text-right">{c.conversions}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={
                          c.cpa > 500
                            ? "text-red-600"
                            : c.cpa > 450
                            ? "text-amber-600"
                            : "text-green-600"
                        }
                      >
                        {c.cpa} &#8381;
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {c.trend === "up" && (
                        <TrendingUp className="mx-auto h-4 w-4 text-green-600" />
                      )}
                      {c.trend === "down" && (
                        <TrendingDown className="mx-auto h-4 w-4 text-red-600" />
                      )}
                      {c.trend === "stable" && (
                        <span className="text-xs text-muted-foreground">&mdash;</span>
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
