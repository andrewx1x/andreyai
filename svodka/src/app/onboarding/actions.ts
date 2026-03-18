"use server";

import { auth } from "@/lib/auth";
import { getDecryptedToken } from "@/lib/db/queries/tokens";
import { createProject } from "@/lib/db/queries/projects";
import { createSubscription, getSubscription } from "@/lib/db/queries/subscriptions";
import { getCounters, getGoals } from "@/lib/engine/metrika/api";
import type { MetrikaCounter, MetrikaGoal } from "@/lib/engine/metrika/api";

export async function fetchUserCounters(): Promise<{
  counters: MetrikaCounter[];
  error?: string;
}> {
  const session = await auth();
  if (!session) return { counters: [], error: "Не авторизован" };

  const userId = (session as any).userId as number;
  const token = await getDecryptedToken(userId);
  if (!token) return { counters: [], error: "Токен не найден" };

  const result = await getCounters(token);
  if (!result.ok) return { counters: [], error: result.error };

  return { counters: result.data || [] };
}

export async function fetchCounterGoals(counterId: number): Promise<{
  goals: MetrikaGoal[];
  error?: string;
}> {
  const session = await auth();
  if (!session) return { goals: [], error: "Не авторизован" };

  const userId = (session as any).userId as number;
  const token = await getDecryptedToken(userId);
  if (!token) return { goals: [], error: "Токен не найден" };

  const result = await getGoals(token, counterId);
  if (!result.ok) return { goals: [], error: result.error };

  return { goals: result.data || [] };
}

export async function setupProjects(
  selectedCounters: Array<{ id: number; name: string; site: string }>
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session) return { success: false, error: "Не авторизован" };

  const userId = (session as any).userId as number;

  // Create projects for selected counters
  for (const counter of selectedCounters) {
    await createProject({
      userId,
      type: "metrika",
      name: counter.site || counter.name,
      yandexCounterId: counter.id,
      settingsJson: JSON.stringify({
        counter_id: counter.id,
        counter_name: counter.name,
        goals: [],
        metrics: [
          "ym:s:visits",
          "ym:s:users",
          "ym:s:bounceRate",
          "ym:s:pageDepth",
        ],
        alerts: {
          enabled: true,
          thresholds: {
            traffic_drop: 20,
            bounce_increase: 20,
            conversion_drop: 20,
          },
        },
      }),
    });
  }

  // Create subscription if doesn't exist
  const existing = await getSubscription(userId);
  if (!existing) {
    await createSubscription(userId, "bundle");
  }

  return { success: true };
}
