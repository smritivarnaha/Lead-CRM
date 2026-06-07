"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellRing, BellOff, Smartphone, X, Link as LinkIcon, Download, Copy, Code2 } from "lucide-react";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function SettingsPage() {
  const [pushStatus, setPushStatus] = useState<"loading" | "subscribed" | "unsubscribed" | "unsupported">("loading");
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    checkPushStatus();
    fetchSettings();

    // Force update Service Worker to ensure new notification settings apply
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.update();
      });
    }

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      toast.error("Installation is not supported or already installed on this browser.");
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async (field: string, value: any) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        toast.success("Settings saved!");
      } else {
        toast.error("Failed to save settings.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveAllPushSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pushTitleTemplate: settings?.pushTitleTemplate,
          pushBodyTemplate: settings?.pushBodyTemplate,
          pushCtaLabel: settings?.pushCtaLabel,
          pushCtaUrl: settings?.pushCtaUrl
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        toast.success("Push Settings saved successfully!");
      } else {
        toast.error("Failed to save settings.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!settings?.fast2smsApiKey || !settings?.adminPhone) {
      toast.error("Please save API Key and Admin Phone first.");
      return;
    }
    setIsTestingSms(true);
    try {
      const res = await fetch("/api/settings/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: settings.fast2smsApiKey, 
          phone: settings.adminPhone 
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Test SMS sent successfully!");
      } else {
        toast.error(data.error || "Failed to send test SMS.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error while sending SMS.");
    } finally {
      setIsTestingSms(false);
    }
  };

  const checkPushStatus = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported");
      return;
    }

    try {
      const sw = await navigator.serviceWorker.ready;
      const sub = await sw.pushManager.getSubscription();
      if (sub) {
        setPushStatus("subscribed");
      } else {
        setPushStatus("unsubscribed");
      }
    } catch (e) {
      console.error(e);
      setPushStatus("unsupported");
    }
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied by browser.");
        setIsProcessing(false);
        return;
      }

      const sw = await navigator.serviceWorker.ready;
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
      toast.success("Successfully enabled push notifications!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to enable notifications.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsProcessing(true);
    try {
      const sw = await navigator.serviceWorker.ready;
      const subscription = await sw.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
      setPushStatus("unsubscribed");
      toast.success("Notifications disabled for this device.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to disable notifications.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestNotification = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (res.ok) {
        toast.success("Test notification sent! Check your device.");
      } else {
        toast.error("Failed to send test notification.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string, maxSize: number = 192) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is too large before even trying to read it (e.g. > 10MB)
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
          setSettings((prev: any) => ({ ...prev, [field]: base64String }));
          saveSettings(field, base64String);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [activeTab, setActiveTab] = useState("push");

  return (
    <div className="flex flex-col h-full gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure your CRM preferences and integrations.</p>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("push")}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "push" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Push Notifications
        </button>
        <button 
          onClick={() => setActiveTab("sms")}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "sms" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          SMS Alerts
        </button>
        <button 
          onClick={() => setActiveTab("install")}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "install" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          App Installation
        </button>
        <button 
          onClick={() => setActiveTab("integration")}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "integration" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Integration Guide
        </button>
      </div>

      <div className="max-w-2xl">
        {/* ─── PUSH NOTIFICATIONS TAB ─── */}
        {activeTab === "push" && (
          <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden mb-6">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BellRing className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Push Notifications</h3>
                <p className="text-xs text-slate-500">Get instant alerts on your phone</p>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-6">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Device Status</span>
                </div>
                {pushStatus === "loading" && <span className="text-xs text-slate-400">Checking...</span>}
                {pushStatus === "unsupported" && <span className="text-xs text-red-500 font-medium">Not Supported</span>}
                {pushStatus === "subscribed" && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-semibold">Enabled</span>}
                {pushStatus === "unsubscribed" && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded font-medium">Disabled</span>}
              </div>

              {/* iOS Style Toggle Row */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Allow Notifications</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Receive alerts when new leads arrive</p>
                </div>
                
                {pushStatus === "unsupported" ? (
                  <span className="text-xs font-semibold text-red-500">Unavailable</span>
                ) : (
                  <button
                    onClick={pushStatus === "subscribed" ? handleUnsubscribe : handleSubscribe}
                    disabled={isProcessing || pushStatus === "loading"}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 ${
                      pushStatus === "subscribed" ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                    role="switch"
                    aria-checked={pushStatus === "subscribed"}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        pushStatus === "subscribed" ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                )}
              </div>

              {pushStatus === "unsupported" && (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <strong>Action Required:</strong> If you are on an iPhone, you must tap the Share icon and select <strong>"Add to Home Screen"</strong> to enable notifications.
                </p>
              )}

              {pushStatus === "subscribed" && (
                <div className="pt-4 border-t border-slate-100">
                  <Button 
                    onClick={handleTestNotification} 
                    disabled={isProcessing}
                    variant="outline"
                    className="w-full sm:w-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    Send Test Notification
                  </Button>
                </div>
              )}

              <div className="h-px bg-slate-100 my-2" />
              
              <h4 className="text-sm font-semibold text-slate-900">Customization</h4>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Notification Title Template</label>
                <input 
                  type="text" 
                  value={settings?.pushTitleTemplate || ""} 
                  onChange={(e) => setSettings({...settings, pushTitleTemplate: e.target.value})}
                  onBlur={(e) => saveSettings("pushTitleTemplate", e.target.value)}
                  placeholder="🔥 New Lead Alert!"
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Notification Body Template</label>
                <input 
                  type="text" 
                  value={settings?.pushBodyTemplate || ""} 
                  onChange={(e) => setSettings({...settings, pushBodyTemplate: e.target.value})}
                  onBlur={(e) => saveSettings("pushBodyTemplate", e.target.value)}
                  placeholder="You have a new lead: {{name}}"
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Notification Main Icon</label>
                <div className="flex gap-3 items-center">
                  {settings?.pushIconUrl && (
                    <div className="relative group shrink-0">
                      <img src={settings.pushIconUrl} alt="icon" className="w-10 h-10 object-cover rounded border border-slate-200 bg-white" />
                      <button 
                        onClick={() => {
                          setSettings({...settings, pushIconUrl: ""});
                          saveSettings("pushIconUrl", "");
                        }}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Icon"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => handleImageUpload(e, "pushIconUrl", 192)}
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-1.5 outline-none focus:border-indigo-500 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
                <p className="text-xs text-slate-500">Upload an image (PNG/JPEG). This is the large colorful icon displayed in the notification body.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Badge Icon (Small Monochrome)</label>
                <div className="flex gap-3 items-center">
                  {settings?.pushBadgeUrl && (
                    <div className="relative group shrink-0 w-10 h-10 rounded border border-slate-200 bg-slate-900 flex items-center justify-center">
                      <img src={settings.pushBadgeUrl} alt="badge" className="w-6 h-6 object-contain" />
                      <button 
                        onClick={() => {
                          setSettings({...settings, pushBadgeUrl: ""});
                          saveSettings("pushBadgeUrl", "");
                        }}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Badge"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/png, image/webp"
                    onChange={(e) => handleImageUpload(e, "pushBadgeUrl", 72)}
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-1.5 outline-none focus:border-indigo-500 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
                <p className="text-xs text-slate-500">Upload a monochrome image with a transparent background for the Android status bar.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Button Label</label>
                  <input 
                    type="text" 
                    value={settings?.pushCtaLabel || ""} 
                    onChange={(e) => setSettings({...settings, pushCtaLabel: e.target.value})}
                    onBlur={(e) => saveSettings("pushCtaLabel", e.target.value)}
                    placeholder="View Lead"
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Button Redirect URL</label>
                  <input 
                    type="text" 
                    value={settings?.pushCtaUrl || ""} 
                    onChange={(e) => setSettings({...settings, pushCtaUrl: e.target.value})}
                    onBlur={(e) => saveSettings("pushCtaUrl", e.target.value)}
                    placeholder="/leads"
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-2">
                <button
                  onClick={saveAllPushSettings}
                  disabled={isSaving}
                  className="w-full sm:w-auto py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Push Settings"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── SMS ALERTS TAB ─── */}
        {activeTab === "sms" && (
          <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden h-fit mb-6">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">SMS Admin Alerts (India)</h3>
                <p className="text-xs text-slate-500">Powered by Fast2SMS</p>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Enable Admin Alerts</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Receive an SMS instantly when a new lead arrives</p>
                </div>
                <button
                  onClick={() => saveSettings("smsAutoReplyEnabled", !settings?.smsAutoReplyEnabled)}
                  disabled={isSaving || !settings}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 ${
                    settings?.smsAutoReplyEnabled ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                  role="switch"
                  aria-checked={settings?.smsAutoReplyEnabled || false}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings?.smsAutoReplyEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {settings?.smsAutoReplyEnabled && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">Fast2SMS API Key</label>
                    <input 
                      type="password" 
                      value={settings?.fast2smsApiKey || ""} 
                      onChange={(e) => setSettings({...settings, fast2smsApiKey: e.target.value})}
                      onBlur={(e) => saveSettings("fast2smsApiKey", e.target.value)}
                      placeholder="Enter your Fast2SMS API Key"
                      className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                    />
                    <p className="text-xs text-slate-500">Sign up on Fast2SMS.com to get your key.</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">Admin Phone Number</label>
                    <input 
                      type="text" 
                      value={settings?.adminPhone || ""} 
                      onChange={(e) => setSettings({...settings, adminPhone: e.target.value})}
                      onBlur={(e) => saveSettings("adminPhone", e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                    />
                    <p className="text-xs text-slate-500">The mobile number where you want to receive the lead alert.</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">SMS Alert Template</label>
                    <textarea 
                      value={settings?.smsTemplate || ""} 
                      onChange={(e) => setSettings({...settings, smsTemplate: e.target.value})}
                      onBlur={(e) => saveSettings("smsTemplate", e.target.value)}
                      rows={3}
                      placeholder="🔥 New Lead: {{name}} has submitted a form!"
                      className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition-colors resize-none"
                    />
                    <p className="text-xs text-slate-500">Use {"{{name}}"} and {"{{source}}"} as variables.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <button
                      onClick={() => {
                        saveSettings("fast2smsApiKey", settings?.fast2smsApiKey);
                        saveSettings("adminPhone", settings?.adminPhone);
                        saveSettings("smsTemplate", settings?.smsTemplate);
                        toast.success("SMS Settings saved successfully!");
                      }}
                      disabled={isSaving}
                      className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save SMS Settings"}
                    </button>
                    <button
                      onClick={handleTestSms}
                      disabled={isTestingSms || isSaving}
                      className="flex-1 py-2.5 px-4 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                      {isTestingSms ? "Sending..." : "Send Test SMS"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── APP INSTALLATION TAB ─── */}
        {activeTab === "install" && (
          <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden mb-6">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Install Mobile App</h3>
                <p className="text-xs text-slate-500">Add LeadFlow to your home screen</p>
              </div>
            </div>

            <div className="p-6">
              {installPrompt ? (
                <div className="flex flex-col items-center justify-center text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-6 flex items-center justify-center text-white font-bold text-2xl">
                    LF
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Ready to Install</h4>
                  <p className="text-slate-500 text-sm max-w-sm mb-6">
                    Install LeadFlow as a native app on your device for the best experience.
                  </p>
                  <button 
                    onClick={async () => {
                      installPrompt.prompt();
                      const { outcome } = await installPrompt.userChoice;
                      if (outcome === 'accepted') {
                        setInstallPrompt(null);
                        toast.success("App installation started!");
                      }
                    }}
                    className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg"
                  >
                    Install App Now
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Smartphone className="w-6 h-6 text-slate-400" />
                  </div>
                  <h4 className="text-slate-900 font-medium mb-1">App Already Installed or Not Supported</h4>
                  <p className="text-slate-500 text-sm max-w-sm">
                    If you are on an iPhone, tap the Share button and select "Add to Home Screen".
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── INTEGRATION GUIDE TAB ─── */}
        {activeTab === "integration" && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-indigo-600" /> Global Integration Guide
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Learn how to connect your clients' websites to LeadFlow. Each client gets their own specific Webhook URL and Plugin.
              </p>
            </div>
            
            <div className="p-6 space-y-10">
              {/* Method 1: WordPress Plugin */}
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">1</span> 
                  Method 1: One-Click WP Plugin (Recommended)
                </h4>
                <div className="ml-8 text-sm text-slate-600 space-y-4">
                  <p>We automatically generate a custom WordPress plugin for each website that integrates with <strong>Elementor Pro Forms</strong> and <strong>Contact Form 7</strong> seamlessly.</p>
                  <ol className="list-decimal ml-4 space-y-2 text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <li>Go to the <strong>Websites</strong> tab in the left sidebar.</li>
                    <li>Find your client's website in the table.</li>
                    <li>Click the <strong>WP Plugin</strong> button next to their Webhook URL to download their customized `.zip` file.</li>
                    <li>Log into their WordPress Admin Dashboard ➔ <strong>Plugins</strong> ➔ <strong>Add New</strong> ➔ <strong>Upload Plugin</strong>.</li>
                    <li>Upload the `.zip` file and click <strong>Activate</strong>.</li>
                  </ol>
                </div>
              </div>

              {/* Method 2: Manual PHP Snippet */}
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs">2</span> 
                  Method 2: Manual PHP Snippet
                </h4>
                <div className="ml-8 text-sm text-slate-600 space-y-4">
                  <p>If you don't want to install the custom plugin, you can paste this snippet into the <strong>WPCode</strong> plugin or <code>functions.php</code> file. Ensure you replace <code>YOUR_WEBSITE_ID</code> with the ID from the Websites table.</p>
                  <div className="relative group">
                    <pre className="bg-[#1E1E1E] text-slate-300 p-4 rounded-lg text-[13px] overflow-x-auto leading-relaxed font-mono">
                      <code className="language-php">
{`add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {
    $fields = [];
    foreach ( $record->get( 'fields' ) as $id => $field ) {
        $fields[ $id ] = $field['value'];
    }
    wp_remote_post( 'https://lead-crmsss.vercel.app/api/webhook/receive/YOUR_WEBSITE_ID', [
        'body' => wp_json_encode($fields),
        'headers' => [ 'Content-Type' => 'application/json' ],
        'blocking' => false
    ]);
}, 10, 2 );`}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Method 3: Direct Webhook */}
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs">3</span> 
                  Method 3: Direct Webhook URL
                </h4>
                <div className="ml-8 text-sm text-slate-600 space-y-4">
                  <p>You can find the unique webhook URL for every client directly in the <strong>Websites</strong> table. Use this if you are pasting directly into individual Elementor forms or Zapier.</p>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 max-w-xl">
                    <code className="text-slate-800 font-mono text-[13px] truncate mr-4">
                      https://lead-crmsss.vercel.app/api/webhook/receive/YOUR_WEBSITE_ID
                    </code>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Spacer specifically for Mobile to prevent bottom nav from hiding content */}
      <div className="h-32 w-full flex-shrink-0 md:hidden"></div>
    </div>
  );
}
