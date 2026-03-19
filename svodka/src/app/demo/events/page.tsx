import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

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
    dateLabel: "18 марта, среда — сегодня",
    events: [
      {
        id: 1,
        severity: "critical",
        message: "CPA превысил порог 500\u20BD",
        cause: "Конверсии на сайте снизились, расход стабилен",
        change: "+24.1%",
        time: "09:15",
        channel: "ads",
      },
      {
        id: 2,
        severity: "critical",
        message: "Отказы с мобильных выросли до 48%",
        cause: "Возможная проблема с загрузкой или формой на мобильных",
        change: "+37.1%",
        time: "09:15",
        channel: "site",
      },
      {
        id: 3,
        severity: "warning",
        message: "Среднее время на сайте снизилось до 1м 48с",
        cause: "Пользователи уходят быстрее, особенно с мобильных",
        change: "-25.0%",
        time: "09:15",
        channel: "site",
      },
    ],
  },
  {
    date: "2026-03-17",
    dateLabel: "17 марта, вторник",
    events: [
      {
        id: 4,
        severity: "warning",
        message: "Конверсии снизились на 12.4% (89 за день)",
        cause: "Рост отказов, снижение глубины просмотра",
        change: "-12.4%",
        time: "22:00",
        channel: "site",
      },
      {
        id: 5,
        severity: "warning",
        message: "CTR кампании 'Бренд-запросы' упал ниже 10%",
        cause: "Возможная активность конкурентов по брендовым запросам",
        change: "-29.2%",
        time: "18:30",
        channel: "ads",
      },
      {
        id: 6,
        severity: "warning",
        message: "Расход на рекламу вырос на 8.7%",
        cause: "Увеличение ставок по высокочастотным запросам",
        change: "+8.7%",
        time: "14:00",
        channel: "ads",
      },
    ],
  },
  {
    date: "2026-03-16",
    dateLabel: "16 марта, понедельник",
    events: [
      {
        id: 7,
        severity: "info",
        message: "Трафик на сайт вырос на 3.2%",
        cause: "Рост органического трафика из поиска",
        change: "+3.2%",
        time: "22:00",
        channel: "site",
      },
      {
        id: 8,
        severity: "info",
        message: "Кампания 'Ретаргетинг' показывает лучший CPA",
        cause: "CPA 387\u20BD — лучший результат среди активных кампаний",
        change: "-8.3%",
        time: "18:00",
        channel: "ads",
      },
      {
        id: 9,
        severity: "warning",
        message: "Bounce rate на странице /pricing вырос до 31.5%",
        cause: "Возможно, цены не соответствуют ожиданиям из рекламы",
        change: "+12.0%",
        time: "12:30",
        channel: "site",
      },
    ],
  },
  {
    date: "2026-03-15",
    dateLabel: "15 марта, воскресенье",
    events: [
      {
        id: 10,
        severity: "info",
        message: "Запущена новая кампания 'Весна-2026'",
        cause: "Кампания на поиске и в РСЯ, бюджет 15 000\u20BD/нед",
        change: "новая",
        time: "10:00",
        channel: "ads",
      },
      {
        id: 11,
        severity: "info",
        message: "Органический трафик стабилен — 1 840 визитов",
        cause: "Позиции в поиске без значимых изменений",
        change: "+0.5%",
        time: "22:00",
        channel: "site",
      },
    ],
  },
  {
    date: "2026-03-14",
    dateLabel: "14 марта, суббота",
    events: [
      {
        id: 12,
        severity: "info",
        message: "CTR кампании 'Каталог — РСЯ' стабилен: 1.2%",
        cause: "Показатели в норме для РСЯ",
        change: "+0.1%",
        time: "22:00",
        channel: "ads",
      },
      {
        id: 13,
        severity: "warning",
        message: "Страница /blog/seo-tips — отказы 52.3%",
        cause: "Контент может не соответствовать поисковому запросу",
        change: "+8.5%",
        time: "15:00",
        channel: "site",
      },
    ],
  },
  {
    date: "2026-03-13",
    dateLabel: "13 марта, пятница",
    events: [
      {
        id: 14,
        severity: "info",
        message: "Кампания 'Акция выходного дня' поставлена на паузу",
        cause: "Бюджет на акцию исчерпан, кампания остановлена",
        change: "пауза",
        time: "17:00",
        channel: "ads",
      },
      {
        id: 15,
        severity: "info",
        message: "Визиты из соцсетей выросли до 980 за день",
        cause: "Публикация в VK получила хороший охват",
        change: "+34.2%",
        time: "14:00",
        channel: "site",
      },
      {
        id: 16,
        severity: "info",
        message: "Глубина просмотра стабильна — 2.4 страницы",
        cause: "Пользователи просматривают каталог и цены",
        change: "0%",
        time: "22:00",
        channel: "site",
      },
    ],
  },
  {
    date: "2026-03-12",
    dateLabel: "12 марта, четверг",
    events: [
      {
        id: 17,
        severity: "info",
        message: "Расход на рекламу в пределах нормы — 6 120\u20BD",
        cause: "Дневной бюджет распределён равномерно",
        change: "-2.1%",
        time: "22:00",
        channel: "ads",
      },
      {
        id: 18,
        severity: "info",
        message: "Новых посетителей 68% от общего трафика",
        cause: "Рекламные кампании привлекают новую аудиторию",
        change: "+3.0%",
        time: "22:00",
        channel: "site",
      },
    ],
  },
];

const severityIcon = {
  critical: <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
  info: <Info className="h-4 w-4 shrink-0 text-blue-500" />,
};

const channelLabels = { site: "Сайт", ads: "Реклама" };

const changeBadgeClass = (change: string) => {
  if (change.startsWith("+") && !change.includes("0.")) return "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  if (change.startsWith("-")) return "text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
  return "text-muted-foreground bg-muted";
};

export default function DemoEventsPage() {
  const totalEvents = eventsByDate.reduce((sum, group) => sum + group.events.length, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Журнал событий</h1>
        <p className="text-sm text-muted-foreground">{totalEvents} событий за 7 дней</p>
      </div>

      {eventsByDate.map((group) => (
        <section key={group.date}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.dateLabel}
          </h2>
          <Card>
            <CardContent className="divide-y p-0">
              {group.events.map((event) => (
                <div key={event.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{severityIcon[event.severity]}</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{event.message}</span>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-xs ${changeBadgeClass(event.change)}`}
                        >
                          {event.change}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{event.cause}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {channelLabels[event.channel]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{event.time}</span>
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
