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

            <div className="flex flex-col gap-3">
              {pushStatus === "subscribed" ? (
                <>
                  <Button 
                    onClick={handleTestNotification} 
                    disabled={isProcessing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Send Test Notification
                  </Button>
                  <Button 
                    onClick={handleUnsubscribe} 
                    disabled={isProcessing}
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Disable Notifications
                  </Button>
                </>
              ) : pushStatus === "unsubscribed" ? (
                <Button 
                  onClick={handleSubscribe} 
                  disabled={isProcessing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Bell className="h-4 w-4 mr-2" /> Enable Notifications
                </Button>
              ) : (
                <p className="text-xs text-slate-500 text-center">
                  Your browser does not support Web Push notifications. If you are on an iPhone, please add this site to your Home Screen first!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
