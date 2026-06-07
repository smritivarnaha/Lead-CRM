import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { sendPushToAll } from "@/lib/push";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspace = await prisma.workspace.findUnique({
      where: { id: "mock_workspace_id" }
    });

    const baseUrl = new URL(req.url).origin;

    await sendPushToAll({
      title: "Test Notification",
      body: "If you are seeing this, your Web Push is working perfectly!",
      url: "/settings",
      icon: workspace?.pushIconUrl?.startsWith('data:') ? `${baseUrl}/api/settings/icon?t=${Date.now()}` : (workspace?.pushIconUrl?.startsWith('http') ? workspace.pushIconUrl : `${baseUrl}${workspace?.pushIconUrl || "/icon-192.png"}`),
      badge: workspace?.pushBadgeUrl?.startsWith('data:') ? `${baseUrl}/api/settings/badge?t=${Date.now()}` : (workspace?.pushBadgeUrl?.startsWith('http') ? workspace.pushBadgeUrl : `${baseUrl}${workspace?.pushBadgeUrl || "/badge-72x72.png"}`),
      actions: [{ action: "dismiss", title: "Dismiss" }]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEST PUSH ERROR]", error);
    return NextResponse.json({ error: "Failed to send test push" }, { status: 500 });
  }
}
