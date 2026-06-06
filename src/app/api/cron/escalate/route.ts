import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";

export async function GET(request: Request) {
  // Vercel Cron auth check
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Find leads with a follow-up due today or overdue, not yet converted/lost
    const dueLeads = await prisma.lead.findMany({
      where: {
        followUpAt: { lte: todayEnd },
        status: { notIn: ["CONVERTED", "LOST"] },
      },
      select: { id: true, fullName: true, phone: true, status: true, followUpAt: true },
      take: 50,
    });

    console.log(`[CRON] Found ${dueLeads.length} follow-up(s) due.`);

    if (dueLeads.length > 0) {
      // Send one grouped push if multiple, individual if just one
      if (dueLeads.length === 1) {
        const lead = dueLeads[0];
        await sendPushToAll({
          title: "⏰ Follow-up Due",
          body: `Time to follow up with ${lead.fullName}${lead.phone ? ` · ${lead.phone}` : ""}`,
          url: "/leads",
          actions: [
            { action: "view", title: "Open Leads" },
            { action: "dismiss", title: "Dismiss" },
          ],
        });
      } else {
        await sendPushToAll({
          title: `⏰ ${dueLeads.length} Follow-ups Due Today`,
          body: dueLeads.slice(0, 3).map(l => l.fullName).join(", ") + (dueLeads.length > 3 ? ` +${dueLeads.length - 3} more` : ""),
          url: "/leads",
          actions: [{ action: "view", title: "Open Leads" }],
        });
      }
    }

    // 2. Escalate NEW leads that have been sitting for > 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const neglectedLeads = await prisma.lead.findMany({
      where: { status: "NEW", createdAt: { lt: thirtyMinAgo } },
      select: { id: true, fullName: true },
      take: 20,
    });

    if (neglectedLeads.length > 0) {
      await sendPushToAll({
        title: `🚨 ${neglectedLeads.length} Lead(s) Not Contacted`,
        body: `${neglectedLeads[0].fullName}${neglectedLeads.length > 1 ? ` and ${neglectedLeads.length - 1} more` : ""} — waiting 30+ min`,
        url: "/leads",
        actions: [{ action: "view", title: "Review Now" }],
      });
    }

    return NextResponse.json({
      success: true,
      followUpsDue: dueLeads.length,
      neglected: neglectedLeads.length,
    });
  } catch (error) {
    console.error("[CRON ERROR]", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
