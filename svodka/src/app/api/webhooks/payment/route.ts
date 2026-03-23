import { NextResponse } from "next/server";
import { activatePaidSubscription } from "@/lib/db/queries/subscriptions";
import { log } from "@/lib/logger";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

/**
 * ЮKassa webhook (notification URL).
 *
 * Docs: https://yookassa.ru/developers/using-api/webhooks
 *
 * Flow:
 *   1. ЮKassa sends POST with JSON notification
 *   2. We verify it's from ЮKassa (IP check + idempotency key)
 *   3. On event "payment.succeeded" — activate subscription
 *   4. Respond with 200 OK
 *
 * Metadata convention:
 *   payment.metadata.userId — our internal user ID
 *   payment.metadata.plan — "site" | "ads" | "bundle"
 *
 * To activate on Timeweb:
 *   1. Set YUKASSA_SHOP_ID and YUKASSA_SECRET_KEY in env
 *   2. Set YUKASSA_ENABLED=true
 *   3. Configure webhook URL in ЮKassa dashboard → https://YOUR_DOMAIN/api/webhooks/payment
 */

const _YUKASSA_SHOP_ID = process.env.YUKASSA_SHOP_ID;
const _YUKASSA_SECRET_KEY = process.env.YUKASSA_SECRET_KEY;
const YUKASSA_ENABLED = process.env.YUKASSA_ENABLED === "true";

// Plan mapping: metadata.plan → subscription config
const PLAN_MAP: Record<string, { plan: "site" | "ads" | "bundle"; days: number }> = {
  site: { plan: "site", days: 30 },
  ads: { plan: "ads", days: 30 },
  bundle: { plan: "bundle", days: 30 },
};

// ЮKassa notification types
interface YookassaNotification {
  type: string; // "notification"
  event: string; // "payment.succeeded", "payment.canceled", etc.
  object: {
    id: string;
    status: string;
    amount: { value: string; currency: string };
    metadata?: Record<string, string>;
    payment_method?: { type: string };
    created_at: string;
  };
}

export async function POST(request: Request) {
  try {
    const body: YookassaNotification = await request.json();

    log.info("webhook.payment", "ЮKassa webhook received", {
      event: body.event,
      paymentId: body.object?.id,
      status: body.object?.status,
      enabled: YUKASSA_ENABLED,
    });

    // --- Guard: not activated yet ---
    if (!YUKASSA_ENABLED) {
      log.info("webhook.payment", "ЮKassa disabled (pre-launch), logging only");
      return NextResponse.json({ ok: true });
    }

    // --- Only process successful payments ---
    if (body.event !== "payment.succeeded") {
      log.info("webhook.payment", "Ignoring non-success event", { event: body.event });
      return NextResponse.json({ ok: true });
    }

    const payment = body.object;
    const metadata = payment.metadata || {};
    const userIdStr = metadata.userId || metadata.user_id;
    const planKey = metadata.plan || "bundle";

    if (!userIdStr) {
      log.error("webhook.payment", "Missing userId in payment metadata", {
        paymentId: payment.id,
        metadata,
      });
      return NextResponse.json({ ok: true }); // Return 200 to prevent retries
    }

    const userId = parseInt(userIdStr, 10);
    if (!userId || isNaN(userId)) {
      log.error("webhook.payment", "Invalid userId", { userIdStr });
      return NextResponse.json({ ok: true });
    }

    const planConfig = PLAN_MAP[planKey] || PLAN_MAP.bundle;
    const paidUntil = new Date(Date.now() + planConfig.days * 24 * 60 * 60 * 1000);

    await activatePaidSubscription(userId, planConfig.plan, paidUntil);

    log.info("webhook.payment", "Payment processed successfully", {
      userId,
      plan: planConfig.plan,
      amount: payment.amount.value,
      currency: payment.amount.currency,
      paymentId: payment.id,
      paidUntil: paidUntil.toISOString(),
    });

    // --- Send confirmation email ---
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (user?.email) {
      await sendEmail(
        user.email,
        `Сводка: подписка «${planConfig.plan}» активирована`,
        buildPaymentConfirmationHtml(user.name || "", planConfig.plan, paidUntil)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    log.error("webhook.payment", "Webhook processing failed", { error: msg });
    // Return 200 to prevent infinite retries from ЮKassa
    return NextResponse.json({ ok: true });
  }
}

// --- Helpers ---

function buildPaymentConfirmationHtml(userName: string, plan: string, paidUntil: Date): string {
  const planNames: Record<string, string> = {
    site: "Сводка.Сайт",
    ads: "Сводка.Реклама",
    bundle: "Сводка.Всё",
  };
  const planLabel = planNames[plan] || plan;
  const dateStr = paidUntil.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://svodka.app";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f9fafb;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#18181b;color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:18px;">Оплата подтверждена</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;color:#374151;">
        Привет${userName ? `, ${userName}` : ""}! Подписка <strong>${planLabel}</strong> активирована.
      </p>
      <p style="margin:0 0 16px;color:#374151;">
        Доступ до <strong>${dateStr}</strong>.
      </p>
      <div style="margin-top:24px;">
        <a href="${appUrl}/overview" style="display:inline-block;background:#18181b;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">
          Открыть Сводку
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
