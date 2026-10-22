import { ContactsView } from "@/components/leads/ContactsView";
import { getLeads } from "@/actions/leads";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ContactsPage() {
  const [user, res] = await Promise.all([
    getAuthenticatedUser(),
    getLeads(),
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  const leads = res.success && res.leads ? res.leads : [];

  return <ContactsView initialLeads={leads} />;
}
