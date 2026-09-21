"use client";

import { toast } from "sonner";
import { Phone, Mail, ArrowUpRight, X, Globe, Sparkles } from "lucide-react";
import Link from "next/link";

export interface RealtimeLeadPayload {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  source?: string | null;
  websiteId?: string;
  websiteName?: string;
  pageUrl?: string | null;
  createdAt?: string;
}

// Active lead queue to prevent lining up on screen and allow "Skip All"
let leadQueue: RealtimeLeadPayload[] = [];
let currentToastId: string | number | null = null;
let toastTimeout: NodeJS.Timeout | null = null;

export function dismissAllLeadToasts() {
  leadQueue = [];
  if (currentToastId) {
    toast.dismiss(currentToastId);
    currentToastId = null;
  }
  toast.dismiss(); // dismiss all sonner toasts
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
}

export function playLeadChime() {
  try {
    if (typeof window === "undefined") return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Play a gentle modern two-tone chime (E5 -> B5)
    const now = ctx.currentTime;
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.1); // B5
    gain2.gain.setValueAtTime(0.08, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);
  } catch (e) {
    // Audio autoplay restrictions or unsupported
  }
}

export function showLeadToast(lead: RealtimeLeadPayload) {
  playLeadChime();

  // Add to queue if not already present
  if (!leadQueue.some((l) => l.id === lead.id)) {
    leadQueue.push(lead);
  }

  const count = leadQueue.length;
  const latestLead = lead; // Display the freshest incoming lead

  // Reset auto-dismiss timer on every new lead
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  toastTimeout = setTimeout(() => {
    dismissAllLeadToasts();
  }, 9000);

  // Use a stable toast ID so multiple leads update in-place rather than lining up down the screen
  const toastId = "active-lead-alert";
  currentToastId = toastId;

  toast.custom(
    (t) => (
      <div className="w-full max-w-[380px] sm:max-w-[400px] bg-white/98 backdrop-blur-xl border border-slate-200/90 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.14),0_0_20px_rgba(124,58,237,0.08)] rounded-2xl p-4 overflow-hidden relative ring-1 ring-slate-900/5 transition-all animate-in fade-in slide-in-from-bottom-5 duration-300">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#7C3AED] via-[#6366F1] to-[#10B981]" />

        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 mb-3 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#7C3AED] shrink-0">
              NEW LEAD {count > 1 ? `(${count})` : ""}
            </span>
            {latestLead.websiteName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-violet-50 text-violet-700 border border-violet-200/80 truncate max-w-[120px]">
                <Globe className="h-2.5 w-2.5 shrink-0 text-violet-600" />
                <span className="truncate">{latestLead.websiteName}</span>
              </span>
            )}
            {count > 1 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                +{count - 1} more
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {count > 1 && (
              <button
                type="button"
                onClick={dismissAllLeadToasts}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80 transition-colors cursor-pointer"
                title="Skip and dismiss all notifications"
              >
                Skip All
              </button>
            )}
            <button
              type="button"
              onClick={dismissAllLeadToasts}
              className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Main Lead Info */}
        <div className="flex items-start gap-3 my-2">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#9061F9] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs ring-2 ring-violet-100">
            {latestLead.fullName ? latestLead.fullName.charAt(0).toUpperCase() : "L"}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-bold text-slate-900 truncate leading-tight tracking-tight">
              {latestLead.fullName || "New Customer"}
            </h4>
            <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 mt-0.5 truncate">
              <Sparkles className="w-3 h-3 text-[#7C3AED] shrink-0" />
              <span className="truncate">{latestLead.source || "Website Form"}</span>
              {latestLead.city && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="truncate">{latestLead.city}{latestLead.state ? `, ${latestLead.state}` : ""}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Contact Details Pills */}
        {(latestLead.phone || latestLead.email) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {latestLead.phone && (
              <a
                href={`tel:${latestLead.phone}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] font-semibold hover:bg-emerald-100 transition-colors"
                title="Click to call"
              >
                <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="tracking-wide">{latestLead.phone}</span>
              </a>
            )}
            {latestLead.email && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11.5px] font-medium truncate max-w-full"
                title={latestLead.email}
              >
                <Mail className="h-3 w-3 text-[#7C3AED] shrink-0" />
                <span className="truncate">{latestLead.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Footer */}
        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100">
          {count > 1 && (
            <button
              type="button"
              onClick={dismissAllLeadToasts}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-[12px] font-semibold transition-colors shrink-0 cursor-pointer"
            >
              Skip All ({count})
            </button>
          )}
          {latestLead.phone && (
            <a
              href={`tel:${latestLead.phone}`}
              onClick={dismissAllLeadToasts}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold shadow-xs transition-all cursor-pointer"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Call Lead</span>
            </a>
          )}
          <Link
            href={latestLead.websiteId ? `/client/${latestLead.websiteId}` : `/leads`}
            onClick={dismissAllLeadToasts}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[12px] font-bold shadow-xs transition-all cursor-pointer"
          >
            <span>View Pipeline</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    ),
    {
      id: toastId,
      duration: 9000,
    }
  );
}
