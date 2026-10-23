import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";
import { generateEmailHtml, EmailTheme } from "@/lib/emailTemplates";
import { processEmailAutomations } from "@/lib/emailAutomations";
import {
  flattenWebhookPayload,
  extractCanonicalLeadData,
  getDeduplicatedFields,
} from "@/lib/fieldDeduplication";

export const dynamic = "force-dynamic";

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

// In-memory sliding window rate limiter (prevents server crashes and flood attacks)
const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isIpRateLimited(ip: string, maxRequests = 40, windowMs = 60000): boolean {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  record.count += 1;
  return record.count > maxRequests;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    // 0. Payload Size Guard (prevents memory exhaustion DOS attacks)
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 100 * 1024) {
      console.warn(`[WEBHOOK BLOCKED] Request payload too large (${contentLength} bytes).`);
      return NextResponse.json(
        { success: false, error: "Payload exceeds 100KB limit." },
        { status: 413, headers: corsHeaders }
      );
    }

    // 0. Rate Limiting Guard (protects from webhook flooding / server crash)
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isIpRateLimited(clientIp, 40, 60000)) {
      console.warn(`[WEBHOOK RATE-LIMITED] IP ${clientIp} exceeded rate threshold.`);
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a moment." },
        { status: 429, headers: corsHeaders }
      );
    }

    let { websiteId } = await params;

    // Parse body — support JSON, URL-encoded, and multipart/form-data
    let rawBody: Record<string, any> = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        rawBody = await request.json();
      } catch {
        rawBody = {};
      }
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        // Ignore binary File uploads or empty File placeholders
        if (typeof value === "object" && value !== null && "arrayBuffer" in value) {
          const fileObj = value as File;
          if (fileObj.name) {
            rawBody[key] = fileObj.name;
          }
          return;
        }
        const strVal = String(value).trim();
        if (!strVal) return;

        const cleanKey = key.replace(/\[\]$/, "");
        if (rawBody[cleanKey] !== undefined) {
          rawBody[cleanKey] = `${rawBody[cleanKey]}, ${strVal}`;
        } else {
          rawBody[cleanKey] = strVal;
        }
      });
    } else {
      // Try JSON first, fall back to URLSearchParams
      try {
        const text = await request.text();
        if (text) {
          try {
            rawBody = JSON.parse(text);
          } catch {
            const paramsObj = new URLSearchParams(text);
            paramsObj.forEach((val, key) => {
              const cleanKey = key.replace(/\[\]$/, "");
              if (rawBody[cleanKey]) {
                rawBody[cleanKey] = `${rawBody[cleanKey]}, ${val}`;
              } else {
                rawBody[cleanKey] = val;
              }
            });
          }
        }
      } catch {
        rawBody = {};
      }
    }

    // Flatten nested structures (Elementor native webhooks, form_fields[...], nested JSON wrappers)
    const body = flattenWebhookPayload(rawBody);

    // --- Bot Spam Prevention (Honeypot) ---
    // If a hidden field named '_honeypot' is filled out, it's a bot. Silently drop the lead but return success.
    if (body._honeypot && body._honeypot.trim() !== "") {
      console.log(`[WEBHOOK] Bot detected via honeypot for website: ${websiteId}. Dropping lead.`);
      return NextResponse.json(
        { success: true, message: "Lead captured successfully" },
        { status: 200, headers: corsHeaders }
      );
    }

    // --- Automatic Website Detection by Domain ---
    if (websiteId === "auto") {
      const siteUrlOrDomain =
        body.site_url ||
        body.site_domain ||
        body.page_url ||
        body.pageUrl ||
        request.headers.get("referer") ||
        request.headers.get("origin");

      if (siteUrlOrDomain) {
        const cleanDomain = siteUrlOrDomain
          .toLowerCase()
          .replace(/^(https?:\/\/)?(www\.)?/, "") // remove protocol and www
          .split("/")[0] // remove path
          .split(":")[0] // remove port if any
          .trim();

        const detectedSite = await prisma.website.findFirst({
          where: {
            domain: {
              contains: cleanDomain,
              mode: "insensitive",
            },
          },
        });

        if (detectedSite) {
          websiteId = detectedSite.id;
          console.log(`[WEBHOOK AUTO-DETECT] Routed domain ${cleanDomain} to website ID: ${websiteId}`);
        } else {
          console.error(`[WEBHOOK AUTO-DETECT FAILED] Could not find website matching domain: ${cleanDomain}`);
          return NextResponse.json(
            {
              success: false,
              error: `Auto-detection failed: No website registered with domain matching ${cleanDomain}.`,
            },
            { status: 404, headers: corsHeaders }
          );
        }
      } else {
        console.error(`[WEBHOOK AUTO-DETECT FAILED] No site_url, referer, or origin found in request.`);
        return NextResponse.json(
          {
            success: false,
            error: "Auto-detection failed: No domain information found in the request.",
          },
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
      return NextResponse.json(
        {
          success: false,
          error: `No website found with ID: ${websiteId}. Please check the webhook URL in your CRM.`,
        },
        { status: 404, headers: corsHeaders }
      );
    }

    const cleanStr = (val: any): string | null => {
      if (val === undefined || val === null || val === "") return null;
      if (typeof val === "object") {
        try {
          return Array.isArray(val) ? val.join(", ") : JSON.stringify(val);
        } catch {
          return String(val);
        }
      }
      const trimmed = String(val).trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    // ── Smart Canonical Field Extraction ────────────────────────────────
    const canonical = extractCanonicalLeadData(body);
    const fullName = canonical.fullName || "Unknown";
    const email = canonical.email;
    const phone = canonical.phone;
    const city = canonical.city;
    const state = canonical.state;
    const message = canonical.message;

    // --- Flood & Duplicate Submission Debouncing ---
    // Prevents impatient users double-clicking, network retry storms, or spam bots
    // from inserting duplicate leads, wasting Fast2SMS credits, or spamming emails.
    if (phone || email) {
      const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);
      const duplicateLead = await prisma.lead.findFirst({
        where: {
          websiteId,
          createdAt: { gte: ninetySecondsAgo },
          OR: [
            phone ? { phone } : undefined,
            email ? { email } : undefined,
          ].filter(Boolean) as any,
        },
        select: { id: true, fullName: true, createdAt: true },
      });

      if (duplicateLead) {
        console.log(
          `[WEBHOOK DEDUPLICATED] Ignored duplicate submission for website ${websiteId} (${phone || email}) within 90s.`
        );

        const redirectUrl = body._redirect || body.redirect_url;
        if (redirectUrl) {
          return NextResponse.redirect(redirectUrl, 302);
        }

        return NextResponse.json(
          {
            success: true,
            message: "Lead already received",
            leadId: duplicateLead.id,
            deduplicated: true,
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Advanced Source Detection
    const userAgent = request.headers.get("user-agent") || "";
    let detectedSource = "";

    if (
      userAgent.includes("Google-Apps-Script") ||
      body.source?.toLowerCase() === "google sheets" ||
      body.source?.toLowerCase() === "sheets"
    ) {
      detectedSource = "Google Sheets";
    } else if (userAgent.includes("WordPress") || body["_wpcf7"]) {
      detectedSource = body.source || "WordPress";
    } else if (userAgent.includes("Zapier")) {
      detectedSource = "Zapier";
    } else if (userAgent.includes("Make") || userAgent.includes("Integromat")) {
      detectedSource = "Make.com";
    } else {
      detectedSource = body.source || body.form_name || body.formName || body.form_id || "Website Form";
    }

    const source = cleanStr(detectedSource);
    const formName = cleanStr(body.form_name || body.formName || body.form_id);
    const utmSource = cleanStr(body.utm_source || body.utmSource);
    const utmMedium = cleanStr(body.utm_medium || body.utmMedium);
    const utmCampaign = cleanStr(body.utm_campaign || body.utmCampaign);
    const utmContent = cleanStr(body.utm_content || body.utmContent);
    const utmTerm = cleanStr(body.utm_term || body.utmTerm);

    const ipAddress = cleanStr(
      body.ipAddress ||
        body.ip_address ||
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip")
    );
    const pageUrl = cleanStr(body.pageUrl || body.page_url || request.headers.get("referer"));
    const pageTitle = cleanStr(body.pageTitle || body.page_title);

    // --- Smart Lead Routing ---
    let assignedToId: string | null = null;
    const allText = `${message || ""} ${JSON.stringify(body)}`.toLowerCase();

    let targetUserKeyword = null;
    if (allText.includes("orthodontic") || allText.includes("braces")) {
      targetUserKeyword = "Smith";
    } else if (allText.includes("general") || allText.includes("cleaning")) {
      targetUserKeyword = "Jones";
    }

    if (targetUserKeyword) {
      const targetUser = await prisma.user.findFirst({
        where: {
          workspaceId: WORKSPACE_ID,
          OR: [
            { lastName: { contains: targetUserKeyword, mode: "insensitive" } },
            { firstName: { contains: targetUserKeyword, mode: "insensitive" } },
          ],
        },
      });
      if (targetUser) {
        assignedToId = targetUser.id;
      }
    }

    // Save lead to database with flattened & normalized rawFields
    const newLead = await prisma.lead.create({
      data: {
        fullName,
        email,
        phone,
        city,
        state,
        message,
        source,
        formName,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
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
    leadPayload.websiteName = existingSite.name;

    let smsSent = false;
    let pushSent = false;

    // Fetch Workspace settings to check for SMS and Push configs
    const workspace = await prisma.workspace.findUnique({
      where: { id: WORKSPACE_ID },
    });

    // Compute deduplicated fields once for both SMS and Email alerts
    const { allDeduplicatedFields } = getDeduplicatedFields(body, {
      fullName,
      phone,
      email,
      message,
      city,
      state,
    });

    // Handle SMS Admin Alerts via Fast2SMS
    const targetPhone = existingSite.adminPhone || workspace?.adminPhone;
    const smsPromise = (async () => {
      if (existingSite.smsAlertsEnabled !== false && workspace?.fast2smsApiKey && targetPhone) {
        try {
          const allFieldsText = allDeduplicatedFields
            .map((f) => `${f.label}: ${f.value}`)
            .join("\n");

          const smsTemplate = workspace.smsTemplate || "🔥 New Lead: {{name}}\n\n{{all_fields}}";
          let smsMessage = smsTemplate
            .replace(/{{name}}/g, fullName)
            .replace(/{{source}}/g, source || "Website");

          if (smsMessage.includes("{{all_fields}}")) {
            smsMessage = smsMessage.replace(/{{all_fields}}/g, allFieldsText || "No additional fields");
          } else if (allFieldsText) {
            smsMessage += `\n\n${allFieldsText}`;
          }

          const cleanPhone = targetPhone.replace(/\D/g, "").slice(-10);

          if (cleanPhone.length === 10) {
            const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
              method: "POST",
              headers: {
                authorization: workspace.fast2smsApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                route: "q",
                message: smsMessage,
                language: "english",
                flash: 0,
                numbers: cleanPhone,
              }),
            });

            const smsData = await smsRes.json();
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
    })();

    // Handle Email Admin Alerts
    let emailAlertSent = false;
    const targetEmail = existingSite.adminEmail || workspace?.adminEmail;
    const emailPromise = (async () => {
      if (
        existingSite.emailAlertsEnabled !== false &&
        workspace?.emailProvider === "RESEND" &&
        workspace?.emailApiKey &&
        targetEmail
      ) {
        try {
          const fromStr = workspace.fromEmailName
            ? `${workspace.fromEmailName} <${workspace.fromEmailAddress || "onboarding@resend.dev"}>`
            : workspace.fromEmailAddress || "onboarding@resend.dev";

          const siteName = existingSite.name || "Website";
          const siteDomain = existingSite.domain || siteName;

          let noticeText = `This verified lead was received from your website ${siteName} (${siteDomain}) via Rankved Healthcare Martech.`;
          let messageBody = `You have received a new hot lead on ${siteName}!\n\nReview the contact details below and connect immediately.`;
          let ctaLabel = `Open Lead in CRM`;
          let ctaUrl = pageUrl || "https://crm.rankved.com";
          let subjectTemplate = `🔔 New Lead: {{name}} - {{company}}`;

          const rawConfig = existingSite.apiKey;
          if (rawConfig && typeof rawConfig === "string" && rawConfig.trim().startsWith("{")) {
            try {
              const parsed = JSON.parse(rawConfig);
              if (parsed.subject || parsed.adminEmailSubject) {
                subjectTemplate = parsed.subject || parsed.adminEmailSubject;
              }
              if (parsed.notice || parsed.adminEmailSourceNote) {
                noticeText = (parsed.notice || parsed.adminEmailSourceNote)
                  .replace(/{{company}}/g, siteName)
                  .replace(/{{website}}/g, siteName)
                  .replace(/{{domain}}/g, siteDomain)
                  .replace(/{{source}}/g, source || "Website Form")
                  .replace(/{{url}}/g, pageUrl || siteName);
              }
              if (parsed.message || parsed.adminEmailMessage) {
                messageBody = (parsed.message || parsed.adminEmailMessage)
                  .replace(/{{company}}/g, siteName)
                  .replace(/{{website}}/g, siteName)
                  .replace(/{{domain}}/g, siteDomain)
                  .replace(/{{source}}/g, source || "Website Form")
                  .replace(/{{name}}/g, fullName);
              }
              if (parsed.cta || parsed.adminEmailCtaLabel) {
                ctaLabel = parsed.cta || parsed.adminEmailCtaLabel;
              }
              if (parsed.ctaUrl || parsed.adminEmailCtaUrl) {
                ctaUrl = parsed.ctaUrl || parsed.adminEmailCtaUrl;
              }
            } catch {
              messageBody = rawConfig;
            }
          } else if (workspace?.emailAlertTemplate) {
            messageBody = workspace.emailAlertTemplate;
          }

          const systemFieldsHtml = `
  <div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed rgba(229, 231, 235, 0.8);">
    <div style="margin-bottom: 6px;">
      <span style="font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: 0.05em;">IP Address:</span> 
      <span style="font-size: 12px; color: #6b7280; font-family: monospace;">${ipAddress || "Unknown"}</span>
    </div>
    <div>
      <span style="font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: 0.05em;">Source URL:</span> 
      <a href="${pageUrl || "#"}" style="font-size: 12px; color: #6366f1; word-break: break-all; text-decoration: none;">${pageUrl || "Direct (Hidden)"}</a>
    </div>
  </div>`;

          const allFieldsHtml = `
<div style="background: rgba(243, 244, 246, 0.7); border: 1px solid rgba(229, 231, 235, 1); border-radius: 8px; padding: 16px; margin-top: 20px;">
  ${allDeduplicatedFields
    .map(
      (f) => `
    <div style="margin-bottom: 14px; border-bottom: 1px solid rgba(229, 231, 235, 0.5); padding-bottom: 8px;">
      <div style="font-size: 11.5px; text-transform: uppercase; color: #6366f1; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px;">${f.label}</div>
      <div style="font-size: 15px; font-weight: 500; margin: 0; word-break: break-word; color: #1f2937;">${f.value}</div>
    </div>
  `
    )
    .join("")}
  ${systemFieldsHtml}
</div>`;

          const rankvedHeaderHtml = `
<div style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px;">
  <img src="https://rankved.com/wp-content/uploads/2025/04/Rankved-Logo-Official-Black.avif" alt="Rankved Healthcare Martech" style="height: 38px; max-width: 220px; object-fit: contain; margin-bottom: 6px; display: inline-block;" />
  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6366f1; letter-spacing: 0.08em;">
    Lead Automation Engine · Rankved Healthcare Martech
  </div>
</div>`;

          const websiteNoticeHtml = `
<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #15803d; letter-spacing: 0.05em; margin-bottom: 4px;">
    🌐 Verified Website Lead Source
  </div>
  <div style="font-size: 13.5px; color: #166534; line-height: 1.5; font-weight: 500;">
    ${noticeText}
  </div>
</div>`;

          const textBody = messageBody
            .replace(/{{name}}/g, fullName)
            .replace(/{{email}}/g, email || "N/A")
            .replace(/{{phone}}/g, phone || "N/A")
            .replace(/{{message}}/g, message || "N/A")
            .replace(/{{company}}/g, siteName)
            .replace(/{{website}}/g, siteName)
            .replace(/{{domain}}/g, siteDomain)
            .replace(/{{source}}/g, source || "Website")
            .replace(/{{url}}/g, pageUrl || "N/A")
            .replace(/{{ip}}/g, ipAddress || "Unknown");

          const rawHtmlBody = textBody.replace(/\n/g, "<br />");

          const ctaButtonHtml = `
<div style="text-align: center; margin-top: 24px; margin-bottom: 20px;">
  <a href="${ctaUrl}" style="background: #1A1523; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 13.5px; text-decoration: none; display: inline-block;">
    ${ctaLabel} ↗
  </a>
</div>`;

          let finalContentHtml = `${rankvedHeaderHtml}${websiteNoticeHtml}<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 16px; border-radius: 8px; margin-bottom: 16px; color: #1e293b; font-size: 14px; line-height: 1.6;">${rawHtmlBody}</div>`;

          if (rawHtmlBody.includes("{{all_fields}}")) {
            finalContentHtml = finalContentHtml.replace(/{{all_fields}}/g, allFieldsHtml);
          } else if (allDeduplicatedFields.length > 0) {
            finalContentHtml += allFieldsHtml;
          }

          finalContentHtml += ctaButtonHtml;

          const finalHtmlBody = generateEmailHtml(
            ((workspace as any)?.emailDesignTheme as EmailTheme) || "modern_minimal",
            `New Lead: ${fullName}`,
            finalContentHtml
          );

          const emailSubject = subjectTemplate
            .replace(/{{name}}/g, fullName)
            .replace(/{{company}}/g, siteName)
            .replace(/{{website}}/g, siteName)
            .replace(/{{domain}}/g, siteDomain)
            .replace(/{{phone}}/g, phone || "N/A")
            .replace(/{{source}}/g, source || "Website");

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${workspace.emailApiKey.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromStr,
              to: targetEmail
                .split(",")
                .map((e: string) => e.trim())
                .filter(Boolean),
              subject: emailSubject,
              html: finalHtmlBody,
            }),
          });

          if (emailRes.ok) {
            emailAlertSent = true;
          } else {
            console.error("[EMAIL ALERT FAILED]", await emailRes.json());
          }
        } catch (err) {
          console.error("[EMAIL ALERT ERROR]", err);
        }
      }
    })();

    // Broadcast via Supabase Realtime to dashboard
    const realtimePromise = (async () => {
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
        console.warn("[WEBHOOK] Realtime broadcast failed (non-critical):", realtimeErr);
      }
    })();

    // Fire push notification to all subscribed team members
    let pushStatus = { success: false, count: 0 };
    const pushPromise = (async () => {
      const siteName = existingSite.name || "Website";
      const contactLine = [fullName !== "Unknown" ? fullName : null, phone, email]
        .filter(Boolean)
        .join(" · ");

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
          icon: workspace?.pushIconUrl?.startsWith("data:")
            ? `${baseUrl}/api/settings/icon?t=${Date.now()}`
            : workspace?.pushIconUrl?.startsWith("http")
            ? workspace.pushIconUrl
            : `${baseUrl}${workspace?.pushIconUrl || "/icon-192.png"}`,
          badge: clientBadgeUrl?.startsWith("data:")
            ? `${baseUrl}/api/settings/client-badge?siteId=${websiteId}&t=${Date.now()}`
            : clientBadgeUrl?.startsWith("http")
            ? clientBadgeUrl
            : `${baseUrl}${clientBadgeUrl || "/badge-72x72.png"}`,
          actions: [
            { action: "view", title: workspace?.pushCtaLabel || "View Lead", url: resolvedActionUrl },
            { action: "dismiss", title: "Dismiss" },
          ],
          data: {
            leadId: newLead.id,
          },
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
    })();

    // Fire auto-responders based on global rules
    const autoResponderPromise = processEmailAutomations(newLead, "NEW_LEAD");

    // Handle Customer / Patient Confirmation Email (Auto-Responder)
    const customerAutoReplyPromise = (async () => {
      if (email && existingSite.customerAutoReplyEnabled && workspace?.emailApiKey) {
        try {
          const siteName = existingSite.name || "Our Team";
          const fromStr = `${siteName} <${workspace.fromEmailAddress || "alerts@rankved.com"}>`;

          const rawSubject =
            existingSite.customerEmailSubject ||
            `Thank you for contacting ${siteName} — We received your details!`;
          const subject = rawSubject
            .replace(/{{name}}/g, fullName !== "Unknown" ? fullName : "there")
            .replace(/{{company}}/g, siteName)
            .replace(/{{website}}/g, siteName);

          const rawMessage =
            existingSite.customerEmailMessage ||
            `Dear ${
              fullName !== "Unknown" ? fullName : "Valued Customer"
            },\n\nThank you for reaching out to ${siteName}. We have successfully received your enquiry.\n\nOur specialized team is reviewing your information and will contact you shortly.`;

          const messageHtml = rawMessage
            .replace(/{{name}}/g, fullName !== "Unknown" ? fullName : "Valued Customer")
            .replace(/{{company}}/g, siteName)
            .replace(/{{website}}/g, siteName)
            .replace(/\n/g, "<br />");

          const workingHours = existingSite.customerWorkingHours || "Mon - Sat: 9:00 AM - 7:00 PM";

          const customerEmailHtml = `
            <!DOCTYPE html>
            <html>
              <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
              <body style="margin: 0; padding: 20px; background-color: #f9fafb; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                  <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 28px 24px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">${siteName}</h1>
                    <p style="color: #e9d5ff; margin: 6px 0 0; font-size: 13px;">Details Received · We Will Contact You Soon</p>
                  </div>
                  <div style="padding: 32px 24px; color: #374151; font-size: 15px; line-height: 1.6;">
                    <div style="margin-bottom: 24px;">${messageHtml}</div>

                    <div style="margin: 24px 0; padding: 18px; background: #f9fafb; border-radius: 8px; border: 1px solid #f3f4f6;">
                      <h4 style="margin: 0 0 10px; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.05em;">Summary of Your Submission:</h4>
                      <div style="font-size: 13.5px; color: #4b5563; line-height: 1.6;">
                        <div>• <strong>Name:</strong> ${fullName}</div>
                        ${phone ? `<div>• <strong>Phone:</strong> ${phone}</div>` : ""}
                        ${city ? `<div>• <strong>Location:</strong> ${city}</div>` : ""}
                        <div>• <strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">Received & In Queue</span></div>
                        <div>• <strong>Date Received:</strong> ${new Date().toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}</div>
                      </div>
                    </div>

                    <div style="padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 12.5px; color: #166534; display: flex; align-items: center; justify-content: space-between;">
                      <span>🕒 <strong>Response Window:</strong> Our team will get back to you during working hours (${workingHours}).</span>
                    </div>
                  </div>
                  <div style="background: #fdfdfd; padding: 16px 24px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af;">
                    This is an automated confirmation sent by ${siteName}. You do not need to reply to this email.
                  </div>
                </div>
              </body>
            </html>
          `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${workspace.emailApiKey.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromStr,
              to: [email],
              subject: subject,
              html: customerEmailHtml,
            }),
          });
        } catch (autoErr) {
          console.warn("[CUSTOMER AUTO-REPLY ERROR]", autoErr);
        }
      }
    })();

    // Run all external notifications concurrently to drastically reduce webhook response latency
    await Promise.allSettled([
      smsPromise,
      emailPromise,
      realtimePromise,
      pushPromise,
      customerAutoReplyPromise,
      autoResponderPromise,
    ]);

    // Update the Lead in the database with the notification statuses
    if (smsSent || pushSent || emailAlertSent) {
      await prisma.lead.update({
        where: { id: newLead.id },
        data: {
          emailSent: emailAlertSent,
          smsSent,
          pushSent,
        },
      });
      // Update payload for the UI broadcast
      leadPayload.emailSent = emailAlertSent;
      leadPayload.smsSent = smsSent;
      leadPayload.pushSent = pushSent;
    }

    console.log(`[WEBHOOK SUCCESS] Lead saved: ${newLead.id} for website: ${websiteId}`);

    try {
      const { revalidateTag } = await import("next/cache");
      (revalidateTag as any)("leads_cache", { expire: 0 });
      (revalidateTag as any)("websites_stats", { expire: 0 });
      (revalidateTag as any)("activity_cache", { expire: 0 });
    } catch (e) {}

    let redirectUrl = body._redirect || body.redirect_url;

    // If no explicit redirect is set, but it was a native HTML form submission, send them back to the page they came from
    if (
      !redirectUrl &&
      (contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data"))
    ) {
      const referer = request.headers.get("referer");
      if (referer) {
        const separator = referer.includes("?") ? "&" : "?";
        redirectUrl = `${referer}${separator}lead_success=true`;
      }
    }

    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl, 302);
    }

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
    return NextResponse.json(
      { success: false, error: "Internal error — lead may not have been saved. Check server logs." },
      { status: 200, headers: corsHeaders }
    );
  }
}
