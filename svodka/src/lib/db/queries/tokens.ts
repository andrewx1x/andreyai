import { db } from "@/lib/db";
import { tokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptToken } from "@/lib/engine/crypto";

export async function getDecryptedToken(userId: number): Promise<string | null> {
  const token = await db.query.tokens.findFirst({
    where: eq(tokens.userId, userId),
  });

  if (!token) return null;

  const encryptionKey = process.env.ENCRYPTION_KEY!;
  return decryptToken(token.encryptedToken, encryptionKey);
}

export async function getTokenRecord(userId: number) {
  return db.query.tokens.findFirst({
    where: eq(tokens.userId, userId),
  });
}
