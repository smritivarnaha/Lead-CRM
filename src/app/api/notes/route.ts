import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/notes?leadId=X */
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

    const notes = await prisma.note.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, notes });
  } catch (e) {
    console.error("[NOTES GET]", e);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

/** POST /api/notes  { leadId, content } */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leadId, content } = await request.json();
    if (!leadId || !content?.trim()) {
      return NextResponse.json({ error: "leadId and content required" }, { status: 400 });
    }

    const authorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.emailAddresses[0]?.emailAddress || "Team";

    const note = await prisma.note.create({
      data: { leadId, content: content.trim(), authorName },
    });

    return NextResponse.json({ success: true, note });
  } catch (e) {
    console.error("[NOTES POST]", e);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

/** DELETE /api/notes?id=X */
export async function DELETE(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[NOTES DELETE]", e);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
