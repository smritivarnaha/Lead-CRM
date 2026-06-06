"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellRing, BellOff, Smartphone } from "lucide-react";
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

  useEffect(() => {
    checkPushStatus();
    fetchSettings();
  }, []);

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

  return (
    <div className="flex flex-col h-full gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure your CRM preferences and integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Push Notifications Card */}
        <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BellRing className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Push Notifications</h3>
              <p className="text-xs text-slate-500">Get instant alerts on your phone</p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Device Status</span>
              </div>
              {pushStatus === "loading" && <span className="text-xs text-slate-400">Checking...</span>}
              {pushStatus === "unsupported" && <span className="text-xs text-red-500 font-medium">Not Supported</span>}
              {pushStatus === "subscribed" && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-semibold">Enabled</span>}
              {pushStatus === "unsubscribed" && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded font-medium">Disabled</span>}
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex flex-col gap-4">
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

              {pushStatus === "subscribed" && (
                <div className="mt-2 pt-4 border-t border-slate-100">
                  <Button 
                    onClick={handleTestNotification} 
                    disabled={isProcessing}
                    variant="outline"
                    className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    Send Test Notification
                  </Button>
                </div>
              )}

              {pushStatus === "unsupported" && (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 mt-2">
                  <strong>Action Required:</strong> If you are on an iPhone, you must tap the Share icon and select <strong>"Add to Home Screen"</strong> to enable notifications.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Install App Card */}
        <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Install Mobile App</h3>
              <p className="text-xs text-slate-500">Add LeadFlow to your Home Screen</p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              For the best experience and to enable push notifications on iOS, install LeadFlow directly to your phone's home screen.
            </p>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">How to install:</h4>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">iOS (Safari):</span> 
                  Tap the Share icon at the bottom, then scroll down and tap "Add to Home Screen".
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">Android (Chrome):</span> 
                  Tap the 3 dots menu at the top right, then tap "Install app" or "Add to Home screen".
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* SMS Auto-Reply Settings Card */}
        <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">SMS Auto-Reply (India)</h3>
              <p className="text-xs text-slate-500">Powered by Fast2SMS</p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Enable Auto-Reply</h4>
                <p className="text-xs text-slate-500 mt-0.5">Send a greeting SMS to new leads instantly</p>
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
                  <label className="text-sm font-medium text-slate-700">SMS Message Template</label>
                  <textarea 
                    value={settings?.smsTemplate || ""} 
                    onChange={(e) => setSettings({...settings, smsTemplate: e.target.value})}
                    onBlur={(e) => saveSettings("smsTemplate", e.target.value)}
                    rows={3}
                    placeholder="Hi {{name}}, thanks for reaching out!"
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                  <p className="text-xs text-slate-500">Use {"{{name}}"} and {"{{source}}"} as variables.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
