import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { websiteId } = await params;
    const body = await request.json();

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;
    if (body.adminPhone !== undefined) data.adminPhone = body.adminPhone;

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
