import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.smsTemplate.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE_SMS_TEMPLATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, content } = body;

    const template = await prisma.smsTemplate.update({
      where: { id },
      data: { name, content }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("[PATCH_SMS_TEMPLATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
