import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  try {
    const session = await auth();
    if (session) {
      redirect("/overview");
    }
  } catch {
    // Auth not configured yet
  }

  // Not authenticated — redirect to landing on Vercel
  redirect("/landing/svodka/");
}
