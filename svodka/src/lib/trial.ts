import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Trial duration in days. Set to 0 to disable trial expiry (infinite trial). */
const TRIAL_DAYS = 7;

/** Whether trial is currently enforced. */
const TRIAL_ENABLED = true;

/**
 * Create trial subscription for new user.
 * Currently creates an infinite trial (trialEndsAt = null).
 * When TRIAL_ENABLED is true, sets trialEndsAt to now + TRIAL_DAYS.
 */
export async function activateTrial(userId: number) {
  // Check if user already has a subscription
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (existing) return existing;

  const trialEndsAt = TRIAL_ENABLED
    ? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null; // null = infinite trial (pre-launch)

  const result = await db
    .insert(subscriptions)
    .values({
      userId,
      plan: "bundle",
      status: "trial",
      trialEndsAt,
    })
    .returning();

  return result[0];
}

/**
 * Check if user's trial has expired.
 * Returns false (not expired) when TRIAL_ENABLED is false.
 */
export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false; // Infinite trial
  return Date.now() > new Date(trialEndsAt).getTime();
}

/**
 * Calculate days remaining in trial.
 * Returns Infinity when trialEndsAt is null (infinite trial).
 */
export function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return Infinity;
  const remaining = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}
