import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";

// Initialize Supabase Server Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// CORS headers — required for browser-based form submissions from external sites
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Also handle GET — some form plugins send a verification GET first
export async function GET() {
  return NextResponse.json(
    { success: true, message: "Webhook endpoint is active." },
    { headers: corsHeaders }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    const { websiteId } = await params;

    // Parse body — support both JSON and form-encoded (WordPress sends form-encoded)
    let body: Record<string, string> = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = value.toString();
      });
    } else {
      // Try JSON first, fall back to text
      try {
        const text = await request.text();
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }
    }

    console.log(`[WEBHOOK RECEIVED] Website: ${websiteId}`, body);

    // Ensure workspace exists
    const workspaceExists = await prisma.workspace.findUnique({
      where: { id: "mock_workspace_id" },
    });
    if (!workspaceExists) {
      await prisma.workspace.create({
        data: { id: "mock_workspace_id", name: "Default Workspace" },
      });
    }

    // Ensure the website exists (use the ID from the URL)
    const existingSite = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!existingSite) {
      // Website not found — return a clear error
      return NextResponse.json(
        { success: false, error: `No website found with ID: ${websiteId}. Please check the webhook URL in your CRM.` },
        { status: 404, headers: corsHeaders }
      );
    }

    // Map all common field names from different form plugins
    const fullName =
      body.name ||
      body.fullName ||
      body.full_name ||
      `${body.first_name || body.firstName || ""} ${body.last_name || body.lastName || ""}`.trim() ||
      "Unknown";

    const email = body.email || body["your-email"] || body.email_address || null;
    const phone = body.phone || body.tel || body.phone_number || body["your-phone"] || body.mobile || null;
    const message = body.message || body["your-message"] || body.comments || body.query || null;
    const source = body.source || body.form_name || body.form_id || body["_wpcf7"] ? "WordPress Form" : "Website Form";
    const utmSource = body.utm_source || null;
    const utmMedium = body.utm_medium || null;
    const utmCampaign = body.utm_campaign || null;

    // Save lead to database
    const newLead = await prisma.lead.create({
      data: {
        fullName,
        email,
        phone,
        message,
        source,
        utmSource,
        utmMedium,
        utmCampaign,
        rawFields: JSON.stringify(body),
        status: "NEW",
        priority: "NORMAL",
        temperature: "WARM",
        websiteId,
        workspaceId: "mock_workspace_id",
      },
    });

    const leadPayload = JSON.parse(JSON.stringify(newLead));

    // Broadcast via Supabase Realtime to dashboard
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      await Promise.all([
        supabase.channel(`website-${websiteId}`).send({
          type: "broadcast",
          event: "new-lead",
          payload: leadPayload,
        }),
        supabase.channel("leads-channel").send({
          type: "broadcast",
          event: "new-lead",
          payload: leadPayload,
        }),
      ]);
    } catch (realtimeErr) {
      // Realtime failure is non-critical — lead is already saved
      console.warn("[WEBHOOK] Realtime broadcast failed (non-critical):", realtimeErr);
    }

    console.log(`[WEBHOOK SUCCESS] Lead saved: ${newLead.id} for website: ${websiteId}`);

    return NextResponse.json(
      {
        success: true,
        message: "Lead captured successfully",
        leadId: newLead.id,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error);
    // Always return 200 so form plugins don't show errors to site visitors
    // The real error is logged server-side
    return NextResponse.json(
      { success: false, error: "Internal error — lead may not have been saved. Check server logs." },
      { status: 200, headers: corsHeaders }
    );
  }
}
