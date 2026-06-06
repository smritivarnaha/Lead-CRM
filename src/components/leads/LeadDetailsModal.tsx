"use client";

import { useState, useEffect, useRef } from "react";
import { X, MapPin, Mail, Phone, Globe, Tag, Clock, Calendar, TrendingUp, StickyNote, Plus, Flame, Sun, Snowflake } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  NEW:         { label: "New",         bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500" },
  CONTACTED:   { label: "Contacted",   bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500" },
  FOLLOW_UP:   { label: "Follow Up",   bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  NO_RESPONSE: { label: "No Reply",    bg: "bg-slate-100", text: "text-slate-600",  dot: "bg-slate-400" },
  CONVERTED:   { label: "Converted",   bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  LOST:        { label: "Lost",        bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  HIGH:   { label: "High",   bg: "bg-red-50",   text: "text-red-700" },
  NORMAL: { label: "Normal", bg: "bg-slate-50", text: "text-slate-700" },
  LOW:    { label: "Low",    bg: "bg-slate-50", text: "text-slate-500" },
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-[#F3F0FF] last:border-0 hover:bg-[#F7F5FF] transition-colors">
      <span className="flex items-center gap-2 text-[12px] text-[#6B7280] font-medium min-w-[80px]">
        {icon} {label}
      </span>
      <span className="text-[13px] font-medium text-right max-w-[60%] truncate text-[#1A1523]">
        {value}
      </span>
    </div>
  );
}

export function LeadDetailsModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [followUp, setFollowUp] = useState(lead.followUpAt ? new Date(lead.followUpAt).toISOString().split("T")[0] : "");

  useEffect(() => {
    fetch(`/api/notes?leadId=${lead.id}`).then(r => r.json()).then(d => { if (d.notes) setNotes(d.notes); });
  }, [lead.id]);

  const initials = lead.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex justify-end" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ animation: "slideLeft 0.2s cubic-bezier(0.32,0.72,0,1)" }}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-[#E8E4F3]">
          <button onClick={onClose} className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#1A1523]"><X className="h-5 w-5" /></button>
          <div className="flex items-center gap-3 pr-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#1A1523] truncate">{lead.fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-[#E8E4F3]`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[lead.status]?.dot || 'bg-slate-400'}`} />
                  {STATUS_CONFIG[lead.status]?.label || lead.status}
                </span>
                <span className="text-[12px] font-medium text-[#6B7280]">
                  Score: <span className="text-[#1A1523] font-bold">{lead.score || 50}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            <a href={`mailto:${lead.email}`} className="flex-1 flex items-center justify-center gap-2 bg-[#F7F5FF] hover:bg-[#EDE9FE] text-[#7C3AED] text-[13px] font-semibold py-2.5 rounded-lg transition-colors border border-[#E8E4F3]">
              <Mail className="h-4 w-4" /> Email
            </a>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-[#F7F5FF] hover:bg-[#EDE9FE] text-[#7C3AED] text-[13px] font-semibold py-2.5 rounded-lg transition-colors border border-[#E8E4F3]">
                <Phone className="h-4 w-4" /> Call
              </a>
            )}
          </div>

          <section>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Details</p>
            <div className="border border-[#E8E4F3] rounded-xl overflow-hidden shadow-sm">
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={lead.email || "—"} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={lead.phone || "—"} />
              <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Website" value={lead.website?.name || "—"} />
              <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Source" value={lead.source || "—"} />
              <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Received" value={new Date(lead.createdAt).toLocaleString()} />
            </div>
          </section>

          {lead.message && (
            <section>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Message</p>
              <div className="p-3.5 bg-[#F7F5FF] border border-[#E8E4F3] rounded-xl">
                <p className="text-[13px] text-[#1A1523] leading-relaxed">{lead.message}</p>
              </div>
            </section>
          )}

          <section>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Notes</p>
            <textarea
              placeholder="Add a note..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              className="w-full border border-[#E8E4F3] rounded-xl text-[13px] p-3 outline-none focus:border-[#7C3AED] bg-white text-[#1A1523] min-h-[80px]"
            />
            {notes.map(note => (
              <div key={note.id} className="mt-3 p-3 bg-white border border-[#E8E4F3] rounded-xl shadow-sm">
                <p className="text-[13px] text-[#1A1523]">{note.content}</p>
                <p className="text-[10px] text-[#9CA3AF] mt-1.5">{new Date(note.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
      <style>{`@keyframes slideLeft { from { transform:translateX(100%) } to { transform:translateX(0) } }`}</style>
    </div>
  );
}
