import { db } from "@/lib/db";
import { events, projects } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { Signal } from "@/lib/engine/types";

export async function saveSignalsAsEvents(
  projectId: number,
  signals: Signal[]
) {
  if (signals.length === 0) return;

  const values = signals
    .filter((s) => s.severity === "warning" || s.severity === "critical")
    .map((signal) => ({
      projectId,
      type: "alert" as const,
      severity: signal.severity as "info" | "warning" | "critical",
      message: signal.message,
      dataJson: JSON.stringify({
        metric: signal.metric,
        channel: signal.channel,
        currentValue: signal.currentValue,
        previousValue: signal.previousValue,
        changePercent: signal.changePercent,
        cause: signal.cause,
        impact: signal.impact,
      }),
    }));

  if (values.length > 0) {
    await db.insert(events).values(values);
  }
}

export async function getEventsByUser(
  userId: number,
  limit = 30
) {
  // Get user's project IDs
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
    columns: { id: true, name: true, type: true },
  });

  if (userProjects.length === 0) return [];

  const projectIds = userProjects.map((p) => p.id);
  const projectMap = new Map(userProjects.map((p) => [p.id, p]));

  const rows = await db.query.events.findMany({
    where: inArray(events.projectId, projectIds),
    orderBy: desc(events.createdAt),
    limit,
  });

  return rows.map((row) => ({
    ...row,
    project: projectMap.get(row.projectId),
  }));
}

export async function getEventsByProject(
  projectId: number,
  limit = 20
) {
  return db.query.events.findMany({
    where: eq(events.projectId, projectId),
    orderBy: desc(events.createdAt),
    limit,
  });
}
