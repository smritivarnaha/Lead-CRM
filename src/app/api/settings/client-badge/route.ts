import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json({ error: "Missing siteId" }, { status: 400 });
    }

    const site = await prisma.website.findUnique({
      where: { id: siteId },
      select: { logoUrl: true, workspaceId: true }
    });

    let badgeUrl = site?.logoUrl;

    // Fallback to workspace badge if client badge is missing
    if (!badgeUrl && site?.workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: site?.workspaceId },
        select: { pushBadgeUrl: true }
      });
      badgeUrl = workspace?.pushBadgeUrl;
    }

    if (badgeUrl && badgeUrl.startsWith('data:image/')) {
      const parts = badgeUrl.split(',');
      const meta = parts[0];
      const base64Data = parts[1];
      
      const mimeMatch = meta.match(/data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      
      const buffer = Buffer.from(base64Data, 'base64');
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // Return the default icon if not base64 or empty
    const defaultUrl = badgeUrl || '/badge-72x72.png';
    const requestUrl = new URL(request.url);
    const redirectUrl = new URL(defaultUrl, requestUrl.origin);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("[CLIENT BADGE GET ERROR]", error);
    return new NextResponse(null, { status: 500 });
  }
}
