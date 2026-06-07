import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";

// Fixed seed IDs — must match prisma/seed.ts
const WORKSPACE_ID = "mock_workspace_id";

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

    // Self-healing: ensure workspace exists (uses fixed seed ID)
    await prisma.workspace.upsert({
      where: { id: WORKSPACE_ID },
      create: { id: WORKSPACE_ID, name: "Default Workspace" },
      update: {},
    });

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
    // ── Smart field detection ──────────────────────────────────────────
    // Elementor sends fields with keys like: field_1, field_2, or the field ID
    // if explicitly set. We fuzzy-match on key names so it "just works"
    // regardless of how the form is configured.

    const find = (patterns: string[]): string | null => {
      for (const p of patterns) {
        const key = Object.keys(body).find(k =>
          k.toLowerCase() === p.toLowerCase() ||
          k.toLowerCase().includes(p.toLowerCase())
        );
        if (key && body[key]) return body[key];
      }
      return null;
    };

    // Detect email by value pattern as final fallback
    const emailByValue = Object.values(body).find(v =>
      typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    ) as string | undefined;

    // Detect phone by value pattern (7-15 digits, may have +, -, spaces)
    const phoneByValue = Object.values(body).find(v =>
      typeof v === "string" && /^[\+\d][\d\s\-]{6,14}\d$/.test(v.trim())
    ) as string | undefined;

    const email   = find(["email", "your-email", "email_address", "e-mail", "mail"]) || emailByValue || null;
    const phone   = find(["phone", "tel", "mobile", "phone_number", "your-phone", "contact", "whatsapp", "number"]) || phoneByValue || null;
    const message = find(["message", "your-message", "comments", "query", "description", "msg", "text", "details"]) || null;

    // Name: try known keys first, then check for a value that looks like a name
    // (2-50 chars, no @ sign, not a phone number)
    const nameByKey = find(["name", "fullName", "full_name", "first_name", "your-name", "contact_name", "naam"]);
    const firstLast = [find(["first_name", "firstname"]) || "", find(["last_name", "lastname"]) || ""].join(" ").trim();
    const nameByValue = !nameByKey && !firstLast
      ? Object.entries(body).find(([k, v]) =>
          !["email", "phone", "message", "source", "utm", "form", "_"].some(p => k.toLowerCase().includes(p)) &&
          typeof v === "string" &&
          v.length >= 2 && v.length <= 60 &&
          !v.includes("@") &&
          !/^\+?[\d\s\-]{7,}$/.test(v) // not a phone
        )?.[1]
      : undefined;

    const fullName = nameByKey || firstLast || nameByValue || "Unknown";

    const source =
      body.source ||
      body.form_name ||
      body.form_id ||
      (body["_wpcf7"] ? "WordPress Form" : "Website Form");
    const utmSource   = body.utm_source   || null;
    const utmMedium   = body.utm_medium   || null;
    const utmCampaign = body.utm_campaign || null;

    const ipAddress = request.headers.get("x-forwarded-for")?.split(',')[0].trim() || request.headers.get("x-real-ip") || null;
    const pageUrl = body.pageUrl || body.page_url || request.headers.get("referer") || null;
    const pageTitle = body.pageTitle || body.page_title || null;

    // --- Smart Lead Routing ---
    // If the message or source contains certain keywords, try to assign to a specific user.
    let assignedToId: string | null = null;
    const allText = `${message || ''} ${JSON.stringify(body)}`.toLowerCase();
    
    // Example: Find a user in this workspace based on specialization
    let targetUserKeyword = null;
    if (allText.includes("orthodontic") || allText.includes("braces")) {
      targetUserKeyword = "Smith"; // Dr. Smith handles orthodontics
    } else if (allText.includes("general") || allText.includes("cleaning")) {
      targetUserKeyword = "Jones"; // Dr. Jones handles general
    }

    if (targetUserKeyword) {
      const targetUser = await prisma.user.findFirst({
        where: {
          workspaceId: WORKSPACE_ID,
          OR: [
            { lastName: { contains: targetUserKeyword, mode: "insensitive" } },
            { firstName: { contains: targetUserKeyword, mode: "insensitive" } }
          ]
        }
      });
      if (targetUser) {
        assignedToId = targetUser.id;
      }
    }

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
        pageUrl,
        pageTitle,
        ipAddress,
        rawFields: JSON.stringify(body),
        status: "NEW",
        priority: "NORMAL",
        temperature: "WARM",
        websiteId,
        workspaceId: WORKSPACE_ID,
        assignedToId,
      },
    });

    const leadPayload = JSON.parse(JSON.stringify(newLead));

    let smsSent = false;
    let pushSent = false;

    // Fetch Workspace settings to check for SMS and Push configs
    const workspace = await prisma.workspace.findUnique({
      where: { id: WORKSPACE_ID },
    });

    // Handle SMS Admin Alerts via Fast2SMS
    const targetPhone = existingSite.adminPhone || workspace?.adminPhone;
    if (workspace?.smsAutoReplyEnabled && workspace?.fast2smsApiKey && targetPhone) {
      try {
        const smsTemplate = workspace.smsTemplate || "🔥 New Lead: {{name}} has just submitted a form!";
        const smsMessage = smsTemplate
          .replace(/{{name}}/g, fullName)
          .replace(/{{source}}/g, source || "Website");

        // Clean the admin phone number (Fast2SMS expects 10 digits usually)
        const cleanPhone = targetPhone.replace(/\D/g, "").slice(-10);

        if (cleanPhone.length === 10) {
          const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              "authorization": workspace.fast2smsApiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              route: "q", // "q" is for Quick SMS. "v3" requires DLT templates.
              message: smsMessage,
              language: "english",
              flash: 0,
              numbers: cleanPhone,
            }),
          });
          
          const smsData = await smsRes.json();
          console.log("[SMS RESULT]", smsData);
          if (smsData.return === true) {
            smsSent = true;
          }
        } else {
          console.warn("[SMS] Invalid Indian phone number length:", cleanPhone);
        }
      } catch (smsErr) {
        console.error("[SMS ERROR]", smsErr);
      }
    }

    // Broadcast via Supabase Realtime to dashboard
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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

    // Fire push notification to all subscribed team members
    const siteName = existingSite.name || "Website";
    const contactLine = [fullName !== "Unknown" ? fullName : null, phone, email].filter(Boolean).join(" · ");
    
    let pushStatus = { success: false, count: 0 };
    try {
      const baseUrl = new URL(request.url).origin;
      const pushTitle = workspace?.pushTitleTemplate 
        ? workspace.pushTitleTemplate.replace(/{{name}}/g, fullName)
        : `🔔 New Lead — ${siteName}`;
        
      const pushBody = workspace?.pushBodyTemplate
        ? workspace.pushBodyTemplate.replace(/{{name}}/g, fullName)
        : contactLine || "A new lead just arrived.";

      const clientBadgeUrl = existingSite.logoUrl || workspace?.pushBadgeUrl;

      const defaultActionUrl = `/client/${websiteId}?leadId=${newLead.id}`;
      let resolvedActionUrl = defaultActionUrl;
      
      if (workspace?.pushCtaUrl && workspace.pushCtaUrl.trim() !== "") {
        let customUrl = workspace.pushCtaUrl
          .replace(/\[websiteId\]/g, websiteId)
          .replace(/\{\{websiteId\}\}/g, websiteId)
          .replace(/\[leadId\]/g, newLead.id)
          .replace(/\{\{leadId\}\}/g, newLead.id);
        
        if (customUrl.startsWith("/")) {
          if (!customUrl.includes("leadId=")) {
            customUrl += (customUrl.includes("?") ? "&" : "?") + `leadId=${newLead.id}`;
          }
        }
        resolvedActionUrl = customUrl;
      }

      pushStatus = await sendPushToAll({
        title: pushTitle,
        body: pushBody,
        url: resolvedActionUrl,
        icon: workspace?.pushIconUrl?.startsWith('data:') ? `${baseUrl}/api/settings/icon?t=${Date.now()}` : (workspace?.pushIconUrl?.startsWith('http') ? workspace.pushIconUrl : `${baseUrl}${workspace?.pushIconUrl || "/icon-192.png"}`),
        badge: clientBadgeUrl?.startsWith('data:') ? `${baseUrl}/api/settings/client-badge?siteId=${websiteId}&t=${Date.now()}` : (clientBadgeUrl?.startsWith('http') ? clientBadgeUrl : `${baseUrl}${clientBadgeUrl || "/badge-72x72.png"}`),
        actions: [
          { action: "view", title: workspace?.pushCtaLabel || "View Lead", url: resolvedActionUrl },
          { action: "dismiss", title: "Dismiss" },
        ],
        data: {
          leadId: newLead.id
        }
      });
      
      // Broadcast the push delivery status to the dashboard
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      await supabase.channel("leads-channel").send({
        type: "broadcast",
        event: "push-status",
        payload: { success: pushStatus.success, count: pushStatus.count, leadId: newLead.id },
      });
      if (pushStatus.success) {
        pushSent = true;
      }
    } catch (err) {
      console.warn("[PUSH] Non-critical push error:", err);
    }

    // Update the Lead in the database with the notification statuses
    if (smsSent || pushSent) {
      await prisma.lead.update({
        where: { id: newLead.id },
        data: {
          smsSent,
          pushSent,
        },
      });
      // Update payload for the UI broadcast
      leadPayload.smsSent = smsSent;
      leadPayload.pushSent = pushSent;
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
