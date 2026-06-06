import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const WORKSPACE_ID = "mock_workspace_id"; // Single tenant for now

export async function GET() {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: WORKSPACE_ID },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, settings: workspace }, { status: 200 });
  } catch (error) {
    console.error("[SETTINGS GET ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Only allow updating specific fields
    const allowedFields = [
      "pushTitleTemplate", 
      "pushBodyTemplate", 
      "smsAutoReplyEnabled", 
      "fast2smsApiKey", 
      "smsTemplate"
    ];

    const dataToUpdate: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        dataToUpdate[field] = body[field];
      }
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: WORKSPACE_ID },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, settings: updatedWorkspace }, { status: 200 });
  } catch (error) {
    console.error("[SETTINGS POST ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
