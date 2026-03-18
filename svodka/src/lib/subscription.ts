import { getSubscription } from "@/lib/db/queries/subscriptions";

export type Screen = "overview" | "site" | "ads" | "settings";

export async function getUserPlan(userId: number) {
  const sub = await getSubscription(userId);
  if (!sub) return null;
  return sub;
}

export async function hasAccess(userId: number, screen: Screen): Promise<boolean> {
  const sub = await getSubscription(userId);
  if (!sub) return false;

  // Check trial
  if (sub.status === "trial") {
    if (sub.trialEndsAt) {
      const trialEnd = new Date(sub.trialEndsAt).getTime();
      if (Date.now() > trialEnd) return false;
    }
    // trialEndsAt is null = unlimited trial (pre-Robokassa)
    return true;
  }

  // Check active subscription
  if (sub.status === "active") {
    if (sub.paidUntil) {
      const paidEnd = new Date(sub.paidUntil).getTime();
      if (Date.now() > paidEnd) return false;
    }

    switch (screen) {
      case "overview":
        return sub.plan === "bundle";
      case "site":
        return sub.plan === "site" || sub.plan === "bundle";
      case "ads":
        return sub.plan === "ads" || sub.plan === "bundle";
      case "settings":
        return true;
      default:
        return false;
    }
  }

  return false;
}

export function getScreenAccess(plan: string | null, status: string | null, trialEndsAt: string | null) {
  // If no subscription, no access
  if (!plan || !status) return { overview: false, site: false, ads: false };

  // Trial with no end date = full access (pre-Robokassa mode)
  if (status === "trial" && !trialEndsAt) {
    return { overview: true, site: true, ads: true };
  }

  // Trial with end date — check if expired
  if (status === "trial" && trialEndsAt) {
    const expired = Date.now() > new Date(trialEndsAt).getTime();
    if (expired) return { overview: false, site: false, ads: false };
    return { overview: true, site: true, ads: true };
  }

  // Active subscription
  if (status === "active") {
    return {
      overview: plan === "bundle",
      site: plan === "site" || plan === "bundle",
      ads: plan === "ads" || plan === "bundle",
    };
  }

  return { overview: false, site: false, ads: false };
}
