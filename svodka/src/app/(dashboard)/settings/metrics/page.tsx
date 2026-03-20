import { redirect } from "next/navigation";
import { auth, getSessionUserId } from "@/lib/auth";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricPickerForm } from "@/components/settings/metric-picker-form";
import {
  METRIKA_KPI_CATALOG,
  DIRECT_KPI_CATALOG,
  DEFAULT_METRIKA_KPIS,
  DEFAULT_DIRECT_KPIS,
} from "@/lib/engine/types";

export default async function MetricsSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session)!;
  const projects = await getProjectsByUser(userId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Показатели</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Выберите какие метрики показывать на дашборде для каждого проекта
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Нет подключённых проектов. Добавьте проект для настройки показателей.
            </p>
          </CardContent>
        </Card>
      ) : (
        projects.map((project) => {
          const settings = JSON.parse(project.settingsJson);
          const isMetrika = project.type === "metrika";

          const catalog = isMetrika
            ? [...METRIKA_KPI_CATALOG]
            : [...DIRECT_KPI_CATALOG];

          const defaults = isMetrika ? DEFAULT_METRIKA_KPIS : DEFAULT_DIRECT_KPIS;
          const currentSelection: string[] = settings.visible_kpis || defaults;

          return (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-[16px]">{project.name}</CardTitle>
                  <Badge variant="outline" className="text-[11px]">
                    {isMetrika ? "Яндекс Метрика" : "Яндекс Директ"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <MetricPickerForm
                  projectId={project.id}
                  projectName={project.name}
                  projectType={project.type as "metrika" | "direct"}
                  catalog={catalog as Array<{ key: string; label: string; description: string; invertColors?: boolean }>}
                  currentSelection={currentSelection}
                />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
