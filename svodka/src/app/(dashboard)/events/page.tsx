import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEventsByUser } from "@/lib/db/queries/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function EventsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session as any).userId as number;
  const events = await getEventsByUser(userId, 50);

  // Group events by date
  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const date = event.createdAt.split("T")[0] || event.createdAt.slice(0, 10);
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(event);
  }

  const severityIcon = {
    critical: <AlertCircle className="h-4 w-4 text-red-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    info: <Info className="h-4 w-4 text-blue-500" />,
  };

  const severityBg = {
    critical: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900",
    warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900",
    info: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900",
  };

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Журнал событий</h1>
        <p className="text-sm text-muted-foreground">
          История сигналов и алертов по всем проектам
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Событий пока нет. Они появятся после первого сбора данных.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                {formatDate(date)}
              </h2>
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const data = event.dataJson ? JSON.parse(event.dataJson) : {};
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3",
                        severityBg[event.severity]
                      )}
                    >
                      <div className="mt-0.5">
                        {severityIcon[event.severity]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{event.message}</span>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {event.project?.name || `Проект #${event.projectId}`}
                          </Badge>
                        </div>
                        {data.cause && (
                          <p className="mt-1 text-xs text-muted-foreground">{data.cause}</p>
                        )}
                        {data.changePercent !== undefined && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Изменение: {data.changePercent > 0 ? "+" : ""}{Math.round(data.changePercent)}%
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTime(event.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
