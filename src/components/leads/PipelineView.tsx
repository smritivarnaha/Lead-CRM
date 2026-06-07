"use client";

import { useState, useEffect, useRef } from "react";
import { getLeads, getLeadsByWebsite, updateLeadStatus, logCallAction, bulkDeleteLeads } from "@/actions/leads";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { CallLogModal } from "@/components/leads/CallLogModal";
import {
  Filter,
  ArrowRightToLine,
  ChevronDown,
  Columns3,
  AlignJustify,
  Layers,
  MoreHorizontal,
  LayoutGrid,
  Mail,
  Phone,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  BellRing
} from "lucide-react";
import { toast } from "sonner";

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
  website?: { name: string };
  smsSent?: boolean;
  pushSent?: boolean;
  followUpAt?: string | null;
  callNotes?: string | null;
  updatedAt?: string;
};

const STAGE_STYLE: Record<string, { label: string; ring: string; fill: string; icon: any }> = {
  NEW:         { label: "New Lead",      ring: "border-blue-500",   fill: "bg-transparent",  icon: HelpCircle },
  CONTACTED:   { label: "Contacted",     ring: "border-amber-500",  fill: "bg-transparent",  icon: Clock }, 
  BUSY:        { label: "Busy / No Answer", ring: "border-slate-500", fill: "bg-transparent", icon: HelpCircle },
  FOLLOW_UP:   { label: "Follow Up Later", ring: "border-orange-500", fill: "bg-transparent",  icon: ArrowRight },
  CONVERTED:   { label: "Converted",     ring: "border-green-500",  fill: "bg-green-500",    icon: CheckCircle2 },
  LOST:        { label: "Junk / Lost",   ring: "border-red-500",    fill: "bg-red-500",      icon: XCircle },
};

// ─── HEAT/OHS CONFIG ───
const HEAT_STYLE: Record<string, { dot: string }> = {
  HOT:  { dot: "bg-[#10B981]" }, 
  WARM: { dot: "bg-[#F59E0B]" }, 
  COLD: { dot: "bg-[#EF4444]" }, 
};

function getScore(lead: Lead) {
  if (lead.score) return lead.score;
  if (lead.temperature === "HOT") return 88;
  if (lead.temperature === "WARM") return 56;
  return 24;
}

import { KanbanBoard } from "./KanbanBoard";

// --- Custom Stage / Action Selector Component ---
function StageSelector({ lead, stageConfig, handleStatusChange, isMobile = false }: { lead: any, stageConfig: any, handleStatusChange: any, isMobile?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, content: note })
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
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsOpen(!isOpen); }}
        className={`flex items-center justify-between w-full transition-all border group ${
          isMobile 
            ? "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 p-2.5 rounded-lg shadow-sm" 
            : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-md shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full border-2 ${stageConfig.ring} ${stageConfig.fill} shrink-0`} />
          <span className={`font-semibold ${isMobile ? "text-[14px] text-slate-800" : "text-[12px] text-slate-700 truncate"}`}>
            {stageConfig.label === "New" ? "Take Action" : stageConfig.label}
          </span>
        </div>
        <ChevronDown className={`text-slate-400 group-hover:text-slate-600 shrink-0 ${isMobile ? "h-4 w-4" : "h-3.5 w-3.5"}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-[100] bg-white border border-[#E8E4F3] shadow-[0_12px_40px_-15px_rgba(0,0,0,0.15)] rounded-2xl p-2.5 flex flex-col gap-2 ${
          isMobile ? "bottom-full left-0 w-full mb-2" : "right-0 top-full mt-2 w-[280px]"
        }`}>
          <div>
            <div className="px-1.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Update Status</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(STAGE_STYLE).map(([statusKey, config]: [string, any]) => (
                <button 
                  key={statusKey} 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleStatusChange(lead.id, statusKey);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 text-left rounded-lg transition-colors border ${
                    lead.status === statusKey 
                      ? "bg-[#F7F5FF] border-[#7C3AED]/30 text-[#1A1523] shadow-sm" 
                      : "bg-white border-transparent hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className={`h-2 w-2 rounded-full shrink-0 ${config.text.replace("text-", "bg-")}`} />
                  <span className="text-[11px] font-semibold truncate">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-[#E8E4F3] my-0.5" />
          
          <div>
            <div className="px-1.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Add Quick Note</div>
            <div className="flex flex-col gap-2 px-0.5">
              <textarea
                placeholder="Spoke with them about..."
                value={note}
                onChange={e => setNote(e.target.value)}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); saveNote(e as any); } }}
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
// ------------------------------------------------
// Custom Toolbar Dropdown Component
function ToolbarDropdown({ label, icon: Icon, children, isActive = false, indicator = false }: { label: React.ReactNode, icon: any, children: React.ReactNode, isActive?: boolean, indicator?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 py-1 px-2 rounded transition-colors outline-none ${isActive ? 'bg-[#F7F5FF] text-[#1A1523] font-semibold' : 'text-[#6B7280] hover:text-[#1A1523] hover:bg-slate-50'}`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} /> 
        {label}
        {indicator && <span className="flex h-2 w-2 rounded-full bg-[#7C3AED] ml-1"></span>}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[12rem] bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

// Custom Bulk Status Dropdown Component
function BulkStatusDropdown({ selectedLeadIds, handleStatusChange, setSelectedLeadIds }: { selectedLeadIds: Set<string>, handleStatusChange: any, setSelectedLeadIds: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className="flex items-center gap-2 hover:bg-white/10 px-2 sm:px-3 py-1.5 rounded transition-colors text-gray-200 hover:text-white outline-none"
      >
        <ChevronDown className="h-4 w-4" /> <span className="hidden sm:inline">Update Status</span>
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#1A1523] border border-white/10 rounded-lg shadow-xl z-50 py-1" onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/10">Set Status For {selectedLeadIds.size} Leads</div>
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
              <div className={`h-2.5 w-2.5 rounded-full ${config.fill === 'bg-transparent' ? config.ring + ' border' : config.fill}`} />
              {config.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// ------------------------------------------------

export function PipelineView({ websiteId, initialLeads }: { websiteId?: string; initialLeads?: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads || []);
  const [loading, setLoading] = useState(!initialLeads);
  const [inspectLead, setInspectLead] = useState<Lead | null>(null);
  const [callLogLead, setCallLogLead] = useState<Lead | null>(null);
  
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
  
  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedLeadIds.size} leads? This action cannot be undone.`)) return;

    try {
      const idsArray = Array.from(selectedLeadIds);
      const res = await bulkDeleteLeads(idsArray);
      if (res.success) {
        setLeads(prev => prev.filter(l => !selectedLeadIds.has(l.id)));
        toast.success(`Successfully deleted ${selectedLeadIds.size} leads.`);
        setSelectedLeadIds(new Set());
      } else {
        toast.error("Failed to delete leads.");
      }
    } catch (e) {
      toast.error("An error occurred while deleting leads.");
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (statusFilter === "HOT") {
      return lead.temperature === "HOT";
    } else if (statusFilter) {
      return lead.status === statusFilter;
    }
    return true;
  });

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const upcomingFollowUps = leads.filter(l => 
    l.status === 'FOLLOW_UP' && l.followUpAt && new Date(l.followUpAt) <= today
  ).sort((a, b) => new Date(a.followUpAt!).getTime() - new Date(b.followUpAt!).getTime());

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
        const matchingLead = leads.find(l => l.id === leadId);
        if (matchingLead) {
          setInspectLead(matchingLead);
          // Preserve other parameters but remove leadId
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
      // Optimistic update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      const res = await updateLeadStatus(leadId, newStatus);
      if (res.success) {
        toast.success("Lead status updated to " + (STAGE_STYLE[newStatus]?.label || newStatus));
      } else {
        toast.error("Failed to update status. Please do a hard refresh (Ctrl+R).");
        // Revert optimistic update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: prev.find(p => p.id === leadId)?.status || newStatus } : l));
      }
    } catch (e) {
      toast.error("Network sync failed. Please do a hard refresh (Ctrl+R) to get the latest app version.");
    }
  };

  const handleCallLogSubmit = async (status: string, notes: string, followUpAt: Date | null) => {
    if (!callLogLead) return;
    const leadId = callLogLead.id;
    setCallLogLead(null);
    
    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
      
      const res = await logCallAction(leadId, status, notes, followUpAt);
      if (res.success) {
        toast.success("Call logged successfully!");
        setLeads(prev => prev.map(l => l.id === leadId ? res.lead : l));
      } else {
        toast.error("Failed to log call. Please do a hard refresh (Ctrl+R).");
      }
    } catch (e) {
      toast.error("Network sync failed. Please do a hard refresh (Ctrl+R) to get the latest app version.");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedLeadIds.size === leads.length) setSelectedLeadIds(new Set());
    else setSelectedLeadIds(new Set(leads.map(l => l.id)));
  };

  const borderClass = "border-[#E8E4F3]";

  return (
    <div className="flex flex-col h-full w-full bg-white relative overflow-hidden">
      {/* ─── FOLLOW UPS BANNER ─── */}
      {upcomingFollowUps.length > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 sm:px-8 py-3 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-orange-900 leading-tight">
                {upcomingFollowUps.length} {upcomingFollowUps.length === 1 ? 'lead needs' : 'leads need'} follow-up today
              </h3>
              <p className="text-[12px] text-orange-700">Don't lose these gems! Give them a quick call.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pb-1 sm:pb-0">
            {upcomingFollowUps.slice(0, 3).map(lead => (
              <button 
                key={lead.id} 
                onClick={() => setCallLogLead(lead)}
                className="flex items-center gap-2 bg-white border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 group shadow-sm"
              >
                <div className="flex items-center justify-center h-5 w-5 rounded-md bg-orange-100 text-[10px] font-bold text-orange-700">
                  {lead.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-[12px] font-bold text-orange-900 group-hover:text-orange-700 leading-tight truncate max-w-[100px]">{lead.fullName}</div>
                  <div className="text-[10px] text-orange-600 font-medium">
                    {new Date(lead.followUpAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </button>
            ))}
            {upcomingFollowUps.length > 3 && (
              <div className="text-[12px] font-bold text-orange-700 px-2">+{upcomingFollowUps.length - 3} more</div>
            )}
          </div>
        </div>
      )}

      {/* ─── TOOLBAR ─── */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 py-3 bg-white border-b gap-3 sm:gap-0"
        style={{ borderColor: "#E8E4F3", flexShrink: 0 }}
      >
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto pb-1 sm:pb-0">
          <button className="flex items-center justify-center w-7 h-7 text-[#9CA3AF] hover:text-[#1A1523] hover:bg-slate-100 rounded transition-colors">
            <ArrowRightToLine className="h-4 w-4" strokeWidth={2} />
          </button>
          
          <div className="h-4 w-px bg-[#E8E4F3]" />
          
          <ToolbarDropdown 
            label={statusFilter ? STAGE_STYLE[statusFilter]?.label || "Filtered" : "All opportunities"} 
            icon={UsersIcon} 
            isActive={true}
          >
            <button className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${!statusFilter ? "font-bold text-indigo-600 bg-[#F7F5FF] text-[#7C3AED]" : "text-slate-700"}`} onClick={() => setStatusFilter(null)}>
              All opportunities
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">By Stage</div>
            {Object.entries(STAGE_STYLE).map(([key, config]) => (
              <button 
                key={key} 
                className={`w-full flex items-center px-3 py-1.5 text-[13px] hover:bg-slate-50 ${statusFilter === key ? "font-bold text-slate-900" : "text-slate-700"}`}
                onClick={() => setStatusFilter(key)}
              >
                <div className={`h-2.5 w-2.5 rounded-full mr-2 shrink-0 ${config.fill === 'bg-transparent' ? config.ring + ' border' : config.fill}`} />
                <span className="truncate">{config.label}</span>
              </button>
            ))}
          </ToolbarDropdown>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[13px] font-medium text-[#6B7280]">
          {/* Workable Fields Dropdown */}
          <ToolbarDropdown label="Fields" icon={Columns3}>
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Visible Columns</div>
            <div className="h-px bg-slate-100 my-1" />
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" checked={cols.name} onChange={(e) => setCols(p => ({...p, name: e.target.checked}))} /> Name
            </label>
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" checked={cols.phone} onChange={(e) => setCols(p => ({...p, phone: e.target.checked}))} /> Phone Number
            </label>
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" checked={cols.email} onChange={(e) => setCols(p => ({...p, email: e.target.checked}))} /> Email Address
            </label>
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" checked={cols.timeInStage} onChange={(e) => setCols(p => ({...p, timeInStage: e.target.checked}))} /> Time in Stage
            </label>
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" checked={cols.stage} onChange={(e) => setCols(p => ({...p, stage: e.target.checked}))} /> Stage (Status)
            </label>
            <label className="flex items-center px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" className="mr-2 rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" checked={cols.closeDate} onChange={(e) => setCols(p => ({...p, closeDate: e.target.checked}))} /> Close Date
            </label>
          </ToolbarDropdown>

          <ToolbarDropdown label="Filters" icon={Filter} indicator={!!statusFilter}>
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Filters</div>
            <button className="w-full text-left px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50" onClick={() => setStatusFilter("NEW")}>Show New Leads</button>
            <button className="w-full text-left px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50" onClick={() => setStatusFilter("HOT")}>Show Hot Leads</button>
            <div className="h-px bg-slate-100 my-1" />
            <button className="w-full text-left px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50" onClick={() => setStatusFilter(null)}>Clear all filters</button>
          </ToolbarDropdown>

          <ToolbarDropdown label="Row height" icon={AlignJustify}>
            <button className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${rowHeight === 'compact' ? 'font-medium text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`} onClick={() => setRowHeight('compact')}>Compact</button>
            <button className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${rowHeight === 'standard' ? 'font-medium text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`} onClick={() => setRowHeight('standard')}>Standard</button>
            <button className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${rowHeight === 'comfortable' ? 'font-medium text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`} onClick={() => setRowHeight('comfortable')}>Comfortable</button>
          </ToolbarDropdown>

          <ToolbarDropdown label="Layout" icon={LayoutGrid}>
            <button className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${viewMode === 'table' ? 'font-medium text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`} onClick={() => setViewMode('table')}>Table View</button>
            <button className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-slate-50 ${viewMode === 'kanban' ? 'font-medium text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`} onClick={() => setViewMode('kanban')}>Kanban Board</button>
          </ToolbarDropdown>
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="flex-1 overflow-auto bg-white relative min-h-[500px] pb-48">
        {viewMode === "kanban" ? (
          <KanbanBoard leads={filteredLeads} onStatusChange={handleStatusChange} onInspect={setInspectLead} onCallLog={setCallLogLead} />
        ) : (
          <>
            {/* ─── DESKTOP TABLE VIEW ─── */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse" style={{ tableLayout: "fixed" }}>
                {/* HEADERS */}
                <thead className={`sticky top-0 bg-[#F7F5FF] z-10 border-b border-[#E8E4F3] shadow-[0_1px_0_#E8E4F3]`}>
                  <tr className="h-[40px] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                    <th className={`w-[40px] px-4 py-0 border-r ${borderClass} text-center font-normal`}>
                      <input 
                        type="checkbox" 
                        checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                        onChange={toggleAll}
                        className="rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" 
                      />
                    </th>
                    <th className={`w-[75px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer`}>
                      <div className="flex items-center justify-between">DATE/TIME<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                    </th>
                    {cols.name && (
                      <th className={`w-[170px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer`}>
                        <div className="flex items-center justify-between">NAME<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    {cols.phone && (
                      <th className={`w-[110px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer`}>
                        <div className="flex items-center justify-between">PHONE<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    {cols.email && (
                      <th className={`w-[160px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer hidden lg:table-cell`}>
                        <div className="flex items-center justify-between">EMAIL<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    {cols.timeInStage && (
                      <th className={`w-[95px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer hidden lg:table-cell`}>
                        <div className="flex items-center justify-between">IN STAGE<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    {cols.closeDate && (
                      <th className={`w-[90px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer`}>
                        <div className="flex items-center justify-between">CLOSE DATE<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    {cols.stage && (
                      <th className={`w-[170px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF] cursor-pointer`}>
                        <div className="flex items-center justify-between">ACTION<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    <th className={`w-[100px] px-0 py-0 ${borderClass}`}>
                      <div className="flex items-center justify-center">ACTIONS</div>
                    </th>
                  </tr>
                </thead>

                {/* BODY */}
                <tbody className="text-[12.5px]">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-12 text-[#9CA3AF]">Loading data...</td></tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-[#9CA3AF]">No leads found.</td></tr>
                  ) : filteredLeads.map((lead) => {
                    const stage = STAGE_STYLE[lead.status] || STAGE_STYLE.NEW;
                    const heat = HEAT_STYLE[lead.temperature] || HEAT_STYLE.WARM;
                    const score = getScore(lead);
                    
                    const colors = ["#FEE2E2", "#FEF3C7", "#D1FAE5", "#DBEAFE", "#EDE9FE"];
                    const char = lead.fullName.charAt(0).toUpperCase();
                    const idx = char.charCodeAt(0) % colors.length;
                    const logoBg = colors[idx];
                    
                    const trHeightClass = rowHeight === "compact" ? "h-[40px]" : rowHeight === "comfortable" ? "h-[68px]" : "h-[50px]";
                    
                    return (
                      <tr 
                        key={lead.id} 
                        className={`${trHeightClass} border-b hover:bg-[#F7F5FF] transition-colors`}
                        style={{ borderColor: "#E8E4F3" }}
                      >
                        <td className={`px-4 py-0 border-r text-center ${borderClass}`}>
                          <input 
                            type="checkbox" 
                            checked={selectedLeadIds.has(lead.id)}
                            onChange={() => toggleSelection(lead.id)}
                            className="rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer" 
                          />
                        </td>
                        <td className={`px-4 py-1 border-r ${borderClass}`}>
                          <div className="font-bold text-[#1A1523] text-[11.5px] leading-tight">
                            {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                          <div className="text-[10.5px] text-[#6B7280] leading-none mt-0.5 font-medium">
                            {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        {cols.name && (
                          <td className={`px-4 py-1 border-r truncate ${borderClass} cursor-pointer`} onClick={() => setInspectLead(lead)}>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center h-6 w-6 rounded text-[10px] font-bold text-[#1A1523] flex-shrink-0 shadow-sm" style={{ background: logoBg }}>
                                {char}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[#1A1523] hover:text-[#7C3AED] truncate text-[12.8px] leading-tight">
                                  {lead.fullName}
                                </div>
                                <div className="text-[11px] text-[#6B7280] truncate leading-tight mt-0.5 flex items-center gap-1">
                                  <span>{lead.source || "Website Form"}</span>
                                  {(lead.smsSent || lead.pushSent) && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <div className="flex items-center gap-0.5 bg-[#F7F5FF] px-1 py-0.2 rounded border border-[#E8E4F3]" title="Alerts Sent">
                                        {lead.smsSent && <Phone className="h-2.5 w-2.5 text-indigo-500" />}
                                        {lead.pushSent && <BellRing className="h-2.5 w-2.5 text-indigo-500" />}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}
                        {cols.phone && (
                          <td className={`px-4 py-0 border-r ${borderClass}`}>
                            <div className="font-semibold text-[#1A1523] text-[12.5px] truncate">
                              {lead.phone ? lead.phone : <span className="text-[#9CA3AF] font-normal italic text-[11px]">No phone</span>}
                            </div>
                          </td>
                        )}
                        {cols.email && (
                          <td className={`px-4 py-0 border-r ${borderClass} hidden lg:table-cell`}>
                            <div className="font-medium text-[#1A1523] text-[12.5px] truncate">
                              {lead.email ? lead.email : <span className="text-[#9CA3AF] font-normal italic text-[11px]">No email</span>}
                            </div>
                          </td>
                        )}
                        {cols.timeInStage && (
                          <td className={`px-4 py-0 border-r ${borderClass} hidden lg:table-cell`}>
                            <div className="flex items-center text-slate-600 font-medium text-[12px]">
                              <Clock className="w-3 h-3 mr-1 text-slate-400" />
                              {lead.updatedAt ? Math.max(0, Math.floor((new Date().getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 3600 * 24))) : 0}d
                            </div>
                          </td>
                        )}
                        {cols.closeDate && (
                          <td className={`px-4 py-0 border-r font-medium text-[#1A1523] text-[12.5px] ${borderClass}`}>
                            {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                        )}
                        {cols.stage && (
                          <td className={`px-4 py-0 border-r ${borderClass} bg-slate-50/30`}>
                            <StageSelector lead={lead} stageConfig={stage} handleStatusChange={handleStatusChange} />
                          </td>
                        )}
                        <td className="px-4 py-0">
                          <div className="flex items-center justify-center gap-1">
                            {lead.email ? (
                              <a href={`mailto:${lead.email}`} className="w-7 h-7 rounded-lg bg-white border border-[#E8E4F3] hover:bg-[#F3F0FF] hover:border-[#7C3AED] hover:text-[#7C3AED] flex items-center justify-center transition-all text-[#6B7280] shadow-sm" title="Send Email">
                                <Mail className="h-3 w-3" />
                              </a>
                            ) : (
                              <div className="w-7 h-7 rounded-lg border border-transparent flex items-center justify-center text-gray-200"><Mail className="h-3 w-3" /></div>
                            )}
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} onClick={() => setCallLogLead(lead)} className="w-7 h-7 rounded-lg bg-white border border-[#E8E4F3] hover:bg-[#ECFDF5] hover:border-[#10B981] hover:text-[#10B981] flex items-center justify-center transition-all text-[#6B7280] shadow-sm" title="Call Contact">
                                <Phone className="h-3 w-3" />
                              </a>
                            ) : (
                              <div className="w-7 h-7 rounded-lg border border-transparent flex items-center justify-center text-gray-200"><Phone className="h-3 w-3" /></div>
                            )}
                            <button onClick={() => setInspectLead(lead)} className="w-7 h-7 rounded-lg bg-white border border-[#E8E4F3] hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 flex items-center justify-center transition-all text-[#6B7280] shadow-sm" title="View Full Details">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── MOBILE CARD VIEW ─── */}
            <div className="md:hidden flex flex-col p-3 gap-3 bg-slate-50/50 min-h-full">
              {loading ? (
                <div className="text-center py-12 text-[#9CA3AF] text-sm">Loading data...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-[#9CA3AF] text-sm">No leads found.</div>
              ) : filteredLeads.map((lead) => {
                const stage = STAGE_STYLE[lead.status] || STAGE_STYLE.NEW;
                const colors = ["#FEE2E2", "#FEF3C7", "#D1FAE5", "#DBEAFE", "#EDE9FE"];
                const char = lead.fullName.charAt(0).toUpperCase();
                const idx = char.charCodeAt(0) % colors.length;
                const logoBg = colors[idx];
                
                return (
                  <div key={lead.id} className="bg-white border border-[#E8E4F3] rounded-xl p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3" onClick={() => setInspectLead(lead)}>
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg text-[14px] font-bold text-[#1A1523] flex-shrink-0" style={{ background: logoBg }}>
                          {char}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[#1A1523] truncate text-[14.5px]">{lead.fullName}</div>
                          <div className="text-[12px] text-slate-500 truncate mt-0.5">{lead.phone || lead.email || "No contact info"}</div>
                          {/* Mobile Date/Time display */}
                          <div className="text-[10.5px] text-[#7C3AED] font-semibold mt-1">
                            Submitted: {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      <StageSelector lead={lead} stageConfig={stage} handleStatusChange={handleStatusChange} isMobile={true} />
                    </div>

                    {/* Responsive Grid for all options */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button onClick={() => setInspectLead(lead)} className="flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-[12px] font-bold transition-colors">
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} onClick={() => setCallLogLead(lead)} className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-700 text-[12px] font-bold transition-colors">
                           <Phone className="h-3.5 w-3.5" /> Call
                        </a>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 py-2 bg-slate-50/50 border border-slate-100 rounded-lg text-slate-300 text-[12px] font-bold cursor-not-allowed">
                           <Phone className="h-3.5 w-3.5" /> Call
                        </div>
                      )}
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="flex items-center justify-center gap-1.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-700 text-[12px] font-bold transition-colors">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </a>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 py-2 bg-slate-50/50 border border-slate-100 rounded-lg text-slate-300 text-[12px] font-bold cursor-not-allowed">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Spacer for mobile bottom nav */}
              <div className="h-20 w-full flex-shrink-0"></div>
            </div>
          </>
        )}
      </div>

      {/* ─── BULK ACTIONS BAR ─── */}
      {selectedLeadIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-max bg-[#1A1523] text-white px-3 sm:px-5 py-2 sm:py-3 rounded-full shadow-2xl flex items-center gap-3 sm:gap-6 z-50 border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-200 justify-center">
          <div className="flex items-center gap-2 border-r border-white/20 pr-3 sm:pr-6">
            <span className="flex items-center justify-center bg-[#7C3AED] text-white text-xs font-bold w-5 h-5 rounded-full">{selectedLeadIds.size}</span>
            <span className="text-[13px] font-medium hidden sm:inline">selected</span>
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-1 text-[13px] font-medium">
            <button className="flex items-center gap-2 hover:bg-white/10 px-2 sm:px-3 py-1.5 rounded transition-colors text-gray-200 hover:text-white" onClick={() => toast("Bulk Email feature coming soon!")}>
              <Mail className="h-4 w-4" /> <span className="hidden sm:inline">Email All</span>
            </button>
            <button className="flex items-center gap-2 hover:bg-white/10 px-2 sm:px-3 py-1.5 rounded transition-colors text-gray-200 hover:text-white" onClick={() => toast("Bulk SMS feature coming soon!")}>
              <Phone className="h-4 w-4" /> <span className="hidden sm:inline">SMS All</span>
            </button>
            <BulkStatusDropdown 
              selectedLeadIds={selectedLeadIds} 
              handleStatusChange={handleStatusChange} 
              setSelectedLeadIds={setSelectedLeadIds} 
            />
            <button className="flex items-center gap-2 hover:bg-red-500/20 px-2 sm:px-3 py-1.5 rounded transition-colors text-red-400 hover:text-red-300 ml-1 sm:ml-2" onClick={handleBulkDelete}>
              <XCircle className="h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      )}

      {inspectLead && (
        <LeadDetailsModal lead={inspectLead} onClose={() => setInspectLead(null)} />
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

// Dummy icon
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
