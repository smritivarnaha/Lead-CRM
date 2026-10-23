"use client";

import { useState, useEffect } from "react";
import {
  X,
  MapPin,
  Mail,
  Phone,
  Globe,
  Tag,
  Clock,
  StickyNote,
  Send,
  Loader2,
  MessageCircle,
  CalendarClock,
} from "lucide-react";
import { getDeduplicatedFields } from "@/lib/fieldDeduplication";
import { updateLeadStatus, updateLeadFollowup } from "@/actions/leads";
import { addHours, format } from "date-fns";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  NEW:       { label: "New Lead",         bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500" },
  CONTACTED: { label: "Contacted",        bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500" },
  BUSY:      { label: "Busy / No Answer", bg: "bg-slate-100", text: "text-slate-700",  dot: "bg-slate-500" },
  FOLLOW_UP: { label: "Follow Up",        bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  CONVERTED: { label: "Converted",        bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  LOST:      { label: "Junk / Lost",      bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
};

function formatWhatsAppUrl(phone: string | null | undefined, name?: string, siteName?: string) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    digits = "91" + digits;
  }
  if (digits.length < 10) return null;
  const greeting = `Hi ${name || "there"}, thank you for reaching out${
    siteName ? ` to ${siteName}` : ""
  }. How can we help you today?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`;
}

function InfoRow({
  icon,
  label,
  value,
  wrapValue = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  wrapValue?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5 bg-white border-b border-[#F3F0FF] last:border-0 hover:bg-[#F7F5FF] transition-colors">
      <span className="flex items-center gap-2 text-[12px] text-[#6B7280] font-medium shrink-0 pt-0.5">
        {icon} {label}
      </span>
      <span
        className={`text-[13px] font-medium text-right max-w-[62%] text-[#1A1523] ${
          wrapValue ? "break-words whitespace-pre-wrap" : "truncate"
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

export function LeadDetailsModal({
  lead,
  onClose,
  onStatusChange,
}: {
  lead: any;
  onClose: () => void;
  onStatusChange?: (leadId: string, newStatus: string) => void;
}) {
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(lead.status || "NEW");
  const [followUpDate, setFollowUpDate] = useState<string | null>(lead.followUpAt || null);

  useEffect(() => {
    setCurrentStatus(lead.status || "NEW");
    setFollowUpDate(lead.followUpAt || null);
    fetch(`/api/notes?leadId=${lead.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.notes) setNotes(d.notes);
      })
      .catch(() => {});
  }, [lead.id, lead.status, lead.followUpAt]);

  const handleStatusUpdate = async (newStatus: string) => {
    setCurrentStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(lead.id, newStatus);
    } else {
      const res = await updateLeadStatus(lead.id, newStatus);
      if (res.success) {
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      } else {
        toast.error("Failed to update status");
      }
    }
  };

  const handleScheduleFollowup = async (hours: number) => {
    const nextTime = addHours(new Date(), hours);
    setFollowUpDate(nextTime.toISOString());
    setCurrentStatus("FOLLOW_UP");
    if (onStatusChange) onStatusChange(lead.id, "FOLLOW_UP");
    toast.success(`Follow-up scheduled for ${format(nextTime, "MMM d, h:mm a")}`);
    try {
      await updateLeadFollowup(lead.id, nextTime);
      await updateLeadStatus(lead.id, "FOLLOW_UP");
    } catch {
      toast.error("Failed to schedule follow-up");
    }
  };

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
        setNotes((prev) => [data.note, ...prev]);
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

  const statusCfg = STATUS_CONFIG[currentStatus] || {
    label: currentStatus,
    bg: "bg-slate-50",
    text: "text-slate-700",
    dot: "bg-slate-400",
  };

  const whatsappUrl = formatWhatsAppUrl(lead.phone, lead.fullName, lead.website?.name);

  // Parse clean, deduplicated custom and technical fields from rawFields
  const { customFieldsOnly: customFields, technicalFields } = getDeduplicatedFields(lead.rawFields, {
    fullName: lead.fullName,
    phone: lead.phone,
    email: lead.email,
    message: lead.message,
    city: lead.city,
    state: lead.state,
  });

  // Resolve IP Address and Page URL with fallback to technicalFields for older leads
  const fallbackIp = technicalFields.find((f) =>
    ["ipaddress", "ip_address", "ip", "client_ip"].includes(f.key.toLowerCase())
  )?.value;
  const fallbackPageUrl = technicalFields.find((f) =>
    ["pageurl", "page_url"].includes(f.key.toLowerCase())
  )?.value;

  const resolvedIp = lead.ipAddress || fallbackIp || "—";
  const resolvedPageUrl = lead.pageUrl || fallbackPageUrl || "—";

  // Filter out technical fields that are already displayed in Contact & Source Details
  const uniqueTechnicalFields = technicalFields.filter((f) => {
    const k = f.key.toLowerCase().replace(/[\s_\-]+/g, "");
    return !["ipaddress", "ip", "clientip", "remoteaddr", "pageurl", "source", "siteurl", "sitedomain"].includes(k);
  });

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
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
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-[#E8E4F3] ${statusCfg.bg} ${statusCfg.text}`}
                >
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Quick Connect Bar: Call, WhatsApp, Email */}
          {(lead.phone || lead.email) && (
            <div className="grid grid-cols-3 gap-2">
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[12.5px] font-bold py-2.5 rounded-xl transition-colors border border-indigo-200/80"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              ) : (
                <div className="flex items-center justify-center gap-1.5 bg-slate-50 text-slate-300 text-[12.5px] font-bold py-2.5 rounded-xl border border-slate-100 cursor-not-allowed">
                  <Phone className="h-3.5 w-3.5" /> Call
                </div>
              )}

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[12.5px] font-bold py-2.5 rounded-xl transition-colors border border-emerald-200/80"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              ) : (
                <div className="flex items-center justify-center gap-1.5 bg-slate-50 text-slate-300 text-[12.5px] font-bold py-2.5 rounded-xl border border-slate-100 cursor-not-allowed">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </div>
              )}

              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center justify-center gap-1.5 bg-[#F7F5FF] hover:bg-[#EDE9FE] text-[#7C3AED] text-[12.5px] font-bold py-2.5 rounded-xl transition-colors border border-[#E8E4F3]"
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </a>
              ) : (
                <div className="flex items-center justify-center gap-1.5 bg-slate-50 text-slate-300 text-[12.5px] font-bold py-2.5 rounded-xl border border-slate-100 cursor-not-allowed">
                  <Mail className="h-3.5 w-3.5" /> Email
                </div>
              )}
            </div>
          )}

          {/* Interactive Stage Switcher inside Drawer */}
          <section className="bg-slate-50/70 border border-[#E8E4F3] rounded-xl p-3">
            <p className="text-[10.5px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">
              Update Lead Stage
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const active = currentStatus === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleStatusUpdate(key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer truncate ${
                      active
                        ? `${cfg.bg} ${cfg.text} border-current shadow-2xs font-bold`
                        : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                    <span className="truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Quick Follow-Up Scheduler */}
          <section className="bg-orange-50/40 border border-orange-200/60 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-orange-600" /> Schedule Follow-up
              </span>
              {followUpDate && (
                <span className="text-[11px] font-semibold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-full">
                  {format(new Date(followUpDate), "MMM d, h:mm a")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleScheduleFollowup(1)}
                className="py-1.5 px-2 bg-white hover:bg-orange-50 border border-orange-200/80 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                +1 Hour
              </button>
              <button
                type="button"
                onClick={() => handleScheduleFollowup(24)}
                className="py-1.5 px-2 bg-white hover:bg-orange-50 border border-orange-200/80 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleScheduleFollowup(72)}
                className="py-1.5 px-2 bg-white hover:bg-orange-50 border border-orange-200/80 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => handleScheduleFollowup(168)}
                className="py-1.5 px-2 bg-white hover:bg-orange-50 border border-orange-200/80 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                +1 Week
              </button>
            </div>
          </section>

          <section>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">
              Contact & Source Details
            </p>
            <div className="border border-[#E8E4F3] rounded-xl overflow-hidden shadow-sm">
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={lead.email || "—"} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={lead.phone || "—"} />
              {(lead.city || lead.state) && (
                <InfoRow
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  label="Location"
                  value={[lead.city, lead.state].filter(Boolean).join(", ")}
                />
              )}
              <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Website" value={lead.website?.name || "—"} />
              <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Page URL" value={resolvedPageUrl} />
              <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Source" value={lead.source || "—"} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="IP Address" value={resolvedIp} />
              <InfoRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Received"
                value={new Date(lead.createdAt).toLocaleString()}
              />
            </div>
          </section>

          {customFields.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">
                Additional Form Responses ({customFields.length})
              </p>
              <div className="border border-[#E8E4F3] rounded-xl overflow-hidden shadow-sm">
                {customFields.map((field, idx) => (
                  <InfoRow
                    key={idx}
                    icon={<StickyNote className="h-3.5 w-3.5" />}
                    label={field.label}
                    value={field.value}
                    wrapValue={true}
                  />
                ))}
              </div>
            </section>
          )}

          {uniqueTechnicalFields.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">
                Technical & Tracking
              </p>
              <div className="border border-[#E8E4F3] rounded-xl overflow-hidden shadow-sm">
                {uniqueTechnicalFields.map((field, idx) => (
                  <InfoRow
                    key={idx}
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label={field.label}
                    value={field.value}
                    wrapValue={true}
                  />
                ))}
              </div>
            </section>
          )}

          {lead.message && (
            <section>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Message / Query</p>
              <div className="p-3.5 bg-[#F7F5FF] border border-[#E8E4F3] rounded-xl">
                <p className="text-[13px] text-[#1A1523] leading-relaxed whitespace-pre-wrap">{lead.message}</p>
              </div>
            </section>
          )}

          <section>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Call & Activity Notes</p>
            <div className="space-y-2">
              <textarea
                placeholder="Add a note about this lead..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-[12px] font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  {isSavingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Save Note
                </button>
              </div>
            </div>
            {notes.map((note) => (
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
