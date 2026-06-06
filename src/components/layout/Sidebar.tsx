"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Briefcase,
  Globe,
  Home,
  Settings,
  Users,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Lead Pipeline", href: "/leads", icon: Users },
  { name: "Websites", href: "/websites", icon: Globe },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Workspaces", href: "/workspaces", icon: Briefcase },
  { name: "Activity", href: "/activity", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  
  // If user is a CLIENT, hide Workspaces, Websites, and Settings
  const role = user?.publicMetadata?.role as string | undefined;
  const isClient = role === "CLIENT";

  const visibleNavItems = navItems.filter(item => {
    if (isClient && (item.name === "Websites" || item.name === "Workspaces" || item.name === "Settings")) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-full w-[280px] flex-col border-r border-gyaan-border bg-gyaan-sidebar">
      <div className="flex h-16 items-center justify-center border-b border-gyaan-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gyaan-purple text-white font-bold text-sm">
            LF
          </div>
          <span className="text-xl font-bold tracking-tight text-gyaan-primary">LeadFlow</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
        <div className="mb-4 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 h-[44px] text-[13px] font-medium transition-all duration-200 border border-transparent",
                isActive
                  ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-gyaan-primary border-l-[3px] !border-l-gyaan-purple !rounded-l-sm"
                  : "text-gyaan-secondary hover:bg-[#F2F2F4] hover:text-gyaan-primary"
              )}
            >
              <item.icon
                strokeWidth={1.75}
                className={cn(
                  "h-[18px] w-[18px]",
                  isActive ? "text-gyaan-purple" : "text-gyaan-secondary"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl bg-gyaan-bg border border-gyaan-border p-4 m-4">
        <h4 className="text-[13px] font-semibold text-gyaan-primary">Need help?</h4>
        <p className="mt-1 text-xs text-gyaan-muted">
          Check out our documentation or contact support.
        </p>
        <button className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-xs font-medium text-gyaan-secondary shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-gyaan-border hover:bg-gyaan-hover transition-colors">
          Documentation
        </button>
      </div>
    </div>
  );
}
