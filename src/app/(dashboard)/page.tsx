import { getWebsites } from "@/actions/websites";
import { getAuthenticatedUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const [user, res] = await Promise.all([
    getAuthenticatedUser(),
    getWebsites(),
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  let websites = res.success && res.websites ? res.websites : [];

  const role = user.role;
  const userWebsiteId = user.websiteId;
  const isClient = role === "CLIENT" && !!userWebsiteId;

  if (isClient) {
    websites = websites.filter((w: any) => w.id === userWebsiteId);
  }

  return (
    <DashboardClient 
      initialWebsites={websites} 
      role={role || undefined} 
      userWebsiteId={userWebsiteId || undefined} 
    />
  );
}
