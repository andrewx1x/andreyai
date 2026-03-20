import { redirect } from "next/navigation";
import { auth, getSessionUserId } from "@/lib/auth";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { getDecryptedToken } from "@/lib/db/queries/tokens";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { getScreenAccess } from "@/lib/subscription";
import { collectUserCockpit } from "@/lib/engine/collect";
import { OverviewContent } from "@/components/dashboard/overview-content";
import { PaywallOverlay } from "@/components/shared/paywall-overlay";

export default async function OverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session)!;

  const subscription = await getSubscription(userId);
  const access = getScreenAccess(
    subscription?.plan || null,
    subscription?.status || null,
    subscription?.trialEndsAt || null
  );

  // ── Access guard: don't load paid data without access ──
  if (!access.overview) {
    return (
      <div className="relative">
        <PaywallOverlay planName="Сводка.Всё" price="1 490" />
        <div className="space-y-10">
          <h1 className="text-[26px] font-bold tracking-tight">Обзор</h1>
          <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const projects = await getProjectsByUser(userId);
  const token = await getDecryptedToken(userId);

  // ── Live-fetch: collect signals and build cockpit ──
  const { cockpit } = token
    ? await collectUserCockpit(token, projects)
    : { cockpit: { status: "healthy" as const, problems: [], actions: [], insight: { status: "neutral" as const, message: "Подключите Яндекс для получения данных." } } };

  return (
    <div className="space-y-10">
      <h1 className="text-[26px] font-bold tracking-tight">Обзор</h1>
      <OverviewContent
        status={cockpit.status}
        problems={cockpit.problems}
        actions={cockpit.actions}
        insight={cockpit.insight}
      />
    </div>
  );
}
