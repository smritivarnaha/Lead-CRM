"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  MessageSquare,
  Search,
  Sparkles,
  X,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  section: "workspace" | "insights" | "setup";
};

const navItems: NavItem[] = [
  // 1. Daily Workspace
  { name: "Dashboard",       href: "/",              icon: LayoutDashboard, section: "workspace" },
  { name: "Lead Pipeline",   href: "/leads",         icon: Users,           section: "workspace" },
  { name: "Follow-ups",      href: "/followups",     icon: CalendarClock,   section: "workspace" },
  { name: "Email Campaigns", href: "/email",         icon: Mail,            section: "workspace" },

  // 2. Insights & Logs
  { name: "Analytics",       href: "/analytics",     icon: BarChart3,       section: "insights" },
  { name: "Activity Log",    href: "/activity",      icon: Activity,        section: "insights" },

  // 3. Setup & Administration
  { name: "Websites",        href: "/websites",      icon: Globe,           section: "setup" },
  { name: "Client Alerts",   href: "/alerts",        icon: MessageSquare,   section: "setup" },
  { name: "Integrations",    href: "/integrations",  icon: Link2,           section: "setup" },
  { name: "Workspaces",      href: "/workspaces",    icon: Briefcase,       section: "setup" },
  { name: "Settings",        href: "/settings",      icon: Settings,        section: "setup" },
  { name: "Team Access",     href: "/settings/team", icon: Users,           section: "setup" },
];

const SECTIONS: { key: NavItem["section"]; label: string }[] = [
  { key: "workspace", label: "Daily Workspace" },
  { key: "insights",  label: "Insights & Logs" },
  { key: "setup",     label: "Setup & Admin" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const role = user?.publicMetadata?.role as string | undefined;
  const isClient = role === "CLIENT";
  const isSuperAdmin = role === "SUPER_ADMIN" || !role;

  const visibleNavItems = navItems.filter((item) => {
    if (
      isClient &&
      (item.name === "Websites" ||
        item.name === "Workspaces" ||
        item.name === "Team Access")
    )
      return false;

    if (item.name === "Team Access" && !isSuperAdmin) {
      return false;
    }

    return true;
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/leads?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/leads");
    }
  };

  return (
    <>
      <div
        className="hidden md:flex h-full w-[260px] flex-col bg-white border-r border-[#E8E4F3]"
        style={{ flexShrink: 0 }}
      >
        {/* Logo */}
        <div className="flex h-[60px] items-center justify-between px-5 border-b border-[#E8E4F3]">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold flex-shrink-0 shadow-xs"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)",
              }}
            >
              LF
            </div>
            <div>
              <span
                className="text-[16px] font-bold tracking-tight block leading-none"
                style={{ color: "#1A1523" }}
              >
                LeadFlow
              </span>
              <span className="text-[10px] font-semibold text-[#7C3AED] tracking-wide uppercase">
                Rankved CRM
              </span>
            </div>
          </Link>
        </div>

        {/* Functional Quick Lead Search */}
        <form onSubmit={handleSearchSubmit} className="px-3 pt-3.5 pb-1">
          <div className="relative flex items-center">
            <Search className="h-3.5 w-3.5 text-[#9CA3AF] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads (Enter)..."
              className="w-full rounded-lg bg-[#F7F5FF] border border-[#E8E4F3] pl-8 pr-7 h-9 text-[12.5px] text-[#1A1523] placeholder:text-[#9CA3AF] outline-none focus:border-[#7C3AED] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-[#9CA3AF] hover:text-[#1A1523]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Grouped Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto no-scrollbar">
          {SECTIONS.map((section) => {
            const items = visibleNavItems.filter((i) => i.section === section.key);
            if (items.length === 0) return null;
            return (
              <div key={section.key} className="space-y-0.5">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                  {section.label}
                </div>
                {items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : item.href === "/settings"
                      ? pathname === "/settings"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={true}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 h-9 text-[13.5px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-[#EDE9FE] text-[#7C3AED] font-semibold shadow-2xs"
                          : "text-[#6B7280] hover:bg-[#F3F0FF] hover:text-[#1A1523]"
                      )}
                    >
                      <item.icon
                        strokeWidth={isActive ? 2.2 : 1.75}
                        className={cn(
                          "h-[16px] w-[16px] flex-shrink-0",
                          isActive ? "text-[#7C3AED]" : "text-[#9CA3AF]"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Interactive Feature Guide / Onboarding Card */}
        <div className="mx-3 mb-3 rounded-xl bg-gradient-to-br from-[#F7F5FF] to-[#EDE9FE]/60 border border-[#E8E4F3] p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-[#7C3AED]" strokeWidth={2} />
            <span className="text-[12.5px] font-bold text-[#1A1523]">New to LeadFlow?</span>
          </div>
          <p className="text-[11.5px] text-[#6B7280] leading-snug mb-2.5">
            Explore how to connect websites, customize alerts, and convert leads faster.
          </p>
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#DDD6FE] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED] transition-colors cursor-pointer shadow-2xs"
          >
            <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
            Quick Start Guide
          </button>
        </div>

        {/* User profile & Log out */}
        <div className="mx-3 mb-3 border-t border-[#E8E4F3] pt-3 flex items-center justify-between">
          <UserButton showName />
        </div>
      </div>

      {/* Interactive Feature Tour / Quick Start Modal */}
      {isGuideOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsGuideOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#7C3AED] to-indigo-600 p-6 text-white flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  Interactive Tour
                </span>
                <h2 className="text-xl font-bold mt-2">Welcome to LeadFlow CRM</h2>
                <p className="text-xs text-purple-100 mt-1">
                  Everything you need to capture, alert, track, and convert healthcare & agency leads in real time.
                </p>
              </div>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-600" /> Connect Your Websites
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Capture leads automatically from WordPress (Contact Form 7, Elementor, WPForms), Google Sheets, or custom HTML forms.
                  </p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setIsGuideOpen(false)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  Open Integration Setup <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Branded Instant Alerts
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Send Rankved Healthcare Martech branded lead alerts to admins/clients AND automatic confirmation emails to visitors.
                  </p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setIsGuideOpen(false)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1"
                >
                  Customize Email & SMS Alerts <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-purple-600" /> Work the Lead Pipeline
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Filter by client website tab, click any lead to open the Command Drawer, connect via 1-click Call or WhatsApp, and log notes.
                  </p>
                </div>
                <Link
                  href="/leads"
                  onClick={() => setIsGuideOpen(false)}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 inline-flex items-center gap-1"
                >
                  Go to Lead Pipeline <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" /> Follow-ups & Broadcasts
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Never miss a callback with snoozeable Follow-up queues, and send bulk email broadcasts to active leads.
                  </p>
                </div>
                <Link
                  href="/followups"
                  onClick={() => setIsGuideOpen(false)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-800 inline-flex items-center gap-1"
                >
                  View Active Follow-ups <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Tip: Use the top-right profile switcher to filter the entire CRM by client.</span>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#1A1523] text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
