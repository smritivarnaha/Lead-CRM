"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";

const LEAD_SELECT_FIELDS = {
  id: true,
  websiteId: true,
  fullName: true,
  email: true,
  phone: true,
  city: true,
  state: true,
  message: true,
  source: true,
  pageUrl: true,
  pageTitle: true,
  ipAddress: true,
  formName: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  utmContent: true,
  utmTerm: true,
  status: true,
  priority: true,
  temperature: true,
  score: true,
  createdAt: true,
  followUpAt: true,
  rawFields: true,
  emailSent: true,
  smsSent: true,
  pushSent: true,
  callNotes: true,
  website: { select: { id: true, name: true, domain: true } },
};

const getCachedLeads = unstable_cache(
  async (websiteId: string | null) => {
    const leads = await prisma.lead.findMany({
      where: websiteId ? { websiteId } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      select: LEAD_SELECT_FIELDS,
    });
    return JSON.parse(JSON.stringify(leads));
  },
  ["leads_list_cache"],
  { revalidate: 20, tags: ["leads_cache"] }
);

function invalidateLeadCaches() {
  try {
    (revalidateTag as any)("leads_cache", { expire: 0 });
    (revalidateTag as any)("websites_stats", { expire: 0 });
    (revalidateTag as any)("activity_cache", { expire: 0 });
  } catch (e) {}
}

export const getLeads = cache(async () => {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const isClient = user.role === "CLIENT" && !!user.websiteId;
    const filterWebsiteId = isClient ? (user.websiteId as string) : null;

    const leads = await getCachedLeads(filterWebsiteId);
    return { success: true, leads };
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE") throw error;
    console.error("Error fetching leads:", error);
    return { success: false, error: "Failed to fetch leads" };
  }
});

export const getLeadsByWebsite = cache(async (websiteId: string) => {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Security check for CLIENT users
    if (user.role === "CLIENT" && user.websiteId && user.websiteId !== websiteId) {
      return { success: false, error: "Forbidden" };
    }

    const leads = await getCachedLeads(websiteId);
    return { success: true, leads };
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE") throw error;
    console.error("Error fetching leads by website:", error);
    return { success: false, error: "Failed to fetch leads" };
  }
});

export async function updateLeadStatus(leadId: string, status: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });

    invalidateLeadCaches();
    return { success: true, lead: JSON.parse(JSON.stringify(updatedLead)) };
  } catch (error) {
    console.error("Error updating lead:", error);
    return { success: false, error: "Failed to update lead" };
  }
}

export async function updateLeadPriority(leadId: string, priority: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { priority },
    });

    invalidateLeadCaches();
    return { success: true, lead: JSON.parse(JSON.stringify(updatedLead)) };
  } catch (error) {
    console.error("Error updating priority:", error);
    return { success: false, error: "Failed to update priority" };
  }
}

export async function deleteLead(leadId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    await prisma.lead.delete({ where: { id: leadId } });
    invalidateLeadCaches();
    return { success: true };
  } catch (error) {
    console.error("Error deleting lead:", error);
    return { success: false, error: "Failed to delete lead" };
  }
}

export async function bulkDeleteLeads(leadIds: string[]) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const result = await prisma.lead.deleteMany({
      where: {
        id: { in: leadIds },
        ...(user.role === "CLIENT" && user.websiteId ? { websiteId: user.websiteId } : {}),
      },
    });

    invalidateLeadCaches();
    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error bulk deleting leads:", error);
    return { success: false, error: "Failed to bulk delete leads" };
  }
}

export async function logCallAction(
  leadId: string,
  status: string,
  callNotes?: string,
  followUpAt?: Date | null
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const dataToUpdate: any = { status };
    if (callNotes !== undefined) dataToUpdate.callNotes = callNotes;
    if (followUpAt !== undefined) dataToUpdate.followUpAt = followUpAt;

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: dataToUpdate,
    });

    invalidateLeadCaches();
    return { success: true, lead: JSON.parse(JSON.stringify(updatedLead)) };
  } catch (error) {
    console.error("Error logging call:", error);
    return { success: false, error: "Failed to log call" };
  }
}

export async function updateLeadFollowup(leadId: string, followUpAt: Date | null) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { followUpAt },
    });

    invalidateLeadCaches();
    return { success: true, lead: JSON.parse(JSON.stringify(updatedLead)) };
  } catch (error) {
    console.error("Error updating followup date:", error);
    return { success: false, error: "Failed to update followup date" };
  }
}
