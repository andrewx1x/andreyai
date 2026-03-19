import { NextResponse } from "next/server";
import { hmacSha256 } from "@/lib/engine/crypto";
import { activatePaidSubscription } from "@/lib/db/queries/subscriptions";
import { log } from "@/lib/logger";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

/**
 * Robokassa Result URL webhook.
 *
 * Called by Robokassa after successful payment.
 * Verifies signature, activates subscription.
 *
 * Flow:
 *   1. Robokassa sends POST with payment params
 *   2. We verify the signature: md5(OutSum:InvId:Password2)
 *   3. Find user by InvId (which maps to userId)
 *   4. Activate paid subscription for 30 days
 *   5. Respond with "OK{InvId}" (required by Robokassa)
 *
 * TODO: Активировать на Timeweb после подключения Робокассы.
 *       Сейчас webhook принимает, логирует и отвечает OK без реальной активации.
 */

const ROBOKASSA_PASSWORD_2 = process.env.ROBOKASSA_PASSWORD_2;
const ROBOKASSA_ENABLED = false; // Switch to true on Timeweb

// Plan mapping: Robokassa description → our plan
const PLAN_MAP: Record<string, { plan: "site" | "ads" | "bundle"; days: number }> = {
  "svodka_site": { plan: "site", days: 30 },
  "svodka_ads": { plan: "ads", days: 30 },
  "svodka_bundle": { plan: "bundle", days: 30 },
};

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const outSum = params.get("OutSum") || "";
    const invId = params.get("InvId") || "";
    const signatureValue = params.get("SignatureValue") || "";
    const shpItem = params.get("Shp_item") || "svodka_bundle"; // custom param: plan type
    const shpUserId = params.get("Shp_userId") || "";

    log.info("webhook.payment", "Payment webhook received", {
      outSum,
      invId,
      shpItem,
      shpUserId,
      enabled: ROBOKASSA_ENABLED,
    });

    // --- Guard: not activated yet ---
    if (!ROBOKASSA_ENABLED) {
      log.info("webhook.payment", "Robokassa disabled (pre-launch), logging only");
      return new Response(`OK${invId}`, { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    // --- Verify signature ---
    if (!ROBOKASSA_PASSWORD_2) {
      log.error("webhook.payment", "ROBOKASSA_PASSWORD_2 not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Robokassa signature: MD5(OutSum:InvId:Password2:Shp_item=...:Shp_userId=...)
    // Note: Shp_ params must be sorted alphabetically
    const signatureString = `${outSum}:${invId}:${ROBOKASSA_PASSWORD_2}:Shp_item=${shpItem}:Shp_userId=${shpUserId}`;
    const expectedSignature = await computeMd5(signatureString);

    if (signatureValue.toLowerCase() !== expectedSignature.toLowerCase()) {
      log.error("webhook.payment", "Invalid signature", {
        invId,
        expected: expectedSignature.substring(0, 8) + "...",
        received: signatureValue.substring(0, 8) + "...",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // --- Activate subscription ---
    const userId = parseInt(shpUserId, 10);
    if (!userId || isNaN(userId)) {
      log.error("webhook.payment", "Invalid userId in webhook", { shpUserId });
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const planConfig = PLAN_MAP[shpItem] || PLAN_MAP["svodka_bundle"];
    const paidUntil = new Date(Date.now() + planConfig.days * 24 * 60 * 60 * 1000);

    await activatePaidSubscription(userId, planConfig.plan, paidUntil);

    log.info("webhook.payment", "Payment processed successfully", {
      userId,
      plan: planConfig.plan,
      amount: outSum,
      invId,
      paidUntil: paidUntil.toISOString(),
    });

    // --- Send confirmation email ---
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (user?.email) {
      await sendEmail(
        user.email,
        `Сводка: подписка "${planConfig.plan}" активирована`,
        buildPaymentConfirmationHtml(user.name || "", planConfig.plan, paidUntil)
      );
    }

    // Robokassa expects "OK{InvId}" as plain text
    return new Response(`OK${invId}`, { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    log.error("webhook.payment", "Webhook processing failed", { error: msg });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// --- Helpers ---

/**
 * MD5 hash (required by Robokassa for signature verification).
 * Uses Web Crypto API — available in Node.js 18+ and Vercel.
 */
async function computeMd5(input: string): Promise<string> {
  // Web Crypto doesn't support MD5 directly.
  // On Timeweb (Node.js): use `crypto.createHash('md5')`.
  // For now, placeholder that will be replaced:
  const { createHash } = await import("node:crypto");
  return createHash("md5").update(input).digest("hex");
}

function buildPaymentConfirmationHtml(userName: string, plan: string, paidUntil: Date): string {
  const planNames: Record<string, string> = {
    site: "Сводка.Сайт",
    ads: "Сводка.Реклама",
    bundle: "Сводка.Всё",
  };
  const planLabel = planNames[plan] || plan;
  const dateStr = paidUntil.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

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
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://svodka.app"}/overview" style="display:inline-block;background:#18181b;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">
          Открыть Сводку
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
