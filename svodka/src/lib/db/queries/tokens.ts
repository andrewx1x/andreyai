import { db } from "@/lib/db";
import { tokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptToken, validateEncryptionKey } from "@/lib/engine/crypto";
import { log } from "@/lib/logger";

export async function getDecryptedToken(userId: number): Promise<string | null> {
  const token = await db.query.tokens.findFirst({
    where: eq(tokens.userId, userId),
  });

  if (!token) {
    log.warn("tokens", "No token record for user", { userId });
    return null;
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || !validateEncryptionKey(encryptionKey)) {
    log.error("tokens", "ENCRYPTION_KEY missing or invalid");
    return null;
  }

  // Check token expiry before expensive decrypt
  if (token.expiresAt) {
    const expiresAt = new Date(token.expiresAt).getTime();
    if (Date.now() > expiresAt) {
      log.warn("tokens", "Token expired", { userId, expiresAt: token.expiresAt });
      // Still decrypt — token may work for a grace period on Yandex side
    }
  }

  try {
    return await decryptToken(token.encryptedToken, encryptionKey);
  } catch (error) {
    log.error("tokens", "Token decryption failed", {
      userId,
      error: error instanceof Error ? error.message : "Unknown",
    });
    return null;
  }
}

export async function getTokenRecord(userId: number) {
  return db.query.tokens.findFirst({
    where: eq(tokens.userId, userId),
  });
}

/**
 * Check if a user's token is expired or about to expire (within N hours).
 */
export async function isTokenExpiringSoon(userId: number, hoursThreshold = 24): Promise<boolean> {
  const token = await db.query.tokens.findFirst({
    where: eq(tokens.userId, userId),
  });

  if (!token || !token.expiresAt) return false;

  const expiresAt = new Date(token.expiresAt).getTime();
  const threshold = Date.now() + hoursThreshold * 60 * 60 * 1000;
  return expiresAt < threshold;
}
