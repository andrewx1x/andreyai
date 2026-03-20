import { redirect } from "next/navigation";
import { auth, getSessionUserId } from "@/lib/auth";
import { getEventsByUser } from "@/lib/db/queries/events";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function EventsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session)!;
  const events = await getEventsByUser(userId, 50);

  // Group events by date
  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const date = event.createdAt.split("T")[0] || event.createdAt.slice(0, 10);
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(event);
  }

  const severityIcon = {
    critical: <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />,
    warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
    info: <Info className="h-4 w-4 shrink-0 text-blue-500" />,
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
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">Журнал событий</h1>
        <span className="text-[14px] text-muted-foreground">
          {events.length} событий
        </span>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-3xl">
              📭
            </div>
            <h3 className="mt-5 text-[18px] font-semibold">Событий пока нет</h3>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              Они появятся после первого сбора данных.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {Array.from(grouped).map(([date, dayEvents]) => (
            <section key={date}>
              <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="inline-block h-1 w-4 rounded-full bg-gray-300" />
                {formatDate(date)}
              </h2>
              <Card>
                <CardContent className="divide-y p-0">
                  {dayEvents.map((event) => {
                    const data = event.dataJson ? JSON.parse(event.dataJson) : {};
                    return (
                      <div
                        key={event.id}
                        className="px-5 py-4 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {severityIcon[event.severity]}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[14px] font-semibold">{event.message}</span>
                              {data.changePercent !== undefined && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "shrink-0 tabular-nums text-[11px]",
                                    data.changePercent > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  )}
                                >
                                  {data.changePercent > 0 ? "+" : ""}{Math.round(data.changePercent)}%
                                </Badge>
                              )}
                            </div>
                            {data.cause && (
                              <p className="text-[13px] text-muted-foreground">{data.cause}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2.5">
                            <Badge variant="outline" className="text-[11px]">
                              {event.project?.name || `Проект #${event.projectId}`}
                            </Badge>
                            <span className="tabular-nums text-[13px] text-muted-foreground">
                              {formatTime(event.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
