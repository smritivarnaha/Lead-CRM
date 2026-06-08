"use client";

import { useState, useEffect } from "react";
import { Building2, Download, ExternalLink, Image as ImageIcon, Smartphone, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DashboardClientProps {
  initialWebsites: any[];
  role: string | undefined;
  userWebsiteId: string | undefined;
}

export function DashboardClient({ initialWebsites, role, userWebsiteId }: DashboardClientProps) {
  const [websites, setWebsites] = useState<any[]>(initialWebsites);
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
            <div key={site.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  {/* Logo Container */}
                  <div className="relative group/logo">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-1">
                      {site.logoUrl ? (
                        <img src={site.logoUrl} alt={site.name} className="w-full h-full object-contain rounded-md" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    {!isClient && (
                      <label className="absolute -bottom-2 -right-2 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" title="Upload Badge Logo">
                        <input 
                          type="file" 
                          accept="image/png, image/webp" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload(e, site.id)} 
                        />
                        <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                      </label>
                    )}
                  </div>
                  
                  <div className="text-right flex-1 ml-4 overflow-hidden">
                    {!isClient ? (
                      <input 
                        type="text"
                        value={site.name}
                        onChange={(e) => setWebsites(prev => prev.map(w => w.id === site.id ? { ...w, name: e.target.value } : w))}
                        onBlur={(e) => handleSave(site.id, "name", e.target.value)}
                        className="text-lg font-bold text-slate-900 leading-tight text-right w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors truncate"
                        placeholder="Brand Name"
                        title="Edit Brand Name"
                      />
                    ) : (
                      <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">
                        {site.name}
                      </h3>
                    )}
                    <a href={site.domain.startsWith('http') ? site.domain : `https://${site.domain}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-end mt-1 truncate">
                      <span className="truncate">{site.domain}</span> <ExternalLink className="w-3 h-3 ml-1 opacity-70 flex-shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-800">{site.stats?.total || 0}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Total</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-800">{site.stats?.newThisWeek || 0}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">This Wk</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-col items-center justify-center relative">
                    {(site.stats?.unread || 0) > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                    )}
                    <span className="text-lg font-bold text-slate-800">{site.stats?.unread || 0}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Unread</span>
                  </div>
                </div>

                {/* Inline Alert Editors */}
                <div className="mt-auto flex flex-col gap-3">
                  {/* Phone Input */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>SMS Alerts</span>
                      <button
                        onClick={() => handleSave(site.id, "smsAlertsEnabled", !site.smsAlertsEnabled)}
                        className={`relative inline-flex h-3 w-5 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:ring-offset-1 disabled:opacity-50 ${
                          site.smsAlertsEnabled !== false ? "bg-indigo-600" : "bg-slate-300"
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-2 w-2 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${site.smsAlertsEnabled !== false ? "translate-x-2" : "translate-x-0"}`} />
                      </button>
                    </label>
                    <div className={`bg-white rounded-md border border-slate-200 flex items-center px-2 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all ${site.smsAlertsEnabled === false ? 'opacity-50' : ''}`}>
                      <Smartphone className="w-3.5 h-3.5 text-slate-400 mr-2" />
                      <input 
                        type="text" 
                        placeholder="Phone number"
                        disabled={site.smsAlertsEnabled === false}
                        className="bg-transparent border-none outline-none text-xs font-medium text-slate-800 w-full placeholder:text-slate-300 disabled:cursor-not-allowed"
                        value={site.adminPhone || ""}
                        onChange={(e) => setWebsites(prev => prev.map(w => w.id === site.id ? { ...w, adminPhone: e.target.value } : w))}
                        onBlur={(e) => handleSave(site.id, "adminPhone", e.target.value)}
                      />
                      {savingId === `${site.id}-adminPhone` && <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin ml-2" />}
                    </div>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Email Alerts</span>
                      <button
                        onClick={() => handleSave(site.id, "emailAlertsEnabled", !site.emailAlertsEnabled)}
                        className={`relative inline-flex h-3 w-5 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:ring-offset-1 disabled:opacity-50 ${
                          site.emailAlertsEnabled !== false ? "bg-indigo-600" : "bg-slate-300"
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-2 w-2 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${site.emailAlertsEnabled !== false ? "translate-x-2" : "translate-x-0"}`} />
                      </button>
                    </label>
                    <div className={`bg-white rounded-md border border-slate-200 flex items-center px-2 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all ${site.emailAlertsEnabled === false ? 'opacity-50' : ''}`}>
                      <svg className="w-3.5 h-3.5 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input 
                        type="text" 
                        placeholder="Email 1, Email 2..."
                        disabled={site.emailAlertsEnabled === false}
                        className="bg-transparent border-none outline-none text-xs font-medium text-slate-800 w-full placeholder:text-slate-300 disabled:cursor-not-allowed"
                        value={site.adminEmail || ""}
                        onChange={(e) => setWebsites(prev => prev.map(w => w.id === site.id ? { ...w, adminEmail: e.target.value } : w))}
                        onBlur={(e) => handleSave(site.id, "adminEmail", e.target.value)}
                      />
                      {savingId === `${site.id}-adminEmail` && <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin ml-2" />}
                    </div>
                  </div>

                  {/* Push Notifications Button */}
                  <div className="flex flex-col gap-1 mt-2">
                    <Button 
                      onClick={togglePush} 
                      disabled={isProcessingPush || pushStatus === "loading" || pushStatus === "unsupported"}
                      variant={pushStatus === "subscribed" ? "outline" : "default"}
                      size="sm"
                      className={`w-full text-[11px] h-8 flex items-center justify-center gap-2 transition-all ${
                        pushStatus === "subscribed" 
                          ? "border-slate-200 text-slate-600 hover:bg-slate-50" 
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      }`}
                    >
                      {pushStatus === "subscribed" ? (
                        <><BellOff className="w-3.5 h-3.5" /> Disable Push on this Device</>
                      ) : pushStatus === "unsupported" ? (
                        "Push Not Supported"
                      ) : (
                        <><BellRing className="w-3.5 h-3.5 animate-pulse" /> Enable Notifications on this Device</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                <a href={`/client/${site.id}`} className="block">
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
                    Open Pipeline
                  </Button>
                </a>
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
    </div>
  );
}
