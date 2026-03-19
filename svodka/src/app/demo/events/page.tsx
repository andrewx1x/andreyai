import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, Calendar } from "lucide-react";

// ── Mock events grouped by date ──

interface DemoEvent {
  id: number;
  severity: "critical" | "warning" | "info";
  message: string;
  cause: string;
  change: string;
  time: string;
  channel: "site" | "ads";
}

const eventsByDate: { date: string; dateLabel: string; events: DemoEvent[] }[] = [
  {
    date: "2026-03-18",
    dateLabel: "18 марта, среда \u2014 сегодня",
    events: [
      { id: 1, severity: "critical", message: "CPA превысил порог 500₽", cause: "Конверсии на сайте снизились, расход стабилен", change: "+24.1%", time: "09:15", channel: "ads" },
      { id: 2, severity: "critical", message: "Отказы с мобильных выросли до 48%", cause: "Возможная проблема с загрузкой или формой на мобильных", change: "+37.1%", time: "09:15", channel: "site" },
      { id: 3, severity: "warning", message: "Среднее время на сайте снизилось до 1м 48с", cause: "Пользователи уходят быстрее, особенно с мобильных", change: "-25.0%", time: "09:15", channel: "site" },
    ],
  },
  {
    date: "2026-03-17",
    dateLabel: "17 марта, вторник",
    events: [
      { id: 4, severity: "warning", message: "Конверсии снизились на 12.4% (89 за день)", cause: "Рост отказов, снижение глубины просмотра", change: "-12.4%", time: "22:00", channel: "site" },
      { id: 5, severity: "warning", message: "CTR кампании \u00ABБренд-запросы\u00BB упал ниже 10%", cause: "Возможная активность конкурентов по брендовым запросам", change: "-29.2%", time: "18:30", channel: "ads" },
      { id: 6, severity: "warning", message: "Расход на рекламу вырос на 8.7%", cause: "Увеличение ставок по высокочастотным запросам", change: "+8.7%", time: "14:00", channel: "ads" },
    ],
  },
  {
    date: "2026-03-16",
    dateLabel: "16 марта, понедельник",
    events: [
      { id: 7, severity: "info", message: "Трафик на сайт вырос на 3.2%", cause: "Рост органического трафика из поиска", change: "+3.2%", time: "22:00", channel: "site" },
      { id: 8, severity: "info", message: "Кампания \u00ABРетаргетинг\u00BB показывает лучший CPA", cause: "CPA 387₽ \u2014 лучший результат среди активных кампаний", change: "-8.3%", time: "18:00", channel: "ads" },
      { id: 9, severity: "warning", message: "Bounce rate на странице /pricing вырос до 31.5%", cause: "Возможно, цены не соответствуют ожиданиям из рекламы", change: "+12.0%", time: "12:30", channel: "site" },
    ],
  },
  {
    date: "2026-03-15",
    dateLabel: "15 марта, воскресенье",
    events: [
      { id: 10, severity: "info", message: "Запущена новая кампания \u00ABВесна-2026\u00BB", cause: "Кампания на поиске и в РСЯ, бюджет 15 000₽/нед", change: "новая", time: "10:00", channel: "ads" },
      { id: 11, severity: "info", message: "Органический трафик стабилен \u2014 1 840 визитов", cause: "Позиции в поиске без значимых изменений", change: "+0.5%", time: "22:00", channel: "site" },
    ],
  },
  {
    date: "2026-03-14",
    dateLabel: "14 марта, суббота",
    events: [
      { id: 12, severity: "info", message: "CTR кампании \u00ABКаталог \u2014 РСЯ\u00BB стабилен: 1.2%", cause: "Показатели в норме для РСЯ", change: "+0.1%", time: "22:00", channel: "ads" },
      { id: 13, severity: "warning", message: "Страница /blog/seo-tips \u2014 отказы 52.3%", cause: "Контент может не соответствовать поисковому запросу", change: "+8.5%", time: "15:00", channel: "site" },
    ],
  },
  {
    date: "2026-03-13",
    dateLabel: "13 марта, пятница",
    events: [
      { id: 14, severity: "info", message: "Кампания \u00ABАкция выходного дня\u00BB поставлена на паузу", cause: "Бюджет на акцию исчерпан, кампания остановлена", change: "пауза", time: "17:00", channel: "ads" },
      { id: 15, severity: "info", message: "Визиты из соцсетей выросли до 980 за день", cause: "Публикация в VK получила хороший охват", change: "+34.2%", time: "14:00", channel: "site" },
      { id: 16, severity: "info", message: "Глубина просмотра стабильна \u2014 2.4 страницы", cause: "Пользователи просматривают каталог и цены", change: "0%", time: "22:00", channel: "site" },
    ],
  },
  {
    date: "2026-03-12",
    dateLabel: "12 марта, четверг",
    events: [
      { id: 17, severity: "info", message: "Расход на рекламу в пределах нормы \u2014 6 120₽", cause: "Дневной бюджет распределён равномерно", change: "-2.1%", time: "22:00", channel: "ads" },
      { id: 18, severity: "info", message: "Новых посетителей 68% от общего трафика", cause: "Рекламные кампании привлекают новую аудиторию", change: "+3.0%", time: "22:00", channel: "site" },
    ],
  },
];

const severityIcon = {
  critical: <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
  info: <Info className="h-4 w-4 shrink-0 text-blue-500" />,
};

const channelLabels = { site: "Сайт", ads: "Реклама" };

const changeBadgeClass = (change: string) => {
  if (change.startsWith("+") && !change.includes("0.")) return "text-rose-700 bg-rose-50 border-rose-200";
  if (change.startsWith("-")) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  return "text-muted-foreground bg-muted";
};

export default function DemoEventsPage() {
  const totalEvents = eventsByDate.reduce((sum, group) => sum + group.events.length, 0);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">Журнал событий</h1>
        <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="tabular-nums">{totalEvents} событий за 7 дней</span>
        </div>
      </div>

      {eventsByDate.map((group) => (
        <section key={group.date}>
          <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="inline-block h-1 w-4 rounded-full bg-gray-300" />
            {group.dateLabel}
          </h2>
          <Card>
            <CardContent className="divide-y p-0">
              {group.events.map((event) => (
                <div
                  key={event.id}
                  className="px-5 py-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{severityIcon[event.severity]}</div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{event.message}</span>
                        <Badge
                          variant="outline"
                          className={`shrink-0 tabular-nums text-[11px] ${changeBadgeClass(event.change)}`}
                        >
                          {event.change}
                        </Badge>
                      </div>
                      <p className="text-[13px] text-muted-foreground">{event.cause}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <Badge variant="outline" className="text-[11px]">
                        {channelLabels[event.channel]}
                      </Badge>
                      <span className="tabular-nums text-[13px] text-muted-foreground">
                        {event.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}
