import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.emailAddresses[0].emailAddress } });
    if (!dbUser || !dbUser.workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const automations = await prisma.emailAutomation.findMany({
      where: { workspaceId: dbUser.workspaceId },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, automations });
  } catch (error: any) {
    console.error("GET EmailAutomations error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.emailAddresses[0].emailAddress } });
    if (!dbUser || !dbUser.workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, trigger, statusValue, isActive, delayMinutes, templateId } = body;

    if (!name || !templateId) {
      return NextResponse.json({ success: false, error: "Name and templateId are required." }, { status: 400 });
    }

    const automation = await prisma.emailAutomation.create({
      data: {
        name,
        trigger: trigger || "NEW_LEAD",
        statusValue,
        isActive: isActive !== undefined ? isActive : true,
        delayMinutes: delayMinutes || 0,
        templateId,
        workspaceId: dbUser.workspaceId,
      },
      include: { template: true }
    });

    return NextResponse.json({ success: true, automation });
  } catch (error: any) {
    console.error("POST EmailAutomation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
