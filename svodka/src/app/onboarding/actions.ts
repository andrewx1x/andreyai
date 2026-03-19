"use server";

import { auth } from "@/lib/auth";
import { getDecryptedToken } from "@/lib/db/queries/tokens";
import { createProject } from "@/lib/db/queries/projects";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { activateTrial } from "@/lib/trial";
import { getCounters, getGoals } from "@/lib/engine/metrika/api";
import { getCampaigns } from "@/lib/engine/direct/api";
import { log } from "@/lib/logger";
import type { MetrikaCounter, MetrikaGoal } from "@/lib/engine/metrika/api";
import type { DirectCampaign } from "@/lib/engine/direct/api";
import { revalidatePath } from "next/cache";

// --- Metrika ---

export async function fetchUserCounters(): Promise<{
  counters: MetrikaCounter[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session) return { counters: [], error: "Не авторизован" };

    const userId = (session as any).userId as number;
    const token = await getDecryptedToken(userId);
    if (!token) return { counters: [], error: "Токен не найден. Попробуйте выйти и войти заново." };

    const result = await getCounters(token);
    if (!result.ok) {
      log.warn("onboarding", "Failed to fetch counters", { userId, error: result.error, errorCode: result.errorCode });
      return { counters: [], error: result.error || "Не удалось загрузить счётчики" };
    }

    return { counters: result.data || [] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("onboarding", "fetchUserCounters crashed", { error: msg });
    return { counters: [], error: "Внутренняя ошибка. Попробуйте позже." };
  }
}

export async function fetchCounterGoals(counterId: number): Promise<{
  goals: MetrikaGoal[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session) return { goals: [], error: "Не авторизован" };

    const userId = (session as any).userId as number;
    const token = await getDecryptedToken(userId);
    if (!token) return { goals: [], error: "Токен не найден" };

    const result = await getGoals(token, counterId);
    if (!result.ok) {
      log.warn("onboarding", "Failed to fetch goals", { userId, counterId, error: result.error });
      return { goals: [], error: result.error || "Не удалось загрузить цели" };
    }

    return { goals: result.data || [] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("onboarding", "fetchCounterGoals crashed", { error: msg });
    return { goals: [], error: "Внутренняя ошибка" };
  }
}

// --- Direct ---

export async function fetchUserCampaigns(login: string): Promise<{
  campaigns: DirectCampaign[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session) return { campaigns: [], error: "Не авторизован" };

    const userId = (session as any).userId as number;
    const token = await getDecryptedToken(userId);
    if (!token) return { campaigns: [], error: "Токен не найден" };

    const result = await getCampaigns(token, login);
    if (!result.ok) {
      log.warn("onboarding", "Failed to fetch campaigns", { userId, login, error: result.error });
      return { campaigns: [], error: result.error || "Не удалось загрузить кампании" };
    }

    return { campaigns: result.data || [] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("onboarding", "fetchUserCampaigns crashed", { error: msg });
    return { campaigns: [], error: "Внутренняя ошибка" };
  }
}

// --- Project setup ---

export async function setupProjects(
  selectedCounters: Array<{ id: number; name: string; site: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Не авторизован" };

    const userId = (session as any).userId as number;

    if (!selectedCounters || selectedCounters.length === 0) {
      return { success: false, error: "Выберите хотя бы один счётчик" };
    }

    // 1. Ensure subscription exists FIRST (before creating projects)
    const existing = await getSubscription(userId);
    if (!existing) {
      await activateTrial(userId);
      log.info("onboarding", "Trial activated for new user", { userId });
    }

    // 2. Create projects for selected counters
    const createdProjects: number[] = [];
    for (const counter of selectedCounters) {
      try {
        const project = await createProject({
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
              "ym:s:avgVisitDurationSeconds",
              "ym:s:pageviews",
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
        createdProjects.push(project.id);
      } catch (projError) {
        const msg = projError instanceof Error ? projError.message : "Unknown";
        log.error("onboarding", "Failed to create project", { userId, counterId: counter.id, error: msg });
        // Continue creating other projects
      }
    }

    if (createdProjects.length === 0) {
      return { success: false, error: "Не удалось создать ни один проект" };
    }

    log.info("onboarding", "Projects created", {
      userId,
      created: createdProjects.length,
      total: selectedCounters.length,
    });

    revalidatePath("/overview");
    revalidatePath("/site");

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("onboarding", "setupProjects crashed", { error: msg });
    return { success: false, error: "Внутренняя ошибка при создании проектов" };
  }
}

export async function setupDirectProject(
  login: string,
  selectedCampaignIds: number[] | "all"
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Не авторизован" };

    const userId = (session as any).userId as number;

    if (!login) return { success: false, error: "Укажите логин Директа" };

    // 1. Ensure subscription exists FIRST
    const existing = await getSubscription(userId);
    if (!existing) {
      await activateTrial(userId);
    }

    // 2. Create Direct project
    await createProject({
      userId,
      type: "direct",
      name: `Директ: ${login}`,
      yandexLogin: login,
      settingsJson: JSON.stringify({
        login,
        campaigns: selectedCampaignIds,
        compare_period: "day",
        alerts: {
          enabled: true,
          thresholds: {
            cost_spike: 30,
            ctr_drop: 20,
            cpa_spike: 30,
          },
        },
      }),
    });

    log.info("onboarding", "Direct project created", { userId, login });

    revalidatePath("/overview");
    revalidatePath("/ads");

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("onboarding", "setupDirectProject crashed", { error: msg });
    return { success: false, error: "Внутренняя ошибка при создании проекта" };
  }
}
