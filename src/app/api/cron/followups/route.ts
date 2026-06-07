import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";

// Force this route to always execute dynamically
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Basic security check to prevent random spam (can use a CRON_SECRET env variable)
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find leads that are not in terminal states and have passed their followUpAt time
    const overdueLeads = await prisma.lead.findMany({
      where: {
        status: {
          notIn: ["CONVERTED", "LOST", "JUNK"]
        },
        followUpAt: {
          lte: new Date()
        }
      },
      select: {
        id: true,
        fullName: true,
        website: { select: { name: true } }
      }
    });

    if (overdueLeads.length > 0) {
      // Build a comprehensive push notification payload
      const title = overdueLeads.length === 1 
        ? `Overdue Follow-up: ${overdueLeads[0].fullName}`
        : `${overdueLeads.length} Overdue Follow-ups!`;
      
      const body = overdueLeads.length === 1
        ? `Lead from ${overdueLeads[0].website.name} requires your attention.`
        : `You have ${overdueLeads.length} leads waiting for a follow-up. Keep the momentum going!`;

      await sendPushToAll({
        title,
        body,
        url: "/followups",
        icon: "/icon-192.png",
      });

      // NOTE: In a true robust system, you might want a `lastNotifiedAt` field on Lead 
      // to avoid spamming the same notification every minute if the cron runs too often.
      // For this system, we assume the staff will either snooze the lead or convert it.
    }

    return NextResponse.json({
      success: true,
      overdueCount: overdueLeads.length,
      message: overdueLeads.length > 0 ? "Notifications sent" : "No overdue followups",
    });
  } catch (error) {
    console.error("[CRON ERROR]", error);
    return NextResponse.json({ error: "Failed to process cron job" }, { status: 500 });
  }
}
