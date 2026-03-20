import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const projects = [
  {
    id: 1,
    name: "Мой сайт",
    type: "metrika",
    isActive: true,
    details: "Счётчик #12345678",
  },
  {
    id: 2,
    name: "Яндекс Директ",
    type: "direct",
    isActive: true,
    details: "Логин: demo-agency",
  },
];

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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
