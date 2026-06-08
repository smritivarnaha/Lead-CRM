"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, BellRing, Menu, LayoutDashboard, Users, Globe, BarChart3, Briefcase, Activity, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { UserButton, useUser } from "@clerk/nextjs";
import { useActiveProfile } from "@/components/providers/ActiveProfileProvider";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const navItems = [
  { name: "Dashboard",    href: "/",           icon: LayoutDashboard },
  { name: "Lead Pipeline",href: "/leads",       icon: Users },
  { name: "Websites",     href: "/websites",    icon: Globe },
  { name: "Analytics",    href: "/analytics",   icon: BarChart3 },
  { name: "Workspaces",   href: "/workspaces",  icon: Briefcase },
  { name: "Activity",     href: "/activity",    icon: Activity },
  { name: "Settings",     href: "/settings",    icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const { websites, activeWebsiteId, setActiveWebsiteId } = useActiveProfile();
  const role = user?.publicMetadata?.role as string | undefined;
  const isClient = role === "CLIENT";
  
  // "idle" = no lead yet, "success" = push sent to mobile, "error" = push failed/nobody subscribed
  const [pushStatus, setPushStatus] = useState<"idle" | "success" | "error">("idle");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
      className="flex h-[60px] items-center border-b bg-white px-4 md:px-8"
      style={{ borderColor: "#E8E4F3", flexShrink: 0 }}
    >
      <div className="flex h-full w-full items-center justify-between">
        
        {/* Left side: Mobile Hamburger & Logo & Desktop Links */}
        <div className="flex h-full items-center gap-4 md:gap-8">
          {/* Hamburger Menu (Mobile Only) */}
          <div className="md:hidden flex items-center">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger className="p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 transition-colors">
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Mobile navigation menu</SheetDescription>
                <div className="flex h-[60px] items-center gap-3 px-6 border-b border-slate-100">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)" }}
                  >
                    LF
                  </div>
                  <span className="text-[17px] font-bold tracking-tight text-slate-900">LeadFlow</span>
                </div>
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                  {navItems
                    .filter((item) => {
                      if (
                        isClient &&
                        (item.name === "Websites" ||
                          item.name === "Workspaces")
                      )
                        return false;
                      return true;
                    })
                    .map((item) => {
                      const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsSheetOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                            isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                          {item.name}
                        </Link>
                      );
                    })}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-start">
                    <UserButton showName />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link href="/" className="flex h-full items-center text-[15px] md:text-[14px] font-bold text-slate-900">
            LeadFlow
          </Link>
          
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex h-full items-center gap-8">
            <Link 
              href="/leads"
              className="flex h-full items-center text-[13.5px] font-semibold cursor-pointer relative text-indigo-600"
            >
              Pipeline
              {pathname === "/leads" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600" />}
            </Link>
            {!isClient && (
              <Link href="/websites" className="flex h-full items-center text-[13.5px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
                Websites
              </Link>
            )}
            <Link href="/contacts" className="flex h-full items-center text-[13.5px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
              Contacts
            </Link>
            <Link href="/analytics" className="flex h-full items-center text-[13.5px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
              Analytics
            </Link>
          </div>
        </div>

        {/* Right side: Push Status Indicator & Settings */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex h-full items-center cursor-pointer mr-2">
            <Plus className="h-4 w-4 text-slate-400 hover:text-slate-600 transition-colors" />
          </div>

          <Tooltip>
            <TooltipTrigger className="flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 cursor-default transition-all duration-300">
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
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="w-[200px] text-xs">
              {pushStatus === "idle" ? "Waiting for new leads..." :
               pushStatus === "success" ? "Last lead was successfully pushed to your mobile devices." :
               "Last push failed or no mobile devices are subscribed."}
            </TooltipContent>
          </Tooltip>

          <Link href="/settings" className="hidden md:block text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mr-1">
            Settings
          </Link>
          
          {/* Active Profile Selector */}
          {!isClient ? (
            <div className="hidden sm:block">
              <select
                className="text-[11px] font-semibold text-slate-700 bg-[#F7F5FF] border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 transition-all cursor-pointer max-w-[120px] truncate"
                value={activeWebsiteId || "all"}
                onChange={(e) => setActiveWebsiteId(e.target.value === "all" ? null : e.target.value)}
              >
                <option value="all">All Profiles</option>
                {websites.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] font-bold text-indigo-700 max-w-[120px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="truncate">{websites.find(w => w.id === activeWebsiteId)?.name || "Client"}</span>
            </div>
          )}

          <div className="flex items-center ml-1">
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  );
}
