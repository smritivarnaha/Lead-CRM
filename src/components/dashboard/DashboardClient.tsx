"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Download, ExternalLink, Image as ImageIcon, Smartphone, Bell, BellOff, BellRing, ArrowRight, Settings, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { useActiveProfile } from "@/components/providers/ActiveProfileProvider";
import { WebsiteSettingsModal } from "./WebsiteSettingsModal";

interface DashboardClientProps {
  initialWebsites: any[];
  role: string | undefined;
  userWebsiteId: string | undefined;
}

export function DashboardClient({ initialWebsites, role, userWebsiteId }: DashboardClientProps) {
  const { websites, setWebsites, activeWebsiteId } = useActiveProfile();
  // Filter websites if an active profile is selected, otherwise show all
  const displayWebsites = websites.length > 0 ? (activeWebsiteId ? websites.filter(w => w.id === activeWebsiteId) : websites) : initialWebsites;
  
  const [configuringSite, setConfiguringSite] = useState<any | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<"loading" | "subscribed" | "unsubscribed" | "unsupported">("loading");
  const [isProcessingPush, setIsProcessingPush] = useState(false);

  const isClient = role === "CLIENT" && !!userWebsiteId;

  // Add push checking
  useEffect(() => {
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported");
      return;
    }
    try {
      const sw = await navigator.serviceWorker.ready;
      const sub = await sw.pushManager.getSubscription();
      if (sub) setPushStatus("subscribed");
      else setPushStatus("unsubscribed");
    } catch (e) {
      setPushStatus("unsupported");
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  };

  const togglePush = async () => {
    if (pushStatus === "unsupported") {
      toast.error("Push not supported on this device/browser.");
      return;
    }
    setIsProcessingPush(true);
    try {
      const sw = await navigator.serviceWorker.ready;
      if (pushStatus === "subscribed") {
        const sub = await sw.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setPushStatus("unsubscribed");
        toast.success("Push notifications disabled.");
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission denied.");
          setIsProcessingPush(false);
          return;
        }
        const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
        const subscription = await sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        setPushStatus("subscribed");
        toast.success("Push notifications enabled!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to toggle push notifications.");
    } finally {
      setIsProcessingPush(false);
    }
  };

  const handleSave = async (siteId: string, field: string, value: any) => {
    setSavingId(siteId);
    try {
      const res = await fetch(`/api/websites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Client updated successfully.");
        setWebsites(prev => prev.map(w => w.id === siteId ? { ...w, [field]: value } : w));
      } else {
        toast.error("Failed to update.");
      }
    } catch (e) {
      toast.error("Network error.");
    } finally {
      setSavingId(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, siteId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image is too large. Please select a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxSize = 72; // For badge
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64String = canvas.toDataURL("image/png");
          handleSave(siteId, "logoUrl", base64String);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-[#FAFAFA] overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1523] tracking-tight">
            {isClient ? "Your Dashboard" : "Client Dashboard"}
          </h1>
          <p className="text-[#6B7280] mt-1 text-sm">
            {isClient ? "Manage your leads and CRM pipeline." : "Overview of all active client CRM pipelines and settings."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayWebsites.map((site: any) => (
            <div 
              key={site.id} 
              className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col overflow-hidden"
            >
              {/* Card Main Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                {/* Header: Logo, Brand Name, Domain & Settings Button */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Compact Logo (42x42) */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-center overflow-hidden p-1 shadow-2xs">
                        {site.logoUrl ? (
                          <img src={site.logoUrl} alt={site.name} className="w-full h-full object-contain rounded-lg" />
                        ) : (
                          <Building2 className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      {!isClient && (
                        <label className="absolute -bottom-1 -right-1 w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-xs cursor-pointer hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" title="Upload Logo">
                          <input 
                            type="file" 
                            accept="image/png, image/webp" 
                            className="hidden" 
                            onChange={(e) => handleImageUpload(e, site.id)} 
                          />
                          <ImageIcon className="w-2.5 h-2.5 text-slate-600" />
                        </label>
                      )}
                    </div>

                    {/* Brand Name & Domain */}
                    <div className="min-w-0 flex-1">
                      {!isClient ? (
                        <input 
                          type="text"
                          value={site.name}
                          onChange={(e) => setWebsites(prev => prev.map(w => w.id === site.id ? { ...w, name: e.target.value } : w))}
                          onBlur={(e) => handleSave(site.id, "name", e.target.value)}
                          className="text-[15px] font-bold text-slate-900 leading-tight bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors truncate max-w-full"
                          placeholder="Brand Name"
                          title="Click to edit name"
                        />
                      ) : (
                        <h3 className="text-[15px] font-bold text-slate-900 leading-tight truncate">
                          {site.name}
                        </h3>
                      )}
                      <a 
                        href={site.domain.startsWith('http') ? site.domain : `https://${site.domain}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[11.5px] font-medium text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1 mt-0.5 transition-colors truncate max-w-[180px]"
                      >
                        <span className="truncate">{site.domain.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                      </a>
                    </div>
                  </div>

                  {/* Settings Button */}
                  <button 
                    type="button"
                    onClick={() => setConfiguringSite(site)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
                    title="Website Settings & Integration"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                {/* High-Density KPI Stats Strip */}
                <div className="grid grid-cols-3 gap-2 mt-4 bg-slate-50/80 border border-slate-100 rounded-xl p-2.5">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-base font-bold text-slate-900 leading-none">{site.stats?.total || 0}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Total</span>
                  </div>
                  <div className="flex flex-col items-center justify-center border-x border-slate-200/60">
                    <span className="text-base font-bold text-slate-900 leading-none">{site.stats?.newThisWeek || 0}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">This Wk</span>
                  </div>
                  <div className="flex flex-col items-center justify-center relative">
                    {(site.stats?.unread || 0) > 0 && (
                      <span className="absolute -top-1 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                    )}
                    <span className={`text-base font-bold leading-none ${(site.stats?.unread || 0) > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-900'}`}>
                      {site.stats?.unread || 0}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Unread</span>
                  </div>
                </div>

                {/* Compact Alert Status Row */}
                <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 pt-2.5 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${
                      site.smsAlertsEnabled !== false && site.adminPhone ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`} title={site.adminPhone ? `SMS: ${site.adminPhone}` : 'SMS Inactive'}>
                      <Smartphone className="w-2.5 h-2.5" /> SMS
                    </span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${
                      site.emailAlertsEnabled !== false && site.adminEmail ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'
                    }`} title={site.adminEmail ? `Email: ${site.adminEmail}` : 'Email Inactive'}>
                      <Mail className="w-2.5 h-2.5" /> Email
                    </span>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setConfiguringSite(site)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                  >
                    Configure
                  </button>
                </div>
              </div>

              {/* Action Footer: Open Pipeline */}
              <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100">
                <Link 
                  href={`/client/${site.id}`}
                  prefetch={true}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#1A1523] hover:bg-indigo-600 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-xs transition-colors"
                >
                  <span>Open Pipeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
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

      {/* Website Configuration Popup Modal */}
      {configuringSite && (
        <WebsiteSettingsModal 
          site={configuringSite} 
          isOpen={!!configuringSite} 
          onClose={() => setConfiguringSite(null)} 
          onUpdate={(updated) => {
            setWebsites(prev => prev.map(w => w.id === updated.id ? { ...w, ...updated } : w));
            setConfiguringSite(updated);
          }}
        />
      )}
    </div>
  );
}
