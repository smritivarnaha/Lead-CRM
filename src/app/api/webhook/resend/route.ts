import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verification step for Resend webhooks or other validation logic could go here

    // Resend sends webhooks in this format: { type: "email.opened", data: { email_id: "..." } }
    const { type, data } = body;

    if (!type || !data?.email_id) {
      return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
    }

    const resendId = data.email_id;

    if (type === "email.opened") {
      await prisma.emailRecipient.updateMany({
        where: { resendId, openedAt: null },
        data: { openedAt: new Date() }
      });
    } else if (type === "email.clicked") {
      await prisma.emailRecipient.updateMany({
        where: { resendId, clickedAt: null },
        data: { clickedAt: new Date() }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESEND WEBHOOK ERROR]", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
