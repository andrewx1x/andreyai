import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    id: "site" as const,
    name: "Сводка.Сайт",
    price: "990",
    features: [
      "Экран Сайт (Яндекс.Метрика)",
      "KPI: визиты, посетители, отказы",
      "Источники трафика",
      "Сигналы и инсайты",
      "Email алерты",
    ],
  },
  {
    id: "ads" as const,
    name: "Сводка.Реклама",
    price: "990",
    features: [
      "Экран Реклама (Яндекс.Директ)",
      "KPI: расход, клики, кликабельность, стоимость заявки",
      "Таблица кампаний",
      "Сигналы и инсайты",
      "Email алерты",
    ],
  },
  {
    id: "bundle" as const,
    name: "Сводка.Всё",
    price: "1 490",
    popular: true,
    features: [
      "Экран Обзор (сводка по бизнесу)",
      "Экран Сайт + Реклама",
      "Кросс-канальные инсайты",
      "Email алерты",
      "Приоритетная поддержка",
    ],
  },
];

export default async function SubscriptionPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session as any).userId as number;
  const subscription = await getSubscription(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Тарифы</h1>
        <p className="text-sm text-muted-foreground">
          Выберите подходящий тариф для вашего бизнеса
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.popular ? "border-primary shadow-md" : ""}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                {plan.popular && <Badge>Выгодно</Badge>}
              </div>
              <div className="text-3xl font-bold">
                {plan.price} <span className="text-base font-normal text-muted-foreground">₽/мес</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-4 w-full"
                variant={subscription?.plan === plan.id ? "outline" : "default"}
                disabled={subscription?.plan === plan.id}
              >
                {subscription?.plan === plan.id ? "Текущий тариф" : "Выбрать"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        7 дней бесплатно на любом тарифе. Оплата будет доступна позже.
      </p>
    </div>
  );
}
