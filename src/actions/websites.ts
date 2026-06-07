"use server";

import prisma from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getWebsites() {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const isClient = user.role === "CLIENT" && !!user.websiteId;

    const websites = await prisma.website.findMany({
      where: isClient ? { id: user.websiteId as string } : undefined,
      include: {
        users: {
          where: { role: "CLIENT" },
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: {
          select: {
            leads: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // We fetch the 'new this week' separately because some older prisma versions don't support where inside _count select
    const websitesWithStats = await Promise.all(websites.map(async (site) => {
      const newThisWeek = await prisma.lead.count({
        where: {
          websiteId: site.id,
          createdAt: { gte: oneWeekAgo }
        }
      });
      const unreadLeads = await prisma.lead.count({
        where: {
          websiteId: site.id,
          status: "NEW"
        }
      });
      return {
        ...site,
        stats: {
          total: site._count.leads,
          newThisWeek,
          unread: unreadLeads
        }
      };
    }));

    const plainWebsites = JSON.parse(JSON.stringify(websitesWithStats));
    return { success: true, websites: plainWebsites };
  } catch (error) {
    console.error("Error fetching websites:", error);
    return { success: false, error: "Failed to fetch websites" };
  }
}

export async function createWebsite(data: { name: string; domain: string }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Ensure the mock workspace exists
    let workspace = await prisma.workspace.findUnique({
      where: { id: "mock_workspace_id" }
    });
    
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: "mock_workspace_id",
          name: "Default Workspace",
        }
      });
    }

    // Generate custom slug-based website ID
    let domainName = data.domain
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, "") // remove protocol and www
      .split(".")[0]; // keep only the main name before first dot
    
    // Sanitize domainName to keep only alphanumeric and hyphens
    domainName = domainName.replace(/[^a-z0-9-]/g, "");
    
    if (!domainName) {
      // Fallback to name slug if domain part is empty
      domainName = data.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "");
    }
    
    if (!domainName) {
      domainName = "site";
    }
    
    let customSiteId = "";
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      customSiteId = `${domainName}-${randomNum}`;
      
      const existing = await prisma.website.findUnique({
        where: { id: customSiteId }
      });
      
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!customSiteId) {
      customSiteId = `${domainName}-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    const newSite = await prisma.website.create({
      data: {
        id: customSiteId,
        name: data.name,
        domain: data.domain,
        workspaceId: "mock_workspace_id", 
      },
    });

    const plainSite = JSON.parse(JSON.stringify(newSite));
    revalidatePath("/websites");
    return { success: true, website: plainSite };
  } catch (error) {
    console.error("Error creating website:", error);
    return { success: false, error: "Failed to create website" };
  }
}

export async function createClientLogin(data: { 
  email: string; 
  firstName: string;
  lastName: string;
  websiteId: string; 
  websiteName: string; 
}) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const clerk = await clerkClient();

    // Check if user already exists in Clerk
    const existingUsers = await clerk.users.getUserList({ emailAddress: [data.email] });
    
    if (existingUsers.totalCount > 0) {
      return { success: false, error: `A user with email ${data.email} already exists.` };
    }

    // Create the Clerk user with a temporary password
    const tempPassword = `Client@${Math.random().toString(36).slice(2, 10)}!`;
    
    const newClerkUser = await clerk.users.createUser({
      emailAddress: [data.email],
      firstName: data.firstName,
      lastName: data.lastName,
      password: tempPassword,
      publicMetadata: {
        role: "CLIENT",
        websiteId: data.websiteId,
        websiteName: data.websiteName,
      },
    });

    // Also save user to our database
    await prisma.user.upsert({
      where: { email: data.email },
      create: {
        id: newClerkUser.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "CLIENT",
        websiteId: data.websiteId,
        workspaceId: "mock_workspace_id",
      },
      update: {
        websiteId: data.websiteId,
        role: "CLIENT",
      },
    });

    return { 
      success: true, 
      tempPassword,
      message: `Client account created! Share these credentials:\nEmail: ${data.email}\nPassword: ${tempPassword}` 
    };
  } catch (error: unknown) {
    console.error("Error creating client login:", error);
    const errMsg = (error as { errors?: Array<{ message: string }> })?.errors?.[0]?.message || "Failed to create client login";
    return { success: false, error: errMsg };
  }
}

export async function resetClientPassword(userId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const clerk = await clerkClient();
    const tempPassword = `Client@${Math.random().toString(36).slice(2, 10)}!`;
    
    await clerk.users.updateUser(userId, {
      password: tempPassword
    });

    return { success: true, tempPassword };
  } catch (error: unknown) {
    console.error("Error resetting password:", error);
    return { success: false, error: "Failed to reset password" };
  }
}

export async function deleteClientLogin(userId: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const clerk = await clerkClient();
    
    // Delete from Clerk
    await clerk.users.deleteUser(userId);
    
    // Delete from Prisma
    await prisma.user.delete({
      where: { id: userId }
    });

    revalidatePath("/websites");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting client user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

export async function getIntegrationsData() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const role = user.role;
    const websiteId = user.websiteId;
    const isClient = role === "CLIENT" && !!websiteId;

    const whereClause = isClient ? { id: websiteId } : {};
    const leadsWhereClause = isClient ? { websiteId } : {};

    const [websites, leads] = await Promise.all([
      prisma.website.findMany({
        where: whereClause,
        include: {
          users: {
            where: { role: "CLIENT" },
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.findMany({
        where: leadsWhereClause,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          source: true,
          createdAt: true,
          websiteId: true,
        },
      })
    ]);

    return {
      success: true,
      websites: JSON.parse(JSON.stringify(websites)),
      leads: JSON.parse(JSON.stringify(leads)),
    };
  } catch (error) {
    console.error("Error fetching integrations data:", error);
    return { success: false, error: "Failed to fetch integrations data" };
  }
}
