"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, X, ArrowDownToLine, Smartphone } from "lucide-react";

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
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    // Basic detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    setIsIOS(ios);
    setIsStandalone(standalone);

    if (!("Notification" in window) && !ios) return; // If completely unsupported
    if ("Notification" in window && Notification.permission === "granted") return;
    if (localStorage.getItem("push-banner-dismissed")) return;

    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const handleEnable = async () => {
    if (isIOS && !isStandalone) {
      // Cannot request permission, they must add to home screen first
      return;
    }

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

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setState("success");
      localStorage.setItem("push-banner-dismissed", "true");
      setTimeout(() => setShow(false), 2500);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none p-4 pb-8 sm:p-6">
      <div 
        className="pointer-events-auto w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 relative"
        style={{ animation: "slideUpSheet 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {/* Close Button */}
        <button onClick={handleDismiss} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors z-10">
          <X className="h-4 w-4" />
        </button>

        {state === "success" ? (
          <div className="px-6 py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Bell className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">You're all set! 🎉</h3>
            <p className="text-slate-500 mt-2 text-sm">We'll ping your phone instantly when a new lead arrives.</p>
          </div>
        ) : state === "denied" ? (
          <div className="px-6 py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <BellOff className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Notifications Blocked</h3>
            <p className="text-slate-500 mt-2 text-sm">Please enable them in your browser settings to receive alerts.</p>
          </div>
        ) : isIOS && !isStandalone ? (
          /* iOS Add to Home Screen Instructions */
          <div className="px-6 py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <ArrowDownToLine className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Install the App</h3>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Apple requires you to add this site to your Home Screen before you can receive push notifications.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6 w-full text-left">
              <ol className="text-sm text-slate-700 space-y-3 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span> 
                  Tap the <strong>Share</strong> button below
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span> 
                  Scroll down & tap <strong>Add to Home Screen</strong>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">3</span> 
                  Open LeadFlow from your Home Screen!
                </li>
              </ol>
            </div>
          </div>
        ) : (
          /* Default Premium Subscribe Modal */
          <div>
            <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_10%,_transparent_50%)] animate-pulse" style={{ animationDuration: '3s' }} />
              
              <div className="relative z-10 w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                <div className="relative">
                  <Bell className="h-8 w-8 text-indigo-600 animate-wiggle" style={{ animationDuration: '2s', animationIterationCount: 'infinite' }} />
                  <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-6 text-center">
              <h3 className="text-xl font-bold text-slate-900">Never miss a hot lead!</h3>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                Enable push notifications to get instant alerts on your phone the second a lead submits a form.
              </p>
            </div>

            <div className="px-6 pb-6 pt-2">
              <button
                onClick={handleEnable}
                disabled={state === "loading"}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {state === "loading" ? (
                  <span className="animate-spin text-lg">⚙️</span>
                ) : (
                  <>
                    <Smartphone className="h-5 w-5" /> Enable Notifications
                  </>
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="w-full mt-3 text-slate-500 hover:text-slate-700 font-semibold py-2 text-sm transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUpSheet {
          0% { transform: translateY(100%) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
      `}</style>
    </div>
  );
}
