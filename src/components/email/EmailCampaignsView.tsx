"use client";

import { useState, useEffect } from "react";
import { Phone, Mail, CheckCircle2, ArrowRight, XCircle, Send, FileText, Clock, Users } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { EmailComposer } from "./EmailComposer";
import { EmailTemplatesTab } from "./EmailTemplatesTab";
import { EmailAutomationsTab } from "./EmailAutomationsTab";

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
  const [activeTab, setActiveTab] = useState<"leads" | "sent" | "drafts" | "templates" | "automations">("leads");
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/email/campaigns")
      .then(res => res.json())
      .then(data => {
        if(data.success) setCampaigns(data.campaigns);
      })
      .catch(console.error);
  }, [isComposerOpen]);

  // Filter out converted or lost leads for email campaigns
  const activeLeads = leads.filter(l => l.status !== "LOST");

  const sentCampaigns = campaigns.filter(c => c.status === "SENT");
  const draftCampaigns = campaigns.filter(c => c.status === "DRAFT");

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

  const renderTabs = () => (
    <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl w-fit border border-slate-200/50">
      <button 
        onClick={() => setActiveTab("leads")}
        className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${activeTab === "leads" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
      >
        Leads Directory
      </button>
      <button 
        onClick={() => setActiveTab("sent")}
        className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${activeTab === "sent" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
      >
        Sent Broadcasts
        <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md text-[10px]">{sentCampaigns.length}</span>
      </button>
      <button 
        onClick={() => setActiveTab("drafts")}
        className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${activeTab === "drafts" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
      >
        Drafts
        <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md text-[10px]">{draftCampaigns.length}</span>
      </button>
      <div className="w-px h-6 bg-slate-200 mx-1"></div>
      <button 
        onClick={() => setActiveTab("templates")}
        className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${activeTab === "templates" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
      >
        Templates & Design
      </button>
      <button 
        onClick={() => setActiveTab("automations")}
        className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${activeTab === "automations" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
      >
        Automations
      </button>
    </div>
  );

  const renderCampaignTable = (items: any[], type: "sent" | "draft") => (
    <div className={`bg-white rounded-2xl border ${borderClass} shadow-sm overflow-hidden flex-1 flex flex-col`}>
      <div className="overflow-x-auto flex-1 pb-24">
        <table className="w-full text-left whitespace-nowrap" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-white sticky top-0 z-10 shadow-sm">
            <tr className={`border-b ${borderClass} ${trHeightClass}`}>
              <th className={`w-[350px] px-6 py-0 border-r ${borderClass}`}>SUBJECT LINE</th>
              <th className={`w-[120px] px-4 py-0 border-r ${borderClass}`}>RECIPIENTS</th>
              {type === "sent" && <th className={`w-[120px] px-4 py-0 border-r ${borderClass}`}>OPEN RATE</th>}
              {type === "sent" && <th className={`w-[120px] px-4 py-0 border-r ${borderClass}`}>CLICK RATE</th>}
              <th className={`w-[200px] px-4 py-0 border-r ${borderClass}`}>{type === "sent" ? "SENT AT" : "CREATED"}</th>
              <th className={`w-[120px] px-4 py-0 border-r ${borderClass}`}>STATUS</th>
            </tr>
          </thead>
          <tbody className="text-[12.5px] divide-y divide-[#E8E4F3]">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-slate-500">
                  {type === "sent" ? <Send className="h-10 w-10 text-indigo-200 mx-auto mb-3" /> : <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />}
                  <p className="text-[15px] font-medium text-slate-700">No {type} campaigns</p>
                  <p className="text-[13px] mt-1">You haven't {type === "sent" ? "sent any email broadcasts" : "saved any drafts"} yet.</p>
                </td>
              </tr>
            ) : (
              items.map(campaign => (
                <tr key={campaign.id} className={`${trHeightClass} border-b hover:bg-[#F7F5FF] transition-colors group cursor-pointer`}>
                  <td className={`px-6 py-1 border-r ${borderClass}`}>
                    <div className="font-bold text-[#1A1523] text-[13px] truncate max-w-[300px]">
                      {campaign.subject || "(No Subject)"}
                    </div>
                  </td>
                  <td className={`px-4 py-1 border-r ${borderClass}`}>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {campaign._count?.recipients || 0} Leads
                    </div>
                  </td>
                  {type === "sent" && (
                    <td className={`px-4 py-1 border-r ${borderClass}`}>
                      <div className="font-semibold text-slate-700 text-[12px]">
                        {campaign._count?.recipients ? Math.round(((campaign.recipients?.filter((r: any) => r.openedAt).length || 0) / campaign._count.recipients) * 100) : 0}%
                      </div>
                    </td>
                  )}
                  {type === "sent" && (
                    <td className={`px-4 py-1 border-r ${borderClass}`}>
                      <div className="font-semibold text-slate-700 text-[12px]">
                        {campaign._count?.recipients ? Math.round(((campaign.recipients?.filter((r: any) => r.clickedAt).length || 0) / campaign._count.recipients) * 100) : 0}%
                      </div>
                    </td>
                  )}
                  <td className={`px-4 py-1 border-r ${borderClass}`}>
                    <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
                      <Clock className="h-3 w-3" />
                      {format(new Date(campaign.createdAt), "MMM d, yyyy h:mm a")}
                    </div>
                  </td>
                  <td className={`px-4 py-0 border-r ${borderClass}`}>
                    {type === "sent" ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold bg-emerald-50 w-fit px-2.5 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle2 className="h-3 w-3" /> Sent
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold bg-slate-100 w-fit px-2.5 py-0.5 rounded-full border border-slate-200">
                        <FileText className="h-3 w-3" /> Draft
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6 relative w-full h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1523] tracking-tight">Email Campaigns</h1>
          <p className="text-slate-500 text-sm mt-1">Select leads and send targeted broadcast emails.</p>
        </div>
        {renderTabs()}
      </div>

      {activeTab === "leads" && (
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
                            onChange={() => {}} 
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
                            <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#6B7280]">
                              <Mail className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{lead.email}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium bg-red-50 w-fit px-2 py-0.5 rounded-full border border-red-100">
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
      )}

      {activeTab === "sent" && renderCampaignTable(sentCampaigns, "sent")}
      {activeTab === "drafts" && renderCampaignTable(draftCampaigns, "draft")}
      {activeTab === "templates" && <EmailTemplatesTab />}
      {activeTab === "automations" && <EmailAutomationsTab />}

      {/* Floating Action Bar */}
      {activeTab === "leads" && selectedLeadIds.length > 0 && (
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
        selectedLeadIds={selectedLeadIds}
        onSent={() => {
           setSelectedLeadIds([]);
           setActiveTab("sent");
        }}
        onDraftSaved={() => {
           setSelectedLeadIds([]);
           setActiveTab("drafts");
        }}
      />
    </div>
  );
}
