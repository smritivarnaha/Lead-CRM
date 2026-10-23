"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getLeads, getLeadsByWebsite, updateLeadStatus, logCallAction, bulkDeleteLeads } from "@/actions/leads";
import { getWebsitesList } from "@/actions/websites";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { CallLogModal } from "@/components/leads/CallLogModal";
import { useActiveProfile } from "@/components/providers/ActiveProfileProvider";
import {
  Filter,
  ChevronDown,
  Columns3,
  AlignJustify,
  LayoutGrid,
  Mail,
  Phone,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  BellRing,
  Users,
  Search,
  X,
  Download,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { KanbanBoard } from "./KanbanBoard";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" });

function formatLeadDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return DATE_FORMATTER.format(d);
}

function formatLeadTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return TIME_FORMATTER.format(d);
}

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

type Lead = {
  id: string;
  fullName: string;
  source: string | null;
  status: string;
  createdAt: string;
  score: number;
  temperature: string;
  phone: string | null;
  email: string | null;
  website?: { id?: string; name: string; domain?: string };
  websiteId?: string;
  emailSent?: boolean;
  smsSent?: boolean;
  pushSent?: boolean;
  followUpAt?: string | null;
  callNotes?: string | null;
  updatedAt?: string;
};

const STAGE_STYLE: Record<string, { label: string; ring: string; fill: string; icon: any }> = {
  NEW:       { label: "New Lead",        ring: "border-blue-500",   fill: "bg-transparent", icon: HelpCircle },
  CONTACTED: { label: "Contacted",       ring: "border-amber-500",  fill: "bg-transparent", icon: Clock },
  BUSY:      { label: "Busy / No Answer",ring: "border-slate-500",  fill: "bg-transparent", icon: HelpCircle },
  FOLLOW_UP: { label: "Follow Up Later", ring: "border-orange-500", fill: "bg-transparent", icon: ArrowRight },
  CONVERTED: { label: "Converted",       ring: "border-green-500",  fill: "bg-green-500",   icon: CheckCircle2 },
  LOST:      { label: "Junk / Lost",     ring: "border-red-500",    fill: "bg-red-500",     icon: XCircle },
};

// ─── PROJECT TABS COLOR PALETTES ───
interface ProjectTheme {
  active: string;
  inactive: string;
  badgeActive: string;
  badgeInactive: string;
  dot: string;
}

const ALL_OPPORTUNITIES_THEME: ProjectTheme = {
  active: "bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm ring-2 ring-[#7C3AED]/20",
  inactive: "bg-white text-[#7C3AED] border-[#DDD6FE] hover:bg-[#EDE9FE] hover:border-[#C4B5FD]",
  badgeActive: "bg-white/25 text-white",
  badgeInactive: "bg-[#EDE9FE] text-[#7C3AED]",
  dot: "bg-[#7C3AED]",
};

const PROJECT_PALETTES: Record<string, ProjectTheme> = {
  rankved: {
    active: "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20",
    inactive: "bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/90 hover:border-emerald-300",
    badgeActive: "bg-white/25 text-white",
    badgeInactive: "bg-emerald-200/80 text-emerald-900",
    dot: "bg-emerald-500",
  },
  medisyn: {
    active: "bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-500/20",
    inactive: "bg-sky-50 text-sky-800 border-sky-200/80 hover:bg-sky-100/90 hover:border-sky-300",
    badgeActive: "bg-white/25 text-white",
    badgeInactive: "bg-sky-200/80 text-sky-900",
    dot: "bg-sky-500",
  },
  ninza: {
    active: "bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/20",
    inactive: "bg-amber-50 text-amber-900 border-amber-200/80 hover:bg-amber-100/90 hover:border-amber-300",
    badgeActive: "bg-white/25 text-white",
    badgeInactive: "bg-amber-200/80 text-amber-950",
    dot: "bg-amber-500",
  },
  clags: {
    active: "bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/20",
    inactive: "bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100/90 hover:border-rose-300",
    badgeActive: "bg-white/25 text-white",
    badgeInactive: "bg-rose-200/80 text-rose-900",
    dot: "bg-rose-500",
  },
};

const FALLBACK_PALETTES: ProjectTheme[] = [
  {
    active: "bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20",
    inactive: "bg-indigo-50 text-indigo-800 border-indigo-200/80 hover:bg-indigo-100/90 hover:border-indigo-300",
    badgeActive: "bg-white/25 text-white",
    badgeInactive: "bg-indigo-200/80 text-indigo-900",
    dot: "bg-indigo-500",
  },
  {
    active: "bg-teal-600 text-white border-teal-600 shadow-sm ring-2 ring-teal-500/20",
    inactive: "bg-teal-50 text-teal-800 border-teal-200/80 hover:bg-teal-100/90 hover:border-teal-300",
    badgeActive: "bg-white/25 text-white",
    badgeInactive: "bg-teal-200/80 text-teal-900",
    dot: "bg-teal-500",
  },
  {
    active: "bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-500/20",
    inactive: "bg-purple-50 text-purple-800 border-purple-200/80 hover:bg-purple-100/90 hover:border-purple-300",
    badgeActive: "bg-white/25 text-white",
    badgeInactive: "bg-purple-200/80 text-purple-900",
    dot: "bg-purple-500",
  },
  {
    active: "bg-cyan-600 text-white border-cyan-600 shadow-sm ring-2 ring-cyan-500/20",
    inactive: "bg-cyan-50 text-cyan-800 border-cyan-200/80 hover:bg-cyan-100/90 hover:border-cyan-300",
    badgeActive: "bg-white/25 text-white",
    badgeInactive: "bg-cyan-200/80 text-cyan-900",
    dot: "bg-cyan-500",
  },
  {
    active: "bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm ring-2 ring-fuchsia-500/20",
    inactive: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200/80 hover:bg-fuchsia-100/90 hover:border-fuchsia-300",
    badgeActive: "bg-white/25 text-white",
    badgeInactive: "bg-fuchsia-200/80 text-fuchsia-900",
    dot: "bg-fuchsia-500",
  },
  {
    active: "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20",
    inactive: "bg-blue-50 text-blue-800 border-blue-200/80 hover:bg-blue-100/90 hover:border-blue-300",
    badgeActive: "bg-white/25 text-white",
    badgeInactive: "bg-blue-200/80 text-blue-900",
    dot: "bg-blue-500",
  },
];

function getProjectTheme(name: string, index: number = 0): ProjectTheme {
  const lower = (name || "").toLowerCase();
  for (const [key, theme] of Object.entries(PROJECT_PALETTES)) {
    if (lower.includes(key)) return theme;
  }
  let hash = index;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash << 5) - hash + lower.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FALLBACK_PALETTES.length;
  return FALLBACK_PALETTES[idx];
}

// --- Custom Stage / Action Selector Component ---
function StageSelector({
  lead,
  stageConfig,
  handleStatusChange,
  isMobile = false,
}: {
  lead: any;
  stageConfig: any;
  handleStatusChange: any;
  isMobile?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const saveNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, content: note }),
      });
      if (res.ok) {
        setNote("");
        toast.success("Note added successfully");
        setIsOpen(false);
      } else {
        toast.error("Failed to add note");
      }
    } catch (err) {
      toast.error("Error adding note");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="relative w-full" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between w-full transition-all border group ${
          isMobile
            ? "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 p-2.5 rounded-lg shadow-sm"
            : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-md shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`h-2.5 w-2.5 rounded-full border-2 ${stageConfig.ring} ${stageConfig.fill} shrink-0`} />
          <span
            className={`font-semibold ${
              isMobile ? "text-[14px] text-slate-800" : "text-[12px] text-slate-700 truncate"
            }`}
          >
            {lead.status === "NEW" ? "Take Action" : stageConfig.label}
          </span>
        </div>
        <ChevronDown
          className={`text-slate-400 group-hover:text-slate-600 shrink-0 ${
            isMobile ? "h-4 w-4" : "h-3.5 w-3.5"
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-[100] bg-white border border-[#E8E4F3] shadow-[0_12px_40px_-15px_rgba(0,0,0,0.15)] rounded-2xl p-2.5 flex flex-col gap-2 ${
            isMobile ? "bottom-full left-0 w-full mb-2" : "right-0 top-full mt-2 w-[280px]"
          }`}
        >
          <div>
            <div className="px-1.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Update Status
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(STAGE_STYLE).map(([statusKey, config]: [string, any]) => (
                <button
                  key={statusKey}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleStatusChange(lead.id, statusKey);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 text-left rounded-lg transition-colors border ${
                    lead.status === statusKey
                      ? "bg-[#F7F5FF] border-[#7C3AED]/30 text-[#1A1523] shadow-sm"
                      : "bg-white border-transparent hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      config.text ? config.text.replace("text-", "bg-") : config.ring.replace("border-", "bg-")
                    }`}
                  />
                  <span className="text-[11px] font-semibold truncate">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-[#E8E4F3] my-0.5" />

          <div>
            <div className="px-1.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Add Quick Note
            </div>
            <div className="flex flex-col gap-2 px-0.5">
              <textarea
                placeholder="Spoke with them about..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveNote(e as any);
                  }
                }}
                className="w-full border border-[#E8E4F3] rounded-xl text-[13px] p-2.5 outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] bg-white text-[#1A1523] min-h-[60px] resize-none shadow-sm"
              />
              <button
                onClick={saveNote}
                disabled={savingNote || !note.trim()}
                className="w-full bg-[#1A1523] hover:bg-[#342E40] disabled:opacity-50 text-white font-semibold text-[13px] py-2 rounded-xl transition-colors shadow-sm"
              >
                {savingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Toolbar Dropdown Component
function ToolbarDropdown({
  label,
  icon: Icon,
  children,
  isActive = false,
  indicator = false,
}: {
  label: React.ReactNode;
  icon: any;
  children: React.ReactNode;
  isActive?: boolean;
  indicator?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border transition-colors outline-none cursor-pointer whitespace-nowrap ${
          isActive
            ? "bg-[#F7F5FF] text-[#7C3AED] border-[#DDD6FE] font-semibold"
            : "bg-white text-[#6B7280] border-slate-200/80 hover:text-[#1A1523] hover:bg-slate-50"
        }`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        {label}
        {indicator && <span className="flex h-2 w-2 rounded-full bg-[#7C3AED] ml-0.5"></span>}
      </button>
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 min-w-[12rem] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Custom Bulk Status Dropdown Component
function BulkStatusDropdown({
  selectedLeadIds,
  handleStatusChange,
  setSelectedLeadIds,
}: {
  selectedLeadIds: Set<string>;
  handleStatusChange: any;
  setSelectedLeadIds: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 hover:bg-white/10 px-2 sm:px-3 py-1.5 rounded transition-colors text-gray-200 hover:text-white outline-none"
      >
        <ChevronDown className="h-4 w-4" /> <span className="hidden sm:inline">Update Status</span>
      </button>
      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#1A1523] border border-white/10 rounded-lg shadow-xl z-50 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/10">
            Set Status For {selectedLeadIds.size} Leads
          </div>
          {Object.entries(STAGE_STYLE).map(([statusKey, config]) => (
            <button
              key={statusKey}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selectedLeadIds.forEach((id: string) => handleStatusChange(id, statusKey));
                setSelectedLeadIds(new Set());
                setIsOpen(false);
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] text-gray-200 hover:bg-white/10 transition-colors"
            >
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  config.fill === "bg-transparent" ? config.ring + " border" : config.fill
                }`}
              />
              {config.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveTimer({ createdAt, status, nowMs }: { createdAt: string; status: string; nowMs: number }) {
  if (status === "CONTACTED" || status === "CONVERTED") {
    return (
      <span className="text-emerald-500 font-bold text-[12px] flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
      </span>
    );
  }

  const created = new Date(createdAt).getTime();
  const diff = Math.max(0, nowMs - created);
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / 1000 / 60) % 60);
  const timeText = `${d} D : ${h} H : ${m} Min`;

  return (
    <div className="flex flex-col">
      <span className="text-slate-700 font-bold text-[11px] leading-tight flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        {timeText}
      </span>
      <span className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5 ml-5">since received</span>
    </div>
  );
}

export function PipelineView({
  websiteId,
  initialLeads,
  initialWebsites,
}: {
  websiteId?: string;
  initialLeads?: Lead[];
  initialWebsites?: any[];
}) {
  const { activeWebsiteId, setActiveWebsiteId } = useActiveProfile();
  const [leads, setLeads] = useState<Lead[]>(initialLeads || []);
  const [websites, setWebsites] = useState<any[]>(initialWebsites || []);
  const [selectedWebsiteTab, setSelectedWebsiteTab] = useState<string>(
    websiteId || activeWebsiteId || "all"
  );
  const [loading, setLoading] = useState(!initialLeads);
  const [inspectLead, setInspectLead] = useState<Lead | null>(null);
  const [callLogLead, setCallLogLead] = useState<Lead | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync with Header active profile selector if not locked to a specific websiteId route
  useEffect(() => {
    if (!websiteId) {
      setSelectedWebsiteTab(activeWebsiteId || "all");
    }
  }, [activeWebsiteId, websiteId]);

  // Single shared 60-second timer for all LiveTimer cells
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // View Toggle State
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Bulk Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Workable Columns State
  const [cols, setCols] = useState({
    name: true,
    phone: true,
    email: true,
    timeInStage: true,
    stage: true,
    closeDate: true,
  });

  // Toolbar States
  const [rowHeight, setRowHeight] = useState<"compact" | "standard" | "comfortable">("standard");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Read ?q= and ?stage= URL params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      const stage = params.get("stage");
      if (q) setSearchQuery(q);
      if (stage) setStatusFilter(stage);
    }
  }, []);

  // Fetch websites if not provided
  useEffect(() => {
    if (!initialWebsites) {
      getWebsitesList().then((res) => {
        if (res.success && res.websites) setWebsites(res.websites);
      });
    }
  }, [initialWebsites]);

  // Dynamically compute project tabs from both websites list and existing leads
  const projectTabs = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; domain?: string; logoUrl?: string; count: number; newCount: number }
    >();

    // 1. Prepopulate from known websites
    websites.forEach((w) => {
      if (w?.id && w?.name) {
        map.set(w.id, {
          id: w.id,
          name: w.name,
          domain: w.domain,
          logoUrl: (w as any).logoUrl,
          count: 0,
          newCount: 0,
        });
      }
    });

    // 2. Count leads per website
    leads.forEach((lead) => {
      const siteId = lead.website?.id || (lead as any).websiteId;
      const siteName = lead.website?.name;

      if (siteId) {
        if (!map.has(siteId)) {
          map.set(siteId, { id: siteId, name: siteName || siteId, count: 0, newCount: 0 });
        }
        const entry = map.get(siteId)!;
        entry.count += 1;
        if (lead.status === "NEW") entry.newCount += 1;
      } else if (siteName) {
        const existing = Array.from(map.values()).find(
          (m) => m.name.toLowerCase() === siteName.toLowerCase()
        );
        if (existing) {
          existing.count += 1;
          if (lead.status === "NEW") existing.newCount += 1;
        } else {
          map.set(siteName, {
            id: siteName,
            name: siteName,
            count: 1,
            newCount: lead.status === "NEW" ? 1 : 0,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [websites, leads]);

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedLeadIds.size} leads? This action cannot be undone.`
      )
    )
      return;

    try {
      const idsArray = Array.from(selectedLeadIds);
      const res = await bulkDeleteLeads(idsArray);
      if (res.success) {
        setLeads((prev) => prev.filter((l) => !selectedLeadIds.has(l.id)));
        toast.success(`Successfully deleted ${selectedLeadIds.size} leads.`);
        setSelectedLeadIds(new Set());
      } else {
        toast.error("Failed to delete leads.");
      }
    } catch (e) {
      toast.error("An error occurred while deleting leads.");
    }
  };

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads.filter((lead) => {
      // 1. Website / Project Tab Filter
      if (selectedWebsiteTab !== "all") {
        const leadSiteId = lead.website?.id || (lead as any).websiteId;
        const leadSiteName = lead.website?.name?.toLowerCase();
        const target = selectedWebsiteTab.toLowerCase();

        const isMatch =
          (leadSiteId && leadSiteId.toLowerCase() === target) ||
          (leadSiteName && leadSiteName === target) ||
          (lead.website?.name && lead.website.name.toLowerCase().includes(target));

        if (!isMatch) return false;
      }

      // 2. Status / Stage Filter
      if (statusFilter === "HOT") {
        if (lead.temperature !== "HOT") return false;
      } else if (statusFilter) {
        if (lead.status !== statusFilter) return false;
      }

      // 3. Real-time Search Filter
      if (q) {
        const hay = [
          lead.fullName,
          lead.phone,
          lead.email,
          lead.source,
          lead.website?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [leads, selectedWebsiteTab, statusFilter, searchQuery]);

  const handleExportCsv = () => {
    if (filteredLeads.length === 0) {
      toast.error("No leads to export.");
      return;
    }
    const headers = ["Name", "Phone", "Email", "Status", "Website", "Source", "Received At"];
    const rows = filteredLeads.map((l) => [
      `"${(l.fullName || "").replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      `"${l.status || ""}"`,
      `"${(l.website?.name || "").replace(/"/g, '""')}"`,
      `"${(l.source || "Website Form").replace(/"/g, '""')}"`,
      `"${new Date(l.createdAt).toLocaleString()}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLeads.length} leads to CSV`);
  };

  const upcomingFollowUps = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return filteredLeads
      .filter((l) => l.status === "FOLLOW_UP" && l.followUpAt && new Date(l.followUpAt) <= today)
      .sort((a, b) => new Date(a.followUpAt!).getTime() - new Date(b.followUpAt!).getTime());
  }, [filteredLeads]);

  useEffect(() => {
    if (initialLeads) return;
    const fetchLeads = websiteId ? getLeadsByWebsite(websiteId) : getLeads();
    fetchLeads.then((res) => {
      if (res.success && res.leads) setLeads(res.leads);
      setLoading(false);
    });
  }, [websiteId, initialLeads]);

  useEffect(() => {
    if (leads.length > 0 && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const leadId = searchParams.get("leadId");
      if (leadId) {
        const matchingLead = leads.find((l) => l.id === leadId);
        if (matchingLead) {
          setInspectLead(matchingLead);
          searchParams.delete("leadId");
          const queryStr = searchParams.toString();
          const newUrl = window.location.pathname + (queryStr ? `?${queryStr}` : "");
          window.history.replaceState({}, document.title, newUrl);
        }
      }
    }
  }, [leads]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
      if (inspectLead && inspectLead.id === leadId) {
        setInspectLead((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      const res = await updateLeadStatus(leadId, newStatus);
      if (res.success) {
        toast.success("Lead status updated to " + (STAGE_STYLE[newStatus]?.label || newStatus));
      } else {
        toast.error("Failed to update status. Please do a hard refresh (Ctrl+R).");
      }
    } catch (e) {
      toast.error("Network sync failed. Please do a hard refresh (Ctrl+R).");
    }
  };

  const handleCallLogSubmit = async (status: string, notes: string, followUpAt: Date | null) => {
    if (!callLogLead) return;
    const leadId = callLogLead.id;
    setCallLogLead(null);

    try {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
      const res = await logCallAction(leadId, status, notes, followUpAt);
      if (res.success) {
        toast.success("Call logged successfully!");
        setLeads((prev) => prev.map((l) => (l.id === leadId ? res.lead : l)));
      } else {
        toast.error("Failed to log call. Please do a hard refresh (Ctrl+R).");
      }
    } catch (e) {
      toast.error("Network sync failed. Please do a hard refresh (Ctrl+R).");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedLeadIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) setSelectedLeadIds(new Set());
    else setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
  };

  const borderClass = "border-[#E8E4F3]";

  return (
    <div className="flex flex-col h-full w-full bg-white relative overflow-hidden">
      {/* ─── FOLLOW UPS BANNER ─── */}
      {upcomingFollowUps.length > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 sm:px-6 py-2.5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13.5px] font-bold text-orange-900 leading-tight">
                {upcomingFollowUps.length}{" "}
                {upcomingFollowUps.length === 1 ? "lead needs" : "leads need"} follow-up today
              </h3>
              <p className="text-[11.5px] text-orange-700">Connect with them now for maximum conversion.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pb-1 sm:pb-0">
            {upcomingFollowUps.slice(0, 3).map((lead) => (
              <button
                key={lead.id}
                onClick={() => setCallLogLead(lead)}
                className="flex items-center gap-2 bg-white border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 group shadow-sm"
              >
                <div className="flex items-center justify-center h-5 w-5 rounded-md bg-orange-100 text-[10px] font-bold text-orange-700">
                  {lead.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-[12px] font-bold text-orange-900 group-hover:text-orange-700 leading-tight truncate max-w-[100px]">
                    {lead.fullName}
                  </div>
                  <div className="text-[10px] text-orange-600 font-medium">
                    {formatLeadTime(lead.followUpAt!)}
                  </div>
                </div>
              </button>
            ))}
            {upcomingFollowUps.length > 3 && (
              <div className="text-[12px] font-bold text-orange-700 px-2">
                +{upcomingFollowUps.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ROW 1: FULL-WIDTH WEBSITE / PROFILE TABS BAR (100% VISIBLE, NEVER CLIPPED) ─── */}
      {!websiteId && (
        <div
          className="w-full px-4 sm:px-6 py-2.5 bg-[#FAF9FE] border-b shrink-0"
          style={{ borderColor: "#E8E4F3" }}
        >
          <div className="flex items-center gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setSelectedWebsiteTab("all");
                setActiveWebsiteId(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all shrink-0 border cursor-pointer ${
                selectedWebsiteTab === "all"
                  ? ALL_OPPORTUNITIES_THEME.active
                  : ALL_OPPORTUNITIES_THEME.inactive
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">All Profiles</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                  selectedWebsiteTab === "all"
                    ? ALL_OPPORTUNITIES_THEME.badgeActive
                    : ALL_OPPORTUNITIES_THEME.badgeInactive
                }`}
              >
                {leads.length}
              </span>
            </button>

            {projectTabs.map((site, idx) => {
              const isSelected =
                selectedWebsiteTab === site.id ||
                selectedWebsiteTab.toLowerCase() === site.name.toLowerCase();
              const theme = getProjectTheme(site.name, idx);
              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    setSelectedWebsiteTab(site.id);
                    setActiveWebsiteId(site.id);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all shrink-0 border cursor-pointer ${
                    isSelected ? theme.active : theme.inactive
                  }`}
                >
                  {site.logoUrl ? (
                    <img
                      src={site.logoUrl}
                      alt={site.name}
                      className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
                    />
                  ) : (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isSelected ? "bg-white" : theme.dot
                      }`}
                    />
                  )}
                  <span className="whitespace-nowrap">{site.name}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      isSelected ? theme.badgeActive : theme.badgeInactive
                    }`}
                  >
                    {site.count}
                  </span>
                  {site.newCount > 0 && (
                    <span
                      className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                        isSelected ? "bg-white ring-2 ring-white/50" : "bg-emerald-500"
                      }`}
                      title={`${site.newCount} new unread lead(s)`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ROW 2: DEDICATED SINGLE-LINE PIPELINE CONTROL BAR ─── */}
      <div
        className="w-full flex flex-wrap items-center justify-between px-4 sm:px-6 py-2 bg-white border-b gap-2.5 shrink-0 text-[12.5px] font-medium text-[#6B7280]"
        style={{ borderColor: "#E8E4F3" }}
      >
        {/* Left Side: Search + Quick Stage Filter + Count */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex items-center w-full sm:w-[260px] md:w-[290px]">
            <Search className="h-3.5 w-3.5 text-[#9CA3AF] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, email..."
              className="w-full rounded-lg bg-[#F7F5FF] border border-[#E8E4F3] pl-8 pr-7 py-1.5 text-[12.5px] text-[#1A1523] placeholder:text-[#9CA3AF] outline-none focus:border-[#7C3AED] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-[#9CA3AF] hover:text-[#1A1523]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Unified Stage & Quick Filter Dropdown */}
          <ToolbarDropdown
            label={
              statusFilter === "HOT"
                ? "🔥 Hot Leads"
                : statusFilter
                ? STAGE_STYLE[statusFilter]?.label || "Filtered"
                : "Stage: All"
            }
            icon={Filter}
            isActive={!!statusFilter}
            indicator={!!statusFilter}
          >
            <button
              className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${
                !statusFilter ? "font-bold text-[#7C3AED] bg-[#F7F5FF]" : "text-slate-700"
              }`}
              onClick={() => setStatusFilter(null)}
            >
              All Leads ({leads.length})
            </button>
            <button
              className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${
                statusFilter === "HOT" ? "font-bold text-emerald-700 bg-emerald-50" : "text-slate-700"
              }`}
              onClick={() => setStatusFilter("HOT")}
            >
              🔥 Hot Leads Only
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Filter By Pipeline Stage
            </div>
            {Object.entries(STAGE_STYLE).map(([key, config]) => (
              <button
                key={key}
                className={`w-full flex items-center px-3 py-1.5 text-[13px] hover:bg-slate-50 ${
                  statusFilter === key ? "font-bold text-slate-900 bg-slate-50" : "text-slate-700"
                }`}
                onClick={() => setStatusFilter(key)}
              >
                <div
                  className={`h-2.5 w-2.5 rounded-full mr-2 shrink-0 ${
                    config.fill === "bg-transparent" ? config.ring + " border" : config.fill
                  }`}
                />
                <span className="truncate">{config.label}</span>
              </button>
            ))}
          </ToolbarDropdown>

          {(statusFilter || searchQuery || selectedWebsiteTab !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter(null);
                if (!websiteId) {
                  setSelectedWebsiteTab("all");
                  setActiveWebsiteId(null);
                }
              }}
              className="text-[11.5px] font-semibold text-[#7C3AED] hover:bg-[#F7F5FF] px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              Reset ({filteredLeads.length})
            </button>
          )}
        </div>

        {/* Right Side: Columns + Density + View Mode + Export (Single Row) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Workable Fields Dropdown */}
          <ToolbarDropdown label="Columns" icon={Columns3}>
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Visible Columns
            </div>
            <div className="h-px bg-slate-100 my-1" />
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]"
                checked={cols.name}
                onChange={(e) => setCols((p) => ({ ...p, name: e.target.checked }))}
              />{" "}
              Name
            </label>
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]"
                checked={cols.phone}
                onChange={(e) => setCols((p) => ({ ...p, phone: e.target.checked }))}
              />{" "}
              Phone Number
            </label>
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]"
                checked={cols.email}
                onChange={(e) => setCols((p) => ({ ...p, email: e.target.checked }))}
              />{" "}
              Email Address
            </label>
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]"
                checked={cols.timeInStage}
                onChange={(e) => setCols((p) => ({ ...p, timeInStage: e.target.checked }))}
              />{" "}
              Time in Stage
            </label>
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]"
                checked={cols.stage}
                onChange={(e) => setCols((p) => ({ ...p, stage: e.target.checked }))}
              />{" "}
              Stage (Status)
            </label>
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]"
                checked={cols.closeDate}
                onChange={(e) => setCols((p) => ({ ...p, closeDate: e.target.checked }))}
              />{" "}
              Close Date
            </label>
          </ToolbarDropdown>

          <ToolbarDropdown label="Density" icon={AlignJustify}>
            <button
              className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${
                rowHeight === "compact"
                  ? "font-medium text-indigo-600 bg-indigo-50/50"
                  : "text-slate-700"
              }`}
              onClick={() => setRowHeight("compact")}
            >
              Compact
            </button>
            <button
              className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${
                rowHeight === "standard"
                  ? "font-medium text-indigo-600 bg-indigo-50/50"
                  : "text-slate-700"
              }`}
              onClick={() => setRowHeight("standard")}
            >
              Standard
            </button>
            <button
              className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${
                rowHeight === "comfortable"
                  ? "font-medium text-indigo-600 bg-indigo-50/50"
                  : "text-slate-700"
              }`}
              onClick={() => setRowHeight("comfortable")}
            >
              Comfortable
            </button>
          </ToolbarDropdown>

          <ToolbarDropdown
            label={viewMode === "kanban" ? "Kanban" : "Table"}
            icon={LayoutGrid}
            isActive={viewMode === "kanban"}
          >
            <button
              className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${
                viewMode === "table"
                  ? "font-medium text-indigo-600 bg-indigo-50/50"
                  : "text-slate-700"
              }`}
              onClick={() => setViewMode("table")}
            >
              Table View
            </button>
            <button
              className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${
                viewMode === "kanban"
                  ? "font-medium text-indigo-600 bg-indigo-50/50"
                  : "text-slate-700"
              }`}
              onClick={() => setViewMode("kanban")}
            >
              Kanban Board
            </button>
          </ToolbarDropdown>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-slate-200/80 bg-white text-[#6B7280] hover:text-[#1A1523] hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            title="Export filtered leads to CSV"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="flex-1 overflow-auto bg-white relative min-h-[500px] pb-48">
        {viewMode === "kanban" ? (
          <KanbanBoard
            leads={filteredLeads}
            onStatusChange={handleStatusChange}
            onInspect={setInspectLead}
            onCallLog={setCallLogLead}
          />
        ) : (
          <>
            {/* ─── DESKTOP TABLE VIEW ─── */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse" style={{ tableLayout: "fixed" }}>
                {/* HEADERS */}
                <thead
                  className={`sticky top-0 bg-[#F7F5FF] z-10 border-b border-[#E8E4F3] shadow-[0_1px_0_#E8E4F3]`}
                >
                  <tr className="h-[40px] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                    <th className={`w-[38px] px-3 py-0 border-r ${borderClass} text-center font-normal`}>
                      <input
                        type="checkbox"
                        checked={
                          filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length
                        }
                        onChange={toggleAll}
                        className="rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]"
                      />
                    </th>
                    <th
                      className={`w-[98px] px-3 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer whitespace-nowrap`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        DATE/TIME
                        <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB] shrink-0" strokeWidth={2} />
                      </div>
                    </th>
                    {cols.name && (
                      <th
                        className={`px-3 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer whitespace-nowrap`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          NAME
                          <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB] shrink-0" strokeWidth={2} />
                        </div>
                      </th>
                    )}
                    {cols.phone && (
                      <th
                        className={`w-[125px] px-3 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer whitespace-nowrap`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          PHONE
                          <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB] shrink-0" strokeWidth={2} />
                        </div>
                      </th>
                    )}
                    {cols.email && (
                      <th
                        className={`w-[165px] px-3 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer hidden lg:table-cell whitespace-nowrap`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          EMAIL
                          <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB] shrink-0" strokeWidth={2} />
                        </div>
                      </th>
                    )}
                    {cols.timeInStage && (
                      <th
                        className={`w-[140px] px-3 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer hidden lg:table-cell whitespace-nowrap`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          TIMER
                          <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB] shrink-0" strokeWidth={2} />
                        </div>
                      </th>
                    )}
                    {cols.closeDate && (
                      <th
                        className={`w-[105px] px-3 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer hidden xl:table-cell whitespace-nowrap`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          CLOSE DATE
                          <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB] shrink-0" strokeWidth={2} />
                        </div>
                      </th>
                    )}
                    {cols.stage && (
                      <th
                        className={`w-[155px] px-3 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer whitespace-nowrap`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          ACTION
                          <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB] shrink-0" strokeWidth={2} />
                        </div>
                      </th>
                    )}
                    <th className={`w-[130px] px-2 py-0 ${borderClass} whitespace-nowrap`}>
                      <div className="flex items-center justify-center">CONNECT</div>
                    </th>
                  </tr>
                </thead>

                {/* BODY */}
                <tbody className="text-[12.5px]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-[#9CA3AF]">
                        Loading data...
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-14 text-[#9CA3AF]">
                        <p className="text-sm font-semibold text-slate-600">
                          No leads match your current filter
                        </p>
                        {(searchQuery || statusFilter || selectedWebsiteTab !== "all") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter(null);
                              setSelectedWebsiteTab("all");
                            }}
                            className="mt-2 text-xs font-semibold text-[#7C3AED] hover:underline cursor-pointer"
                          >
                            Reset all filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const stage = STAGE_STYLE[lead.status] || STAGE_STYLE.NEW;
                      const colors = ["#FEE2E2", "#FEF3C7", "#D1FAE5", "#DBEAFE", "#EDE9FE"];
                      const char = (lead.fullName || "?").charAt(0).toUpperCase();
                      const idx = char.charCodeAt(0) % colors.length;
                      const logoBg = colors[idx];
                      const dateText = formatLeadDate(lead.createdAt);
                      const timeText = formatLeadTime(lead.createdAt);
                      const waUrl = formatWhatsAppUrl(lead.phone, lead.fullName, lead.website?.name);

                      const trHeightClass =
                        rowHeight === "compact"
                          ? "h-[40px]"
                          : rowHeight === "comfortable"
                          ? "h-[68px]"
                          : "h-[50px]";

                      return (
                        <tr
                          key={lead.id}
                          className={`${trHeightClass} border-b hover:bg-[#F7F5FF] transition-colors`}
                          style={{ borderColor: "#E8E4F3" }}
                        >
                          <td className={`px-3 py-0 border-r text-center ${borderClass}`}>
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.has(lead.id)}
                              onChange={() => toggleSelection(lead.id)}
                              className="rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer"
                            />
                          </td>
                          <td className={`px-3 py-1 border-r ${borderClass}`}>
                            <div className="font-bold text-[#1A1523] text-[11.5px] leading-tight">
                              {dateText}
                            </div>
                            <div className="text-[10.5px] text-[#6B7280] leading-none mt-0.5 font-medium">
                              {timeText}
                            </div>
                          </td>
                          {cols.name && (
                            <td
                              className={`px-3 py-1 border-r truncate ${borderClass} cursor-pointer`}
                              onClick={() => setInspectLead(lead)}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex items-center justify-center h-6 w-6 rounded text-[10px] font-bold text-[#1A1523] flex-shrink-0 shadow-sm"
                                  style={{ background: logoBg }}
                                >
                                  {char}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-[#1A1523] hover:text-[#7C3AED] truncate text-[12.8px] leading-tight">
                                    {lead.fullName}
                                  </div>
                                  <div className="text-[11px] text-[#6B7280] truncate leading-tight mt-0.5 flex items-center gap-1">
                                    <span>{lead.website?.name || lead.source || "Website Form"}</span>
                                    {(lead.emailSent || lead.smsSent || lead.pushSent) && (
                                      <>
                                        <span className="text-gray-300">•</span>
                                        <div
                                          className="flex items-center gap-1 bg-[#F7F5FF] px-1.5 py-0.5 rounded border border-[#E8E4F3]"
                                          title={`Alerts: ${[
                                            lead.emailSent ? "Email Sent" : null,
                                            lead.smsSent ? "SMS Sent" : null,
                                            lead.pushSent ? "Push Sent" : null,
                                          ]
                                            .filter(Boolean)
                                            .join(", ")}`}
                                        >
                                          {lead.emailSent && (
                                            <Mail className="h-2.5 w-2.5 text-emerald-600" />
                                          )}
                                          {lead.smsSent && (
                                            <Phone className="h-2.5 w-2.5 text-indigo-500" />
                                          )}
                                          {lead.pushSent && (
                                            <BellRing className="h-2.5 w-2.5 text-indigo-500" />
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}
                          {cols.phone && (
                            <td className={`px-3 py-0 border-r ${borderClass}`}>
                              <div className="font-semibold text-[#1A1523] text-[12.5px] truncate">
                                {lead.phone ? (
                                  lead.phone
                                ) : (
                                  <span className="text-[#9CA3AF] font-normal italic text-[11px]">
                                    No phone
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {cols.email && (
                            <td className={`px-3 py-0 border-r ${borderClass} hidden lg:table-cell`}>
                              <div className="font-medium text-[#1A1523] text-[12.5px] truncate">
                                {lead.email ? (
                                  lead.email
                                ) : (
                                  <span className="text-[#9CA3AF] font-normal italic text-[11px]">
                                    No email
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {cols.timeInStage && (
                            <td className={`px-3 py-1 border-r ${borderClass} hidden lg:table-cell`}>
                              <LiveTimer
                                createdAt={lead.createdAt}
                                status={lead.status}
                                nowMs={nowMs}
                              />
                            </td>
                          )}
                          {cols.closeDate && (
                            <td
                              className={`px-3 py-0 border-r font-medium text-[#1A1523] text-[12.5px] hidden xl:table-cell ${borderClass}`}
                            >
                              {dateText}
                            </td>
                          )}
                          {cols.stage && (
                            <td className={`px-2.5 py-0 border-r ${borderClass} bg-slate-50/30`}>
                              <StageSelector
                                lead={lead}
                                stageConfig={stage}
                                handleStatusChange={handleStatusChange}
                              />
                            </td>
                          )}
                          <td className="px-2 py-0">
                            <div className="flex items-center justify-center gap-1">
                              {lead.phone ? (
                                <a
                                  href={`tel:${lead.phone}`}
                                  onClick={() => setCallLogLead(lead)}
                                  className="w-7 h-7 rounded-lg bg-white border border-[#E8E4F3] hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center transition-all text-[#6B7280] shadow-sm"
                                  title="Call & Log"
                                >
                                  <Phone className="h-3 w-3" />
                                </a>
                              ) : (
                                <div className="w-7 h-7 rounded-lg border border-transparent flex items-center justify-center text-gray-200">
                                  <Phone className="h-3 w-3" />
                                </div>
                              )}
                              {waUrl ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-7 h-7 rounded-lg bg-white border border-[#E8E4F3] hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 flex items-center justify-center transition-all text-[#6B7280] shadow-sm"
                                  title="WhatsApp Message"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                              ) : (
                                <div className="w-7 h-7 rounded-lg border border-transparent flex items-center justify-center text-gray-200">
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </div>
                              )}
                              {lead.email ? (
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="w-7 h-7 rounded-lg bg-white border border-[#E8E4F3] hover:bg-[#F3F0FF] hover:border-[#7C3AED] hover:text-[#7C3AED] flex items-center justify-center transition-all text-[#6B7280] shadow-sm"
                                  title="Send Email"
                                >
                                  <Mail className="h-3 w-3" />
                                </a>
                              ) : (
                                <div className="w-7 h-7 rounded-lg border border-transparent flex items-center justify-center text-gray-200">
                                  <Mail className="h-3 w-3" />
                                </div>
                              )}
                              <button
                                onClick={() => setInspectLead(lead)}
                                className="w-7 h-7 rounded-lg bg-white border border-[#E8E4F3] hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 flex items-center justify-center transition-all text-[#6B7280] shadow-sm cursor-pointer"
                                title="Open Lead Command Drawer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ─── MOBILE CARD VIEW ─── */}
            <div className="md:hidden flex flex-col p-3 gap-3 bg-slate-50/50 min-h-full">
              {loading ? (
                <div className="text-center py-12 text-[#9CA3AF] text-sm">Loading data...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-[#9CA3AF] text-sm">No leads found.</div>
              ) : (
                filteredLeads.map((lead) => {
                  const stage = STAGE_STYLE[lead.status] || STAGE_STYLE.NEW;
                  const colors = ["#FEE2E2", "#FEF3C7", "#D1FAE5", "#DBEAFE", "#EDE9FE"];
                  const char = (lead.fullName || "?").charAt(0).toUpperCase();
                  const idx = char.charCodeAt(0) % colors.length;
                  const logoBg = colors[idx];
                  const dateText = formatLeadDate(lead.createdAt);
                  const timeText = formatLeadTime(lead.createdAt);
                  const waUrl = formatWhatsAppUrl(lead.phone, lead.fullName, lead.website?.name);

                  return (
                    <div
                      key={lead.id}
                      className="bg-white border border-[#E8E4F3] rounded-xl p-4 shadow-sm flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3" onClick={() => setInspectLead(lead)}>
                          <div
                            className="flex items-center justify-center h-10 w-10 rounded-lg text-[14px] font-bold text-[#1A1523] flex-shrink-0"
                            style={{ background: logoBg }}
                          >
                            {char}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#1A1523] truncate text-[14.5px]">
                              {lead.fullName}
                            </div>
                            <div className="text-[12px] text-slate-500 truncate mt-0.5">
                              {lead.phone || lead.email || "No contact info"}
                            </div>
                            <div className="text-[10.5px] text-[#7C3AED] font-semibold mt-1">
                              {lead.website?.name ? `${lead.website.name} • ` : ""}
                              {dateText} at {timeText}
                            </div>
                            <div className="mt-1.5 bg-slate-50 border border-slate-100 rounded-md p-2">
                              <LiveTimer
                                createdAt={lead.createdAt}
                                status={lead.status}
                                nowMs={nowMs}
                              />
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead.id)}
                          onChange={() => toggleSelection(lead.id)}
                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                        />
                      </div>

                      <div className="flex flex-col gap-2 relative">
                        <StageSelector
                          lead={lead}
                          stageConfig={stage}
                          handleStatusChange={handleStatusChange}
                          isMobile={true}
                        />
                      </div>

                      {/* Responsive 4-button Grid for Mobile: View, Call, WhatsApp, Email */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        <button
                          onClick={() => setInspectLead(lead)}
                          className="flex items-center justify-center gap-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-[11.5px] font-bold transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={() => setCallLogLead(lead)}
                            className="flex items-center justify-center gap-1 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-700 text-[11.5px] font-bold transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call
                          </a>
                        ) : (
                          <div className="flex items-center justify-center gap-1 py-2 bg-slate-50/50 border border-slate-100 rounded-lg text-slate-300 text-[11.5px] font-bold cursor-not-allowed">
                            <Phone className="h-3.5 w-3.5" /> Call
                          </div>
                        )}
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-1 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-700 text-[11.5px] font-bold transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> WA
                          </a>
                        ) : (
                          <div className="flex items-center justify-center gap-1 py-2 bg-slate-50/50 border border-slate-100 rounded-lg text-slate-300 text-[11.5px] font-bold cursor-not-allowed">
                            <MessageCircle className="h-3.5 w-3.5" /> WA
                          </div>
                        )}
                        {lead.email ? (
                          <a
                            href={`mailto:${lead.email}`}
                            className="flex items-center justify-center gap-1 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-purple-700 text-[11.5px] font-bold transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5" /> Email
                          </a>
                        ) : (
                          <div className="flex items-center justify-center gap-1 py-2 bg-slate-50/50 border border-slate-100 rounded-lg text-slate-300 text-[11.5px] font-bold cursor-not-allowed">
                            <Mail className="h-3.5 w-3.5" /> Email
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div className="h-20 w-full flex-shrink-0"></div>
            </div>
          </>
        )}
      </div>

      {/* ─── BULK ACTIONS BAR ─── */}
      {selectedLeadIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-max bg-[#1A1523] text-white px-3 sm:px-5 py-2 sm:py-3 rounded-full shadow-2xl flex items-center gap-3 sm:gap-6 z-50 border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-200 justify-center">
          <div className="flex items-center gap-2 border-r border-white/20 pr-3 sm:pr-6">
            <span className="flex items-center justify-center bg-[#7C3AED] text-white text-xs font-bold w-5 h-5 rounded-full">
              {selectedLeadIds.size}
            </span>
            <span className="text-[13px] font-medium hidden sm:inline">selected</span>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 text-[13px] font-medium">
            <BulkStatusDropdown
              selectedLeadIds={selectedLeadIds}
              handleStatusChange={handleStatusChange}
              setSelectedLeadIds={setSelectedLeadIds}
            />
            <button
              className="flex items-center gap-2 hover:bg-red-500/20 px-2 sm:px-3 py-1.5 rounded transition-colors text-red-400 hover:text-red-300 ml-1 sm:ml-2"
              onClick={handleBulkDelete}
            >
              <XCircle className="h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      )}

      {inspectLead && (
        <LeadDetailsModal
          lead={inspectLead}
          onClose={() => setInspectLead(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {callLogLead && (
        <CallLogModal
          leadName={callLogLead.fullName}
          onClose={() => setCallLogLead(null)}
          onSubmit={handleCallLogSubmit}
        />
      )}
    </div>
  );
}
