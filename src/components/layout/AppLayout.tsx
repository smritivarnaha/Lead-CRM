"use client";

import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function AppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Listen to the "leads-channel" for any broadcast messages
    const channel = supabase.channel('leads-channel')
      .on('broadcast', { event: 'new-lead' }, (payload) => {
        console.log('Realtime Lead Received:', payload);
        const lead = payload.payload;
        toast.success(`New Lead Captured!`, {
          description: `${lead.fullName} from ${lead.source}`,
          duration: 10000,
        });
      })
      .on('broadcast', { event: 'lead-escalated' }, (payload) => {
        console.log('Lead Escalated:', payload);
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
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
