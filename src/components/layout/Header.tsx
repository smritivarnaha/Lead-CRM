"use client";

import { Bell, Search, User as UserIcon, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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

export function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Basic logic to get title from pathname
  const title = pathname === "/" 
    ? "Dashboard" 
    : pathname.split('/')[1].charAt(0).toUpperCase() + pathname.split('/')[1].slice(1);

  const mockSearchResults = [
    { type: "Lead", text: "John Doe (Google Ads)" },
    { type: "Lead", text: "Sarah Connor (Website Form)" },
    { type: "Website", text: "dranuragneuro.com" },
  ].filter(result => result.text.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <header className="flex h-20 items-center justify-between border-b bg-white px-8">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Search leads, websites..." 
            className="w-full rounded-full bg-slate-50 pl-10 border-slate-200 focus-visible:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearching(true)}
            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
          />
          {isSearching && searchQuery.length > 0 && (
            <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 shadow-lg rounded-xl z-50 overflow-hidden">
              {mockSearchResults.length > 0 ? (
                mockSearchResults.map((res, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-0">
                    <div className="text-xs font-semibold text-blue-600 mb-0.5">{res.type}</div>
                    <div className="text-sm text-slate-800">{res.text}</div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-slate-500">No results found for "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 border-l pl-6">
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="hidden text-right md:block">
                  <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                    {user?.fullName || "Sarah Drasner"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {user?.primaryEmailAddress?.emailAddress || "sarah@rankved.com"}
                  </p>
                </div>
                <Avatar className="h-10 w-10 border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                  <AvatarImage src={user?.imageUrl || "https://i.pravatar.cc/150?u=sarah"} />
                  <AvatarFallback>SD</AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" />
                <SignOutButton>
                  <span>Log out</span>
                </SignOutButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
