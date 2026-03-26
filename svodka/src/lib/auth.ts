import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { db } from "@/lib/db";
import { users, tokens, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptToken } from "@/lib/engine/crypto";
import { sendWelcomeEmail } from "@/lib/email";
import { activateTrial } from "@/lib/trial";

const yandexProvider = {
  id: "yandex",
  name: "Яндекс",
  type: "oauth" as const,
  authorization: {
    url: "https://oauth.yandex.ru/authorize",
    params: {
      response_type: "code",
      force_confirm: "yes",
      scope: "login:info login:email metrika:read direct:api",
    },
  },
  token: "https://oauth.yandex.ru/token",
  userinfo: "https://login.yandex.ru/info?format=json",
  clientId: process.env.YANDEX_CLIENT_ID,
  clientSecret: process.env.YANDEX_CLIENT_SECRET,
  profile(profile: {
    id: string;
    login: string;
    default_email?: string;
    real_name?: string;
    display_name?: string;
    default_avatar_id?: string;
    is_avatar_empty?: boolean;
  }) {
    return {
      id: profile.id,
      name: profile.real_name || profile.display_name || profile.login,
      email: profile.default_email,
      image: profile.is_avatar_empty
        ? undefined
        : `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`,
    };
  },
};

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [yandexProvider],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== "yandex") return false;

      const yandexId = user.id!;
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        console.error("[Auth] ENCRYPTION_KEY not configured");
        return false;
      }

      // Upsert user
      const existing = await db.query.users.findFirst({
        where: eq(users.yandexId, yandexId),
      });

      let userId: number;

      if (existing) {
        await db.update(users).set({
          name: user.name || existing.name,
          email: user.email || existing.email,
          avatarUrl: user.image || existing.avatarUrl,
          updatedAt: new Date().toISOString(),
        }).where(eq(users.id, existing.id));
        userId = existing.id;
      } else {
        const result = await db.insert(users).values({
          yandexId,
          name: user.name,
          email: user.email,
          avatarUrl: user.image,
        }).returning({ id: users.id });
        userId = result[0].id;

        // New user — create trial subscription + send welcome email
        try {
          await activateTrial(userId);
        } catch (trialError) {
          console.error("[Auth] Failed to activate trial for userId:", userId, trialError);
        }

        try {
          if (user.email) {
            await sendWelcomeEmail(user.email, user.name || "");
          }
        } catch (emailError) {
          console.error("[Auth] Failed to send welcome email:", emailError);
        }
      }

      // Encrypt and save OAuth token
      if (account.access_token) {
        const encrypted = await encryptToken(account.access_token, encryptionKey);

        // Delete old tokens and insert new
        await db.delete(tokens).where(eq(tokens.userId, userId));
        await db.insert(tokens).values({
          userId,
          encryptedToken: encrypted,
          tokenType: "metrika", // one token works for both Metrika and Direct
          expiresAt: account.expires_at
            ? new Date(account.expires_at * 1000).toISOString()
            : null,
        });
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        // On sign in, add user DB id to JWT
        const dbUser = await db.query.users.findFirst({
          where: eq(users.yandexId, user.id!),
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.yandexId = dbUser.yandexId;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = String(token.userId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as Record<string, any>).userId = token.userId as number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as Record<string, any>).yandexId = token.yandexId as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);

/** Extract userId from session. Returns null if not authenticated. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSessionUserId(session: any): number | null {
  if (!session) return null;
  return session.userId as number ?? null;
}
