"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Briefcase,
  Globe,
  LayoutDashboard,
  Settings,
  Users,
  HelpCircle,
  BookOpen,
  Link2,
  CalendarClock,
  Mail,
} from "lucide-react";

const navItems = [
  { name: "Dashboard",    href: "/",           icon: LayoutDashboard },
  { name: "Lead Pipeline",href: "/leads",       icon: Users },
  { name: "Followups",    href: "/followups",   icon: CalendarClock },
  { name: "Email Campaigns",href: "/email",     icon: Mail },
  { name: "Websites",     href: "/websites",    icon: Globe },
  { name: "Analytics",    href: "/analytics",   icon: BarChart3 },
  { name: "Integrations", href: "/integrations",icon: Link2 },
  { name: "Workspaces",   href: "/workspaces",  icon: Briefcase },
  { name: "Activity",     href: "/activity",    icon: Activity },
  { name: "Settings",     href: "/settings",    icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  const role = user?.publicMetadata?.role as string | undefined;
  const isClient = role === "CLIENT";

  const visibleNavItems = navItems.filter((item) => {
    if (
      isClient &&
      (item.name === "Websites" ||
        item.name === "Workspaces")
    )
      return false;
    return true;
  });

  return (
    <div
      className="hidden md:flex h-full w-[260px] flex-col bg-white border-r border-[#E8E4F3]"
      style={{ flexShrink: 0 }}
    >
      {/* Logo */}
      <div className="flex h-[60px] items-center gap-3 px-6 border-b border-[#E8E4F3]">
        {/* Purple gradient star logo — matching Gyaan */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)",
          }}
        >
          LF
        </div>
        <span
          className="text-[17px] font-bold tracking-tight"
          style={{ color: "#1A1523" }}
        >
          LeadFlow
        </span>
      </div>

      {/* Search */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-[#F7F5FF] border border-[#E8E4F3] px-3 h-10 text-sm text-[#9CA3AF] cursor-pointer hover:border-[#7C3AED] transition-colors">
          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[13px]">Search</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 h-10 text-[14px] font-medium transition-all duration-150",
                isActive
                  ? "bg-[#EDE9FE] text-[#7C3AED]"
                  : "text-[#6B7280] hover:bg-[#F3F0FF] hover:text-[#1A1523]"
              )}
            >
              <item.icon
                strokeWidth={isActive ? 2 : 1.75}
                className={cn(
                  "h-[17px] w-[17px] flex-shrink-0",
                  isActive ? "text-[#7C3AED]" : "text-[#9CA3AF]"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom help card */}
      <div className="mx-3 mb-4 rounded-xl bg-[#F7F5FF] border border-[#E8E4F3] p-3.5">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="h-4 w-4 text-[#7C3AED]" strokeWidth={1.75} />
          <span className="text-[13px] font-semibold text-[#1A1523]">Need help?</span>
        </div>
        <p className="text-[12px] text-[#9CA3AF] leading-relaxed mb-2.5">
          Check our docs or contact support anytime.
        </p>
        <button className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#E8E4F3] bg-white px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors">
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
          Documentation
        </button>
      </div>

      {/* User profile & Log out */}
      <div className="mx-3 mb-4 mt-auto border-t border-[#E8E4F3] pt-4 flex items-center justify-between">
        <UserButton showName />
      </div>
    </div>
  );
}
