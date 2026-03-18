"use server";

import { auth } from "@/lib/auth";
import { deactivateProject, getProjectById } from "@/lib/db/queries/projects";
import { revalidatePath } from "next/cache";

export async function deactivateProjectAction(projectId: number) {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const userId = (session as any).userId as number;
  const project = await getProjectById(projectId);

  if (!project || project.userId !== userId) {
    return { error: "Проект не найден" };
  }

  await deactivateProject(projectId);
  revalidatePath("/settings/projects");
  return { success: true };
}
