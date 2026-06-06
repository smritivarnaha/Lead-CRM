"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  return (
    <header
      className="flex h-[60px] items-center border-b bg-white px-8"
      style={{ borderColor: "#E8E4F3", flexShrink: 0 }}
    >
      <div className="flex h-full items-center gap-8">
        <Link href="/" className="flex h-full items-center text-[14px] font-bold" style={{ color: "#1A1523" }}>
          Lead Center
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
    </header>
  );
}
