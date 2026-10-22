"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, 
  Download, 
  ExternalLink, 
  Image as ImageIcon, 
  Smartphone, 
  ArrowRight, 
  Settings, 
  Mail, 
  Users, 
  Sparkles, 
  BellRing, 
  Globe, 
  HelpCircle, 
  X, 
  Layers,
  CheckCircle2,
  TrendingUp,
  AlertCircle
} from "lucide-react";
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
  const router = useRouter();
  const { setWebsites, activeWebsiteId, setActiveWebsiteId } = useActiveProfile();
  const [sites, setSites] = useState<any[]>(initialWebsites || []);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (initialWebsites && initialWebsites.length > 0) {
      setSites(initialWebsites);
    }
  }, [initialWebsites]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("leadflow_onboarding_dismissed");
      if (!dismissed) {
        setShowOnboarding(true);
      }
    }
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("leadflow_onboarding_dismissed", "true");
    }
  };

  // Filter websites if an active profile is selected, otherwise show all
  const displayWebsites = activeWebsiteId
    ? sites.filter((w) => w.id === activeWebsiteId)
    : sites;
  
  const [configuringSite, setConfiguringSite] = useState<any | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<"general" | "admin_email" | "auto_reply" | "integration">("general");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<"loading" | "subscribed" | "unsubscribed" | "unsupported">("loading");
  const [isProcessingPush, setIsProcessingPush] = useState(false);

  const isClient = role === "CLIENT" && !!userWebsiteId;

  // Compute global KPI summary metrics across visible websites
  const totalLeadsAll = displayWebsites.reduce((sum, s) => sum + (s.stats?.total || 0), 0);
  const newThisWeekAll = displayWebsites.reduce((sum, s) => sum + (s.stats?.newThisWeek || 0), 0);
  const unreadAll = displayWebsites.reduce((sum, s) => sum + (s.stats?.unread || 0), 0);
  const activeAlertsCount = displayWebsites.filter(s => (s.emailAlertsEnabled !== false && s.adminEmail) || (s.smsAlertsEnabled !== false && s.adminPhone)).length;

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
        setSites(prev => prev.map(w => w.id === siteId ? { ...w, [field]: value } : w));
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
        const maxSize = 72;
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

  const openSiteModal = (site: any, tab: "general" | "admin_email" | "auto_reply" | "integration") => {
    setModalInitialTab(tab);
    setConfiguringSite(site);
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Row with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1523] tracking-tight">
              {isClient ? "Your CRM Dashboard" : "Client Command Center"}
            </h1>
            <p className="text-[#6B7280] mt-1 text-sm">
              {isClient
                ? "Monitor incoming leads, configure instant alerts, and manage your pipeline."
                : "Overview of all connected client websites, live lead counters, and alert configurations."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowOnboarding(!showOnboarding)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showOnboarding
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showOnboarding ? "Hide Guide" : "How It Works"}</span>
            </button>
            <Link
              href="/leads"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xs transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              <span>View All Leads</span>
            </Link>
          </div>
        </div>

        {/* New User Onboarding / Feature Discovery Banner */}
        {showOnboarding && (
          <div className="bg-gradient-to-r from-[#F7F5FF] via-white to-indigo-50/50 border border-[#DDD6FE] rounded-2xl p-5 shadow-xs relative animate-in fade-in duration-200">
            <button
              type="button"
              onClick={dismissOnboarding}
              className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Dismiss guide"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#7C3AED] bg-[#EDE9FE] px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /> Quick Start Workflow
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                4 simple steps to get maximum conversions from your CRM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div
                onClick={() => sites[0] ? openSiteModal(sites[0], "integration") : router.push("/websites")}
                className="bg-white/90 hover:bg-white border border-slate-200/80 hover:border-indigo-300 rounded-xl p-3.5 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase">Step 1</span>
                  <Layers className="w-4 h-4 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Connect Website Form</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Install the WP Plugin, Google Sheet script, or HTML webhook snippet to capture leads live.
                </p>
              </div>

              <div
                onClick={() => sites[0] ? openSiteModal(sites[0], "admin_email") : router.push("/settings")}
                className="bg-white/90 hover:bg-white border border-slate-200/80 hover:border-emerald-300 rounded-xl p-3.5 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">Step 2</span>
                  <Mail className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Branded Admin & Visitor Emails</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Customize Rankved Healthcare Martech instant lead alerts & visitor thank-you auto-replies.
                </p>
              </div>

              <div
                onClick={() => router.push("/leads")}
                className="bg-white/90 hover:bg-white border border-slate-200/80 hover:border-purple-300 rounded-xl p-3.5 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-purple-600 uppercase">Step 3</span>
                  <Users className="w-4 h-4 text-purple-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Work Leads & WhatsApp</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Click any lead to open the Command Drawer — Call, WhatsApp in 1 click, update status, or add notes.
                </p>
              </div>

              <div
                onClick={() => router.push("/followups")}
                className="bg-white/90 hover:bg-white border border-slate-200/80 hover:border-amber-300 rounded-xl p-3.5 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-amber-600 uppercase">Step 4</span>
                  <BellRing className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Follow-up & Convert</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Snooze callbacks (+1 hr, Tomorrow, +3 days) and track your team's conversion rate.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top Global KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/leads"
            className="bg-white border border-slate-200/80 hover:border-indigo-200 rounded-2xl p-4 shadow-2xs transition-all flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalLeadsAll}</div>
              <span className="text-[11px] text-slate-500">Across {displayWebsites.length} {displayWebsites.length === 1 ? "website" : "websites"}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </Link>

          <Link
            href="/leads"
            className="bg-white border border-slate-200/80 hover:border-emerald-200 rounded-2xl p-4 shadow-2xs transition-all flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">New This Week</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">+{newThisWeekAll}</div>
              <span className="text-[11px] text-slate-500">Last 7 days</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </Link>

          <Link
            href="/leads?stage=NEW"
            className="bg-white border border-slate-200/80 hover:border-rose-200 rounded-2xl p-4 shadow-2xs transition-all flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Action Needed</span>
              <div className={`text-2xl font-extrabold mt-1 ${unreadAll > 0 ? "text-rose-600" : "text-slate-900"}`}>
                {unreadAll}
              </div>
              <span className="text-[11px] text-slate-500">Uncontacted new leads</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${unreadAll > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </Link>

          <Link
            href="/settings"
            className="bg-white border border-slate-200/80 hover:border-purple-200 rounded-2xl p-4 shadow-2xs transition-all flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Alerts</span>
              <div className="text-2xl font-extrabold text-purple-600 mt-1">
                {activeAlertsCount}/{displayWebsites.length}
              </div>
              <span className="text-[11px] text-slate-500">Profiles with Email/SMS on</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </Link>
        </div>

        {/* Client Website Cards Grid */}
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
                    {/* Compact Logo */}
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
                          onChange={(e) => {
                            const val = e.target.value;
                            setSites(prev => prev.map(w => w.id === site.id ? { ...w, name: val } : w));
                            setWebsites(prev => prev.map(w => w.id === site.id ? { ...w, name: val } : w));
                          }}
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
                    onClick={() => openSiteModal(site, "general")}
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

                {/* Direct Quick-Configure Pills (Each opens its exact tab!) */}
                <div className="flex items-center justify-between gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openSiteModal(site, "general")}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold transition-colors cursor-pointer ${
                        site.smsAlertsEnabled !== false && site.adminPhone
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                      title="Configure SMS Alert Phone Number"
                    >
                      <Smartphone className="w-2.5 h-2.5" /> SMS
                    </button>

                    <button
                      type="button"
                      onClick={() => openSiteModal(site, "admin_email")}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold transition-colors cursor-pointer ${
                        site.emailAlertsEnabled !== false && site.adminEmail
                          ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                      title="Customize Rankved Admin Alert Email"
                    >
                      <Mail className="w-2.5 h-2.5" /> Admin Email
                    </button>

                    <button
                      type="button"
                      onClick={() => openSiteModal(site, "auto_reply")}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold transition-colors cursor-pointer ${
                        site.customerAutoReplyEnabled
                          ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                      title="Customize Visitor Auto-Reply Email"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Auto-Reply
                    </button>
                  </div>

                  <button 
                    type="button"
                    onClick={() => openSiteModal(site, "integration")}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer shrink-0"
                    title="WP Plugin, Google Sheets & Webhook Setup"
                  >
                    Connect →
                  </button>
                </div>
              </div>

              {/* Action Footer: Open Pipeline */}
              <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100">
                <Link 
                  href={`/client/${site.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#1A1523] hover:bg-indigo-600 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-xs transition-colors"
                >
                  <span>Open Pipeline ({site.stats?.total || 0})</span>
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
          initialTab={modalInitialTab}
          onClose={() => setConfiguringSite(null)} 
          onUpdate={(updated) => {
            setSites(prev => prev.map(w => w.id === updated.id ? { ...w, ...updated } : w));
            setWebsites(prev => prev.map(w => w.id === updated.id ? { ...w, ...updated } : w));
            setConfiguringSite(updated);
          }}
        />
      )}
    </div>
  );
}
