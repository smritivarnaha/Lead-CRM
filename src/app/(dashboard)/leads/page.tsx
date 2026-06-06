"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { getLeads, updateLeadStatus, updateLeadPriority, deleteLead } from "@/actions/leads";
import {
  RefreshCw, Search, Phone, Mail, Globe, MapPin, MessageSquare, TrendingUp,
  Filter, Download, Trash2, X, Inbox, Eye, Calendar, ChevronUp, ChevronDown,
  ChevronsUpDown, Flame, Snowflake, Sun, Tag, Clock, Plus, StickyNote,
} from "lucide-react";

type Lead = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  message: string | null;
  source: string | null;
  formName: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  status: string;
  priority: string;
  temperature: string;
  score: number;
  createdAt: string;
  followUpAt: string | null;
  rawFields?: string | null;
  website: { id: string; name: string; domain: string } | null;
};

const STATUS_OPTIONS = ["NEW", "CONTACTED", "FOLLOW_UP", "NO_RESPONSE", "CONVERTED", "LOST"];
const PRIORITY_OPTIONS = ["HIGH", "NORMAL", "LOW"];

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  NEW:         { label: "New",         dot: "bg-blue-500",   bg: "bg-gyaan-neutral-bg",   text: "text-slate-700",   border: "border-transparent" },
  CONTACTED:   { label: "Contacted",   dot: "bg-amber-500",  bg: "bg-gyaan-warning-bg",  text: "text-amber-700",  border: "border-transparent" },
  FOLLOW_UP:   { label: "Follow Up",   dot: "bg-orange-500", bg: "bg-gyaan-warning-bg", text: "text-orange-700", border: "border-transparent" },
  NO_RESPONSE: { label: "No Reply",    dot: "bg-slate-400",  bg: "bg-gyaan-neutral-bg",  text: "text-slate-600",  border: "border-transparent" },
  CONVERTED:   { label: "Converted",   dot: "bg-green-500",  bg: "bg-gyaan-success-bg",  text: "text-green-700",  border: "border-transparent" },
  LOST:        { label: "Lost",        dot: "bg-red-400",    bg: "bg-gyaan-danger-bg",    text: "text-red-700",    border: "border-transparent" },
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  HIGH:   { label: "High",   bg: "bg-gyaan-danger-bg",   text: "text-red-700",   border: "border-transparent" },
  NORMAL: { label: "Normal", bg: "bg-gyaan-neutral-bg",  text: "text-slate-700",  border: "border-transparent" },
  LOW:    { label: "Low",    bg: "bg-gyaan-neutral-bg", text: "text-slate-500", border: "border-transparent" },
};

function avatarColor(name: string) {
  const colors = ["bg-violet-500","bg-blue-500","bg-cyan-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-pink-500","bg-indigo-500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string) {
  if (!name || name === "Unknown") return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "Now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function TempDot({ temp }: { temp: string }) {
  if (temp === "HOT")  return <span title="Hot"><Flame    className="h-3.5 w-3.5 text-red-500" /></span>;
  if (temp === "WARM") return <span title="Warm"><Sun      className="h-3.5 w-3.5 text-amber-400" /></span>;
  return                      <span title="Cold"><Snowflake className="h-3.5 w-3.5 text-sky-400" /></span>;
}

// ─── Info row for modal ───────────────────────────────────────────────────
function InfoRow({ icon, label, value, highlight }: { icon?: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white hover:bg-slate-50 transition-colors">
      <span className="flex items-center gap-2 text-xs text-slate-400 font-medium capitalize min-w-[80px]">{icon}{label}</span>
      <span className={`text-xs font-medium text-right max-w-[55%] truncate ${highlight ? "text-orange-600" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}

// ─── Note type ───────────────────────────────────────────────────────────
type Note = { id: string; content: string; authorName: string | null; createdAt: string };

// ─── Lead Details Modal ───────────────────────────────────────────────────
function LeadDetailsModal({ lead, onClose, onStatusChange, onPriorityChange, onFollowUpChange }: {
  lead: Lead; onClose: () => void;
  onStatusChange: (id: string, s: string) => void;
  onPriorityChange: (id: string, p: string) => void;
  onFollowUpChange: (id: string, date: string) => void;
}) {
  let rawData: Record<string, unknown> = {};
  try { if (lead.rawFields) rawData = JSON.parse(lead.rawFields); } catch { /**/ }

  const hasContact = lead.email || lead.phone;
  const hasUTM = lead.utmSource || lead.utmMedium || lead.utmCampaign;
  const formFields = Object.entries(rawData).filter(([k]) =>
    !["email","phone","name","full_name","message","utm_source","utm_medium","utm_campaign","utm_content","utm_term"].includes(k.toLowerCase())
  );

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Follow-up state
  const [followUp, setFollowUp] = useState(
    lead.followUpAt ? new Date(lead.followUpAt).toISOString().split("T")[0] : ""
  );
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  useEffect(() => {
    fetch(`/api/notes?leadId=${lead.id}`)
      .then(r => r.json())
      .then(d => { if (d.notes) setNotes(d.notes); })
      .finally(() => setNotesLoading(false));
  }, [lead.id]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, content: noteText }) });
    const data = await res.json();
    if (data.note) { setNotes(prev => [data.note, ...prev]); setNoteText(""); }
    setSavingNote(false);
  };

  const handleDeleteNote = async (id: string) => {
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleFollowUpSave = async () => {
    setSavingFollowUp(true);
    await fetch("/api/leads/followup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, followUpAt: followUp || null }) });
    onFollowUpChange(lead.id, followUp);
    setSavingFollowUp(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: "slideUp 0.2s cubic-bezier(0.32,0.72,0,1)" }}
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 border-b border-slate-100">
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(lead.fullName)}`}>
              {initials(lead.fullName)}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 leading-tight truncate">
                {lead.fullName === "Unknown" ? <span className="text-slate-400 italic">Unknown Lead</span> : lead.fullName}
              </h2>
              {(lead.city || lead.state) && (
                <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5">
                  <MapPin className="h-3 w-3" />{[lead.city, lead.state].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[lead.status]?.bg} ${STATUS_CONFIG[lead.status]?.text} ${STATUS_CONFIG[lead.status]?.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[lead.status]?.dot}`} />
                  {STATUS_CONFIG[lead.status]?.label}
                </span>
                <TempDot temp={lead.temperature} />
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${PRIORITY_CONFIG[lead.priority]?.bg} ${PRIORITY_CONFIG[lead.priority]?.text} ${PRIORITY_CONFIG[lead.priority]?.border}`}>
                  {lead.priority}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick Actions */}
          {hasContact && (
            <div className="px-5 py-3 flex gap-2 border-b border-slate-100">
              {lead.phone && (
                <>
                  <a href={`tel:${lead.phone}`} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                    💬 WhatsApp
                  </a>
                </>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                  <Mail className="h-3.5 w-3.5" /> Email
                </a>
              )}
            </div>
          )}

          <div className="px-5 py-4 space-y-4">
            {/* Contact */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Contact</p>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                <InfoRow icon={<Mail className="h-3 w-3 text-blue-400" />} label="Email" value={lead.email || "Not provided"} />
                <InfoRow icon={<Phone className="h-3 w-3 text-emerald-400" />} label="Phone" value={lead.phone || "Not provided"} />
              </div>
            </section>

            {/* Message */}
            {lead.message && (
              <section>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Message</p>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs text-slate-700 leading-relaxed">{lead.message}</p>
                </div>
              </section>
            )}

            {/* Update */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Update</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block font-medium">Status</label>
                  <select value={lead.status} onChange={e => onStatusChange(lead.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-lg text-xs py-2 px-2.5 outline-none focus:border-blue-400 bg-white font-medium text-slate-800 cursor-pointer">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block font-medium">Priority</label>
                  <select value={lead.priority} onChange={e => onPriorityChange(lead.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-lg text-xs py-2 px-2.5 outline-none focus:border-blue-400 bg-white font-medium text-slate-800 cursor-pointer">
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Lead Info */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lead Info</p>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                <InfoRow icon={<Globe className="h-3 w-3 text-violet-400" />} label="Website" value={lead.website?.name || "—"} />
                <InfoRow icon={<Tag className="h-3 w-3 text-slate-300" />} label="Source" value={lead.source || "—"} />
                <InfoRow icon={<Clock className="h-3 w-3 text-slate-300" />} label="Received" value={new Date(lead.createdAt).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })} />
              </div>
            </section>

            {/* Follow-up Date */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Follow-up Reminder
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={followUp}
                  onChange={e => setFollowUp(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex-1 border border-slate-200 rounded-lg text-xs py-2 px-3 outline-none focus:border-blue-400 bg-white text-slate-700 cursor-pointer"
                />
                <button
                  onClick={handleFollowUpSave}
                  disabled={savingFollowUp}
                  className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  {savingFollowUp ? "Saving…" : followUp ? "Set" : "Clear"}
                </button>
              </div>
              {followUp && (
                <p className="text-[10px] text-orange-600 mt-1 flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" /> Reminder set for {new Date(followUp + "T00:00:00").toLocaleDateString("en-IN", { weekday:"short", day:"2-digit", month:"short" })}
                </p>
              )}
            </section>

            {/* UTM */}
            {hasUTM && (
              <section>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" />UTM Tracking</p>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {lead.utmSource && <InfoRow label="Source" value={lead.utmSource} />}
                  {lead.utmMedium && <InfoRow label="Medium" value={lead.utmMedium} />}
                  {lead.utmCampaign && <InfoRow label="Campaign" value={lead.utmCampaign} />}
                </div>
              </section>
            )}

            {/* Extra form fields */}
            {formFields.length > 0 && (
              <section>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">All Form Fields</p>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {formFields.map(([k, v]) => <InfoRow key={k} label={k.replace(/_/g," ")} value={String(v)} />)}
                </div>
              </section>
            )}

            {/* Notes */}
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <StickyNote className="h-3 w-3" /> Notes ({notes.length})
              </p>
              {/* Add note */}
              <div className="flex flex-col gap-1.5 mb-3">
                <textarea
                  ref={noteRef}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote(); }}
                  placeholder="Add a note… (Ctrl+Enter to save)"
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl text-xs py-2.5 px-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none text-slate-700 bg-white"
                />
                <button
                  onClick={handleAddNote}
                  disabled={savingNote || !noteText.trim()}
                  className="self-end flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Plus className="h-3 w-3" /> {savingNote ? "Saving…" : "Add Note"}
                </button>
              </div>
              {/* Notes list */}
              {notesLoading ? (
                <p className="text-xs text-slate-400 text-center py-3">Loading notes…</p>
              ) : notes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded-xl">No notes yet. Add one above.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map(note => (
                    <div key={note.id} className="group bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2.5 relative">
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-slate-400">
                          {note.authorName || "Team"} · {timeAgo(note.createdAt)}
                        </span>
                        <button onClick={() => handleDeleteNote(note.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }`}</style>
    </div>
  );
}

// ─── Sort Icon ────────────────────────────────────────────────────────────
type SortKey = keyof Lead;
type SortDir = "asc" | "desc" | null;

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="h-2.5 w-2.5 text-slate-300" />;
  if (dir === "asc") return <ChevronUp className="h-2.5 w-2.5 text-blue-500" />;
  return <ChevronDown className="h-2.5 w-2.5 text-blue-500" />;
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [websiteFilter, setWebsiteFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [inspectLead, setInspectLead] = useState<Lead | null>(null);

  const handleFollowUpChange = (id: string, date: string) => {
    setLeads(p => p.map(l => l.id === id ? { ...l, followUpAt: date || null } : l));
    setInspectLead(p => p?.id === id ? { ...p, followUpAt: date || null } : p);
  };

  const load = async () => {
    setLoading(true);
    try { const r = await getLeads(); if (r.success && r.leads) setLeads(r.leads); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const websites = useMemo(() => {
    const m = new Map<string, string>();
    leads.forEach(l => { if (l.website) m.set(l.website.id, l.website.name); });
    return Array.from(m.entries());
  }, [leads]);

  const filtered = useMemo(() => {
    let d = [...leads];
    if (search) { const q = search.toLowerCase(); d = d.filter(l => l.fullName.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q) || l.website?.name.toLowerCase().includes(q) || l.source?.toLowerCase().includes(q)); }
    if (statusFilter !== "ALL")   d = d.filter(l => l.status === statusFilter);
    if (priorityFilter !== "ALL") d = d.filter(l => l.priority === priorityFilter);
    if (websiteFilter !== "ALL")  d = d.filter(l => l.website?.id === websiteFilter);
    if (sortKey && sortDir) d.sort((a, b) => { const cmp = String(a[sortKey]??'').localeCompare(String(b[sortKey]??'')); return sortDir === "asc" ? cmp : -cmp; });
    return d;
  }, [leads, search, statusFilter, priorityFilter, websiteFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortDir(d => d==="asc"?"desc":d==="desc"?null:"asc"); if (sortDir===null) setSortKey("createdAt"); }
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    const r = await updateLeadStatus(id, status);
    if (r.success) { setLeads(p => p.map(l => l.id===id?{...l,status}:l)); setInspectLead(p => p?.id===id?{...p,status}:p); }
    setUpdatingId(null);
  };
  const handlePriorityChange = async (id: string, priority: string) => {
    setUpdatingId(id);
    const r = await updateLeadPriority(id, priority);
    if (r.success) { setLeads(p => p.map(l => l.id===id?{...l,priority}:l)); setInspectLead(p => p?.id===id?{...p,priority}:p); }
    setUpdatingId(null);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const r = await deleteLead(id);
    if (r.success) { setLeads(p => p.filter(l => l.id!==id)); if (inspectLead?.id===id) setInspectLead(null); }
  };
  const exportCSV = () => {
    const h = ["Name","Email","Phone","Source","Website","Status","Priority","Temperature","UTM Source","UTM Campaign","Date"];
    const rows = filtered.map(l => [l.fullName,l.email||"",l.phone||"",l.source||"",l.website?.name||"",l.status,l.priority,l.temperature,l.utmSource||"",l.utmCampaign||"",new Date(l.createdAt).toLocaleString("en-IN")]);
    const csv = [h,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="leads.csv"; a.click();
  };
  const hasFilters = search || statusFilter!=="ALL" || priorityFilter!=="ALL" || websiteFilter!=="ALL";

  type SortKey = "fullName" | "status" | "priority" | "source" | "temperature" | "createdAt";

  // Columns definition
  const COLS = [
    { label: "Contact",  sk: "fullName"   as SortKey, w: "min-w-[200px]" },
    { label: "Status",   sk: "status"     as SortKey, w: "w-28" },
    { label: "Priority", sk: "priority"   as SortKey, w: "w-24" },
    { label: "Source",   sk: "source"     as SortKey, w: "w-32" },
    { label: "Website",  sk: null,                    w: "w-28" },
    { label: "Heat",     sk: "temperature"as SortKey, w: "w-16" },
    { label: "Received", sk: "createdAt"  as SortKey, w: "w-20" },
    { label: "",         sk: null,                    w: "w-16" },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gyaan-primary">Pipeline</h1>
          <p className="text-[13px] font-normal text-gyaan-secondary mt-0.5">Manage and track your incoming leads.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="text-[13px] font-medium bg-white hover:bg-gyaan-hover border border-gyaan-border text-gyaan-secondary px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <Download className="h-[18px] w-[18px] stroke-[1.75]" /> Export
          </button>
          <button onClick={load} className="text-[13px] font-medium bg-white hover:bg-gyaan-hover border border-gyaan-border text-gyaan-secondary px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]" title="Refresh leads">
            <RefreshCw className={`h-[18px] w-[18px] stroke-[1.75] ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gyaan-muted stroke-[1.75]" />
          <input type="text" placeholder="Search leads by name, email, phone..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-white border border-gyaan-border rounded-xl text-[13px] py-2.5 pl-10 pr-3 outline-none focus:border-gyaan-purple text-gyaan-primary placeholder-gyaan-muted shadow-[0_1px_2px_rgba(0,0,0,0.03)]" />
        </div>

        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-gyaan-border rounded-xl text-[13px] font-medium py-2.5 px-3 outline-none focus:border-gyaan-purple text-gyaan-secondary bg-white cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <option value="ALL">All Status</option>
          {STATUS_OPTIONS.map(s=><option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>)}
        </select>

        <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="border border-gyaan-border rounded-xl text-[13px] font-medium py-2.5 px-3 outline-none focus:border-gyaan-purple text-gyaan-secondary bg-white cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <option value="ALL">All Priority</option>
          {PRIORITY_OPTIONS.map(p=><option key={p} value={p}>{p}</option>)}
        </select>

        {websites.length > 1 && (
          <select value={websiteFilter} onChange={e=>setWebsiteFilter(e.target.value)} className="border border-gyaan-border rounded-xl text-[13px] font-medium py-2.5 px-3 outline-none focus:border-gyaan-purple text-gyaan-secondary bg-white cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <option value="ALL">All Websites</option>
            {websites.map(([id,name])=><option key={id} value={id}>{name}</option>)}
          </select>
        )}

        {hasFilters && (
          <button onClick={()=>{setSearch("");setStatusFilter("ALL");setPriorityFilter("ALL");setWebsiteFilter("ALL");}} className="text-[11px] text-red-400 hover:text-red-600 flex items-center gap-0.5">
            <X className="h-2.5 w-2.5"/>Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 bg-white border border-gyaan-border rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-[#ECECF0] sticky top-0 z-10">
              <tr className="h-[52px]">
                {COLS.map(col => (
                  <th key={col.label}
                    onClick={col.sk ? ()=>handleSort(col.sk!) : undefined}
                    className={`px-4 text-[13px] font-semibold text-gyaan-secondary whitespace-nowrap ${col.w} ${col.sk?"cursor-pointer hover:text-gyaan-primary select-none":""}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.sk && <SortIcon active={sortKey===col.sk} dir={sortKey===col.sk?sortDir:null} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-400 mb-2" />
                  <p className="text-xs text-slate-400">Loading leads…</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Inbox className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">No leads found</p>
                  <p className="text-xs text-slate-400 mt-1">{hasFilters?"Try adjusting your filters":"Submit a form via your webhook"}</p>
                </td></tr>
              ) : filtered.map(lead => {
                const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;
                const pc = PRIORITY_CONFIG[lead.priority] || PRIORITY_CONFIG.NORMAL;
                const isUpdating = updatingId === lead.id;

                return (
                  <tr key={lead.id} className={`h-[60px] hover:bg-gyaan-row-hover border-b border-gyaan-border transition-colors group ${isUpdating?"opacity-40 pointer-events-none":""}`}>

                    {/* ── Contact: Name + Email + Phone ── */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${avatarColor(lead.fullName)}`}>
                          {initials(lead.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gyaan-primary text-[14px] leading-tight whitespace-nowrap">
                            {lead.fullName === "Unknown" ? <span className="text-gyaan-muted italic font-normal">Unknown</span> : lead.fullName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} className="text-[13px] font-normal text-gyaan-secondary hover:text-gyaan-primary truncate max-w-[150px]">
                                {lead.email}
                              </a>
                            )}
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="text-[13px] font-normal text-gyaan-secondary hover:text-gyaan-primary truncate max-w-[120px]">
                                {lead.phone}
                              </a>
                            )}
                            {!lead.email && !lead.phone && <span className="text-[13px] font-normal text-gyaan-muted italic">No contact</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ── Status ── */}
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1.5 h-[28px] px-[12px] text-[13px] font-medium rounded-full ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    </td>

                    {/* ── Priority ── */}
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center h-[28px] px-[12px] text-[13px] font-medium rounded-full ${pc.bg} ${pc.text}`}>
                        {pc.label}
                      </span>
                    </td>

                    {/* ── Source ── */}
                    <td className="px-4 py-2 text-[13px] font-normal text-gyaan-secondary whitespace-nowrap">
                      {lead.source || <span className="text-gyaan-muted">—</span>}
                    </td>

                    {/* ── Website ── */}
                    <td className="px-4 py-2">
                      {lead.website
                        ? <span className="text-[13px] font-normal text-gyaan-secondary whitespace-nowrap">{lead.website.name}</span>
                        : <span className="text-gyaan-muted text-[13px]">—</span>}
                    </td>

                    {/* ── Heat ── */}
                    <td className="px-4 py-2">
                      <TempDot temp={lead.temperature} />
                    </td>

                    {/* ── Received ── */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <p className="text-[13px] font-normal text-gyaan-secondary">{timeAgo(lead.createdAt)}</p>
                    </td>

                    {/* ── Actions ── */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>setInspectLead(lead)}
                          className="w-8 h-8 rounded-lg bg-white border border-gyaan-border hover:bg-gyaan-hover text-gyaan-secondary hover:text-gyaan-primary flex items-center justify-center transition-colors shadow-sm" title="View details">
                          <Eye className="h-4 w-4 stroke-[1.75]"/>
                        </button>
                        <button onClick={()=>handleDelete(lead.id)}
                          className="w-8 h-8 rounded-lg bg-white border border-gyaan-border hover:bg-gyaan-danger-bg text-gyaan-secondary hover:text-red-600 flex items-center justify-center transition-colors shadow-sm" title="Delete">
                          <Trash2 className="h-4 w-4 stroke-[1.75]"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="border-t border-gyaan-divider px-5 py-3 bg-white flex items-center justify-between">
            <span className="text-[13px] font-normal text-gyaan-secondary">
              <strong className="text-gyaan-primary font-medium">{filtered.length}</strong>{leads.length!==filtered.length?` of ${leads.length}`:""} leads
            </span>
            <span className="text-[13px] font-normal text-gyaan-secondary flex items-center gap-1.5">Hover a row → <Eye className="h-[18px] w-[18px] inline text-gyaan-secondary stroke-[1.75]" /> to view details</span>
          </div>
        )}
      </div>

      {inspectLead && (
        <LeadDetailsModal lead={inspectLead} onClose={()=>setInspectLead(null)} onStatusChange={handleStatusChange} onPriorityChange={handlePriorityChange} onFollowUpChange={handleFollowUpChange}/>
      )}
    </div>
  );
}
