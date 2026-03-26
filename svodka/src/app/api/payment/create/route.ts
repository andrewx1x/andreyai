import { NextResponse } from "next/server";
import { auth, getSessionUserId } from "@/lib/auth";
import { log } from "@/lib/logger";

const YUKASSA_SHOP_ID = process.env.YUKASSA_SHOP_ID;
const YUKASSA_SECRET_KEY = process.env.YUKASSA_SECRET_KEY;

const PLAN_PRICES: Record<string, { amount: string; description: string }> = {
  site: { amount: "990.00", description: "Сводка.Сайт — 1 месяц" },
  ads: { amount: "990.00", description: "Сводка.Реклама — 1 месяц" },
  bundle: { amount: "1490.00", description: "Сводка.Всё — 1 месяц" },
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = getSessionUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "No user ID" }, { status: 401 });
    }

    if (!YUKASSA_SHOP_ID || !YUKASSA_SECRET_KEY) {
      return NextResponse.json({ error: "Платежи временно недоступны" }, { status: 503 });
    }

    const { plan } = await request.json();
    const planConfig = PLAN_PRICES[plan];
    if (!planConfig) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.andreyai.ru";
    const idempotenceKey = `${userId}-${plan}-${Date.now()}`;

    // Create payment via YooKassa API
    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
        Authorization: `Basic ${Buffer.from(`${YUKASSA_SHOP_ID}:${YUKASSA_SECRET_KEY}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: {
          value: planConfig.amount,
          currency: "RUB",
        },
        confirmation: {
          type: "redirect",
          return_url: `${appUrl}/settings/subscription?payment=success`,
        },
        capture: true,
        description: planConfig.description,
        metadata: {
          userId: String(userId),
          plan: plan,
        },
        receipt: {
          customer: {
            email: session.user?.email || undefined,
          },
          items: [
            {
              description: planConfig.description,
              quantity: "1",
              amount: {
                value: planConfig.amount,
                currency: "RUB",
              },
              vat_code: 1, // Без НДС (самозанятый)
              payment_subject: "service",
              payment_mode: "full_payment",
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      log.error("payment.create", "YooKassa API error", { status: response.status, body: errorData });
      return NextResponse.json({ error: "Ошибка создания платежа" }, { status: 500 });
    }

    const payment = await response.json();

    log.info("payment.create", "Payment created", {
      paymentId: payment.id,
      userId,
      plan,
      amount: planConfig.amount,
    });

    return NextResponse.json({
      confirmationUrl: payment.confirmation.confirmation_url,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    log.error("payment.create", "Failed to create payment", { error: msg });
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
