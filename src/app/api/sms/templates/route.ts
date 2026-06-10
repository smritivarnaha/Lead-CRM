import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const WORKSPACE_ID = "mock_workspace_id";

export async function GET() {
  try {
    const templates = await prisma.smsTemplate.findMany({
      where: { workspaceId: WORKSPACE_ID },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("[GET_SMS_TEMPLATES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, content } = body;

    if (!name || !content) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const template = await prisma.smsTemplate.create({
      data: {
        name,
        content,
        workspaceId: WORKSPACE_ID,
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("[POST_SMS_TEMPLATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
