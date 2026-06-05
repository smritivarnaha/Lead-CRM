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
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-20 items-center justify-center border-b px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
            LF
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">LeadFlow</span>
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
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-blue-700" : "text-slate-400"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl bg-slate-50 p-4">
        <h4 className="text-sm font-semibold text-slate-900">Need help?</h4>
        <p className="mt-1 text-xs text-slate-500">
          Check out our documentation or contact support.
        </p>
        <button className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm border hover:bg-slate-50 transition-colors">
          Documentation
        </button>
      </div>
    </div>
  );
}
