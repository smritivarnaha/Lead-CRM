"use server";

import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getWebsites() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const role = user.publicMetadata?.role as string | undefined;

    // Only Agency Owners should see all websites
    if (role !== "AGENCY_OWNER" && role !== "SUPER_ADMIN" && !role) {
       // If no role, let's just assume they can see them for now to test, 
       // but ideally we check workspace
    }

    // Since we don't have workspaces fully enforced yet, we fetch all sites
    const websites = await prisma.website.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, websites };
  } catch (error) {
    console.error("Error fetching websites:", error);
    return { success: false, error: "Failed to fetch websites" };
  }
}

export async function createWebsite(data: { name: string; domain: string }) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const newSite = await prisma.website.create({
      data: {
        name: data.name,
        domain: data.domain,
        workspaceId: "mock_workspace_id", // Update this when we have real workspaces
      },
    });

    revalidatePath("/websites");
    return { success: true, website: newSite };
  } catch (error) {
    console.error("Error creating website:", error);
    return { success: false, error: "Failed to create website" };
  }
}
