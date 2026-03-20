import { redirect } from "next/navigation";
import { auth, getSessionUserId } from "@/lib/auth";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertSettingsForm } from "@/components/settings/alert-settings-form";

export default async function AlertsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session)!;
  const projects = await getProjectsByUser(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Алерты</h1>
        <p className="text-sm text-muted-foreground">
          Настройте пороги для email-уведомлений
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Нет проектов. Добавьте проект для настройки алертов.
            </p>
          </CardContent>
        </Card>
      ) : (
        projects.map((project) => {
          const settings = JSON.parse(project.settingsJson);
          return (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {project.name}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({project.type === "metrika" ? "Метрика" : "Директ"})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AlertSettingsForm
                  projectId={project.id}
                  projectType={project.type}
                  alerts={settings.alerts || { enabled: true, thresholds: {} }}
                />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
