import { db } from "@/lib/db";
import { snapshots } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getLatestSnapshot(projectId: number) {
  return db.query.snapshots.findFirst({
    where: eq(snapshots.projectId, projectId),
    orderBy: desc(snapshots.date),
  });
}

export async function getSnapshotByDate(projectId: number, date: string) {
  return db.query.snapshots.findFirst({
    where: and(eq(snapshots.projectId, projectId), eq(snapshots.date, date)),
  });
}

export async function saveSnapshot(projectId: number, date: string, dataJson: string) {
  // Validate JSON before saving
  try {
    JSON.parse(dataJson);
  } catch {
    throw new Error(`Invalid JSON for snapshot: projectId=${projectId}, date=${date}`);
  }

  await db.insert(snapshots).values({
    projectId,
    date,
    dataJson,
  }).onConflictDoUpdate({
    target: [snapshots.projectId, snapshots.date],
    set: { dataJson }, // Don't overwrite createdAt on upsert
  });
}
