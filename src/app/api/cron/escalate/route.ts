import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Server Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  // Security check: Ensure this is called by Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch leads that have been in "NEW" status for more than 5 minutes
    // In a real scenario, this would use Prisma:
    // const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    // const neglectedLeads = await prisma.lead.findMany({
    //   where: { status: 'NEW', createdAt: { lt: fiveMinutesAgo } }
    // });

    console.log("[CRON] Running Escalation Engine check...");
    
    // Mocking an escalated lead for demonstration
    const escalatedLead = {
      id: "lead_esc_123",
      fullName: "Urgent Client",
      source: "Escalation Engine",
      status: "ESCALATED",
      message: "This lead was not contacted within 5 minutes!",
      priority: "HIGH"
    };

    // 2. Broadcast the escalation to managers via WebSockets
    await supabase.channel('leads-channel').send({
      type: 'broadcast',
      event: 'lead-escalated',
      payload: escalatedLead,
    });

    // 3. (Optional) Send SMS/Email via Twilio/SendGrid to the Manager
    
    return NextResponse.json({ 
      success: true, 
      message: "Escalation check complete. 1 lead escalated.",
      escalatedCount: 1 
    });
  } catch (error) {
    console.error("[CRON ERROR]", error);
    return NextResponse.json({ error: "Escalation check failed" }, { status: 500 });
  }
}
