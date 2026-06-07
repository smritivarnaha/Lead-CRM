import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: "mock_workspace_id" }
    });

    const iconUrl = workspace?.pushIconUrl;

    if (iconUrl && iconUrl.startsWith('data:image/')) {
      const parts = iconUrl.split(',');
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
    const defaultUrl = iconUrl || '/icon-192.png';
    const requestUrl = new URL(request.url);
    const redirectUrl = new URL(defaultUrl, requestUrl.origin);
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    return new NextResponse("Failed to load icon", { status: 500 });
  }
}
