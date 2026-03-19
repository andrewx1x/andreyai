import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { log } from "@/lib/logger";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * API contract between Сводка (web) and Боты (Telegram).
 *
 * GET /api/subscription/check?yandexId=XXX
 *
 * Returns:
 *   { plan: "bundle"|"site"|"ads"|null, status: "trial"|"active"|"expired"|null, active: boolean }
 *
 * Auth: Bearer token (CRON_SECRET) — same secret shared between systems.
 *
 * TODO: Активировать на Timeweb после интеграции Ботов.
 */
export async function GET(request: Request) {
  // --- Auth ---
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const yandexId = searchParams.get("yandexId");

  if (!yandexId) {
    return NextResponse.json({ error: "Missing yandexId" }, { status: 400 });
  }

  // Find user by Yandex ID
  const user = await db.query.users.findFirst({
    where: eq(users.yandexId, yandexId),
  });

  if (!user) {
    return NextResponse.json({ plan: null, status: null, active: false });
  }

  // Get subscription
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
  });

  if (!sub) {
    return NextResponse.json({ plan: null, status: null, active: false });
  }

  // Check if active
  let active = false;

  if (sub.status === "trial") {
    if (!sub.trialEndsAt) {
      active = true; // Infinite trial
    } else {
      active = Date.now() <= new Date(sub.trialEndsAt).getTime();
    }
  } else if (sub.status === "active") {
    if (!sub.paidUntil) {
      active = true;
    } else {
      active = Date.now() <= new Date(sub.paidUntil).getTime();
    }
  }

  log.info("api.subscription.check", "Subscription checked", { yandexId, plan: sub.plan, status: sub.status, active });

  return NextResponse.json({
    plan: sub.plan,
    status: sub.status,
    active,
  });
}
