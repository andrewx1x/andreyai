import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectsByUser } from "@/lib/db/queries/projects";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session as any).userId as number;
  const existingProjects = await getProjectsByUser(userId);

  // If user already has projects, go to overview
  if (existingProjects.length > 0) {
    redirect("/overview");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <OnboardingWizard userId={userId} />
      </div>
    </div>
  );
}
