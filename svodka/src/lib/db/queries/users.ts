import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserById(id: number) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByYandexId(yandexId: string) {
  return db.query.users.findFirst({
    where: eq(users.yandexId, yandexId),
  });
}
