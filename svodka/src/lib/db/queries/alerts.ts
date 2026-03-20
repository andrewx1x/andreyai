import { db } from "@/lib/db";
import { alertCooldowns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const COOLDOWN_HOURS = 4;

export async function canSendAlert(
  userId: number,
  projectId: number,
  alertType: string
): Promise<boolean> {
  const cooldown = await db.query.alertCooldowns.findFirst({
    where: and(
      eq(alertCooldowns.userId, userId),
      eq(alertCooldowns.projectId, projectId),
      eq(alertCooldowns.alertType, alertType)
    ),
  });

  if (!cooldown) return true;

  const lastSent = new Date(cooldown.lastSentAt).getTime();
  const now = Date.now();
  return now - lastSent > COOLDOWN_HOURS * 60 * 60 * 1000;
}

export async function markAlertSent(
  userId: number,
  projectId: number,
  alertType: string
) {
  const now = new Date().toISOString();

  await db.insert(alertCooldowns).values({
    userId,
    projectId,
    alertType,
    lastSentAt: now,
  }).onConflictDoUpdate({
    target: [alertCooldowns.userId, alertCooldowns.projectId, alertCooldowns.alertType],
    set: { lastSentAt: now },
  });
}
