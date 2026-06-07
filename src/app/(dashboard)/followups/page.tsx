import { FollowupsView } from "@/components/leads/FollowupsView";
import { getLeads } from "@/actions/leads";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function FollowupsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch all leads on the server instantly
  const res = await getLeads();
  const allLeads = res.success && res.leads ? res.leads : [];

  // Filter leads that are NOT in terminal states (CONVERTED, LOST, JUNK)
  // and need follow-up. We can pass all valid leads to the view and let it handle sorting.
  const terminalStatuses = ["CONVERTED", "LOST", "JUNK"];
  const followupLeads = allLeads.filter((l: any) => !terminalStatuses.includes(l.status));

  return <FollowupsView initialLeads={followupLeads} />;
}
