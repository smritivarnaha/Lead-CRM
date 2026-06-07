import { PipelineView } from "@/components/leads/PipelineView";
import { getLeads } from "@/actions/leads";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LeadsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch all leads on the server instantly
  const res = await getLeads();
  const leads = res.success && res.leads ? res.leads : [];

  return <PipelineView initialLeads={leads} />;
}
