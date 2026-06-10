import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.emailAddresses[0].emailAddress } });
    if (!dbUser || !dbUser.workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();

    const automation = await prisma.emailAutomation.findUnique({ where: { id } });
    if (!automation || automation.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ success: false, error: "Automation not found" }, { status: 404 });
    }

    const updatedAutomation = await prisma.emailAutomation.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : automation.name,
        trigger: body.trigger !== undefined ? body.trigger : automation.trigger,
        statusValue: body.statusValue !== undefined ? body.statusValue : automation.statusValue,
        isActive: body.isActive !== undefined ? body.isActive : automation.isActive,
        delayMinutes: body.delayMinutes !== undefined ? body.delayMinutes : automation.delayMinutes,
        templateId: body.templateId !== undefined ? body.templateId : automation.templateId,
      },
      include: { template: true }
    });

    return NextResponse.json({ success: true, automation: updatedAutomation });
  } catch (error: any) {
    console.error("PATCH EmailAutomation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.emailAddresses[0].emailAddress } });
    if (!dbUser || !dbUser.workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const { id } = await params;

    const automation = await prisma.emailAutomation.findUnique({ where: { id } });
    if (!automation || automation.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ success: false, error: "Automation not found" }, { status: 404 });
    }

    await prisma.emailAutomation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE EmailAutomation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
