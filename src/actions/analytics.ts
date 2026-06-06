"use server";

import "server-only";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function getDashboardStats() {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // In a fully multi-tenant system, we would filter by workspaceId
    const [totalLeads, convertedLeads, leadsByStatus, recentLeads] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "CONVERTED" } }),
      prisma.lead.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
      prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { website: true },
      }),
    ]);

    const conversionRate = totalLeads === 0 ? 0 : Math.round((convertedLeads / totalLeads) * 100);
    
    // Assume average lead value is $1,000 for Pipeline Value
    const estimatedPipelineValue = totalLeads * 1000;

    // Format chart data for Recharts
    const chartData = leadsByStatus.map(statusGroup => ({
      name: statusGroup.status,
      total: statusGroup._count.status,
    }));

    return { 
      success: true, 
      stats: {
        totalLeads,
        convertedLeads,
        conversionRate,
        estimatedPipelineValue,
        chartData,
        recentLeads: recentLeads.map(l => ({
          id: l.id,
          name: l.fullName,
          email: l.email,
          website: l.website?.name || "Unknown",
          createdAt: l.createdAt,
          status: l.status,
        })),
      }
    };
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return { success: false, error: "Failed to load dashboard stats" };
  }
}
