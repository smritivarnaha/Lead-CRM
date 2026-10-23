import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

function unpackAdminEmailConfig(site: any) {
  if (!site) return site;
  const enriched = { ...site };
  if (typeof site.apiKey === "string" && site.apiKey.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(site.apiKey);
      if (parsed.subject || parsed.adminEmailSubject) {
        enriched.adminEmailSubject = parsed.adminEmailSubject || parsed.subject;
      }
      if (parsed.notice || parsed.adminEmailSourceNote) {
        enriched.adminEmailSourceNote = parsed.adminEmailSourceNote || parsed.notice;
      }
      if (parsed.message || parsed.adminEmailMessage) {
        enriched.adminEmailMessage = parsed.adminEmailMessage || parsed.message;
      }
      if (parsed.cta || parsed.adminEmailCtaLabel) {
        enriched.adminEmailCtaLabel = parsed.adminEmailCtaLabel || parsed.cta;
      }
      if (parsed.ctaUrl || parsed.adminEmailCtaUrl) {
        enriched.adminEmailCtaUrl = parsed.adminEmailCtaUrl || parsed.ctaUrl;
      }
    } catch {}
  }
  return enriched;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { websiteId } = await params;

    // Restrict CLIENT users to only updating their assigned websiteId
    if (user.role === "CLIENT" && user.websiteId !== websiteId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;
    if (body.adminPhone !== undefined) data.adminPhone = body.adminPhone;
    if (body.adminEmail !== undefined) data.adminEmail = body.adminEmail;
    if (body.apiKey !== undefined) data.apiKey = body.apiKey;
    if (body.smsAlertsEnabled !== undefined) data.smsAlertsEnabled = body.smsAlertsEnabled;
    if (body.emailAlertsEnabled !== undefined) data.emailAlertsEnabled = body.emailAlertsEnabled;
    if (body.customerAutoReplyEnabled !== undefined) {
      data.customerAutoReplyEnabled = body.customerAutoReplyEnabled;
    }
    if (body.customerEmailSubject !== undefined) data.customerEmailSubject = body.customerEmailSubject;
    if (body.customerEmailMessage !== undefined) data.customerEmailMessage = body.customerEmailMessage;
    if (body.customerSupportPhone !== undefined) data.customerSupportPhone = body.customerSupportPhone;
    if (body.customerWorkingHours !== undefined) data.customerWorkingHours = body.customerWorkingHours;

    // Persist Admin Email custom template fields into apiKey JSON if provided
    const hasAdminEmailConfigFields =
      body.adminEmailSubject !== undefined ||
      body.adminEmailSourceNote !== undefined ||
      body.adminEmailMessage !== undefined ||
      body.adminEmailCtaLabel !== undefined ||
      body.adminEmailCtaUrl !== undefined;

    if (hasAdminEmailConfigFields && body.apiKey === undefined) {
      const currentSite = await prisma.website.findUnique({
        where: { id: websiteId },
        select: { apiKey: true },
      });

      let currentJson: Record<string, any> = {};
      if (
        currentSite?.apiKey &&
        typeof currentSite.apiKey === "string" &&
        currentSite.apiKey.trim().startsWith("{")
      ) {
        try {
          currentJson = JSON.parse(currentSite.apiKey);
        } catch {}
      }

      if (body.adminEmailSubject !== undefined) {
        currentJson.subject = body.adminEmailSubject;
        currentJson.adminEmailSubject = body.adminEmailSubject;
      }
      if (body.adminEmailSourceNote !== undefined) {
        currentJson.notice = body.adminEmailSourceNote;
        currentJson.adminEmailSourceNote = body.adminEmailSourceNote;
      }
      if (body.adminEmailMessage !== undefined) {
        currentJson.message = body.adminEmailMessage;
        currentJson.adminEmailMessage = body.adminEmailMessage;
      }
      if (body.adminEmailCtaLabel !== undefined) {
        currentJson.cta = body.adminEmailCtaLabel;
        currentJson.adminEmailCtaLabel = body.adminEmailCtaLabel;
      }
      if (body.adminEmailCtaUrl !== undefined) {
        currentJson.ctaUrl = body.adminEmailCtaUrl;
        currentJson.adminEmailCtaUrl = body.adminEmailCtaUrl;
      }

      data.apiKey = JSON.stringify(currentJson);
    }

    const updatedWebsite = await prisma.website.update({
      where: { id: websiteId },
      data,
    });

    try {
      const { revalidateTag } = await import("next/cache");
      (revalidateTag as any)("websites_list", { expire: 0 });
      (revalidateTag as any)("websites_stats", { expire: 0 });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      website: unpackAdminEmailConfig(updatedWebsite),
    });
  } catch (error) {
    console.error("Error updating website:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
