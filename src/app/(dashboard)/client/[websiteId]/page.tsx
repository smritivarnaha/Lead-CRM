import { PipelineView } from "@/components/leads/PipelineView";
import { getLeadsByWebsite } from "@/actions/leads";
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

  // Fetch the leads for this website on the server instantly
  const res = await getLeadsByWebsite(websiteId);
  const leads = res.success && res.leads ? res.leads : [];

  return <PipelineView websiteId={websiteId} initialLeads={leads} />;
}
