"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { cookies } from "next/headers";

export async function getLeads() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const role = user.role;
    const isClient = role === "CLIENT" && !!user.websiteId;
    
    // Read the active profile cookie set by the frontend dropdown
    const cookieStore = await cookies();
    const activeWebsiteCookie = cookieStore.get("leadflow_active_website_id")?.value;
    
    // Determine which website to filter by
    let filterWebsiteId = undefined;
    if (isClient) {
      filterWebsiteId = user.websiteId as string;
    } else if (activeWebsiteCookie && activeWebsiteCookie !== "all") {
      filterWebsiteId = activeWebsiteCookie;
    }

    const leads = await prisma.lead.findMany({
      where: filterWebsiteId ? { websiteId: filterWebsiteId } : {},
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        message: true,
        source: true,
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
      },
    });

    return { success: true, leads: JSON.parse(JSON.stringify(leads)) };
  } catch (error) {
    console.error("Error fetching leads:", error);
    return { success: false, error: "Failed to fetch leads" };
  }
}

export async function getLeadsByWebsite(websiteId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const leads = await prisma.lead.findMany({
      where: { websiteId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        message: true,
        source: true,
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
        smsSent: true,
        pushSent: true,
        callNotes: true,
        website: { select: { id: true, name: true, domain: true } },
      },
    });

    return { success: true, leads: JSON.parse(JSON.stringify(leads)) };
  } catch (error) {
    console.error("Error fetching leads by website:", error);
    return { success: false, error: "Failed to fetch leads" };
  }
}

export async function updateLeadStatus(leadId: string, status: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });

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
        // Ensure CLIENT users can only delete leads for their website
        ...(user.role === "CLIENT" && user.websiteId ? { websiteId: user.websiteId } : {})
      }
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error bulk deleting leads:", error);
    return { success: false, error: "Failed to bulk delete leads" };
  }
}

export async function logCallAction(leadId: string, status: string, callNotes?: string, followUpAt?: Date | null) {
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

    return { success: true, lead: JSON.parse(JSON.stringify(updatedLead)) };
  } catch (error) {
    console.error("Error updating followup date:", error);
    return { success: false, error: "Failed to update followup date" };
  }
}
