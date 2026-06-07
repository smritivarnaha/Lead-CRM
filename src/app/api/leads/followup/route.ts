import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leadId, followUpAt } = await request.json();
    if (!leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 });

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        followUpAt: followUpAt ? new Date(followUpAt) : null,
      },
    });

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (e) {
    console.error("[FOLLOWUP POST]", e);
    return NextResponse.json({ error: "Failed to set follow-up date" }, { status: 500 });
  }
}
