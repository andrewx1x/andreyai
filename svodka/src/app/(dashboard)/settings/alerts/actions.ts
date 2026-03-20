"use server";

import { auth, getSessionUserId } from "@/lib/auth";
import { getProjectById } from "@/lib/db/queries/projects";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateAlertSettings(
  projectId: number,
  alerts: { enabled: boolean; thresholds: Record<string, number> }
) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const userId = getSessionUserId(session)!;
  const project = await getProjectById(projectId);

  if (!project || project.userId !== userId) {
    return { error: "Проект не найден" };
  }

  const settings = JSON.parse(project.settingsJson);
  settings.alerts = alerts;

  await db.update(projects).set({
    settingsJson: JSON.stringify(settings),
    updatedAt: new Date().toISOString(),
  }).where(eq(projects.id, projectId));

  revalidatePath("/settings/alerts");
  return { success: true };
}
