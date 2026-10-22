"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import { cache } from "react";

export type ActivityItem = {
  id: string;
  type: "lead_create" | "note_create" | "sms_alert" | "push_alert";
  title: string;
  description: string;
  timestamp: string;
  websiteName: string;
  websiteId?: string;
  link: string;
  meta?: any;
};

const getCachedActivityLog = unstable_cache(
  async (isClient: boolean, websiteId: string | null) => {
    const whereClause = isClient && websiteId ? { websiteId } : {};

    const [recentLeads, recentNotes] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          website: {
            select: { name: true }
          }
        }
      }),
      prisma.note.findMany({
        where: isClient && websiteId ? {
          lead: { websiteId }
        } : {},
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          lead: {
            include: {
              website: {
                select: { name: true }
              }
            }
          }
        }
      })
    ]);

    const activities: ActivityItem[] = [];

    recentLeads.forEach(lead => {
      activities.push({
        id: `lead-${lead.id}`,
        type: "lead_create",
        title: "New Lead Captured",
        description: `Form submitted by "${lead.fullName}" via ${lead.source || "Website Form"}.`,
        timestamp: lead.createdAt.toISOString(),
        websiteName: lead.website?.name || "Unknown Website",
        websiteId: lead.websiteId,
        link: isClient ? `/client/${lead.websiteId}` : `/client/${lead.websiteId}?leadId=${lead.id}`,
        meta: {
          email: lead.email,
          phone: lead.phone,
          score: lead.score,
          priority: lead.priority,
          temperature: lead.temperature
        }
      });

      if (lead.smsSent) {
        activities.push({
          id: `sms-${lead.id}`,
          type: "sms_alert",
          title: "SMS Alert Delivered",
          description: `SMS notification dispatched to admin for lead "${lead.fullName}".`,
          timestamp: lead.createdAt.toISOString(),
          websiteName: lead.website?.name || "Unknown Website",
          websiteId: lead.websiteId,
          link: isClient ? `/client/${lead.websiteId}` : `/client/${lead.websiteId}?leadId=${lead.id}`,
        });
      }

      if (lead.pushSent) {
        activities.push({
          id: `push-${lead.id}`,
          type: "push_alert",
          title: "Push Notification Broadcasted",
          description: `Web Push alert broadcasted to all subscribed staff members.`,
          timestamp: lead.createdAt.toISOString(),
          websiteName: lead.website?.name || "Unknown Website",
          websiteId: lead.websiteId,
          link: isClient ? `/client/${lead.websiteId}` : `/client/${lead.websiteId}?leadId=${lead.id}`,
        });
      }
    });

    recentNotes.forEach(note => {
      activities.push({
        id: `note-${note.id}`,
        type: "note_create",
        title: "Call Logged / Note Added",
        description: `"${note.authorName || 'Staff Member'}" added a log details note for lead "${note.lead.fullName}".`,
        timestamp: note.createdAt.toISOString(),
        websiteName: note.lead.website?.name || "Unknown Website",
        websiteId: note.lead.websiteId,
        link: isClient ? `/client/${note.lead.websiteId}` : `/client/${note.lead.websiteId}?leadId=${note.leadId}`,
        meta: {
          content: note.content
        }
      });
    });

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, 40);
  },
  ["activity_log_cache"],
  { revalidate: 20, tags: ["activity_cache", "leads_cache"] }
);

export const getActivityLog = cache(async () => {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const isClient = user.role === "CLIENT" && !!user.websiteId;
    const activities = await getCachedActivityLog(isClient, user.websiteId || null);

    return { success: true, activities };
  } catch (error) {
    console.error("[GET_ACTIVITY_LOG_ERROR]", error);
    return { success: false, error: "Failed to load activity logs" };
  }
});
