import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { sendPushToAll } from "@/lib/push";

export async function POST() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await sendPushToAll({
      title: "Test Notification",
      body: "If you are seeing this, your Web Push is working perfectly!",
      url: "/settings",
      actions: [{ action: "dismiss", title: "Dismiss" }]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEST PUSH ERROR]", error);
    return NextResponse.json({ error: "Failed to send test push" }, { status: 500 });
  }
}
