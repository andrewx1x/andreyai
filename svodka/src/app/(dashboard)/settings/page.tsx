import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session as any).userId as number;
  const projects = await getProjectsByUser(userId);
  const subscription = await getSubscription(userId);

  const planLabels: Record<string, string> = {
    site: "Сводка.Сайт",
    ads: "Сводка.Реклама",
    bundle: "Сводка.Всё",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Настройки</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Профиль</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{session.user?.name}</div>
              <div className="text-sm text-muted-foreground">{session.user?.email}</div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                Выйти
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Подписка</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{planLabels[subscription?.plan || "bundle"] || "Нет"}</span>
              <Badge variant={subscription?.status === "trial" ? "secondary" : "default"}>
                {subscription?.status === "trial" ? "Триал" : subscription?.status || "—"}
              </Badge>
            </div>
            <Link href="/settings/subscription" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Управление
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Проекты ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет подключённых проектов</p>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.type === "metrika" ? "Яндекс.Метрика" : "Яндекс.Директ"}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {p.isActive ? "Активен" : "Отключён"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
