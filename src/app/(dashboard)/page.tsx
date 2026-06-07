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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {websites.map((site) => (
            <div key={site.id} className="group relative bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 transition-all duration-300 overflow-hidden flex flex-col hover:-translate-y-1">
              {/* Decorative top gradient bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="p-8 flex-1 flex flex-col items-center text-center relative z-10">
                {/* Logo Container with Glow effect */}
                <div className="relative mb-6 group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity duration-300" />
                  <div className="w-20 h-20 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center overflow-hidden relative z-10 p-1">
                    {site.logoUrl ? (
                      <img src={site.logoUrl} alt={site.name} className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <div className="w-full h-full bg-slate-50 rounded-xl flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-indigo-400" />
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1 group-hover:text-indigo-600 transition-colors">
                  {site.name}
                </h3>
                
                <a href={site.domain.startsWith('http') ? site.domain : `https://${site.domain}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center transition-colors">
                  {site.domain} <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                </a>

                {/* Premium Stats Section */}
                <div className="w-full mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors duration-300 flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-800 group-hover:text-indigo-700 transition-colors">0</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Leads</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 group-hover:bg-purple-50 group-hover:border-purple-100 transition-colors duration-300 flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-800 group-hover:text-purple-700 transition-colors">0</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">New This Wk</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex gap-3 backdrop-blur-sm">
                <Link href={`/client/${site.id}`} className="flex-1">
                  <Button className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-semibold shadow-md transition-all duration-300">
                    <Activity className="w-4 h-4 mr-2" />
                    Open Pipeline
                  </Button>
                </Link>
                {!isClient && (
                  <Link href={`/client/${site.id}/settings`}>
                    <Button variant="outline" className="px-3 border-slate-200 text-slate-600 hover:bg-white hover:text-indigo-600 hover:border-indigo-200 transition-all duration-300 shadow-sm">
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
