import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const projects = [
  { id: 1, name: "Мой сайт", type: "metrika", isActive: true },
  { id: 2, name: "Яндекс Директ", type: "direct", isActive: true },
];

export default function DemoSettingsPage() {
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
              <div className="font-medium">Демо-пользователь</div>
              <div className="text-sm text-muted-foreground">demo@svodka.ru</div>
            </div>
            <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium opacity-50 cursor-not-allowed">
              Выйти
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Показатели</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Выберите какие метрики показывать на дашборде
            </p>
            <Link href="/demo/settings/metrics" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              Настроить
            </Link>
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
              <span>Сводка.Всё</span>
              <Badge variant="secondary">Триал</Badge>
            </div>
            <Link href="/demo/settings/subscription" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
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
          <div className="space-y-2">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.type === "metrika" ? "Яндекс.Метрика" : "Яндекс.Директ"}
                  </div>
                </div>
                <Badge variant="outline">Активен</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
