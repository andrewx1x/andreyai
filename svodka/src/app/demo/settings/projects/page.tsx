import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const projects = [
  {
    id: 1,
    name: "Мой сайт",
    type: "metrika",
    isActive: true,
    details: "Счётчик #12345678",
    lastSync: "23 мар, 09:15",
    syncStatus: "ok" as const,
    goals: 3,
    metrics: 6,
  },
  {
    id: 2,
    name: "Яндекс Директ",
    type: "direct",
    isActive: true,
    details: "Логин: demo-agency",
    lastSync: "23 мар, 09:12",
    syncStatus: "ok" as const,
    campaigns: 4,
    metrics: 5,
  },
];

const syncStatusLabel = { ok: "Синхронизировано", error: "Ошибка", pending: "Ожидание" } as const;
const syncStatusColor = { ok: "bg-emerald-500", error: "bg-red-500", pending: "bg-amber-500" } as const;

export default function DemoProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Проекты</h1>
        <p className="text-sm text-muted-foreground">
          Подключённые счётчики и аккаунты
        </p>
      </div>

      {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{project.name}</CardTitle>
              <Badge variant={project.isActive ? "default" : "secondary"}>
                {project.isActive ? "Активен" : "Отключён"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Тип:</span>
              <span>{project.type === "metrika" ? "Яндекс.Метрика" : "Яндекс.Директ"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Детали:</span>
              <span>{project.details}</span>
            </div>
            {/* Health status */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Статус:</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${syncStatusColor[project.syncStatus]}`} />
                {syncStatusLabel[project.syncStatus]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Последняя синхронизация:</span>
              <span>{project.lastSync}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {project.type === "metrika" ? "Целей:" : "Кампаний:"}
              </span>
              <span>{project.type === "metrika" ? project.goals : project.campaigns}</span>
              <span className="text-muted-foreground ml-2">Метрик:</span>
              <span>{project.metrics}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
