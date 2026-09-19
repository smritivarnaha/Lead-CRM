import { PipelineView } from "@/components/leads/PipelineView";
import { getLeadsByWebsite } from "@/actions/leads";
import { getWebsitesList } from "@/actions/websites";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ websiteId: string }>;
}

export default async function ClientPipelinePage({ params }: PageProps) {
  const { websiteId } = await params;
  if (!websiteId) return null;

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch the leads for this website and lightweight websites list in parallel
  const [leadsRes, websitesRes] = await Promise.all([
    getLeadsByWebsite(websiteId),
    getWebsitesList()
  ]);

  const leads = leadsRes.success && leadsRes.leads ? leadsRes.leads : [];
  const websites = websitesRes.success && websitesRes.websites ? websitesRes.websites : [];

  return <PipelineView websiteId={websiteId} initialLeads={leads} initialWebsites={websites} />;
}
