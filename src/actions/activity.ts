"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export type ActivityItem = {
  id: string;
  type: "lead_create" | "note_create" | "sms_alert" | "push_alert";
  title: string;
  description: string;
  timestamp: string;
  websiteName: string;
  link: string;
  meta?: any;
};

export async function getActivityLog() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const role = user.role;
    const websiteId = user.websiteId;
    const isClient = role === "CLIENT" && !!websiteId;

    const whereClause = isClient ? { websiteId } : {};

    // Fetch leads and notes in parallel
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
        where: isClient ? {
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

    // 1. Process Lead Creation activities
    recentLeads.forEach(lead => {
      activities.push({
        id: `lead-${lead.id}`,
        type: "lead_create",
        title: "New Lead Captured",
        description: `Form submitted by "${lead.fullName}" via ${lead.source || "Website Form"}.`,
        timestamp: lead.createdAt.toISOString(),
        websiteName: lead.website?.name || "Unknown Website",
        link: isClient ? `/client/${lead.websiteId}` : `/client/${lead.websiteId}?leadId=${lead.id}`,
        meta: {
          email: lead.email,
          phone: lead.phone,
          score: lead.score,
          priority: lead.priority,
          temperature: lead.temperature
        }
      });

      // Add SMS alert activity if sent
      if (lead.smsSent) {
        activities.push({
          id: `sms-${lead.id}`,
          type: "sms_alert",
          title: "SMS Alert Delivered",
          description: `SMS notification dispatched to admin for lead "${lead.fullName}".`,
          timestamp: lead.createdAt.toISOString(), // happened at the same time
          websiteName: lead.website?.name || "Unknown Website",
          link: isClient ? `/client/${lead.websiteId}` : `/client/${lead.websiteId}?leadId=${lead.id}`,
        });
      }

      // Add Push notification activity if sent
      if (lead.pushSent) {
        activities.push({
          id: `push-${lead.id}`,
          type: "push_alert",
          title: "Push Notification Broadcasted",
          description: `Web Push alert broadcasted to all subscribed staff members.`,
          timestamp: lead.createdAt.toISOString(),
          websiteName: lead.website?.name || "Unknown Website",
          link: isClient ? `/client/${lead.websiteId}` : `/client/${lead.websiteId}?leadId=${lead.id}`,
        });
      }
    });

    // 2. Process Note Creation activities
    recentNotes.forEach(note => {
      activities.push({
        id: `note-${note.id}`,
        type: "note_create",
        title: "Call Logged / Note Added",
        description: `"${note.authorName || 'Staff Member'}" added a log details note for lead "${note.lead.fullName}".`,
        timestamp: note.createdAt.toISOString(),
        websiteName: note.lead.website?.name || "Unknown Website",
        link: isClient ? `/client/${note.lead.websiteId}` : `/client/${note.lead.websiteId}?leadId=${note.leadId}`,
        meta: {
          content: note.content
        }
      });
    });

    // 3. Sort chronologically (descending)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Take top 40 sorted activities
    const finalActivities = activities.slice(0, 40);

    return { success: true, activities: finalActivities };
  } catch (error) {
    console.error("[GET_ACTIVITY_LOG_ERROR]", error);
    return { success: false, error: "Failed to load activity logs" };
  }
}
