import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function getProjectsByUser(userId: number) {
  return db.query.projects.findMany({
    where: and(eq(projects.userId, userId), eq(projects.isActive, true)),
  });
}

export async function getProjectById(id: number) {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
  });
}

export async function getProjectsByType(userId: number, type: "metrika" | "direct") {
  return db.query.projects.findMany({
    where: and(
      eq(projects.userId, userId),
      eq(projects.type, type),
      eq(projects.isActive, true)
    ),
  });
}

export async function createProject(data: {
  userId: number;
  type: "metrika" | "direct";
  name: string;
  yandexCounterId?: number;
  yandexLogin?: string;
  settingsJson?: string;
}) {
  const result = await db.insert(projects).values({
    userId: data.userId,
    type: data.type,
    name: data.name,
    yandexCounterId: data.yandexCounterId,
    yandexLogin: data.yandexLogin,
    settingsJson: data.settingsJson || "{}",
  }).returning();
  return result[0];
}

export async function deactivateProject(id: number) {
  await db.update(projects).set({
    isActive: false,
    updatedAt: new Date().toISOString(),
  }).where(eq(projects.id, id));
}
