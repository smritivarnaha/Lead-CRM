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

    const templates = await prisma.emailTemplate.findMany({
      where: { workspaceId: dbUser.workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error("GET EmailTemplates error:", error);
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
    const { name, subject, bodyHtml, designJson } = body;

    if (!name || !subject || !bodyHtml) {
      return NextResponse.json({ success: false, error: "Name, subject, and bodyHtml are required." }, { status: 400 });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        bodyHtml,
        designJson,
        workspaceId: dbUser.workspaceId,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("POST EmailTemplate error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
