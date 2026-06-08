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
    let { websiteId } = await params;

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

    // --- Automatic Website Detection by Domain ---
    if (websiteId === "auto") {
      const siteUrlOrDomain = body.site_url || body.site_domain || body.page_url || body.pageUrl || request.headers.get("referer") || request.headers.get("origin");
      
      if (siteUrlOrDomain) {
        const cleanDomain = siteUrlOrDomain
          .toLowerCase()
          .replace(/^(https?:\/\/)?(www\.)?/, "") // remove protocol and www
          .split('/')[0] // remove path
          .split(':')[0] // remove port if any
          .trim();
        
        const detectedSite = await prisma.website.findFirst({
          where: {
            domain: {
              contains: cleanDomain,
              mode: "insensitive"
            }
          }
        });
        
        if (detectedSite) {
          websiteId = detectedSite.id;
          console.log(`[WEBHOOK AUTO-DETECT] Routed domain ${cleanDomain} to website ID: ${websiteId}`);
        } else {
          console.error(`[WEBHOOK AUTO-DETECT FAILED] Could not find website matching domain: ${cleanDomain}`);
          return NextResponse.json(
            { success: false, error: `Auto-detection failed: No website registered with domain matching ${cleanDomain}.` },
            { status: 404, headers: corsHeaders }
          );
        }
      } else {
        console.error(`[WEBHOOK AUTO-DETECT FAILED] No site_url, referer, or origin found in request.`);
        return NextResponse.json(
          { success: false, error: "Auto-detection failed: No domain information found in the request." },
          { status: 400, headers: corsHeaders }
        );
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

    const find = (patterns: string[], exclude: string[] = []): string | null => {
      // Try exact matches first
      for (const p of patterns) {
        const key = Object.keys(body).find(k => k.toLowerCase() === p.toLowerCase());
        if (key && body[key]) return body[key];
      }
      // Then partial matches
      for (const p of patterns) {
        const key = Object.keys(body).find(k => {
          const lowerK = k.toLowerCase();
          if (!lowerK.includes(p.toLowerCase())) return false;
          if (exclude.some(ex => lowerK.includes(ex.toLowerCase()))) return false;
          return true;
        });
        if (key && body[key]) return body[key];
      }
      return null;
    };

    const cleanStr = (val: any): string | null => {
      if (val === undefined || val === null || val === "") return null;
      return String(val).trim();
    };

    // Detect email by value pattern as final fallback
    const emailByValue = Object.values(body).find(v => {
      const s = cleanStr(v);
      return s ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) : false;
    }) as string | undefined;

    // Detect phone by value pattern (7-15 digits, may have +, -, spaces)
    const phoneByValue = Object.values(body).find(v => {
      const s = cleanStr(v);
      return s ? /^[\+\d][\d\s\-]{6,14}\d$/.test(s) : false;
    }) as string | undefined;

    const email   = cleanStr(find(["email", "your-email", "email_address", "e-mail", "mail"]) || emailByValue);
    const phone   = cleanStr(find(["phone", "tel", "mobile", "phone_number", "your-phone", "contact", "whatsapp", "number"]) || phoneByValue);
    const message = cleanStr(find(["message", "your-message", "comments", "query", "description", "msg", "text", "details"]));

    // Name: try known keys first, then check for a value that looks like a name
    // (2-50 chars, no @ sign, not a phone number, not an IP address)
    const nameByKey = find(["name", "fullName", "full_name", "first_name", "your-name", "contact_name", "naam"], ["form", "page", "site", "file", "utm"]);
    const firstLast = [find(["first_name", "firstname"]) || "", find(["last_name", "lastname"]) || ""].join(" ").trim();
    const nameByValue = !nameByKey && !firstLast
      ? Object.entries(body).find(([k, v]) => {
          const s = cleanStr(v);
          return s
            ? !["email", "phone", "message", "source", "utm", "form", "_", "ip", "address"].some(p => k.toLowerCase().includes(p)) &&
              s.length >= 2 && s.length <= 60 &&
              !s.includes("@") &&
              !/^\+?[\d\s\-]{7,}$/.test(s) &&
              !/^[\d\.\:]+$/.test(s) // exclude IP addresses or numeric-only strings
            : false;
        })?.[1]
      : undefined;

    const fullName = cleanStr(nameByKey || firstLast || nameByValue) || "Unknown";

    // Advanced Source Detection
    const userAgent = request.headers.get("user-agent") || "";
    let detectedSource = "";
    
    if (userAgent.includes("Google-Apps-Script") || body.source?.toLowerCase() === "google sheets" || body.source?.toLowerCase() === "sheets") {
      detectedSource = "Google Sheets";
    } else if (userAgent.includes("WordPress") || body["_wpcf7"]) {
      detectedSource = "WordPress";
    } else if (userAgent.includes("Zapier")) {
      detectedSource = "Zapier";
    } else if (userAgent.includes("Make") || userAgent.includes("Integromat")) {
      detectedSource = "Make.com";
    } else {
      detectedSource = body.source || body.form_name || body.form_id || "Website Form";
    }

    const source = cleanStr(detectedSource);
    const utmSource   = cleanStr(body.utm_source);
    const utmMedium   = cleanStr(body.utm_medium);
    const utmCampaign = cleanStr(body.utm_campaign);

    const ipAddress = cleanStr(request.headers.get("x-forwarded-for")?.split(',')[0].trim() || request.headers.get("x-real-ip"));
    const pageUrl = cleanStr(body.pageUrl || body.page_url || request.headers.get("referer"));
    const pageTitle = cleanStr(body.pageTitle || body.page_title);

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

    // Handle Email Admin Alerts
    let emailAlertSent = false;
    const targetEmail = existingSite.adminEmail || workspace?.adminEmail;
    if (workspace?.emailAlertsEnabled && workspace?.emailProvider === "RESEND" && workspace?.emailApiKey && targetEmail) {
      try {
        const fromStr = workspace.fromEmailName
          ? `${workspace.fromEmailName} <${workspace.fromEmailAddress || "onboarding@resend.dev"}>`
          : (workspace.fromEmailAddress || "onboarding@resend.dev");

        const defaultEmailTemplate = "You have a new lead from {{source}}:\n\nName: {{name}}\nEmail: {{email}}\nPhone: {{phone}}\nMessage: {{message}}\nURL: {{url}}";
        const rawTemplate = workspace.emailAlertTemplate || defaultEmailTemplate;
        
        const emailBody = rawTemplate
          .replace(/{{name}}/g, fullName)
          .replace(/{{email}}/g, email || "N/A")
          .replace(/{{phone}}/g, phone || "N/A")
          .replace(/{{message}}/g, message || "N/A")
          .replace(/{{source}}/g, source || "Website")
          .replace(/{{url}}/g, pageUrl || "N/A");

        const htmlBody = emailBody.replace(/\n/g, '<br />');

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${workspace.emailApiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromStr,
            to: targetEmail,
            subject: `🔔 New Lead: ${fullName}`,
            html: htmlBody,
          })
        });

        if (emailRes.ok) {
          emailAlertSent = true;
          console.log("[EMAIL ALERT SUCCESS]", await emailRes.json());
        } else {
          console.error("[EMAIL ALERT FAILED]", await emailRes.json());
        }
      } catch (err) {
        console.error("[EMAIL ALERT ERROR]", err);
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
