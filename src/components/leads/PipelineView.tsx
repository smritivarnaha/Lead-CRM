"use client";

import { useState, useEffect, useRef } from "react";
import { getLeads, getLeadsByWebsite, updateLeadStatus, logCallAction } from "@/actions/leads";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { CallLogModal } from "@/components/leads/CallLogModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
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

// --- Custom Stage Selector Component (Bug-Free) ---
function StageSelector({ lead, stageConfig, handleStatusChange, isMobile = false }: { lead: any, stageConfig: any, handleStatusChange: any, isMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button 
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(!open); }}
        className={`flex items-center outline-none cursor-pointer text-left transition-colors ${
          isMobile 
            ? "justify-between w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 p-2.5 rounded-lg" 
            : "gap-2.5 w-full hover:bg-white p-1.5 rounded"
        }`}
      >
        <div className={`flex items-center ${isMobile ? "gap-2.5" : "gap-2.5"}`}>
          <div className={`h-3.5 w-3.5 rounded-full border-2 ${stageConfig.ring} ${stageConfig.fill} shrink-0`} />
          <span className={`${isMobile ? "text-[13px] font-semibold text-slate-700" : "text-[#1A1523] font-medium truncate flex-1"}`}>{stageConfig.label}</span>
        </div>
        <ChevronDown className={`${isMobile ? "h-4 w-4 text-slate-400 shrink-0" : "h-3 w-3 text-[#9CA3AF] shrink-0"}`} />
      </button>

      {open && (
        <div className={`absolute left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-[100] p-1 flex flex-col gap-0.5 ${isMobile ? "w-full" : "w-48 top-full"}`}>
          <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">Update Status</div>
          {Object.entries(STAGE_STYLE).map(([statusKey, config]) => (
            <button 
              key={statusKey} 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleStatusChange(lead.id, statusKey);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 rounded cursor-pointer text-left transition-colors"
            >
              <div className={`h-3 w-3 rounded-full border-2 ${config.ring} ${config.fill} shrink-0`} />
              {config.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// ------------------------------------------------

export function PipelineView({ websiteId }: { websiteId?: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
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
    const fetchLeads = websiteId ? getLeadsByWebsite(websiteId) : getLeads();
    fetchLeads.then((res) => {
      if (res.success && res.leads) setLeads(res.leads);
      setLoading(false);
    });
  }, [websiteId]);

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

  const borderClass = "border-[#E5E7EB]";

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
        style={{ borderColor: "#E5E7EB", flexShrink: 0 }}
      >
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto pb-1 sm:pb-0">
          <button className="flex items-center justify-center w-7 h-7 text-[#9CA3AF] hover:text-[#1A1523] hover:bg-slate-100 rounded transition-colors">
            <ArrowRightToLine className="h-4 w-4" strokeWidth={2} />
          </button>
          
          <div className="h-4 w-px bg-[#E5E7EB]" />
          
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-semibold text-[#1A1523] hover:bg-[#F7F5FF] rounded transition-colors outline-none">
              <UsersIcon className="h-4 w-4 text-[#9CA3AF]" />
              {statusFilter ? STAGE_STYLE[statusFilter]?.label || "Filtered" : "All opportunities"}
              <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF] ml-1" strokeWidth={2} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setStatusFilter(null)} className={!statusFilter ? "font-bold" : ""}>All opportunities</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">By Stage</DropdownMenuLabel>
              {Object.entries(STAGE_STYLE).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)} className={statusFilter === key ? "font-bold" : ""}>
                  <div className={`h-2.5 w-2.5 rounded-full mr-2 ${config.fill === 'bg-transparent' ? config.ring + ' border' : config.fill}`} />
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[13px] font-medium text-[#6B7280]">
          {/* Workable Fields Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors py-1 px-2 rounded hover:bg-slate-50 outline-none">
              <Columns3 className="h-4 w-4" strokeWidth={1.75} /> Fields
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">Visible Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={cols.name} onCheckedChange={(v) => setCols(p => ({...p, name: v}))}>Name</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={cols.phone} onCheckedChange={(v) => setCols(p => ({...p, phone: v}))}>Phone Number</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={cols.email} onCheckedChange={(v) => setCols(p => ({...p, email: v}))}>Email Address</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={cols.timeInStage} onCheckedChange={(v) => setCols(p => ({...p, timeInStage: v}))}>Time in Stage</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={cols.stage} onCheckedChange={(v) => setCols(p => ({...p, stage: v}))}>Stage (Status)</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={cols.closeDate} onCheckedChange={(v) => setCols(p => ({...p, closeDate: v}))}>Close Date</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors py-1 px-2 rounded hover:bg-slate-50 outline-none">
              <Filter className="h-4 w-4" strokeWidth={1.75} /> Filters {statusFilter && <span className="flex h-2 w-2 rounded-full bg-[#7C3AED]"></span>}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">Quick Filters</DropdownMenuLabel>
              <DropdownMenuItem className="text-[13px]" onClick={() => setStatusFilter("NEW")}>Show New Leads</DropdownMenuItem>
              <DropdownMenuItem className="text-[13px]" onClick={() => setStatusFilter("HOT")}>Show Hot Leads</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[13px]" onClick={() => setStatusFilter(null)}>Clear all filters</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors py-1 px-2 rounded hover:bg-slate-50 outline-none">
              <AlignJustify className="h-4 w-4" strokeWidth={1.75} /> Row height
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem className={`text-[13px] ${rowHeight === 'compact' ? 'font-medium bg-slate-50' : ''}`} onClick={() => setRowHeight('compact')}>Compact</DropdownMenuItem>
              <DropdownMenuItem className={`text-[13px] ${rowHeight === 'standard' ? 'font-medium bg-slate-50' : ''}`} onClick={() => setRowHeight('standard')}>Standard</DropdownMenuItem>
              <DropdownMenuItem className={`text-[13px] ${rowHeight === 'comfortable' ? 'font-medium bg-slate-50' : ''}`} onClick={() => setRowHeight('comfortable')}>Comfortable</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors py-1 px-2 rounded hover:bg-slate-50 outline-none">
              <LayoutGrid className="h-4 w-4" strokeWidth={1.75} /> Layout
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem className={`text-[13px] ${viewMode === 'table' ? 'font-medium bg-slate-50' : ''}`} onClick={() => setViewMode('table')}>Table View</DropdownMenuItem>
              <DropdownMenuItem className={`text-[13px] ${viewMode === 'kanban' ? 'font-medium bg-slate-50' : ''}`} onClick={() => setViewMode('kanban')}>Kanban Board</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="flex-1 overflow-auto bg-white relative">
        {viewMode === "kanban" ? (
          <KanbanBoard leads={filteredLeads} onStatusChange={handleStatusChange} onInspect={setInspectLead} onCallLog={setCallLogLead} />
        ) : (
          <>
            {/* ─── DESKTOP TABLE VIEW ─── */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse" style={{ tableLayout: "fixed" }}>
                {/* HEADERS */}
                <thead className={`sticky top-0 bg-white z-10 border-b shadow-[0_1px_0_#E5E7EB]`}>
                  <tr className="h-[48px] text-[11.5px] font-semibold text-[#6B7280] uppercase tracking-wider">
                    <th className={`w-[56px] px-6 py-0 border-r ${borderClass} text-center font-normal`}>
                      <input 
                        type="checkbox" 
                        checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                        onChange={toggleAll}
                        className="rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" 
                      />
                    </th>
                    {cols.name && (
                      <th className={`w-[260px] px-5 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer`}>
                        <div className="flex items-center justify-between">NAME<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    {cols.phone && (
                      <th className={`w-[140px] px-5 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer`}>
                        <div className="flex items-center justify-between">PHONE<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    {cols.email && (
                      <th className={`w-[200px] px-5 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer hidden lg:table-cell`}>
                        <div className="flex items-center justify-between">EMAIL<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    {cols.timeInStage && (
                      <th className={`w-[120px] px-5 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer hidden lg:table-cell`}>
                        <div className="flex items-center justify-between">IN STAGE<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    {cols.stage && (
                      <th className={`w-[240px] px-5 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer`}>
                        <div className="flex items-center justify-between">STAGE<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    {cols.closeDate && (
                      <th className={`w-[120px] px-5 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer`}>
                        <div className="flex items-center justify-between">CLOSE DATE<ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} /></div>
                      </th>
                    )}
                    <th className={`w-[140px] px-0 py-0 ${borderClass}`}>
                      <div className="flex items-center justify-center">ACTIONS</div>
                    </th>
                  </tr>
                </thead>

                {/* BODY */}
                <tbody className="text-[13px]">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-12 text-[#9CA3AF]">Loading data...</td></tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-[#9CA3AF]">No leads found.</td></tr>
                  ) : filteredLeads.map((lead) => {
                    const stage = STAGE_STYLE[lead.status] || STAGE_STYLE.NEW;
                    const heat = HEAT_STYLE[lead.temperature] || HEAT_STYLE.WARM;
                    const score = getScore(lead);
                    
                    const colors = ["#FEE2E2", "#FEF3C7", "#D1FAE5", "#DBEAFE", "#EDE9FE"];
                    const char = lead.fullName.charAt(0).toUpperCase();
                    const idx = char.charCodeAt(0) % colors.length;
                    const logoBg = colors[idx];
                    
                    const trHeightClass = rowHeight === "compact" ? "h-[48px]" : rowHeight === "comfortable" ? "h-[80px]" : "h-[64px]";
                    
                    return (
                      <tr 
                        key={lead.id} 
                        className={`${trHeightClass} border-b hover:bg-[#F7F5FF] transition-colors`}
                        style={{ borderColor: "#E5E7EB" }}
                      >
                        <td className={`px-6 py-0 border-r text-center ${borderClass}`}>
                          <input 
                            type="checkbox" 
                            checked={selectedLeadIds.has(lead.id)}
                            onChange={() => toggleSelection(lead.id)}
                            className="rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer" 
                          />
                        </td>
                        {cols.name && (
                          <td className={`px-5 py-0 border-r truncate ${borderClass} cursor-pointer`} onClick={() => setInspectLead(lead)}>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-7 w-7 rounded-md text-[12px] font-bold text-[#1A1523] flex-shrink-0 shadow-sm" style={{ background: logoBg }}>
                                {char}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-[#1A1523] hover:text-[#7C3AED] truncate leading-tight">
                                  {lead.fullName}
                                </div>
                                <div className="text-[12px] text-[#6B7280] truncate leading-tight mt-0.5 flex items-center gap-1.5">
                                  <span>{lead.source || "Website Form"}</span>
                                  {(lead.smsSent || lead.pushSent) && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <div className="flex items-center gap-1 bg-[#F7F5FF] px-1.5 py-0.5 rounded border border-[#E8E4F3]" title="Alerts Sent">
                                        {lead.smsSent && <Phone className="h-3 w-3 text-indigo-500" />}
                                        {lead.pushSent && <BellRing className="h-3 w-3 text-indigo-500" />}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}
                        {cols.phone && (
                          <td className={`px-5 py-0 border-r ${borderClass}`}>
                            <div className="font-medium text-[#1A1523] truncate">
                              {lead.phone ? lead.phone : <span className="text-[#9CA3AF] font-normal italic">No phone</span>}
                            </div>
                          </td>
                        )}
                        {cols.email && (
                          <td className={`px-5 py-0 border-r ${borderClass} hidden lg:table-cell`}>
                            <div className="font-medium text-[#1A1523] truncate">
                              {lead.email ? lead.email : <span className="text-[#9CA3AF] font-normal italic">No email</span>}
                            </div>
                          </td>
                        )}
                        {cols.timeInStage && (
                          <td className={`px-5 py-0 border-r ${borderClass} hidden lg:table-cell`}>
                            <div className="flex items-center text-slate-600 font-medium">
                              <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                              {lead.updatedAt ? Math.max(0, Math.floor((new Date().getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 3600 * 24))) : 0} days
                            </div>
                          </td>
                        )}
                        {cols.stage && (
                          <td className={`px-5 py-0 border-r ${borderClass}`}>
                            <StageSelector lead={lead} stageConfig={stage} handleStatusChange={handleStatusChange} />
                          </td>
                        )}
                        {cols.closeDate && (
                          <td className={`px-5 py-0 border-r font-medium text-[#1A1523] ${borderClass}`}>
                            {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                        )}
                        <td className="px-5 py-0">
                          <div className="flex items-center justify-center gap-1.5">
                            {lead.email ? (
                              <a href={`mailto:${lead.email}`} className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F3F0FF] hover:border-[#7C3AED] hover:text-[#7C3AED] flex items-center justify-center transition-all text-[#6B7280] shadow-sm" title="Send Email">
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <div className="w-8 h-8 rounded-lg border border-transparent flex items-center justify-center text-gray-200"><Mail className="h-3.5 w-3.5" /></div>
                            )}
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} onClick={() => setCallLogLead(lead)} className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#ECFDF5] hover:border-[#10B981] hover:text-[#10B981] flex items-center justify-center transition-all text-[#6B7280] shadow-sm" title="Call Contact">
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <div className="w-8 h-8 rounded-lg border border-transparent flex items-center justify-center text-gray-200"><Phone className="h-3.5 w-3.5" /></div>
                            )}
                            <button onClick={() => setInspectLead(lead)} className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 flex items-center justify-center transition-all text-[#6B7280] shadow-sm" title="View Full Details">
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
                  <div key={lead.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3" onClick={() => setInspectLead(lead)}>
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg text-[14px] font-bold text-[#1A1523] flex-shrink-0" style={{ background: logoBg }}>
                          {char}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[#1A1523] truncate text-[15px]">{lead.fullName}</div>
                          <div className="text-[12px] text-slate-500 truncate mt-0.5">{lead.phone || lead.email || "No contact info"}</div>
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

                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={() => setInspectLead(lead)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-[13px] font-semibold transition-colors">
                        <Eye className="h-4 w-4" /> View
                      </button>
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} onClick={() => setCallLogLead(lead)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-700 text-[13px] font-semibold transition-colors">
                          <Phone className="h-4 w-4" /> Call
                        </a>
                      )}
                      {lead.email && !lead.phone && (
                        <a href={`mailto:${lead.email}`} className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-700 text-[13px] font-semibold transition-colors">
                          <Mail className="h-4 w-4" /> Email
                        </a>
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
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-white/10 px-2 sm:px-3 py-1.5 rounded transition-colors text-gray-200 hover:text-white outline-none">
                <ChevronDown className="h-4 w-4" /> <span className="hidden sm:inline">Update Status</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 bg-[#1A1523] text-white border-white/10">
                <DropdownMenuLabel className="text-xs text-gray-400">Set Status For {selectedLeadIds.size} Leads</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {Object.entries(STAGE_STYLE).map(([statusKey, config]) => (
                  <DropdownMenuItem 
                    key={statusKey} 
                    onClick={() => {
                      selectedLeadIds.forEach(id => handleStatusChange(id, statusKey));
                      setSelectedLeadIds(new Set());
                    }}
                    className="text-[13px] flex items-center gap-2 cursor-pointer focus:bg-white/10 focus:text-white"
                  >
                    <div className={`h-2.5 w-2.5 rounded-full ${config.fill === 'bg-transparent' ? config.ring + ' border' : config.fill}`} />
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button className="flex items-center gap-2 hover:bg-red-500/20 px-2 sm:px-3 py-1.5 rounded transition-colors text-red-400 hover:text-red-300 ml-1 sm:ml-2" onClick={() => toast("Bulk Delete feature coming soon!")}>
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
