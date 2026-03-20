"use server";

import { auth, getSessionUserId } from "@/lib/auth";
import { getProjectById } from "@/lib/db/queries/projects";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateVisibleKpis(
  projectId: number,
  visibleKpis: string[]
) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const userId = getSessionUserId(session)!;
  const project = await getProjectById(projectId);

  if (!project || project.userId !== userId) {
    return { error: "Проект не найден" };
  }

  const settings = JSON.parse(project.settingsJson);
  settings.visible_kpis = visibleKpis;

  await db
    .update(projects)
    .set({
      settingsJson: JSON.stringify(settings),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, projectId));

  revalidatePath("/settings/metrics");
  revalidatePath("/overview");
  revalidatePath("/site");
  revalidatePath("/ads");
  return { success: true };
}
