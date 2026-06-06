"use client";

import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

import { MobileNav } from "./MobileNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const role = user.publicMetadata?.role as string | undefined;
    const websiteId = user.publicMetadata?.websiteId as string | undefined;

    // If CLIENT, subscribe to their specific website channel. Otherwise, global channel.
    const targetChannel = (role === "CLIENT" && websiteId) ? `website-${websiteId}` : 'leads-channel';

    const channel = supabase.channel(targetChannel)
      .on('broadcast', { event: 'new-lead' }, (payload) => {
        console.log(`Realtime Lead Received on ${targetChannel}:`, payload);
        const lead = payload.payload;
        toast.success(`New Lead Captured!`, {
          description: `${lead.fullName} from ${lead.source}`,
          duration: 10000,
        });
      })
      .on('broadcast', { event: 'lead-escalated' }, (payload) => {
        console.log(`Lead Escalated on ${targetChannel}:`, payload);
        const lead = payload.payload;
        toast.error(`ESCALATION ALERT!`, {
          description: `Lead ${lead.fullName} has been waiting too long!`,
          duration: Infinity, // Forces manager to manually dismiss it
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#F7F5FF", color: "#1A1523" }}
    >
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto bg-slate-50 pb-20 md:pb-0">
          <div className="p-4 md:p-8 h-full">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
