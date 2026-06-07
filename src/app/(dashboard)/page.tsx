"use client";

import { useState, useEffect } from "react";
import { getWebsites } from "@/actions/websites";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Building2, Settings, Download, ExternalLink, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useUser();
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const role = user?.publicMetadata?.role as string | undefined;
  const userWebsiteId = user?.publicMetadata?.websiteId as string | undefined;
  const isClient = role === "CLIENT" && !!userWebsiteId;

  useEffect(() => {
    getWebsites().then((res) => {
      if (res.success && res.websites) {
        if (isClient) {
          setWebsites(res.websites.filter((w: any) => w.id === userWebsiteId));
        } else {
          setWebsites(res.websites);
        }
      }
      setLoading(false);
    });
  }, [isClient, userWebsiteId]);

  if (loading) {
    return (
      <div className="flex-1 p-8 bg-[#FAFAFA] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-[#FAFAFA] overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1523] tracking-tight">
            {isClient ? "Your Dashboard" : "Client Dashboard"}
          </h1>
          <p className="text-[#6B7280] mt-1 text-sm">
            {isClient ? "Manage your leads and CRM pipeline." : "Overview of all active client CRM pipelines and settings."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {websites.map((site) => (
            <div key={site.id} className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
              <div className="p-6 flex-1 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4 overflow-hidden relative">
                  {site.logoUrl ? (
                    <img src={site.logoUrl} alt={site.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-indigo-400" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-[#1A1523] group-hover:text-indigo-600 transition-colors">
                  {site.name}
                </h3>
                <a href={site.domain.startsWith('http') ? site.domain : `https://${site.domain}`} target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:text-slate-800 flex items-center mt-1">
                  {site.domain} <ExternalLink className="w-3 h-3 ml-1" />
                </a>

                {/* Example Stats - placeholder until analytics are fully wired */}
                <div className="w-full mt-6 grid grid-cols-2 gap-3 pt-6 border-t border-slate-100">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-slate-800">0</span>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Total Leads</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-indigo-600">0</span>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">New This Wk</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border-t border-[#E5E7EB] p-4 flex gap-2">
                <Link href={`/client/${site.id}`} className="flex-1">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm">
                    <Activity className="w-4 h-4 mr-2" />
                    Pipeline
                  </Button>
                </Link>
                {!isClient && (
                  <Link href={`/client/${site.id}/settings`}>
                    <Button variant="outline" className="px-3 border-slate-200 text-slate-600 hover:bg-slate-100">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}

          {/* Install App Promo Card for Clients */}
          {isClient && (
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md flex flex-col p-6 text-white justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Install CRM App</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-6">
                  Get instant push notifications for new leads by installing this dashboard on your mobile home screen.
                </p>
              </div>
              <Button 
                variant="secondary" 
                className="w-full bg-white text-indigo-600 hover:bg-slate-50 font-bold relative z-10"
                onClick={() => {
                  // Standard PWA install trigger (if beforeinstallprompt event was captured)
                  const event = (window as any).deferredPrompt;
                  if (event) {
                    event.prompt();
                    event.userChoice.then((choiceResult: any) => {
                      if (choiceResult.outcome === 'accepted') {
                        (window as any).deferredPrompt = null;
                      }
                    });
                  } else {
                    alert("To install, tap 'Share' (iOS) or 'Menu' (Android) and select 'Add to Home Screen'.");
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Install App
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
