"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function Header() {
  const pathname = usePathname();
  
  // "idle" = no lead yet, "success" = push sent to mobile, "error" = push failed/nobody subscribed
  const [pushStatus, setPushStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const channel = supabase.channel("leads-channel");

    channel
      .on("broadcast", { event: "push-status" }, (payload) => {
        const status = payload.payload;
        if (status.success && status.count > 0) {
          setPushStatus("success");
        } else {
          setPushStatus("error");
        }
        
        // Reset to idle after 10 seconds
        setTimeout(() => setPushStatus("idle"), 10000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <header
      className="flex h-[60px] items-center border-b bg-white px-8"
      style={{ borderColor: "#E8E4F3", flexShrink: 0 }}
    >
      <div className="flex h-full w-full items-center justify-between">
        <div className="flex h-full items-center gap-8">
          <Link href="/" className="flex h-full items-center text-[14px] font-bold" style={{ color: "#1A1523" }}>
            LeadFlow
          </Link>
          <Link 
            href="/leads"
            className="flex h-full items-center text-[13.5px] font-semibold cursor-pointer relative"
            style={{ color: "#7C3AED" }}
          >
            Pipeline
            {pathname === "/leads" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7C3AED]" />}
          </Link>
          <Link href="/websites" className="flex h-full items-center text-[13.5px] font-medium cursor-pointer transition-colors" style={{ color: "#6B7280" }}>
            Websites
          </Link>
          <Link href="/contacts" className="flex h-full items-center text-[13.5px] font-medium cursor-pointer transition-colors" style={{ color: "#6B7280" }}>
            Contacts
          </Link>
          <Link href="/analytics" className="flex h-full items-center text-[13.5px] font-medium cursor-pointer transition-colors" style={{ color: "#6B7280" }}>
            Analytics
          </Link>
          <div className="flex h-full items-center cursor-pointer">
            <Plus className="h-4 w-4" style={{ color: "#9CA3AF" }} />
          </div>
        </div>

        {/* Right side: Push Status Indicator & Settings */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 cursor-default transition-all duration-300">
                <BellRing className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">Mobile Push</span>
                <div className="relative flex h-2.5 w-2.5">
                  {pushStatus === "success" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 transition-colors duration-300 ${
                    pushStatus === "success" ? "bg-emerald-500" :
                    pushStatus === "error" ? "bg-red-500" :
                    "bg-slate-300"
                  }`}></span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="w-[200px] text-xs">
              {pushStatus === "idle" ? "Waiting for new leads..." :
               pushStatus === "success" ? "Last lead was successfully pushed to your mobile devices." :
               "Last push failed or no mobile devices are subscribed."}
            </TooltipContent>
          </Tooltip>

          <Link href="/settings" className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
            Settings
          </Link>
        </div>
      </div>
    </header>
  );
}
