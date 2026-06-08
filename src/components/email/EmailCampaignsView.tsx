"use client";

import { useState } from "react";
import { Phone, Mail, CheckCircle2, ArrowRight, XCircle, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EmailComposer } from "./EmailComposer";

const STAGE_STYLE: Record<string, { label: string; ring: string; fill: string; text?: string }> = {
  NEW:         { label: "New Lead",      ring: "border-blue-500",   fill: "bg-transparent", text: "text-blue-500" },
  CONTACTED:   { label: "Contacted",     ring: "border-amber-500",  fill: "bg-transparent", text: "text-amber-500" }, 
  NO_RESPONSE: { label: "No Response",   ring: "border-red-500",    fill: "bg-transparent", text: "text-red-500" },
  FOLLOW_UP:   { label: "Follow Up Later",ring: "border-orange-500", fill: "bg-transparent", text: "text-orange-500" },
  CONVERTED:   { label: "Converted",     ring: "border-emerald-500",fill: "bg-emerald-500", text: "text-emerald-500" },
  LOST:        { label: "Junk / Lost",   ring: "border-red-500",    fill: "bg-red-500",     text: "text-red-500" },
};

export function EmailCampaignsView({ initialLeads }: { initialLeads: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Filter out converted or lost leads for email campaigns
  const activeLeads = leads.filter(l => l.status !== "LOST");

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === activeLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(activeLeads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter(leadId => leadId !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  const borderClass = "border-[#E8E4F3]";
  const trHeightClass = "h-[46px]";

  return (
    <div className="flex flex-col h-full gap-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1523] tracking-tight">Email Campaigns</h1>
          <p className="text-slate-500 text-sm mt-1">Select leads and send targeted broadcast emails.</p>
        </div>
      </div>

      <div className={`bg-white rounded-2xl border ${borderClass} shadow-sm overflow-hidden flex-1 flex flex-col`}>
        <div className="overflow-x-auto flex-1 pb-24">
          <table className="w-full text-left whitespace-nowrap" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-white sticky top-0 z-10 shadow-sm">
              <tr className={`border-b ${borderClass} ${trHeightClass}`}>
                <th className={`w-[40px] px-4 py-0 border-r ${borderClass}`}>
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="rounded-sm border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                      checked={activeLeads.length > 0 && selectedLeadIds.length === activeLeads.length}
                      onChange={toggleSelectAll}
                    />
                  </div>
                </th>
                <th className={`w-[220px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF]`}>
                  <div className="flex items-center justify-between">LEAD</div>
                </th>
                <th className={`w-[250px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF]`}>
                  <div className="flex items-center justify-between">EMAIL ADDRESS</div>
                </th>
                <th className={`w-[155px] px-4 py-0 border-r ${borderClass} hover:bg-[#F3F0FF]`}>
                  <div className="flex items-center justify-between">STATUS</div>
                </th>
              </tr>
            </thead>
            <tbody className="text-[12.5px] divide-y divide-[#E8E4F3]">
              {activeLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                    <Mail className="h-10 w-10 text-indigo-200 mx-auto mb-3" />
                    <p className="text-[15px] font-medium text-slate-700">No leads found</p>
                    <p className="text-[13px] mt-1">You don't have any active leads to email.</p>
                  </td>
                </tr>
              ) : (
                activeLeads.map(lead => {
                  const stage = STAGE_STYLE[lead.status] || STAGE_STYLE.NEW;
                  const hasEmail = Boolean(lead.email);
                  return (
                    <tr 
                      key={lead.id} 
                      className={`${trHeightClass} border-b transition-colors group cursor-pointer ${
                        selectedLeadIds.includes(lead.id) ? "bg-[#F3F0FF]" : "hover:bg-[#F7F5FF]"
                      }`}
                      onClick={() => toggleSelectLead(lead.id)}
                    >
                      <td className={`px-4 py-0 border-r text-center ${borderClass}`}>
                        <input 
                          type="checkbox" 
                          className="rounded-sm border-slate-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => {}} // Handled by tr onClick
                        />
                      </td>
                      <td className={`px-4 py-1 border-r ${borderClass}`}>
                        <div className="font-bold text-[#1A1523] text-[12.5px] truncate block">
                          {lead.fullName}
                        </div>
                        <div className="text-[10.5px] text-[#9CA3AF] mt-0.5">
                          Added {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td className={`px-4 py-1 border-r ${borderClass}`}>
                        {hasEmail ? (
                          <div className="flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
                            <Mail className="h-3.5 w-3.5 text-indigo-400" />
                            {lead.email}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11.5px] text-red-400 font-medium bg-red-50 w-fit px-2 py-0.5 rounded-full border border-red-100">
                            <XCircle className="h-3 w-3" /> No email
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-0 border-r ${borderClass}`}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full border-2 ${stage.ring} ${stage.fill}`} />
                          <span className="font-semibold text-[#1A1523] text-[11.5px]">{stage.label}</span>
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

      {/* Floating Action Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1523]/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] flex items-center gap-5 z-40 border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-white">
              {selectedLeadIds.length} Leads Selected
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Ready to broadcast</span>
          </div>
          
          <div className="h-8 w-px bg-white/20" />
          
          <button 
            onClick={() => setIsComposerOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 px-5 py-2.5 rounded-xl transition-all shadow-lg text-[13px] font-bold tracking-wide active:scale-95"
          >
            <Send className="h-4 w-4" /> 
            Compose Email
          </button>
        </div>
      )}

      {/* Composer Modal */}
      <EmailComposer 
        isOpen={isComposerOpen} 
        onClose={() => setIsComposerOpen(false)} 
        selectedCount={selectedLeadIds.length}
      />
    </div>
  );
}
