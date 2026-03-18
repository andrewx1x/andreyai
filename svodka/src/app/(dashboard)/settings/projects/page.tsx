import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { DeactivateProjectButton } from "@/components/settings/deactivate-project-button";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session as any).userId as number;
  const projects = await getProjectsByUser(userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Проекты</h1>
          <p className="text-sm text-muted-foreground">
            Управление подключёнными счётчиками и аккаунтами
          </p>
        </div>
        <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
          Добавить
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Нет подключённых проектов.{" "}
              <Link href="/onboarding" className="text-primary underline">
                Добавить счётчик
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {project.type === "metrika" ? "Яндекс.Метрика" : "Яндекс.Директ"}
                    {project.yandexCounterId && ` · Счётчик ${project.yandexCounterId}`}
                    {project.yandexLogin && ` · ${project.yandexLogin}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={project.isActive ? "default" : "secondary"}>
                    {project.isActive ? "Активен" : "Отключён"}
                  </Badge>
                  {project.isActive && (
                    <DeactivateProjectButton projectId={project.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
