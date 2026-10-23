"use server";

import prisma from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";

function enrichWebsiteConfig(site: any) {
  if (!site) return site;
  const enriched = { ...site };
  if (typeof site.apiKey === "string" && site.apiKey.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(site.apiKey);
      if (parsed.subject || parsed.adminEmailSubject) {
        enriched.adminEmailSubject = parsed.adminEmailSubject || parsed.subject;
      }
      if (parsed.notice || parsed.adminEmailSourceNote) {
        enriched.adminEmailSourceNote = parsed.adminEmailSourceNote || parsed.notice;
      }
      if (parsed.message || parsed.adminEmailMessage) {
        enriched.adminEmailMessage = parsed.adminEmailMessage || parsed.message;
      }
      if (parsed.cta || parsed.adminEmailCtaLabel) {
        enriched.adminEmailCtaLabel = parsed.adminEmailCtaLabel || parsed.cta;
      }
      if (parsed.ctaUrl || parsed.adminEmailCtaUrl) {
        enriched.adminEmailCtaUrl = parsed.adminEmailCtaUrl || parsed.ctaUrl;
      }
    } catch {}
  }
  return enriched;
}

const getCachedWebsitesList = unstable_cache(
  async (isClient: boolean, websiteId?: string | null) => {
    const sites = await prisma.website.findMany({
      where: isClient && websiteId ? { id: websiteId } : undefined,
      orderBy: {
        createdAt: "desc",
      },
    });
    return sites.map(enrichWebsiteConfig);
  },
  ["websites_list_cache"],
  { revalidate: 60, tags: ["websites_list"] }
);

const getCachedWebsitesWithStats = unstable_cache(
  async (isClient: boolean, websiteId?: string | null) => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const websitesPromise = prisma.website.findMany({
      where: isClient && websiteId ? { id: websiteId } : undefined,
      include: {
        users: {
          where: { role: "CLIENT" },
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const newThisWeekPromise = prisma.lead.groupBy({
      by: ["websiteId"],
      where: {
        ...(isClient && websiteId ? { websiteId } : {}),
        createdAt: { gte: oneWeekAgo },
      },
      _count: { id: true },
    });

    const unreadPromise = prisma.lead.groupBy({
      by: ["websiteId"],
      where: {
        ...(isClient && websiteId ? { websiteId } : {}),
        status: "NEW",
      },
      _count: { id: true },
    });

    const [websites, newThisWeekGroups, unreadGroups] = await Promise.all([
      websitesPromise,
      newThisWeekPromise,
      unreadPromise,
    ]);

    const newThisWeekMap = new Map<string, number>();
    newThisWeekGroups.forEach((g) => newThisWeekMap.set(g.websiteId, g._count.id));

    const unreadMap = new Map<string, number>();
    unreadGroups.forEach((g) => unreadMap.set(g.websiteId, g._count.id));

    return websites.map((site) =>
      enrichWebsiteConfig({
        ...site,
        stats: {
          total: site._count.leads,
          newThisWeek: newThisWeekMap.get(site.id) || 0,
          unread: unreadMap.get(site.id) || 0,
        },
      })
    );
  },
  ["websites_with_stats_cache"],
  { revalidate: 20, tags: ["websites_stats"] }
);

export const getWebsites = cache(async () => {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const isClient = user.role === "CLIENT" && !!user.websiteId;
    const websitesWithStats = await getCachedWebsitesWithStats(isClient, user.websiteId || null);

    return { success: true, websites: JSON.parse(JSON.stringify(websitesWithStats)) };
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE") throw error;
    console.error("Error fetching websites:", error);
    return { success: false, error: "Failed to fetch websites" };
  }
});

/**
 * Ultra-fast, lightweight website list for project tabs, dropdowns, and settings.
 * Selects all scalar website fields without heavy lead grouping/counting queries.
 */
export const getWebsitesList = cache(async () => {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const isClient = user.role === "CLIENT" && !!user.websiteId;
    const websites = await getCachedWebsitesList(isClient, user.websiteId || null);

    return { success: true, websites: JSON.parse(JSON.stringify(websites)) };
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE") throw error;
    console.error("Error in getWebsitesList:", error);
    return { success: false, error: "Failed to fetch websites list" };
  }
});

export async function createWebsite(data: { name: string; domain: string }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Ensure the mock workspace exists
    let workspace = await prisma.workspace.findUnique({
      where: { id: "mock_workspace_id" },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: "mock_workspace_id",
          name: "Default Workspace",
        },
      });
    }

    // Generate custom slug-based website ID
    let domainName = data.domain
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .split(".")[0];

    domainName = domainName.replace(/[^a-z0-9-]/g, "");

    if (!domainName) {
      domainName = data.name.toLowerCase().replace(/[^a-z0-9-]/g, "");
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
        where: { id: customSiteId },
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
    revalidatePath("/", "layout");
    try {
      (revalidateTag as any)("websites_list", { expire: 0 });
      (revalidateTag as any)("websites_stats", { expire: 0 });
    } catch (e) {}
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

    try {
      (revalidateTag as any)("websites_stats", { expire: 0 });
      (revalidateTag as any)("auth_user", { expire: 0 });
    } catch (e) {}

    return {
      success: true,
      tempPassword,
      message: `Client account created! Share these credentials:\nEmail: ${data.email}\nPassword: ${tempPassword}`,
    };
  } catch (error: unknown) {
    console.error("Error creating client login:", error);
    const errMsg =
      (error as { errors?: Array<{ message: string }> })?.errors?.[0]?.message ||
      "Failed to create client login";
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
      password: tempPassword,
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
      where: { id: userId },
    });

    revalidatePath("/websites");
    try {
      (revalidateTag as any)("websites_stats", { expire: 0 });
      (revalidateTag as any)("auth_user", { expire: 0 });
    } catch (e) {}
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting client user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

const getCachedIntegrationsData = unstable_cache(
  async (isClient: boolean, websiteId: string | null) => {
    const whereClause = isClient && websiteId ? { id: websiteId } : {};
    const leadsWhereClause = isClient && websiteId ? { websiteId } : {};

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
        take: 300,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          source: true,
          createdAt: true,
          websiteId: true,
        },
      }),
    ]);

    return {
      websites: JSON.parse(JSON.stringify(websites.map(enrichWebsiteConfig))),
      leads: JSON.parse(JSON.stringify(leads)),
    };
  },
  ["integrations_data_cache"],
  { revalidate: 20, tags: ["websites_list", "leads_cache"] }
);

export const getIntegrationsData = cache(async () => {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const isClient = user.role === "CLIENT" && !!user.websiteId;
    const data = await getCachedIntegrationsData(isClient, user.websiteId || null);

    return {
      success: true,
      websites: data.websites,
      leads: data.leads,
    };
  } catch (error) {
    console.error("Error fetching integrations data:", error);
    return { success: false, error: "Failed to fetch integrations data" };
  }
});
