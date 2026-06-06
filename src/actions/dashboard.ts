"use server";

import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function getDashboardStats() {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const role = user.publicMetadata?.role as string | undefined;
    const websiteId = user.publicMetadata?.websiteId as string | undefined;
    const isClient = role === "CLIENT" && !!websiteId;
    const whereClause = isClient ? { websiteId } : {};

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Run all queries in parallel
    const [
      totalLeads,
      leadsThisMonth,
      leadsLastMonth,
      leadsToday,
      convertedLeads,
      activeWebsites,
      newLeads,
      contactedLeads,
      followUpLeads,
      recentLeads,
      last7Days,
    ] = await Promise.all([
      prisma.lead.count({ where: whereClause }),
      prisma.lead.count({ where: { ...whereClause, createdAt: { gte: startOfThisMonth } } }),
      prisma.lead.count({ where: { ...whereClause, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.lead.count({ where: { ...whereClause, createdAt: { gte: startOfToday } } }),
      prisma.lead.count({ where: { ...whereClause, status: "CONVERTED" } }),
      isClient ? Promise.resolve(1) : prisma.website.count({ where: { isActive: true } }),
      prisma.lead.count({ where: { ...whereClause, status: "NEW" } }),
      prisma.lead.count({ where: { ...whereClause, status: "CONTACTED" } }),
      prisma.lead.count({ where: { ...whereClause, status: "FOLLOW_UP" } }),
      // Recent 5 leads
      prisma.lead.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          fullName: true,
          source: true,
          status: true,
          priority: true,
          createdAt: true,
          website: { select: { name: true } },
        },
      }),
      // Last 7 days leads per day
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT 
          TO_CHAR(DATE_TRUNC('day', "createdAt"), 'Dy') as day,
          COUNT(*) as count
        FROM "Lead"
        WHERE "createdAt" >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE_TRUNC('day', "createdAt"), TO_CHAR(DATE_TRUNC('day', "createdAt"), 'Dy')
        ORDER BY DATE_TRUNC('day', "createdAt") ASC
      `,
    ]);

    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0.0";
    const monthGrowth = leadsLastMonth > 0
      ? (((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100).toFixed(1)
      : leadsThisMonth > 0 ? "100.0" : "0.0";

    const chartData = (last7Days as Array<{ day: string; count: bigint }>).map(row => ({
      name: row.day,
      leads: Number(row.count),
    }));

    return {
      success: true,
      stats: {
        totalLeads,
        leadsToday,
        leadsThisMonth,
        conversionRate,
        monthGrowth: Number(monthGrowth),
        activeWebsites,
        newLeads,
        contactedLeads,
        followUpLeads,
        convertedLeads,
      },
      recentLeads: JSON.parse(JSON.stringify(recentLeads)),
      chartData,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}
