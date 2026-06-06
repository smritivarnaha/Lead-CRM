import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

/** POST /api/push/subscribe — save a push subscription */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { endpoint, keys } = await request.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[PUSH SUBSCRIBE]", e);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}

/** DELETE /api/push/subscribe — remove a subscription */
export async function DELETE(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { endpoint } = await request.json();
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[PUSH UNSUBSCRIBE]", e);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
