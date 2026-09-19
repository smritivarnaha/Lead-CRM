import { PipelineView } from "@/components/leads/PipelineView";
import { getLeads } from "@/actions/leads";
import { getWebsitesList } from "@/actions/websites";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LeadsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch all leads and lightweight websites list in parallel
  const [leadsRes, websitesRes] = await Promise.all([
    getLeads(),
    getWebsitesList()
  ]);

  const leads = leadsRes.success && leadsRes.leads ? leadsRes.leads : [];
  const websites = websitesRes.success && websitesRes.websites ? websitesRes.websites : [];

  return <PipelineView initialLeads={leads} initialWebsites={websites} />;
}
