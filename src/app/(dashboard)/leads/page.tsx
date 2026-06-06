"use client";

import { useState, useEffect, useMemo } from "react";
import { getLeads, updateLeadStatus, updateLeadPriority, deleteLead } from "@/actions/leads";
import {
  RefreshCw, Search, Phone, Mail, Globe, MapPin, MessageSquare, TrendingUp,
  Filter, Download, Trash2, X, Inbox, Eye, Calendar, ChevronUp, ChevronDown,
  ChevronsUpDown, Flame, Snowflake, Sun, User, Tag, Clock, Zap,
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
  NEW:         { label: "New",         dot: "bg-blue-500",   bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  CONTACTED:   { label: "Contacted",   dot: "bg-amber-500",  bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  FOLLOW_UP:   { label: "Follow Up",   dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  NO_RESPONSE: { label: "No Response", dot: "bg-slate-400",  bg: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200" },
  CONVERTED:   { label: "Converted",   dot: "bg-green-500",  bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  LOST:        { label: "Lost",        dot: "bg-red-500",    bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  HIGH:   { label: "High",   bg: "bg-red-50",   text: "text-red-600",   border: "border-red-200" },
  NORMAL: { label: "Normal", bg: "bg-blue-50",  text: "text-blue-600",  border: "border-blue-200" },
  LOW:    { label: "Low",    bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200" },
};

// Generates a consistent color based on name
function avatarColor(name: string) {
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-cyan-500", "bg-emerald-500",
    "bg-amber-500", "bg-rose-500", "bg-pink-500", "bg-indigo-500",
  ];
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
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function TempIcon({ temp }: { temp: string }) {
  if (temp === "HOT") return <span className="flex items-center gap-1 text-xs font-medium text-red-600"><Flame className="h-3.5 w-3.5" />Hot</span>;
  if (temp === "WARM") return <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><Sun className="h-3.5 w-3.5" />Warm</span>;
  return <span className="flex items-center gap-1 text-xs font-medium text-blue-400"><Snowflake className="h-3.5 w-3.5" />Cold</span>;
}

// ─── Status Badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.NEW;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Lead Details Modal ───────────────────────────────────────────────────
function LeadDetailsModal({ lead, onClose, onStatusChange, onPriorityChange }: {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onPriorityChange: (id: string, priority: string) => void;
}) {
  let rawData: Record<string, unknown> = {};
  try { if (lead.rawFields) rawData = JSON.parse(lead.rawFields); } catch { /* ignore */ }

  const hasContact = lead.email || lead.phone;
  const hasLocation = lead.city || lead.state;
  const hasUTM = lead.utmSource || lead.utmMedium || lead.utmCampaign;
  const formFields = Object.entries(rawData).filter(([k]) =>
    !["email", "phone", "name", "full_name", "message", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].includes(k.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: "slideUp 0.22s cubic-bezier(0.32,0.72,0,1)" }}
      >
        {/* ── Header ── */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            {/* Avatar */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 ${avatarColor(lead.fullName)}`}>
              {initials(lead.fullName)}
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {lead.fullName === "Unknown" ? "Unknown Lead" : lead.fullName}
              </h2>
              {hasLocation && (
                <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" />{[lead.city, lead.state].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="flex items-center flex-wrap gap-2 mt-2">
                <StatusBadge status={lead.status} />
                <TempIcon temp={lead.temperature} />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_CONFIG[lead.priority]?.bg} ${PRIORITY_CONFIG[lead.priority]?.text} ${PRIORITY_CONFIG[lead.priority]?.border}`}>
                  {lead.priority} priority
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick Actions */}
          {hasContact && (
            <div className="px-6 py-4 flex gap-2 border-b border-slate-100">
              {lead.phone && (
                <>
                  <a href={`tel:${lead.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                    <Phone className="h-4 w-4" /> Call
                  </a>
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                    <span>💬</span> WhatsApp
                  </a>
                </>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  <Mail className="h-4 w-4" /> Email
                </a>
              )}
            </div>
          )}

          <div className="px-6 py-4 space-y-5">
            {/* Contact Details */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contact Info</h3>
              <div className="space-y-2">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Email</p>
                      <p className="text-sm font-semibold text-blue-600 group-hover:underline">{lead.email}</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Mail className="h-4 w-4 text-slate-300" /></div>
                    <p className="text-sm text-slate-400">No email provided</p>
                  </div>
                )}
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-200 hover:bg-emerald-50 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Phone</p>
                      <p className="text-sm font-semibold text-emerald-600 group-hover:underline">{lead.phone}</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Phone className="h-4 w-4 text-slate-300" /></div>
                    <p className="text-sm text-slate-400">No phone provided</p>
                  </div>
                )}
              </div>
            </section>

            {/* Message */}
            {lead.message && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Message</h3>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-sm text-slate-700 leading-relaxed">{lead.message}</p>
                </div>
              </section>
            )}

            {/* Lead Management */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Update Lead</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Status</label>
                  <select
                    value={lead.status}
                    onChange={e => onStatusChange(lead.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl text-sm py-2.5 px-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white font-medium text-slate-800 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Priority</label>
                  <select
                    value={lead.priority}
                    onChange={e => onPriorityChange(lead.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl text-sm py-2.5 px-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white font-medium text-slate-800 cursor-pointer"
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Lead Metadata */}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Lead Info</h3>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                <InfoRow icon={<Globe className="h-3.5 w-3.5 text-purple-500" />} label="Source" value={lead.website?.name || "—"} />
                <InfoRow icon={<Tag className="h-3.5 w-3.5 text-slate-400" />} label="Form" value={lead.source || "—"} />
                <InfoRow icon={<Clock className="h-3.5 w-3.5 text-slate-400" />} label="Received" value={new Date(lead.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                {lead.followUpAt && (
                  <InfoRow icon={<Calendar className="h-3.5 w-3.5 text-orange-400" />} label="Follow-up" value={new Date(lead.followUpAt).toLocaleDateString("en-IN")} highlight />
                )}
              </div>
            </section>

            {/* UTM Tracking */}
            {hasUTM && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />UTM Tracking</span>
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {lead.utmSource && <InfoRow label="Source" value={lead.utmSource} />}
                  {lead.utmMedium && <InfoRow label="Medium" value={lead.utmMedium} />}
                  {lead.utmCampaign && <InfoRow label="Campaign" value={lead.utmCampaign} />}
                  {lead.utmContent && <InfoRow label="Content" value={lead.utmContent} />}
                  {lead.utmTerm && <InfoRow label="Term" value={lead.utmTerm} />}
                </div>
              </section>
            )}

            {/* Extra Form Fields */}
            {formFields.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">All Form Fields</h3>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {formFields.map(([key, val]) => (
                    <InfoRow key={key} label={key.replace(/_/g, " ")} value={String(val)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

function InfoRow({ icon, label, value, highlight }: { icon?: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-slate-50 transition-colors">
      <span className="flex items-center gap-2 text-xs text-slate-400 font-medium capitalize min-w-[80px]">
        {icon}{label}
      </span>
      <span className={`text-sm font-medium text-right max-w-[55%] truncate ${highlight ? "text-orange-600" : "text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Sort Header ─────────────────────────────────────────────────────────
type SortKey = keyof Lead;
type SortDir = "asc" | "desc" | null;

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 text-slate-300" />;
  if (dir === "asc") return <ChevronUp className="h-3 w-3 text-blue-500" />;
  if (dir === "desc") return <ChevronDown className="h-3 w-3 text-blue-500" />;
  return <ChevronsUpDown className="h-3 w-3 text-slate-300" />;
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

  const load = async () => {
    setLoading(true);
    try {
      const res = await getLeads();
      if (res.success && res.leads) setLeads(res.leads);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const websites = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach(l => { if (l.website) map.set(l.website.id, l.website.name); });
    return Array.from(map.entries());
  }, [leads]);

  const filtered = useMemo(() => {
    let data = [...leads];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(l =>
        l.fullName.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.website?.name.toLowerCase().includes(q) ||
        l.source?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "ALL") data = data.filter(l => l.status === statusFilter);
    if (priorityFilter !== "ALL") data = data.filter(l => l.priority === priorityFilter);
    if (websiteFilter !== "ALL") data = data.filter(l => l.website?.id === websiteFilter);
    if (sortKey && sortDir) {
      data.sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return data;
  }, [leads, search, statusFilter, priorityFilter, websiteFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : d === "desc" ? null : "asc");
      if (sortDir === null) setSortKey("createdAt");
    } else { setSortKey(key); setSortDir("asc"); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    const res = await updateLeadStatus(id, status);
    if (res.success) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      if (inspectLead?.id === id) setInspectLead(prev => prev ? { ...prev, status } : prev);
    }
    setUpdatingId(null);
  };

  const handlePriorityChange = async (id: string, priority: string) => {
    setUpdatingId(id);
    const res = await updateLeadPriority(id, priority);
    if (res.success) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, priority } : l));
      if (inspectLead?.id === id) setInspectLead(prev => prev ? { ...prev, priority } : prev);
    }
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead permanently?")) return;
    const res = await deleteLead(id);
    if (res.success) {
      setLeads(prev => prev.filter(l => l.id !== id));
      if (inspectLead?.id === id) setInspectLead(null);
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "City", "State", "Source", "Website", "Status", "Priority", "Temperature", "UTM Source", "UTM Medium", "UTM Campaign", "Message", "Date"];
    const rows = filtered.map(l => [
      l.fullName, l.email || "", l.phone || "", l.city || "", l.state || "",
      l.source || "", l.website?.name || "", l.status, l.priority, l.temperature,
      l.utmSource || "", l.utmMedium || "", l.utmCampaign || "",
      (l.message || "").replace(/\n/g, " "),
      new Date(l.createdAt).toLocaleString("en-IN"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "leads.csv"; a.click();
  };

  const activeFilters = [
    search && `"${search}"`,
    statusFilter !== "ALL" && STATUS_CONFIG[statusFilter]?.label,
    priorityFilter !== "ALL" && priorityFilter,
    websiteFilter !== "ALL" && websites.find(([id]) => id === websiteFilter)?.[1],
  ].filter(Boolean);

  // Stats
  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === "NEW").length,
    converted: leads.filter(l => l.status === "CONVERTED").length,
    hot: leads.filter(l => l.temperature === "HOT").length,
  }), [leads]);

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {loading ? "Loading…" : `${filtered.length} of ${leads.length} leads`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      {!loading && leads.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Leads", value: stats.total, icon: <User className="h-4 w-4 text-slate-400" />, color: "bg-slate-100" },
            { label: "New", value: stats.new, icon: <Zap className="h-4 w-4 text-blue-500" />, color: "bg-blue-50" },
            { label: "Hot Leads", value: stats.hot, icon: <Flame className="h-4 w-4 text-red-500" />, color: "bg-red-50" },
            { label: "Converted", value: stats.converted, icon: <span className="text-green-500 text-sm">✓</span>, color: "bg-green-50" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-slate-900 leading-none">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="pl-9 pr-8 py-2 w-full border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 text-slate-800 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
          <Filter className="h-3.5 w-3.5" />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-xl text-sm py-2 px-3 outline-none focus:border-blue-400 text-slate-700 bg-white cursor-pointer"
        >
          <option value="ALL">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>)}
        </select>

        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="border border-slate-200 rounded-xl text-sm py-2 px-3 outline-none focus:border-blue-400 text-slate-700 bg-white cursor-pointer"
        >
          <option value="ALL">All Priority</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {websites.length > 1 && (
          <select
            value={websiteFilter}
            onChange={e => setWebsiteFilter(e.target.value)}
            className="border border-slate-200 rounded-xl text-sm py-2 px-3 outline-none focus:border-blue-400 text-slate-700 bg-white cursor-pointer"
          >
            <option value="ALL">All Websites</option>
            {websites.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}

        {activeFilters.length > 0 && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("ALL"); setPriorityFilter("ALL"); setWebsiteFilter("ALL"); }}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 ml-1"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {[
                  { label: "Lead", sk: "fullName" as SortKey },
                  { label: "Contact", sk: null },
                  { label: "Status", sk: "status" as SortKey },
                  { label: "Heat", sk: "temperature" as SortKey },
                  { label: "Source", sk: "source" as SortKey },
                  { label: "Received", sk: "createdAt" as SortKey },
                  { label: "", sk: null },
                ].map(col => (
                  <th
                    key={col.label}
                    onClick={col.sk ? () => handleSort(col.sk!) : undefined}
                    className={`px-4 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.sk ? "cursor-pointer hover:text-slate-700 select-none" : ""}`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sk && <SortIcon active={sortKey === col.sk} dir={sortKey === col.sk ? sortDir : null} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-20">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-400 mb-3" />
                  <p className="text-sm text-slate-400">Loading leads…</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Inbox className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-700">No leads found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeFilters.length > 0 ? "Try adjusting your filters" : "Submit a form via your webhook to see leads here"}
                  </p>
                </td></tr>
              ) : filtered.map(lead => {
                const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;
                const isUpdating = updatingId === lead.id;

                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-slate-50/60 transition-colors group ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {/* Lead column — avatar + name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(lead.fullName)}`}>
                          {initials(lead.fullName)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 whitespace-nowrap text-sm">
                            {lead.fullName === "Unknown" ? <span className="text-slate-400 italic">Unknown</span> : lead.fullName}
                          </p>
                          {(lead.city || lead.state) && (
                            <p className="text-xs text-slate-400 flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />{[lead.city, lead.state].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 hover:underline whitespace-nowrap">
                            <Mail className="h-3 w-3 flex-shrink-0" />{lead.email}
                          </a>
                        )}
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 hover:underline whitespace-nowrap">
                            <Phone className="h-3 w-3 flex-shrink-0" />{lead.phone}
                          </a>
                        )}
                        {!lead.email && !lead.phone && (
                          <span className="text-xs text-slate-300 italic">No contact</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </td>

                    {/* Heat */}
                    <td className="px-4 py-3.5">
                      <TempIcon temp={lead.temperature} />
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        {lead.website && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Globe className="h-3 w-3 text-violet-400 flex-shrink-0" />{lead.website.name}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{lead.source || "Direct"}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-slate-600">{timeAgo(lead.createdAt)}</p>
                        <p className="text-slate-300">{new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setInspectLead(lead)}
                          className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 flex items-center justify-center transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-400 flex items-center justify-center transition-colors"
                          title="Delete lead"
                        >
                          <Trash2 className="h-4 w-4" />
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
          <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing <strong className="text-slate-600">{filtered.length}</strong>{leads.length !== filtered.length ? ` of ${leads.length}` : ""} leads
            </span>
            <span className="text-xs text-slate-400">Click <Eye className="h-3 w-3 inline text-blue-400 mx-0.5" /> to view full details</span>
          </div>
        )}
      </div>

      {/* Lead Details Modal */}
      {inspectLead && (
        <LeadDetailsModal
          lead={inspectLead}
          onClose={() => setInspectLead(null)}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
        />
      )}
    </div>
  );
}
