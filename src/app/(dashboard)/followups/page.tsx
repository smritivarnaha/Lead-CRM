import { FollowupsView } from "@/components/leads/FollowupsView";
import { getLeads } from "@/actions/leads";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function FollowupsPage() {
  const [user, res] = await Promise.all([
    getAuthenticatedUser(),
    getLeads(),
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  const allLeads = res.success && res.leads ? res.leads : [];

  const terminalStatuses = ["CONVERTED", "LOST", "JUNK"];
  const followupLeads = allLeads.filter((l: any) => !terminalStatuses.includes(l.status));

  return <FollowupsView initialLeads={followupLeads} />;
}
