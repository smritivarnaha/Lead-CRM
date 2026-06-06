"use client";

import { useState, useEffect, useMemo } from "react";
import { getLeads, updateLeadStatus, updateLeadPriority, deleteLead } from "@/actions/leads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Phone, Mail, Globe, MapPin, MessageSquare, TrendingUp,
  Filter, Download, Trash2, ChevronRight, X, Inbox,
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
  website: { id: string; name: string; domain: string } | null;
};

const STATUS_OPTIONS = ["NEW", "CONTACTED", "FOLLOW_UP", "NO_RESPONSE", "CONVERTED", "LOST"];
const PRIORITY_OPTIONS = ["HIGH", "NORMAL", "LOW"];

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  CONTACTED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  FOLLOW_UP: "bg-orange-50 text-orange-700 border-orange-200",
  NO_RESPONSE: "bg-slate-50 text-slate-600 border-slate-200",
  CONVERTED: "bg-green-50 text-green-700 border-green-200",
  LOST: "bg-red-50 text-red-700 border-red-200",
};

const PRIORITY_STYLE: Record<string, string> = {
  HIGH: "bg-red-50 text-red-700 border-red-200",
  NORMAL: "bg-blue-50 text-blue-700 border-blue-200",
  LOW: "bg-slate-50 text-slate-500 border-slate-200",
};

const TEMP_STYLE: Record<string, string> = {
  HOT: "🔥",
  WARM: "🌤️",
  COLD: "❄️",
};

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

type SortKey = keyof Lead;
type SortDir = "asc" | "desc" | null;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [websiteFilter, setWebsiteFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 text-slate-300" />;
    if (sortDir === "asc") return <ChevronUp className="h-3 w-3 text-blue-500" />;
    if (sortDir === "desc") return <ChevronDown className="h-3 w-3 text-blue-500" />;
    return <ChevronsUpDown className="h-3 w-3 text-slate-300" />;
  };

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    const res = await updateLeadStatus(id, status);
    if (res.success) setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    setUpdatingId(null);
  };

  const handlePriorityChange = async (id: string, priority: string) => {
    setUpdatingId(id);
    const res = await updateLeadPriority(id, priority);
    if (res.success) setLeads(prev => prev.map(l => l.id === id ? { ...l, priority } : l));
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead permanently?")) return;
    const res = await deleteLead(id);
    if (res.success) setLeads(prev => prev.filter(l => l.id !== id));
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
  };

  const TH = ({ label, sortable, sk }: { label: string; sortable?: boolean; sk?: SortKey }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${sortable ? "cursor-pointer hover:text-slate-800 select-none" : ""}`}
      onClick={sortable && sk ? () => handleSort(sk) : undefined}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortable && sk && <SortIcon k={sk} />}
      </div>
    </th>
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">All Leads</h2>
          <p className="text-sm text-slate-500">{filtered.length} of {leads.length} leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportCSV} variant="outline" size="sm" className="flex items-center gap-2 text-slate-700 border-slate-300">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={load} variant="outline" size="sm" disabled={loading} className="flex items-center gap-2 text-slate-700 border-slate-300">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone, website..."
            className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 text-slate-800 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium pl-1">
          <Filter className="h-3.5 w-3.5" /> Filter:
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg text-sm py-2 px-3 outline-none focus:border-blue-500 text-slate-700 bg-white"
        >
          <option value="ALL">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="border border-slate-200 rounded-lg text-sm py-2 px-3 outline-none focus:border-blue-500 text-slate-700 bg-white"
        >
          <option value="ALL">All Priority</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Website filter */}
        {websites.length > 1 && (
          <select
            value={websiteFilter}
            onChange={e => setWebsiteFilter(e.target.value)}
            className="border border-slate-200 rounded-lg text-sm py-2 px-3 outline-none focus:border-blue-500 text-slate-700 bg-white"
          >
            <option value="ALL">All Websites</option>
            {websites.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}

        {(search || statusFilter !== "ALL" || priorityFilter !== "ALL" || websiteFilter !== "ALL") && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("ALL"); setPriorityFilter("ALL"); setWebsiteFilter("ALL"); }}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <TH label="" />
                <TH label="Name" sortable sk="fullName" />
                <TH label="Contact" />
                <TH label="Website" sortable sk="website" />
                <TH label="Source" sortable sk="source" />
                <TH label="Status" sortable sk="status" />
                <TH label="Priority" sortable sk="priority" />
                <TH label="Temp" />
                <TH label="Date" sortable sk="createdAt" />
                <TH label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-16 text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading leads...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16 text-slate-400">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No leads found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or submit a form via the webhook</p>
                </td></tr>
              ) : filtered.map(lead => (
                <>
                  <tr
                    key={lead.id}
                    className={`hover:bg-slate-50 transition-colors ${expandedRow === lead.id ? "bg-blue-50/50" : ""} ${updatingId === lead.id ? "opacity-60" : ""}`}
                  >
                    {/* Expand toggle */}
                    <td className="pl-4 pr-1 py-3">
                      <button
                        onClick={() => setExpandedRow(expandedRow === lead.id ? null : lead.id)}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedRow === lead.id ? "rotate-90" : ""}`} />
                      </button>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 whitespace-nowrap">{lead.fullName}</div>
                      {lead.city && <div className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="h-2.5 w-2.5" />{lead.city}{lead.state ? `, ${lead.state}` : ""}</div>}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Mail className="h-3 w-3" />{lead.email}
                          </a>
                        )}
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                            <Phone className="h-3 w-3" />{lead.phone}
                          </a>
                        )}
                        {!lead.email && !lead.phone && <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>

                    {/* Website */}
                    <td className="px-4 py-3">
                      {lead.website ? (
                        <div className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap">
                          <Globe className="h-3 w-3 text-purple-500 flex-shrink-0" />
                          {lead.website.name}
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">
                        {lead.source || "Direct"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={e => handleStatusChange(lead.id, e.target.value)}
                        className={`text-xs border rounded-lg px-2 py-1 font-medium outline-none cursor-pointer ${STATUS_STYLE[lead.status] || STATUS_STYLE.NEW}`}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      <select
                        value={lead.priority}
                        onChange={e => handlePriorityChange(lead.id, e.target.value)}
                        className={`text-xs border rounded-lg px-2 py-1 font-medium outline-none cursor-pointer ${PRIORITY_STYLE[lead.priority] || PRIORITY_STYLE.NORMAL}`}
                      >
                        {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>

                    {/* Temperature */}
                    <td className="px-4 py-3 text-center text-base">
                      {TEMP_STYLE[lead.temperature] || "❄️"}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {timeAgo(lead.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title="Delete lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {expandedRow === lead.id && (
                    <tr key={`${lead.id}-expanded`} className="bg-blue-50/30">
                      <td colSpan={10} className="px-8 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {/* Message */}
                          {lead.message && (
                            <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                                <MessageSquare className="h-3.5 w-3.5" /> Message
                              </div>
                              <p className="text-sm text-slate-700">{lead.message}</p>
                            </div>
                          )}

                          {/* UTM Info */}
                          {(lead.utmSource || lead.utmMedium || lead.utmCampaign || lead.utmContent || lead.utmTerm) && (
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                                <TrendingUp className="h-3.5 w-3.5" /> UTM Tracking
                              </div>
                              <div className="space-y-1 text-xs">
                                {lead.utmSource && <p><span className="text-slate-400">Source:</span> <span className="text-slate-700 font-medium">{lead.utmSource}</span></p>}
                                {lead.utmMedium && <p><span className="text-slate-400">Medium:</span> <span className="text-slate-700 font-medium">{lead.utmMedium}</span></p>}
                                {lead.utmCampaign && <p><span className="text-slate-400">Campaign:</span> <span className="text-slate-700 font-medium">{lead.utmCampaign}</span></p>}
                                {lead.utmContent && <p><span className="text-slate-400">Content:</span> <span className="text-slate-700 font-medium">{lead.utmContent}</span></p>}
                                {lead.utmTerm && <p><span className="text-slate-400">Term:</span> <span className="text-slate-700 font-medium">{lead.utmTerm}</span></p>}
                              </div>
                            </div>
                          )}

                          {/* Lead Meta */}
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="text-xs font-semibold text-slate-500 mb-1.5">Lead Details</div>
                            <div className="space-y-1 text-xs">
                              <p><span className="text-slate-400">ID:</span> <span className="text-slate-600 font-mono text-[10px]">{lead.id}</span></p>
                              <p><span className="text-slate-400">Form:</span> <span className="text-slate-700">{lead.formName || "—"}</span></p>
                              <p><span className="text-slate-400">Score:</span> <span className="text-slate-700">{lead.score}</span></p>
                              <p><span className="text-slate-400">Created:</span> <span className="text-slate-700">{new Date(lead.createdAt).toLocaleString("en-IN")}</span></p>
                              {lead.followUpAt && <p><span className="text-slate-400">Follow-up:</span> <span className="text-orange-600 font-medium">{new Date(lead.followUpAt).toLocaleDateString("en-IN")}</span></p>}
                            </div>
                          </div>

                          {/* Quick actions */}
                          <div className="flex flex-col gap-2">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 bg-green-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-green-700 transition-colors">
                                <Phone className="h-3.5 w-3.5" /> Call {lead.fullName.split(" ")[0]}
                              </a>
                            )}
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 bg-blue-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                <Mail className="h-3.5 w-3.5" /> Email {lead.fullName.split(" ")[0]}
                              </a>
                            )}
                            {lead.phone && (
                              <a
                                href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-[#25D366] text-white text-xs px-3 py-2 rounded-lg hover:bg-[#128C7E] transition-colors"
                              >
                                <span className="text-sm">💬</span> WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filtered.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {filtered.length} leads{leads.length !== filtered.length ? ` (filtered from ${leads.length})` : ""}</span>
            <span>Click <ChevronRight className="h-3 w-3 inline" /> on any row to see full details</span>
          </div>
        )}
      </div>
    </div>
  );
}
