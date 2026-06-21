import prisma from "@/lib/prisma";
import { generateEmailHtml, EmailTheme } from "@/lib/emailTemplates";

export async function processEmailAutomations(lead: any, trigger: string, newStatus?: string) {
  try {
    // Check if automations are globally enabled for this workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: lead.workspaceId },
    });

    if (!workspace || !workspace.emailAutomationsEnabled) {
      return;
    }

    if (!workspace.emailProvider || workspace.emailProvider !== "RESEND" || !workspace.emailApiKey) {
      console.warn("[AUTOMATIONS] Resend is not configured for workspace", workspace.id);
      return;
    }

    // Find active automations for this trigger
    const automations = await prisma.emailAutomation.findMany({
      where: {
        workspaceId: lead.workspaceId,
        isActive: true,
        trigger: trigger,
        ...(newStatus ? { statusValue: newStatus } : {})
      },
      include: { template: true }
    });

    if (!automations || automations.length === 0) {
      return;
    }

    // Process each automation
    for (const automation of automations) {
      if (!automation.template) continue;
      
      const { template } = automation;
      
      // Replace variables in subject and body
      const subject = template.subject
        .replace(/{{name}}/g, lead.fullName || "")
        .replace(/{{email}}/g, lead.email || "")
        .replace(/{{source}}/g, lead.source || "Website")
        .replace(/{{company}}/g, "Our Company"); // In a real app, use workspace name

      const rawBody = template.bodyHtml
        .replace(/{{name}}/g, lead.fullName || "")
        .replace(/{{email}}/g, lead.email || "")
        .replace(/{{source}}/g, lead.source || "Website")
        .replace(/{{company}}/g, "Our Company");

      // Wrap in standard layout if needed, or if the template provides its own HTML, just use it
      // Let's assume bodyHtml is ready to send but we might need CAN-SPAM footers
      const footer = `<br/><br/><hr style="border:0;border-top:1px solid #eee;"/><p style="font-size:11px;color:#888;text-align:center;">You are receiving this email because you recently contacted us. <a href="#">Unsubscribe</a><br/><br/><span style="text-transform:uppercase;letter-spacing:0.5px;">Lead Automation CRM Developed By Rankved Healthcare Martech</span></p>`;
      const finalHtmlBody = rawBody + footer;

      const fromStr = workspace.fromEmailName
        ? `${workspace.fromEmailName} <${workspace.fromEmailAddress || "onboarding@resend.dev"}>`
        : (workspace.fromEmailAddress || "onboarding@resend.dev");

      // Handle delayed emails using a background queue in a real production app.
      // For now, if delayMinutes > 0, we can use a setTimeout or a specialized API like Upstash QStash.
      // Since this is a CRM prototype, we'll execute it immediately if delay is 0, else we'd queue it.
      if (automation.delayMinutes === 0) {
        if (lead.email) {
           const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${workspace.emailApiKey.trim()}`,
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
            console.error("[AUTOMATION EMAIL FAILED]", await emailRes.json());
          } else {
             const resendData = await emailRes.json();
             // Create a campaign log and recipient entry to track it
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
          }
        }
      } else {
        if (lead.email) {
          const scheduledFor = new Date(Date.now() + automation.delayMinutes * 60000);
          await prisma.emailQueue.create({
            data: {
              automationId: automation.id,
              templateId: template.id,
              leadId: lead.id,
              workspaceId: workspace.id,
              scheduledFor: scheduledFor,
              status: "PENDING"
            }
          });
          console.log(`[AUTOMATION] Queued email with delay ${automation.delayMinutes} mins. Scheduled for ${scheduledFor.toISOString()}`);
        }
      }
    }

  } catch (error) {
    console.error("[AUTOMATION ERROR]", error);
  }
}
