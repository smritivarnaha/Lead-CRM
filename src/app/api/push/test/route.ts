import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { sendPushToAll } from "@/lib/push";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspace = await prisma.workspace.findUnique({
      where: { id: "mock_workspace_id" }
    });

    await sendPushToAll({
      title: "Test Notification",
      body: "If you are seeing this, your Web Push is working perfectly!",
      url: "/settings",
      icon: workspace?.pushIconUrl?.startsWith('data:') ? "/api/settings/icon" : (workspace?.pushIconUrl || "/icon-192.png"),
      badge: workspace?.pushBadgeUrl?.startsWith('data:') ? "/api/settings/badge" : (workspace?.pushBadgeUrl || "/badge-72x72.png"),
      actions: [{ action: "dismiss", title: "Dismiss" }]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEST PUSH ERROR]", error);
    return NextResponse.json({ error: "Failed to send test push" }, { status: 500 });
  }
}
