import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "site",
    name: "Сводка.Сайт",
    price: "990",
    features: ["Яндекс.Метрика", "Сигналы по сайту", "Email-алерты"],
  },
  {
    id: "ads",
    name: "Сводка.Реклама",
    price: "990",
    features: ["Яндекс.Директ", "Сигналы по рекламе", "Email-алерты"],
  },
  {
    id: "bundle",
    name: "Сводка.Всё",
    price: "1 490",
    features: ["Метрика + Директ", "Кросс-канальная диагностика", "Email-алерты", "Обзор со светофором"],
    recommended: true,
  },
];

export default function DemoSubscriptionPage() {
  const currentPlan = "bundle";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Подписка</h1>
        <p className="text-sm text-muted-foreground">
          Текущий план: <strong>Сводка.Всё</strong>{" "}
          <Badge variant="secondary">Триал — 5 дней осталось</Badge>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-shadow",
                isCurrent && "border-indigo-300 shadow-md",
                plan.recommended && "ring-2 ring-indigo-200"
              )}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600 text-white">Рекомендуем</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground"> ₽/мес</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={cn(
                    "mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    isCurrent
                      ? "bg-indigo-50 text-indigo-700 cursor-default"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Текущий план" : "Выбрать"}
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
