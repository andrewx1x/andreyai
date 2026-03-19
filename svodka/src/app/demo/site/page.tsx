import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

const maxVisits = Math.max(...trafficByDay.map((d) => d.visits));

const trafficSources = [
  { name: "Поиск (органика)", visits: 5420, percent: 42.2, color: "bg-blue-500" },
  { name: "Реклама (Директ)", visits: 3850, percent: 30.0, color: "bg-amber-500" },
  { name: "Прямые заходы", visits: 1920, percent: 14.9, color: "bg-green-500" },
  { name: "Соцсети", visits: 980, percent: 7.6, color: "bg-purple-500" },
  { name: "Рассылки", visits: 450, percent: 3.5, color: "bg-pink-500" },
  { name: "Другие", visits: 227, percent: 1.8, color: "bg-gray-400" },
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

const maxBounce = 50;

export default function DemoSitePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сайт</h1>
        <p className="text-sm text-muted-foreground">Данные Яндекс Метрики</p>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Визиты за неделю</div>
            <div className="mt-1 text-2xl font-bold">12 847</div>
            <div className="mt-0.5 text-xs text-green-600">+3.2% к прошлой</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Посетители</div>
            <div className="mt-1 text-2xl font-bold">9 214</div>
            <div className="mt-0.5 text-xs text-green-600">+1.8% к прошлой</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Глубина просмотра</div>
            <div className="mt-1 text-2xl font-bold">2.4 стр.</div>
            <div className="mt-0.5 text-xs text-muted-foreground">без изменений</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Ср. время на сайте</div>
            <div className="mt-1 text-2xl font-bold">1м 48с</div>
            <div className="mt-0.5 text-xs text-red-600">-25% к прошлой</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Traffic chart ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Визиты за неделю</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2" style={{ height: 180 }}>
            {trafficByDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {d.visits.toLocaleString("ru-RU")}
                </span>
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${(d.visits / maxVisits) * 140}px` }}
                />
                <span className="text-xs text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Traffic sources ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Источники трафика</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trafficSources.map((src) => (
              <div key={src.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{src.name}</span>
                  <span className="font-medium">
                    {src.visits.toLocaleString("ru-RU")} ({src.percent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${src.color}`}
                    style={{ width: `${src.percent}%` }}
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
              <CardTitle className="text-base">Отказы за неделю</CardTitle>
              <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                Тренд: рост
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2" style={{ height: 180 }}>
              {bounceByDay.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {d.rate}%
                  </span>
                  <div
                    className="w-full rounded-t bg-red-400/70"
                    style={{ height: `${(d.rate / maxBounce) * 140}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Отказы на мобильных устройствах: <span className="font-medium text-red-600">48%</span> (десктоп: 22%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Top pages ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Популярные страницы</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Страница</th>
                  <th className="px-4 py-2.5 font-medium text-right">Визиты</th>
                  <th className="px-4 py-2.5 font-medium text-right">Отказы</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topPages.map((page) => (
                  <tr key={page.url} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{page.title}</div>
                      <div className="text-xs text-muted-foreground">{page.url}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {page.visits.toLocaleString("ru-RU")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={
                          page.bounce > 40
                            ? "text-red-600"
                            : page.bounce > 30
                            ? "text-amber-600"
                            : "text-green-600"
                        }
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
