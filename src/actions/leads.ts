"use server";

import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function getLeads() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const role = user.publicMetadata?.role as string | undefined;
    const websiteId = user.publicMetadata?.websiteId as string | undefined;

    let leads;

    if (role === "CLIENT" && websiteId) {
      // Clients ONLY see leads for their specific website
      leads = await prisma.lead.findMany({
        where: {
          websiteId: websiteId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Agency Owners / Admins see all leads across all websites
      leads = await prisma.lead.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    return { success: true, leads };
  } catch (error) {
    console.error("Error fetching leads:", error);
    return { success: false, error: "Failed to fetch leads" };
  }
}

export async function updateLeadStatus(leadId: string, status: string) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });

    return { success: true, lead: updatedLead };
  } catch (error) {
    console.error("Error updating lead:", error);
    return { success: false, error: "Failed to update lead" };
  }
}
