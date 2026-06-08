import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const WORKSPACE_ID = "mock_workspace_id";

export async function POST(req: Request) {
  try {
    const { leadIds, subject, body } = await req.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "No leads selected" }, { status: 400 });
    }

    if (!subject || !body) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    // Fetch workspace settings
    const workspace = await prisma.workspace.findUnique({
      where: { id: WORKSPACE_ID },
      select: {
        emailProvider: true,
        emailApiKey: true,
        fromEmailAddress: true,
        fromEmailName: true,
      }
    });

    if (!workspace?.emailApiKey) {
      return NextResponse.json({ 
        error: "Email API Key is missing. Please configure it in Settings." 
      }, { status: 400 });
    }

    if (!workspace?.fromEmailAddress) {
      return NextResponse.json({ 
        error: "From Email Address is missing. Please configure it in Settings." 
      }, { status: 400 });
    }

    // Fetch leads
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, fullName: true, email: true }
    });

    const leadsWithEmail = leads.filter(l => l.email);

    if (leadsWithEmail.length === 0) {
      return NextResponse.json({ error: "None of the selected leads have an email address." }, { status: 400 });
    }

    // Format From address
    const fromStr = workspace.fromEmailName 
      ? `${workspace.fromEmailName} <${workspace.fromEmailAddress}>`
      : workspace.fromEmailAddress;

    // Construct the batch payload for Resend
    const batchPayload = leadsWithEmail.map(lead => {
      // Replace {{First Name}} with the lead's actual first name
      const firstName = lead.fullName.split(' ')[0] || "there";
      const customizedBody = body.replace(/\{\{\s*First Name\s*\}\}/g, firstName);

      // Convert newlines to HTML breaks for basic formatting
      const htmlBody = customizedBody.replace(/\n/g, '<br />');

      return {
        from: fromStr,
        to: [lead.email],
        subject: subject,
        html: htmlBody,
      };
    });

    // Make request to Resend Batch API
    const response = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${workspace.emailApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(batchPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[RESEND BATCH ERROR]", errorData);
      return NextResponse.json({ 
        error: "Email provider rejected the request. Check your API key and verified domains.",
        details: errorData 
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({ 
      success: true, 
      message: `Successfully queued ${leadsWithEmail.length} emails.`,
      data
    }, { status: 200 });

  } catch (error) {
    console.error("[EMAIL SEND ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
