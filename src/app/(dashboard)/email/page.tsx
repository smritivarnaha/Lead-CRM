import { EmailCampaignsView } from "@/components/email/EmailCampaignsView";
import { getLeads } from "@/actions/leads";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EmailCampaignsPage() {
  const [user, res] = await Promise.all([
    getAuthenticatedUser(),
    getLeads(),
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  const leads = res.success && res.leads ? res.leads : [];

  return <EmailCampaignsView initialLeads={leads} />;
}
