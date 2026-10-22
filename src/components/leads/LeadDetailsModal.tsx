"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Mail, Phone, Globe, Tag, Clock, StickyNote, Send, Loader2 } from "lucide-react";
import { getDeduplicatedFields } from "@/lib/fieldDeduplication";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  NEW:         { label: "New",              bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500" },
  CONTACTED:   { label: "Contacted",        bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500" },
  BUSY:        { label: "Busy / No Answer", bg: "bg-slate-100", text: "text-slate-700",  dot: "bg-slate-500" },
  FOLLOW_UP:   { label: "Follow Up",        bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  NO_RESPONSE: { label: "No Reply",         bg: "bg-slate-100", text: "text-slate-600",  dot: "bg-slate-400" },
  CONVERTED:   { label: "Converted",        bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  LOST:        { label: "Lost",             bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-[#F3F0FF] last:border-0 hover:bg-[#F7F5FF] transition-colors">
      <span className="flex items-center gap-2 text-[12px] text-[#6B7280] font-medium min-w-[80px]">
        {icon} {label}
      </span>
      <span className="text-[13px] font-medium text-right max-w-[60%] truncate text-[#1A1523]" title={value}>
        {value}
      </span>
    </div>
  );
}

export function LeadDetailsModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    fetch(`/api/notes?leadId=${lead.id}`)
      .then(r => r.json())
      .then(d => { if (d.notes) setNotes(d.notes); })
      .catch(() => {});
  }, [lead.id]);

  const handleSaveNote = async () => {
    if (!noteText.trim() || isSavingNote) return;
    setIsSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, content: noteText.trim() }),
      });
      const data = await res.json();
      if (data.success && data.note) {
        setNotes(prev => [data.note, ...prev]);
        setNoteText("");
        toast.success("Note saved");
      } else {
        toast.error("Failed to save note");
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const initials = (lead.fullName || "Lead")
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const statusCfg = STATUS_CONFIG[lead.status] || {
    label: lead.status,
    bg: "bg-slate-50",
    text: "text-slate-700",
    dot: "bg-slate-400",
  };

  // Parse clean, deduplicated custom and technical fields from rawFields
  const { customFieldsOnly: customFields, technicalFields } = getDeduplicatedFields(lead.rawFields, {
    fullName: lead.fullName,
    phone: lead.phone,
    email: lead.email,
    message: lead.message,
    city: lead.city,
    state: lead.state,
  });

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex justify-end" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col relative"
        onClick={e => e.stopPropagation()}
        style={{ animation: "slideLeft 0.2s cubic-bezier(0.32,0.72,0,1)" }}
      >
        {/* Header */}
        <div className="relative px-5 pt-6 pb-4 border-b border-[#E8E4F3]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#1A1523] hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#1A1523] truncate">{lead.fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-[#E8E4F3] ${statusCfg.bg} ${statusCfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
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
          {(lead.email || lead.phone) && (
            <div className="flex gap-2">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex-1 flex items-center justify-center gap-2 bg-[#F7F5FF] hover:bg-[#EDE9FE] text-[#7C3AED] text-[13px] font-semibold py-2.5 rounded-lg transition-colors border border-[#E8E4F3]">
                  <Mail className="h-4 w-4" /> Email
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-[#F7F5FF] hover:bg-[#EDE9FE] text-[#7C3AED] text-[13px] font-semibold py-2.5 rounded-lg transition-colors border border-[#E8E4F3]">
                  <Phone className="h-4 w-4" /> Call
                </a>
              )}
            </div>
          )}

          <section>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Details</p>
            <div className="border border-[#E8E4F3] rounded-xl overflow-hidden shadow-sm">
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={lead.email || "—"} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={lead.phone || "—"} />
              {(lead.city || lead.state) && (
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={[lead.city, lead.state].filter(Boolean).join(", ")} />
              )}
              <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Website" value={lead.website?.name || "—"} />
              <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Page URL" value={lead.pageUrl || "—"} />
              <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Source" value={lead.source || "—"} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="IP Address" value={lead.ipAddress || "—"} />
              <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Received" value={new Date(lead.createdAt).toLocaleString()} />
            </div>
          </section>

          {customFields.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Additional Responses</p>
              <div className="border border-[#E8E4F3] rounded-xl overflow-hidden shadow-sm">
                {customFields.map((field, idx) => (
                  <InfoRow key={idx} icon={<StickyNote className="h-3.5 w-3.5" />} label={field.label} value={field.value} />
                ))}
              </div>
            </section>
          )}

          {technicalFields.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Technical & Tracking</p>
              <div className="border border-[#E8E4F3] rounded-xl overflow-hidden shadow-sm">
                {technicalFields.map((field, idx) => (
                  <InfoRow key={idx} icon={<Globe className="h-3.5 w-3.5" />} label={field.label} value={field.value} />
                ))}
              </div>
            </section>
          )}

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
            <div className="space-y-2">
              <textarea
                placeholder="Add a note about this lead..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSaveNote();
                  }
                }}
                className="w-full border border-[#E8E4F3] rounded-xl text-[13px] p-3 outline-none focus:border-[#7C3AED] bg-white text-[#1A1523] min-h-[80px] resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={!noteText.trim() || isSavingNote}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-[12px] font-semibold transition-colors shadow-sm"
                >
                  {isSavingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Save Note
                </button>
              </div>
            </div>
            {notes.map(note => (
              <div key={note.id} className="mt-3 p-3 bg-white border border-[#E8E4F3] rounded-xl shadow-sm">
                <p className="text-[13px] text-[#1A1523] whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] font-medium text-[#7C3AED]">{note.authorName || "Team"}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{new Date(note.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
      <style>{`@keyframes slideLeft { from { transform:translateX(100%) } to { transform:translateX(0) } }`}</style>
    </div>
  );
}
