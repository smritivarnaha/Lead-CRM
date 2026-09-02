import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

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
    if (body.smsAlertsEnabled !== undefined) data.smsAlertsEnabled = body.smsAlertsEnabled;
    if (body.emailAlertsEnabled !== undefined) data.emailAlertsEnabled = body.emailAlertsEnabled;
    if (body.customerAutoReplyEnabled !== undefined) data.customerAutoReplyEnabled = body.customerAutoReplyEnabled;
    if (body.customerEmailSubject !== undefined) data.customerEmailSubject = body.customerEmailSubject;
    if (body.customerEmailMessage !== undefined) data.customerEmailMessage = body.customerEmailMessage;
    if (body.customerSupportPhone !== undefined) data.customerSupportPhone = body.customerSupportPhone;
    if (body.customerWorkingHours !== undefined) data.customerWorkingHours = body.customerWorkingHours;

    const updatedWebsite = await prisma.website.update({
      where: { id: websiteId },
      data,
    });

    return NextResponse.json({ success: true, website: updatedWebsite });
  } catch (error) {
    console.error("Error updating website:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
