"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getWebsitesList } from "@/actions/websites";
import { useUser } from "@clerk/nextjs";

export type Website = {
  id: string;
  name: string;
  domain: string;
  webhookUrl?: string;
  isActive?: boolean;
  logoUrl?: string | null;
  adminPhone?: string | null;
  adminEmail?: string | null;
  smsAlertsEnabled?: boolean;
  emailAlertsEnabled?: boolean;
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

export function ActiveProfileProvider({ 
  children,
  initialWebsites 
}: { 
  children: React.ReactNode;
  initialWebsites?: Website[];
}) {
  const [websites, setWebsites] = useState<Website[]>(initialWebsites || []);
  const [activeWebsiteId, setActiveWebsiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialWebsites || initialWebsites.length === 0);
  const { user, isLoaded } = useUser();

  // Keep state in sync if initialWebsites updates
  useEffect(() => {
    if (initialWebsites && initialWebsites.length > 0) {
      setWebsites(initialWebsites);
      setIsLoading(false);
    }
  }, [initialWebsites]);

  // Determine active profile from user role or localStorage
  useEffect(() => {
    if (!isLoaded || !user) return;

    const role = user.publicMetadata?.role as string | undefined;
    const isClient = role === "CLIENT";
    const currentList = websites.length > 0 ? websites : (initialWebsites || []);

    if (isClient && currentList.length > 0) {
      setActiveWebsiteId(currentList[0].id);
    } else if (!isClient && currentList.length > 0) {
      const savedId = localStorage.getItem("leadflow_active_website_id");
      if (savedId && currentList.some((w: Website) => w.id === savedId)) {
        setActiveWebsiteId(savedId);
      } else {
        setActiveWebsiteId(null);
      }
    }
  }, [isLoaded, user, websites]);

  // Only fetch on client if initialWebsites was not provided
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    if (initialWebsites && initialWebsites.length > 0) {
      setIsLoading(false);
      return;
    }

    const fetchSites = async () => {
      try {
        const res = await getWebsitesList();
        if (res?.success && res.websites) {
          setWebsites(res.websites);
          
          const role = user.publicMetadata?.role as string | undefined;
          const isClient = role === "CLIENT";
          
          if (isClient && res.websites.length > 0) {
            setActiveWebsiteId(res.websites[0].id);
          } else if (!isClient) {
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
  }, [isLoaded, user, initialWebsites]);

  // Sync to localStorage AND cookie whenever it changes
  useEffect(() => {
    if (activeWebsiteId) {
      localStorage.setItem("leadflow_active_website_id", activeWebsiteId);
      document.cookie = `leadflow_active_website_id=${activeWebsiteId}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      localStorage.removeItem("leadflow_active_website_id");
      document.cookie = `leadflow_active_website_id=; path=/; max-age=0; SameSite=Lax`;
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
