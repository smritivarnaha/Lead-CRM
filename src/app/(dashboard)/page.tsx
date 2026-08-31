import { getWebsites } from "@/actions/websites";
import { getAuthenticatedUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/sign-in");
  }

  const res = await getWebsites();
  let websites = res.success && res.websites ? res.websites : [];

  const role = user.role;
  const userWebsiteId = user.websiteId;
  const isClient = role === "CLIENT" && !!userWebsiteId;

  const cookieStore = await cookies();
  const activeWebsiteCookie = cookieStore.get("leadflow_active_website_id")?.value;

  if (isClient) {
    websites = websites.filter((w: any) => w.id === userWebsiteId);
  } else if (activeWebsiteCookie && activeWebsiteCookie !== "all") {
    websites = websites.filter((w: any) => w.id === activeWebsiteCookie);
  }

  return (
    <DashboardClient 
      initialWebsites={websites} 
      role={role || undefined} 
      userWebsiteId={userWebsiteId || undefined} 
    />
  );
}
