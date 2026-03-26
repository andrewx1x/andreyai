import { redirect } from "next/navigation";
import { auth, getSessionUserId } from "@/lib/auth";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { SubscribeButton } from "./subscribe-button";

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

  const userId = getSessionUserId(session)!;
  const subscription = await getSubscription(userId);

  const isActive = subscription?.status === "active";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Тарифы</h1>
        <p className="text-sm text-muted-foreground">
          Выберите подходящий тариф для вашего бизнеса
        </p>
      </div>

      {subscription?.status === "trial" && subscription.trialEndsAt && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Пробный период до{" "}
          <strong>
            {new Date(subscription.trialEndsAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
            })}
          </strong>
          . Выберите тариф, чтобы продолжить пользоваться Сводкой.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = isActive && subscription?.plan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? "border-primary shadow-md overflow-visible" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 right-4">Выгодно</Badge>
              )}
              <CardHeader>
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    ₽/мес
                  </span>
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
                <SubscribeButton planId={plan.id} isCurrent={isCurrent} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        7 дней бесплатно. Оплата через ЮKassa (банковские карты, ЮMoney, SberPay).
      </p>
    </div>
  );
}
