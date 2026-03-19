import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSubscription } from "@/lib/db/queries/subscriptions";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { getScreenAccess } from "@/lib/subscription";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session as any).userId as number;

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

  return (
    <div className="flex h-screen">
      <Sidebar
        access={access}
        userName={session.user?.name}
      />
      <main className="flex-1 overflow-auto pb-12">
        <div className="mx-auto max-w-[1200px] px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
