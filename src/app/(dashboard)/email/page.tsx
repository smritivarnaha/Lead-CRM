import { EmailCampaignsView } from "@/components/email/EmailCampaignsView";
import { getLeads } from "@/actions/leads";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EmailCampaignsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch all leads on the server
  const res = await getLeads();
  const leads = res.success && res.leads ? res.leads : [];

  return <EmailCampaignsView initialLeads={leads} />;
}
