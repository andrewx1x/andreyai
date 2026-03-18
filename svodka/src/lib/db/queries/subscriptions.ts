import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
    trialEndsAt: null, // заложено, не активировано
  }).returning();
  return result[0];
}

export async function updateSubscriptionPlan(userId: number, plan: "site" | "ads" | "bundle") {
  await db.update(subscriptions).set({
    plan,
    updatedAt: new Date().toISOString(),
  }).where(eq(subscriptions.userId, userId));
}
