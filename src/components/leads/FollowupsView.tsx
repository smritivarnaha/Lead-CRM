"use client";

import React, { useState } from "react";
import { format, formatDistanceToNow, addDays, addHours, isPast } from "date-fns";
import { Clock, Calendar, ChevronDown, Phone, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { updateLeadFollowup, updateLeadStatus } from "@/actions/leads";
import { LeadDetailsModal } from "./LeadDetailsModal";

const STAGE_STYLE: Record<string, any> = {
  NEW:         { label: "New Lead",      ring: "border-blue-500",   fill: "bg-transparent", text: "text-blue-500" },
  CONTACTED:   { label: "Contacted",     ring: "border-amber-500",  fill: "bg-transparent", text: "text-amber-500" }, 
  BUSY:        { label: "Busy / No Answer", ring: "border-slate-500", fill: "bg-transparent", text: "text-slate-500" },
  FOLLOW_UP:   { label: "Follow Up Later", ring: "border-orange-500", fill: "bg-transparent", text: "text-orange-500" },
  CONVERTED:   { label: "Converted",     ring: "border-green-500",  fill: "bg-green-500", text: "text-green-500" },
  LOST:        { label: "Junk / Lost",   ring: "border-red-500",    fill: "bg-red-500", text: "text-red-500" },
};

function FollowupTimeSelector({ lead, onUpdate }: { lead: any, onUpdate: (leadId: string, date: Date | null) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSetTime = async (hours: number) => {
    setIsOpen(false);
    const nextTime = addHours(new Date(), hours);
    onUpdate(lead.id, nextTime);
    
    // Optimistic toast
    toast.success(`Follow-up set for ${format(nextTime, "MMM d, h:mm a")}`);
    
    try {
      const res = await updateLeadFollowup(lead.id, nextTime);
      if (!res.success) throw new Error("Failed");
    } catch {
      toast.error("Failed to update follow-up time. Please try again.");
    }
  };

  const isOverdue = lead.followUpAt && isPast(new Date(lead.followUpAt));

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-[13px] font-medium w-full justify-between ${
          lead.followUpAt 
            ? isOverdue 
              ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {lead.followUpAt ? (
            isOverdue ? "Overdue" : formatDistanceToNow(new Date(lead.followUpAt), { addSuffix: true })
          ) : "Set Follow-up"}
        </div>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-1 z-50">
          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Snooze</div>
          <button onClick={() => handleSetTime(1)} className="w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 rounded-md text-slate-700">+ 1 Hour</button>
          <button onClick={() => handleSetTime(24)} className="w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 rounded-md text-slate-700">+ 1 Day (Tomorrow)</button>
          <button onClick={() => handleSetTime(24 * 3)} className="w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 rounded-md text-slate-700">+ 3 Days</button>
          <button onClick={() => handleSetTime(24 * 7)} className="w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 rounded-md text-slate-700">+ 1 Week</button>
        </div>
      )}
    </div>
  );
}

export function FollowupsView({ initialLeads }: { initialLeads: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const borderClass = "border-[#E8E4F3]";
  const trHeightClass = "h-[46px]";

  // Sort leads: Overdue first, then upcoming, then no follow-up date
  const sortedLeads = [...leads].sort((a, b) => {
    if (!a.followUpAt && !b.followUpAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (!a.followUpAt) return 1;
    if (!b.followUpAt) return -1;
    return new Date(a.followUpAt).getTime() - new Date(b.followUpAt).getTime();
  });

  const handleUpdateFollowup = (id: string, date: Date | null) => {
    setLeads(leads.map(l => l.id === id ? { ...l, followUpAt: date } : l));
  };

  const handleMarkResolved = async (leadId: string, terminalStatus: string) => {
    setLeads(leads.filter(l => l.id !== leadId));
    toast.success(`Lead marked as ${STAGE_STYLE[terminalStatus]?.label}`);
    await updateLeadStatus(leadId, terminalStatus);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1523] tracking-tight">Active Follow-ups</h1>
          <p className="text-slate-500 text-sm mt-1">Manage leads that require your attention and keep them moving.</p>
        </div>
      </div>

      <div className={`bg-white rounded-2xl border ${borderClass} shadow-sm overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-white sticky top-0 z-10">
              <tr className={`border-b ${borderClass} ${trHeightClass}`}>
                <th className={`w-[220px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF]`}>
                  <div className="flex items-center justify-between">LEAD</div>
                </th>
                <th className={`w-[200px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF]`}>
                  <div className="flex items-center justify-between">CONTACT</div>
                </th>
                <th className={`w-[155px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF]`}>
                  <div className="flex items-center justify-between">STATUS</div>
                </th>
                <th className={`w-[180px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF]`}>
                  <div className="flex items-center justify-between">NEXT FOLLOW-UP</div>
                </th>
                <th className={`w-[100px] px-0 py-0 ${borderClass}`}>
                  <div className="flex items-center justify-center">RESOLVE</div>
                </th>
              </tr>
            </thead>
            <tbody className="text-[12.5px] divide-y divide-[#E8E4F3]">
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
                    <p className="text-[15px] font-medium text-slate-700">All caught up!</p>
                    <p className="text-[13px] mt-1">No active leads require follow-up right now.</p>
                  </td>
                </tr>
              ) : (
                sortedLeads.map(lead => {
                  const stage = STAGE_STYLE[lead.status] || STAGE_STYLE.NEW;
                  return (
                    <tr key={lead.id} className={`${trHeightClass} border-b hover:bg-[#F7F5FF] transition-colors group`}>
                      <td className={`px-4 py-1 border-r ${borderClass}`}>
                        <button 
                          onClick={() => setSelectedLead(lead)}
                          className="font-bold text-[#1A1523] text-[12.5px] hover:text-[#7C3AED] transition-colors truncate block"
                        >
                          {lead.fullName}
                        </button>
                        <div className="text-[10.5px] text-[#9CA3AF] mt-0.5">
                          Added {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td className={`px-4 py-1 border-r ${borderClass}`}>
                        <div className="flex flex-col gap-0.5 text-[11.5px] text-[#6B7280]">
                          {lead.phone ? <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {lead.phone}</div> : <span className="text-[#9CA3AF] italic text-[11px]">No phone</span>}
                          {lead.email ? <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> <span className="truncate max-w-[150px]">{lead.email}</span></div> : <span className="text-[#9CA3AF] italic text-[11px]">No email</span>}
                        </div>
                      </td>
                      <td className={`px-4 py-0 border-r ${borderClass}`}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full border-2 ${stage.ring} ${stage.fill}`} />
                          <span className="font-semibold text-[#1A1523] text-[11.5px]">{stage.label}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-0 border-r ${borderClass}`}>
                        <FollowupTimeSelector lead={lead} onUpdate={handleUpdateFollowup} />
                      </td>
                      <td className={`px-4 py-0 ${borderClass}`}>
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleMarkResolved(lead.id, "CONVERTED")}
                            className="h-7 w-7 rounded border border-green-200 bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors"
                            title="Mark Converted"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleMarkResolved(lead.id, "LOST")}
                            className="h-7 w-7 rounded border border-red-200 bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                            title="Mark Junk/Lost"
                          >
                            <ArrowRight className="h-4 w-4 transform rotate-45" />
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
      </div>

      {selectedLead && (
        <LeadDetailsModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
