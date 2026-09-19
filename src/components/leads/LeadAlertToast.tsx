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

  toast.custom((t) => (
    <div className="w-full max-w-[370px] sm:max-w-[390px] bg-[#151324]/98 text-white backdrop-blur-2xl border border-white/12 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.65),0_0_25px_rgba(124,58,237,0.25)] rounded-2xl p-4 overflow-hidden relative transition-all ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Top Accent Glowing Gradient Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 via-indigo-400 to-emerald-400" />

      {/* Header Row: Live Radar, Category, Project Pill, Timestamp, Close */}
      <div className="flex items-center justify-between gap-2 mb-3 pt-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10.5px] font-extrabold tracking-wider uppercase text-emerald-400 shrink-0">
            NEW INQUIRY
          </span>
          {lead.websiteName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 truncate max-w-[125px]">
              <Globe className="h-2.5 w-2.5 shrink-0 text-violet-400" />
              <span className="truncate">{lead.websiteName}</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10.5px] font-medium text-slate-400">Just now</span>
          <button
            onClick={() => toast.dismiss(t)}
            className="h-5 w-5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Lead Info */}
      <div className="flex items-start gap-3 my-2">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-md ring-2 ring-violet-500/20">
          {lead.fullName ? lead.fullName.charAt(0).toUpperCase() : "L"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-[15px] font-bold text-white truncate leading-tight tracking-tight">
              {lead.fullName || "New Customer"}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            <Sparkles className="w-2.5 h-2.5 text-violet-400 shrink-0" />
            <span className="truncate">{lead.source || "Website Form"}</span>
            {lead.city && (
              <>
                <span className="text-slate-600">•</span>
                <span className="truncate">{lead.city}{lead.state ? `, ${lead.state}` : ''}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contact Details Pills */}
      {(lead.phone || lead.email) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11.5px] font-semibold hover:bg-emerald-500/20 transition-colors"
              title="Click to dial"
            >
              <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="tracking-wide">{lead.phone}</span>
            </a>
          )}
          {lead.email && (
            <div 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[11.5px] font-medium truncate max-w-full"
              title={lead.email}
            >
              <Mail className="h-3 w-3 text-violet-400 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-white/10">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            onClick={() => toast.dismiss(t)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold shadow-xs transition-all cursor-pointer"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Call Lead</span>
          </a>
        )}
        <Link
          href={lead.websiteId ? `/client/${lead.websiteId}` : `/leads`}
          onClick={() => toast.dismiss(t)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[12px] font-bold shadow-xs shadow-violet-950/50 transition-all cursor-pointer"
        >
          <span>View Pipeline</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  ), {
    duration: 8000,
    id: `lead-toast-${lead.id || Date.now()}`,
  });
}
