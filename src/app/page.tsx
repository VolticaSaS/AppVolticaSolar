import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { SolarSizingWorkspace } from "@/features/solar/components/solar-sizing-workspace";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.role === "admin") redirect("/admin");
  if (user.role === "reviewer") redirect("/reviewer");
  return <SolarSizingWorkspace role={user.role} />;
}
