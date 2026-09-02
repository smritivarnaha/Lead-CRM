"use client";

import { toast } from "sonner";
import { Phone, Mail, ArrowUpRight, X, Globe, Sparkles } from "lucide-react";
import Link from "next/link";

export interface RealtimeLeadPayload {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
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
    <div className="w-full max-w-[380px] bg-white/95 backdrop-blur-xl border border-[#E8E4F3] shadow-[0_20px_45px_-12px_rgba(124,58,237,0.22)] rounded-2xl p-4 overflow-hidden relative transition-all ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Top Accent Gradient Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7C3AED] via-[#A78BFA] to-[#10B981]" />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2.5 pt-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#7C3AED] flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> New Lead
          </span>
          {lead.websiteName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] truncate max-w-[120px]">
              <Globe className="h-2.5 w-2.5 shrink-0 text-[#8B5CF6]" />
              <span className="truncate">{lead.websiteName}</span>
            </span>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="h-6 w-6 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#1A1523] hover:bg-[#F3F4F6] transition-colors shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main Lead Info */}
      <div className="flex items-start gap-3 my-2">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
          {lead.fullName ? lead.fullName.charAt(0).toUpperCase() : "L"}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[14px] font-bold text-[#1A1523] truncate leading-snug">
            {lead.fullName || "New Customer"}
          </h4>
          <div className="flex flex-col gap-0.5 mt-1 text-[12px] text-[#4B5563]">
            {lead.phone && (
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="font-medium text-[#1F2937]">{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3 text-indigo-500 shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {!lead.phone && !lead.email && lead.source && (
              <div className="text-[11.5px] text-[#6B7280] italic">
                Source: {lead.source}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2 pt-2.5 mt-2 border-t border-[#F3F0FF]">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            onClick={() => toast.dismiss(t)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold text-[#374151] hover:bg-[#F3F4F6] border border-[#E5E7EB] transition-colors"
          >
            <Phone className="h-3 w-3 text-[#6B7280]" /> Call
          </a>
        )}
        <Link
          href={`/leads`}
          onClick={() => toast.dismiss(t)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11.5px] font-bold text-white bg-gradient-to-r from-[#7C3AED] to-[#9061F9] hover:from-[#6D28D9] hover:to-[#7E3AF2] shadow-sm transition-all"
        >
          View Pipeline <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  ), {
    duration: 6000,
    id: `lead-toast-${lead.id || Date.now()}`,
  });
}
