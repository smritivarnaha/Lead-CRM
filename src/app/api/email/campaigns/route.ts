import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const WORKSPACE_ID = "mock_workspace_id";

export async function GET() {
  try {
    const campaigns = await prisma.emailCampaign.findMany({
      where: { workspaceId: WORKSPACE_ID },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { recipients: true }
        }
      }
    });

    return NextResponse.json({ success: true, campaigns }, { status: 200 });
  } catch (error) {
    console.error("[FETCH CAMPAIGNS ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
