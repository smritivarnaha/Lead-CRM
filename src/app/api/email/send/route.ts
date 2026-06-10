import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const WORKSPACE_ID = "mock_workspace_id";

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    if (!bodyText) {
       return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }
    const { 
      leadIds, 
      subject, 
      body, 
      action = "send",
      isABTest = false,
      variantASubject,
      variantABody,
      variantBSubject,
      variantBBody
    } = JSON.parse(bodyText);

    if (!subject || !body) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    if (action === "send" && (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0)) {
      return NextResponse.json({ error: "No leads selected" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: WORKSPACE_ID },
      select: {
        emailProvider: true,
        emailApiKey: true,
        fromEmailAddress: true,
        fromEmailName: true,
      }
    });

    if (action === "send") {
      if (!workspace?.emailApiKey) {
        return NextResponse.json({ 
          error: "Email API Key is missing. Please configure it in Settings." 
        }, { status: 400 });
      }

      const trimmedApiKey = workspace.emailApiKey.trim();
      if (!trimmedApiKey.startsWith("re_")) {
        return NextResponse.json({ 
          error: "Invalid API Key format. Resend API keys must start with 're_'." 
        }, { status: 400 });
      }

      if (!workspace?.fromEmailAddress) {
        return NextResponse.json({ 
          error: "From Email Address is missing. Please configure it in Settings." 
        }, { status: 400 });
      }

      const leads = await prisma.lead.findMany({
        where: { id: { in: leadIds } },
        select: { id: true, fullName: true, email: true }
      });

      const leadsWithEmail = leads.filter(l => l.email);

      if (leadsWithEmail.length === 0) {
        return NextResponse.json({ error: "None of the selected leads have an email address." }, { status: 400 });
      }

      const fromStr = workspace.fromEmailName 
        ? `${workspace.fromEmailName} <${workspace.fromEmailAddress}>`
        : workspace.fromEmailAddress;

      const batchPayload = leadsWithEmail.map((lead, index) => {
        const firstName = lead.fullName.split(' ')[0] || "there";
        
        let finalSubject = subject;
        let finalBody = body;
        let variant = "A";

        if (isABTest) {
          // simple 50/50 split based on index (even = A, odd = B)
          if (index % 2 !== 0) {
            variant = "B";
            finalSubject = variantBSubject || subject;
            finalBody = variantBBody || body;
          } else {
            finalSubject = variantASubject || subject;
            finalBody = variantABody || body;
          }
        }

        const customizedBody = finalBody.replace(/\{\{\s*First Name\s*\}\}/g, firstName);
        const htmlBody = customizedBody.replace(/\n/g, '<br />');

        return {
          from: fromStr,
          to: [lead.email],
          subject: finalSubject,
          html: htmlBody,
          // Attach variant internally so we can retrieve it
          _variant: variant,
          _leadId: lead.id
        };
      });

      // We remove our internal fields before sending to Resend
      const resendPayload = batchPayload.map(({ _variant, _leadId, ...rest }) => rest);

      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${trimmedApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(resendPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[RESEND BATCH ERROR]", errorData);
        return NextResponse.json({ 
          error: "Email provider rejected the request. Check your API key and verified domains.",
          details: errorData 
        }, { status: response.status });
      }

      const resendData = await response.json();
      
      // Resend batch API returns data.data as array of objects containing the new email id
      // e.g. { data: [ { id: "req_123" }, { id: "req_456" } ] }
      const resendResults = resendData.data || [];

      const campaign = await prisma.emailCampaign.create({
        data: {
          subject: isABTest ? "A/B Test: " + (variantASubject || subject) : subject,
          body,
          isABTest,
          variantASubject: isABTest ? variantASubject : null,
          variantABody: isABTest ? variantABody : null,
          variantBSubject: isABTest ? variantBSubject : null,
          variantBBody: isABTest ? variantBBody : null,
          status: "SENT",
          sentAt: new Date(),
          workspaceId: WORKSPACE_ID,
          recipients: {
            create: batchPayload.map((item, i) => ({
              leadId: item._leadId,
              status: "SENT",
              sentAt: new Date(),
              variant: item._variant,
              resendId: resendResults[i]?.id || null
            }))
          }
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `Successfully queued ${leadsWithEmail.length} emails.`,
        data: resendData,
        campaign
      }, { status: 200 });

    } else if (action === "draft") {
      const campaign = await prisma.emailCampaign.create({
        data: {
          subject: isABTest ? "A/B Test: " + (variantASubject || subject) : subject,
          body,
          isABTest,
          variantASubject: isABTest ? variantASubject : null,
          variantABody: isABTest ? variantABody : null,
          variantBSubject: isABTest ? variantBSubject : null,
          variantBBody: isABTest ? variantBBody : null,
          status: "DRAFT",
          workspaceId: WORKSPACE_ID,
          recipients: {
            create: Array.isArray(leadIds) ? leadIds.map((id: string) => ({
              leadId: id,
              status: "PENDING"
            })) : []
          }
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: "Draft saved successfully.",
        campaign
      }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("[EMAIL SEND ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
