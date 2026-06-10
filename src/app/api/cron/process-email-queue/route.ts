import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Fetch pending queue items that are due
    const pendingItems = await prisma.emailQueue.findMany({
      where: {
        status: "PENDING",
        scheduledFor: { lte: new Date() }
      },
      include: {
        template: true,
        lead: true,
        workspace: true
      },
      take: 50 // process in batches
    });

    if (pendingItems.length === 0) {
      return NextResponse.json({ success: true, message: "No pending items" });
    }

    const processed = [];

    // 2. Process each item
    for (const item of pendingItems) {
      if (!item.lead.email || !item.workspace.emailApiKey || item.workspace.emailProvider !== "RESEND") {
        await prisma.emailQueue.update({
          where: { id: item.id },
          data: { status: "FAILED" }
        });
        continue;
      }

      const { template, lead, workspace } = item;

      // Replace variables
      const subject = template.subject
        .replace(/{{name}}/g, lead.fullName || "")
        .replace(/{{email}}/g, lead.email || "")
        .replace(/{{source}}/g, lead.source || "Website")
        .replace(/{{company}}/g, "Our Company");

      const rawBody = template.bodyHtml
        .replace(/{{name}}/g, lead.fullName || "")
        .replace(/{{email}}/g, lead.email || "")
        .replace(/{{source}}/g, lead.source || "Website")
        .replace(/{{company}}/g, "Our Company");

      const footer = `<br/><br/><hr style="border:0;border-top:1px solid #eee;"/><p style="font-size:11px;color:#888;">You are receiving this email because you recently contacted us. <a href="#">Unsubscribe</a></p>`;
      const finalHtmlBody = rawBody + footer;

      const fromStr = workspace.fromEmailName
        ? `${workspace.fromEmailName} <${workspace.fromEmailAddress || "onboarding@resend.dev"}>`
        : (workspace.fromEmailAddress || "onboarding@resend.dev");

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${(workspace.emailApiKey || "").trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromStr,
            to: [lead.email],
            subject: subject,
            html: finalHtmlBody,
          })
        });

        if (!emailRes.ok) {
          throw new Error("Resend API failed");
        }

        const resendData = await emailRes.json();

        // Mark queue item as sent
        await prisma.emailQueue.update({
          where: { id: item.id },
          data: { status: "SENT" }
        });

        // Log campaign
        const campaign = await prisma.emailCampaign.create({
          data: {
            subject,
            body: finalHtmlBody,
            status: "SENT",
            sentAt: new Date(),
            workspaceId: workspace.id,
          }
        });

        await prisma.emailRecipient.create({
          data: {
            emailCampaignId: campaign.id,
            leadId: lead.id,
            status: "SENT",
            sentAt: new Date(),
            resendId: resendData.id || null
          }
        });

        processed.push(item.id);

      } catch (err) {
        await prisma.emailQueue.update({
          where: { id: item.id },
          data: { status: "FAILED" }
        });
      }
    }

    return NextResponse.json({ success: true, processedCount: processed.length });
  } catch (error) {
    console.error("[CRON ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
