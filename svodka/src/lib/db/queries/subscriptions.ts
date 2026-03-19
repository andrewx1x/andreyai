import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { log } from "@/lib/logger";

export async function getSubscription(userId: number) {
  return db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
}

export async function createSubscription(userId: number, plan: "site" | "ads" | "bundle" = "bundle") {
  const result = await db.insert(subscriptions).values({
    userId,
    plan,
    status: "trial",
    trialEndsAt: null, // заложено, не активировано — будет на Timeweb
  }).returning();
  return result[0];
}

export async function updateSubscriptionPlan(userId: number, plan: "site" | "ads" | "bundle") {
  await db.update(subscriptions).set({
    plan,
    updatedAt: new Date().toISOString(),
  }).where(eq(subscriptions.userId, userId));
}

/**
 * Activate paid subscription after successful payment.
 * Called from payment webhook.
 */
export async function activatePaidSubscription(
  userId: number,
  plan: "site" | "ads" | "bundle",
  paidUntil: Date
) {
  const existing = await getSubscription(userId);

  if (existing) {
    await db.update(subscriptions).set({
      plan,
      status: "active",
      paidUntil: paidUntil.toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(subscriptions.userId, userId));
    log.info("billing", "Subscription activated", { userId, plan, paidUntil: paidUntil.toISOString() });
  } else {
    await db.insert(subscriptions).values({
      userId,
      plan,
      status: "active",
      paidUntil: paidUntil.toISOString(),
    });
    log.info("billing", "New paid subscription created", { userId, plan, paidUntil: paidUntil.toISOString() });
  }
}

/**
 * Extend existing subscription by N days (e.g., renewal).
 */
export async function extendSubscription(userId: number, days: number) {
  const sub = await getSubscription(userId);
  if (!sub) return null;

  // Extend from current paidUntil or from now
  const base = sub.paidUntil ? new Date(sub.paidUntil) : new Date();
  const newPaidUntil = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await db.update(subscriptions).set({
    paidUntil: newPaidUntil.toISOString(),
    status: "active",
    updatedAt: new Date().toISOString(),
  }).where(eq(subscriptions.userId, userId));

  log.info("billing", "Subscription extended", { userId, days, paidUntil: newPaidUntil.toISOString() });
  return newPaidUntil;
}

/**
 * Cancel subscription.
 */
export async function cancelSubscription(userId: number) {
  await db.update(subscriptions).set({
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  }).where(eq(subscriptions.userId, userId));

  log.info("billing", "Subscription cancelled", { userId });
}

/**
 * Mark expired subscriptions (called from cron or on-demand).
 * Returns count of expired subscriptions.
 */
export async function expireOverdueSubscriptions(): Promise<number> {
  const now = new Date().toISOString();

  // Find active subscriptions where paidUntil has passed
  const allSubs = await db.query.subscriptions.findMany({
    where: eq(subscriptions.status, "active"),
  });

  let expired = 0;
  for (const sub of allSubs) {
    if (sub.paidUntil && new Date(sub.paidUntil).getTime() < Date.now()) {
      await db.update(subscriptions).set({
        status: "expired",
        updatedAt: now,
      }).where(eq(subscriptions.id, sub.id));
      expired++;
      log.info("billing", "Subscription expired", { userId: sub.userId, paidUntil: sub.paidUntil });
    }
  }

  return expired;
}
