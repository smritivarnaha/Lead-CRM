import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  // This endpoint should be triggered by a CRON job (e.g. Vercel Cron) every day at 9 AM.
  // Example verification (ensure it's requested by Vercel)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== "development") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Find all leads in "NO_RESPONSE" or "CONTACTED" state that haven't been updated in 3+ days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const staleLeads = await prisma.lead.findMany({
      where: {
        status: { in: ["NO_RESPONSE", "CONTACTED"] },
        updatedAt: { lte: threeDaysAgo },
        email: { not: null }
      }
    });

    // 2. Loop through and send automated follow-up emails
    let emailsSent = 0;
    for (const lead of staleLeads) {
      // NOTE: Integration with Resend/SendGrid/Nodemailer goes here.
      // e.g. await sendEmail({ to: lead.email, subject: "Checking in!", body: "Hi, still interested in our services?" });
      emailsSent++;
      
      // Update status to FOLLOW_UP so we don't spam them repeatedly
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "FOLLOW_UP" }
      });
    }

    return NextResponse.json({ success: true, processed: staleLeads.length, emailsSent });
  } catch (error) {
    console.error("Drip campaign error:", error);
    return NextResponse.json({ success: false, error: "Failed to execute drip campaign" }, { status: 500 });
  }
}
