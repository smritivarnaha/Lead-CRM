"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getWebsites } from "@/actions/websites";
import { useUser } from "@clerk/nextjs";

export type Website = {
  id: string;
  name: string;
  domain: string;
  webhookUrl: string;
  isActive: boolean;
  logoUrl?: string | null;
  adminPhone?: string | null;
  adminEmail?: string | null;
  smsAlertsEnabled: boolean;
  emailAlertsEnabled: boolean;
  stats?: {
    total: number;
    newThisWeek: number;
    unread: number;
  };
  [key: string]: any;
};

interface ActiveProfileContextType {
  websites: Website[];
  setWebsites: React.Dispatch<React.SetStateAction<Website[]>>;
  activeWebsiteId: string | null; // null means "All Profiles"
  setActiveWebsiteId: (id: string | null) => void;
  isLoading: boolean;
}

const ActiveProfileContext = createContext<ActiveProfileContextType | undefined>(undefined);

export function ActiveProfileProvider({ children }: { children: React.ReactNode }) {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [activeWebsiteId, setActiveWebsiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchSites = async () => {
      try {
        const res = await getWebsites();
        if (res?.success && res.websites) {
          setWebsites(res.websites);
          
          const role = user.publicMetadata?.role as string | undefined;
          const isClient = role === "CLIENT";
          
          if (isClient && res.websites.length > 0) {
            setActiveWebsiteId(res.websites[0].id);
          } else if (!isClient) {
            // For admins, default to "all" (null) or load from localStorage if previously selected
            const savedId = localStorage.getItem("leadflow_active_website_id");
            if (savedId && res.websites.some((w: Website) => w.id === savedId)) {
              setActiveWebsiteId(savedId);
            } else {
              setActiveWebsiteId(null);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching websites for context:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSites();
  }, [isLoaded, user]);

  // Sync to localStorage whenever it changes
  useEffect(() => {
    if (activeWebsiteId) {
      localStorage.setItem("leadflow_active_website_id", activeWebsiteId);
    } else {
      localStorage.removeItem("leadflow_active_website_id");
    }
  }, [activeWebsiteId]);

  return (
    <ActiveProfileContext.Provider value={{ websites, setWebsites, activeWebsiteId, setActiveWebsiteId, isLoading }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  const context = useContext(ActiveProfileContext);
  if (context === undefined) {
    throw new Error("useActiveProfile must be used within an ActiveProfileProvider");
  }
  return context;
}
