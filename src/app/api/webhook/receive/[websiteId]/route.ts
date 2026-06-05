import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Server Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    const { websiteId } = await params;
    const body = await request.json();

    console.log(`[WEBHOOK RECEIVED] Website: ${websiteId}`);

    const leadData = {
      id: `lead_${Math.random().toString(36).substr(2, 9)}`,
      fullName: body.name || body.fullName || body["first_name"] || "Unknown",
      email: body.email || null,
      phone: body.phone || body.tel || null,
      message: body.message || null,
      source: body.source || "WordPress Form",
      status: "NEW",
      websiteId: websiteId,
      workspaceId: "mock_workspace_id",
      createdAt: new Date().toISOString(),
    };

    // Save to Database
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Check if website exists, if not create a fallback (or fail, but for now we want robust tracking)
    const existingSite = await prisma.website.findUnique({ where: { id: websiteId }});
    if (!existingSite) {
        await prisma.website.create({
            data: {
                id: websiteId,
                name: "Auto-created Site",
                domain: "unknown",
                workspaceId: "mock_workspace_id"
            }
        });
    }

    await prisma.lead.create({
      data: {
        id: leadData.id,
        fullName: leadData.fullName,
        email: leadData.email,
        phone: leadData.phone,
        message: leadData.message,
        source: leadData.source,
        status: leadData.status,
        websiteId: leadData.websiteId,
        workspaceId: leadData.workspaceId,
      }
    });

    // 4. Trigger the Lead Routing Logic & WebSockets (Phase 3)
    // Broadcast the new lead to the specific client's website channel
    const channelName = `website-${websiteId}`;
    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'new-lead',
      payload: leadData,
    });
    
    // Also broadcast to the global agency channel so the Agency sees all leads
    await supabase.channel('leads-channel').send({
      type: 'broadcast',
      event: 'new-lead',
      payload: leadData,
    });

    return NextResponse.json(
      { success: true, message: "Lead captured and broadcasted successfully", lead: leadData },
      { status: 200 }
    );
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 400 });
  }
}
