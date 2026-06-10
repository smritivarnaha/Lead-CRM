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

    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template || template.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : template.name,
        subject: body.subject !== undefined ? body.subject : template.subject,
        bodyHtml: body.bodyHtml !== undefined ? body.bodyHtml : template.bodyHtml,
        designJson: body.designJson !== undefined ? body.designJson : template.designJson,
      },
    });

    return NextResponse.json({ success: true, template: updatedTemplate });
  } catch (error: any) {
    console.error("PATCH EmailTemplate error:", error);
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

    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template || template.workspaceId !== dbUser.workspaceId) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    await prisma.emailTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE EmailTemplate error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
