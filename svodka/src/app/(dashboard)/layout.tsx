import { redirect } from "next/navigation";
import { auth, getSessionUserId } from "@/lib/auth";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { getTokenRecord } from "@/lib/db/queries/tokens";
import { getScreenAccess } from "@/lib/subscription";
import { Sidebar } from "@/components/layout/sidebar";
import { TokenExpiryBanner } from "@/components/shared/token-expiry-banner";

type TokenStatus = "ok" | "expiring" | "expired" | "missing";

function getTokenStatus(tokenRecord: { expiresAt: string | null } | undefined): TokenStatus {
  if (!tokenRecord) return "missing";
  if (!tokenRecord.expiresAt) return "ok";
  const expiresAt = new Date(tokenRecord.expiresAt).getTime();
  const now = Date.now();
  if (now > expiresAt) return "expired";
  if (expiresAt - now < 24 * 60 * 60 * 1000) return "expiring";
  return "ok";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session)!;

  // Check if user has projects (if not, go to onboarding)
  const projects = await getProjectsByUser(userId);
  if (projects.length === 0) {
    redirect("/onboarding");
  }

  const subscription = await getSubscription(userId);
  const access = getScreenAccess(
    subscription?.plan || null,
    subscription?.status || null,
    subscription?.trialEndsAt || null
  );

  // Check token health
  const tokenRecord = await getTokenRecord(userId);
  const tokenStatus = getTokenStatus(tokenRecord);

  return (
    <div className="flex h-screen">
      <Sidebar
        access={access}
        userName={session.user?.name}
      />
      <main className="flex-1 overflow-auto pb-12">
        {tokenStatus !== "ok" && (
          <TokenExpiryBanner status={tokenStatus} />
        )}
        <div className="mx-auto max-w-[1200px] px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
