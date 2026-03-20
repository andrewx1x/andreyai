"use server";

import { auth, getSessionUserId } from "@/lib/auth";
import { deactivateProject, getProjectById } from "@/lib/db/queries/projects";
import { revalidatePath } from "next/cache";

export async function deactivateProjectAction(projectId: number) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const userId = getSessionUserId(session)!;
  const project = await getProjectById(projectId);

  if (!project || project.userId !== userId) {
    return { error: "Проект не найден" };
  }

  await deactivateProject(projectId);
  revalidatePath("/settings/projects");
  return { success: true };
}
