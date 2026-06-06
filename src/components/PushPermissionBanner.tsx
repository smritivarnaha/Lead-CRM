"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function PushPermissionBanner() {
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "success" | "denied">("idle");

  useEffect(() => {
    // Only show if: browser supports push, not already asked, not already subscribed
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted") return; // already subscribed
    if (localStorage.getItem("push-banner-dismissed")) return;
    // Small delay so it doesn't flash immediately on load
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const handleEnable = async () => {
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const sw = await navigator.serviceWorker.ready;
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save subscription to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setState("success");
      localStorage.setItem("push-banner-dismissed", "true");
      setTimeout(() => setShow(false), 2000);
    } catch (err) {
      console.error("[PUSH] Subscription failed:", err);
      setState("denied");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("push-banner-dismissed", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm"
      style={{ animation: "slideUpBanner 0.3s cubic-bezier(0.32,0.72,0,1)" }}
    >
      <div className="mx-4 bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        {state === "success" ? (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Notifications enabled! 🎉</p>
              <p className="text-xs text-slate-400">You&apos;ll get instant alerts for new leads.</p>
            </div>
          </div>
        ) : state === "denied" ? (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-slate-600 flex items-center justify-center flex-shrink-0">
              <BellOff className="h-5 w-5 text-slate-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Notifications blocked</p>
              <p className="text-xs text-slate-400">Enable in browser settings to get lead alerts.</p>
            </div>
            <button onClick={handleDismiss} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Top section */}
            <div className="px-5 pt-4 pb-3 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">Get instant lead alerts</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Know the moment a new lead arrives — even on your phone.
                </p>
              </div>
              <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300 flex-shrink-0 mt-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={handleEnable}
                disabled={state === "loading"}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                {state === "loading" ? (
                  <><span className="animate-spin">⏳</span> Enabling…</>
                ) : (
                  <><Bell className="h-3.5 w-3.5" /> Enable Notifications</>
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Later
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes slideUpBanner {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
