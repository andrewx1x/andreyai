"use server";

import { auth, signOut, getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, tokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Отзыв OAuth-токена (отключение доступа к Яндексу).
 * Удаляет токен из БД. Пользователь останется залогинен,
 * но данные перестанут обновляться.
 */
export async function revokeTokenAction() {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const userId = getSessionUserId(session);
  if (!userId) return { error: "Не авторизован" };

  await db.delete(tokens).where(eq(tokens.userId, userId));
  return { ok: true };
}

/**
 * Полное удаление аккаунта и всех данных (152-ФЗ, отзыв согласия).
 * CASCADE удалит: tokens, projects, subscriptions, snapshots, events, alertCooldowns, reportCache.
 */
export async function deleteAccountAction() {
  const session = await auth();
  if (!session) return { error: "Не авторизован" };

  const userId = getSessionUserId(session);
  if (!userId) return { error: "Не авторизован" };

  // Удаляем пользователя — CASCADE удалит всё остальное
  await db.delete(users).where(eq(users.id, userId));

  // Завершаем сессию
  await signOut({ redirectTo: "/login" });
}
