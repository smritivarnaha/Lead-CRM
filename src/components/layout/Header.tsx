"use client";

import { Bell, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton, useUser } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/":           { title: "Dashboard",    subtitle: "Live overview of your leads & websites" },
  "/leads":      { title: "Lead Pipeline",subtitle: "Manage and track all your leads" },
  "/websites":   { title: "Websites",     subtitle: "Connected websites receiving leads" },
  "/analytics":  { title: "Analytics",    subtitle: "Performance metrics and insights" },
  "/workspaces": { title: "Workspaces",   subtitle: "Manage client workspaces" },
  "/activity":   { title: "Activity",     subtitle: "Recent actions and notifications" },
  "/settings":   { title: "Settings",     subtitle: "Configure your account and preferences" },
};

export function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Find best matching route
  const meta =
    PAGE_META[pathname] ||
    Object.entries(PAGE_META)
      .filter(([k]) => k !== "/" && pathname.startsWith(k))
      .map(([, v]) => v)[0] ||
    { title: "LeadFlow", subtitle: "" };

  const mockResults = [
    { type: "Lead",    text: "Arun Sharma — Google Ads" },
    { type: "Lead",    text: "Priya Mehta — Website Form" },
    { type: "Website", text: "dranuragneuro.com" },
  ].filter((r) =>
    searchQuery ? r.text.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header
      className="flex h-[58px] items-center justify-between border-b bg-white px-6"
      style={{ borderColor: "#E8E4F3", flexShrink: 0 }}
    >
      {/* Left — page title */}
      <div className="flex items-baseline gap-3">
        <h1
          className="text-[20px] font-bold leading-tight tracking-tight"
          style={{ color: "#1A1523" }}
        >
          {meta.title}
        </h1>
        {meta.subtitle && (
          <span className="hidden md:inline text-[13px]" style={{ color: "#9CA3AF" }}>
            — {meta.subtitle}
          </span>
        )}
      </div>

      {/* Right — search + bell + user */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: "#9CA3AF" }}
          />
          <input
            type="text"
            placeholder="Search leads, websites…"
            className="w-64 rounded-lg border pl-9 pr-4 py-2 text-[13px] outline-none transition-all focus:w-80"
            style={{
              background: "#F7F5FF",
              borderColor: "#E8E4F3",
              color: "#1A1523",
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearching(true)}
            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
          />
          {isSearching && searchQuery.length > 0 && (
            <div
              className="absolute top-11 left-0 w-72 rounded-xl border bg-white shadow-lg z-50 overflow-hidden"
              style={{ borderColor: "#E8E4F3" }}
            >
              {mockResults.length > 0 ? (
                mockResults.map((res, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F5FF] cursor-pointer transition-colors"
                    style={{ borderBottom: i < mockResults.length - 1 ? "1px solid #F3F0FF" : "none" }}
                  >
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{
                        background: res.type === "Lead" ? "#EDE9FE" : "#ECFDF5",
                        color: res.type === "Lead" ? "#7C3AED" : "#10B981",
                      }}
                    >
                      {res.type}
                    </span>
                    <span className="text-[13px]" style={{ color: "#1A1523" }}>
                      {res.text}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-[13px]" style={{ color: "#9CA3AF" }}>
                  No results for &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bell */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#F3F0FF]"
          style={{ border: "1px solid #E8E4F3" }}
        >
          <Bell className="h-4 w-4" style={{ color: "#6B7280" }} strokeWidth={1.75} />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-white"
            style={{ background: "#7C3AED" }}
          />
        </button>

        {/* Divider */}
        <div className="h-6 w-px" style={{ background: "#E8E4F3" }} />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="hidden text-right md:block">
                <p className="text-[13px] font-semibold leading-tight" style={{ color: "#1A1523" }}>
                  {user?.fullName || "Rankved"}
                </p>
                <p className="text-[11px] leading-tight" style={{ color: "#9CA3AF" }}>
                  {user?.primaryEmailAddress?.emailAddress || "hello@rankved.com"}
                </p>
              </div>
              <Avatar className="h-8 w-8 ring-2 ring-white transition-transform group-hover:scale-105"
                style={{ boxShadow: "0 0 0 2px #E8E4F3" }}>
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback
                  className="text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-[13px]">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13px]">Profile Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13px] text-red-600 focus:text-red-600 focus:bg-red-50">
              <SignOutButton>
                <span>Log out</span>
              </SignOutButton>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
