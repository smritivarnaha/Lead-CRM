"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

import { MobileNav } from "./MobileNav";
import { ActiveProfileProvider } from "@/components/providers/ActiveProfileProvider";
import { showLeadToast } from "@/components/leads/LeadAlertToast";

export function AppLayout({ 
  children,
  initialWebsites 
}: { 
  children: React.ReactNode;
  initialWebsites?: any[];
}) {
  const { user } = useUser();
  const pathname = usePathname();

  // Pipeline views manage their own full-bleed edge-to-edge height and scroll
  const isFullBleed =
    pathname === "/leads" ||
    (pathname.startsWith("/client/") && !pathname.endsWith("/settings"));

  // Pages that manage their own inner container padding
  const hasOwnPadding =
    isFullBleed ||
    pathname === "/" ||
    pathname.startsWith("/followups") ||
    pathname.startsWith("/email") ||
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/integrations") ||
    pathname.startsWith("/workspaces") ||
    pathname.startsWith("/activity") ||
    (pathname.startsWith("/client/") && pathname.endsWith("/settings"));

  useEffect(() => {
    if (!user) return;

    const role = user.publicMetadata?.role as string | undefined;
    const websiteId = user.publicMetadata?.websiteId as string | undefined;

    // If CLIENT, subscribe to their specific website channel. Otherwise, global channel.
    const targetChannel = (role === "CLIENT" && websiteId) ? `website-${websiteId}` : 'leads-channel';

    const channel = supabase.channel(targetChannel)
      .on('broadcast', { event: 'new-lead' }, (payload) => {
        const lead = payload.payload;
        if (lead) {
          showLeadToast(lead);
        }
      })
      .on('broadcast', { event: 'lead-escalated' }, (payload) => {
        const lead = payload.payload;
        toast.error(`⚠️ Escalation Notice`, {
          description: `Lead ${lead?.fullName || 'Customer'} is awaiting immediate response!`,
          duration: 10000,
        });
      })
      .on('broadcast', { event: 'push-status' }, (payload) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("leadflow:push-status", { detail: payload.payload }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <ActiveProfileProvider initialWebsites={initialWebsites}>
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: "#F7F5FF", color: "#1A1523" }}
      >
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden relative">
          <Header />
          <main className={`flex-1 bg-slate-50 pb-20 md:pb-0 ${isFullBleed ? "overflow-hidden" : "overflow-y-auto"}`}>
            <div className={isFullBleed ? "h-full w-full overflow-hidden" : hasOwnPadding ? "min-h-full w-full" : "p-4 md:p-8 min-h-full"}>
              {children}
            </div>
          </main>
          <MobileNav />
        </div>
      </div>
    </ActiveProfileProvider>
  );
}
