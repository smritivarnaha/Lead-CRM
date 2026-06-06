"use client";

import { useState, useEffect } from "react";
import { getLeads } from "@/actions/leads";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
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
  Eye
} from "lucide-react";

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
};

// ─── STAGE CONFIG ───
const STAGE_STYLE: Record<string, { label: string; ring: string; fill: string }> = {
  NEW:         { label: "Prospecting",   ring: "border-[#7C3AED]", fill: "bg-transparent" },
  CONTACTED:   { label: "Requirement",   ring: "border-[#7C3AED]", fill: "bg-transparent" }, 
  FOLLOW_UP:   { label: "Negotiation",   ring: "border-[#7C3AED]", fill: "bg-transparent" },
  CONVERTED:   { label: "Technical win", ring: "border-[#7C3AED]", fill: "bg-[#7C3AED]" },
  LOST:        { label: "Closed lost",   ring: "border-[#9CA3AF]", fill: "bg-[#9CA3AF]" },
  NO_RESPONSE: { label: "No response",   ring: "border-[#9CA3AF]", fill: "bg-transparent" },
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

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectLead, setInspectLead] = useState<Lead | null>(null);

  useEffect(() => {
    getLeads().then((res) => {
      if (res.success && res.leads) setLeads(res.leads);
      setLoading(false);
    });
  }, []);

  const borderClass = "border-[#E5E7EB]"; // Darker borders

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* ─── TOOLBAR ─── */}
      <div 
        className="flex items-center justify-between px-4 py-2 bg-white border-b"
        style={{ borderColor: "#E5E7EB", flexShrink: 0 }}
      >
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center w-7 h-7 text-[#9CA3AF] hover:text-[#1A1523] hover:bg-slate-100 rounded transition-colors">
            <ArrowRightToLine className="h-4 w-4" strokeWidth={2} />
          </button>
          
          <div className="h-4 w-px bg-[#E5E7EB]" />
          
          <button className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-semibold text-[#1A1523] hover:bg-[#F7F5FF] rounded transition-colors">
            <UsersIcon className="h-4 w-4 text-[#9CA3AF]" />
            All opportunities
            <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF] ml-1" strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center gap-4 text-[13px] font-medium text-[#6B7280]">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors py-1 px-2 rounded hover:bg-slate-50 outline-none">
              <Columns3 className="h-4 w-4" strokeWidth={1.75} /> Fields
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">Visible Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[13px]"><input type="checkbox" checked readOnly className="mr-2" /> Name</DropdownMenuItem>
              <DropdownMenuItem className="text-[13px]"><input type="checkbox" checked readOnly className="mr-2" /> OHS Score</DropdownMenuItem>
              <DropdownMenuItem className="text-[13px]"><input type="checkbox" checked readOnly className="mr-2" /> Contact Info</DropdownMenuItem>
              <DropdownMenuItem className="text-[13px]"><input type="checkbox" checked readOnly className="mr-2" /> Stage</DropdownMenuItem>
              <DropdownMenuItem className="text-[13px]"><input type="checkbox" checked readOnly className="mr-2" /> Close Date</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors py-1 px-2 rounded hover:bg-slate-50 outline-none">
              <Filter className="h-4 w-4" strokeWidth={1.75} /> Filters
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem className="text-[13px]">Status is any of...</DropdownMenuItem>
              <DropdownMenuItem className="text-[13px]">Source equals...</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[13px] text-[#7C3AED] font-medium">+ Add filter</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors py-1 px-2 rounded hover:bg-slate-50 outline-none">
              <AlignJustify className="h-4 w-4" strokeWidth={1.75} /> Row height
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem className="text-[13px]">Compact</DropdownMenuItem>
              <DropdownMenuItem className="text-[13px] font-medium bg-slate-50">Standard</DropdownMenuItem>
              <DropdownMenuItem className="text-[13px]">Comfortable</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors py-1 px-2 rounded hover:bg-slate-50 outline-none">
            <Layers className="h-4 w-4" strokeWidth={1.75} /> Group by
          </button>
          <button className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors py-1 px-2 rounded hover:bg-slate-50 outline-none">
            <LayoutGrid className="h-4 w-4" strokeWidth={1.75} /> Layout
          </button>
        </div>
      </div>

      {/* ─── TABLE ─── */}
      <div className="flex-1 overflow-auto bg-white relative">
        <table className="w-full text-left border-collapse" style={{ tableLayout: "fixed" }}>
          {/* HEADERS */}
          <thead className={`sticky top-0 bg-white z-10 border-b shadow-[0_1px_0_#E5E7EB]`}>
            <tr className="h-[36px] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
              <th className={`w-[48px] px-4 py-0 border-r ${borderClass} text-center font-normal`}>
                <input type="checkbox" className="rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" />
              </th>
              <th className={`w-[280px] px-3 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  NAME
                  <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} />
                </div>
              </th>
              <th className={`w-[120px] px-3 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  OHS
                  <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} />
                </div>
              </th>
              <th className={`w-[180px] px-3 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  CONTACT (AMOUNT)
                  <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} />
                </div>
              </th>
              <th className={`w-[180px] px-3 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  STAGE
                  <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} />
                </div>
              </th>
              <th className={`w-[140px] px-3 py-0 border-r ${borderClass} hover:bg-slate-50 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  CLOSE DATE
                  <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} />
                </div>
              </th>
              <th className={`w-[100px] px-0 py-0 ${borderClass}`}>
                <div className="flex items-center justify-center">
                  <MoreHorizontal className="h-4 w-4 text-[#D1D5DB]" />
                </div>
              </th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="text-[13px]">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-[#9CA3AF]">Loading data...</td></tr>
            ) : leads.map((lead) => {
              const stage = STAGE_STYLE[lead.status] || STAGE_STYLE.NEW;
              const heat = HEAT_STYLE[lead.temperature] || HEAT_STYLE.WARM;
              const score = getScore(lead);
              
              // App logo generator
              const colors = ["#FEE2E2", "#FEF3C7", "#D1FAE5", "#DBEAFE", "#EDE9FE"];
              const char = lead.fullName.charAt(0).toUpperCase();
              const idx = char.charCodeAt(0) % colors.length;
              const logoBg = colors[idx];
              
              return (
                <tr 
                  key={lead.id} 
                  onClick={() => setInspectLead(lead)}
                  className="h-[56px] border-b hover:bg-[#F7F5FF] transition-colors group cursor-pointer"
                  style={{ borderColor: "#E5E7EB" }}
                >
                  {/* Checkbox */}
                  <td className={`px-4 py-0 border-r text-center ${borderClass}`} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" />
                  </td>

                  {/* Name */}
                  <td className={`px-3 py-0 border-r truncate ${borderClass}`}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex items-center justify-center h-7 w-7 rounded-md text-[12px] font-bold text-[#1A1523] flex-shrink-0 shadow-sm"
                        style={{ background: logoBg }}
                      >
                        {char}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#1A1523] truncate leading-tight">
                          {lead.fullName}
                        </div>
                        <div className="text-[12px] text-[#6B7280] truncate leading-tight mt-0.5">
                          {lead.source || "Website Form"}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* OHS / Heat */}
                  <td className={`px-3 py-0 border-r ${borderClass}`}>
                    <div className="flex justify-end pr-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#E5E7EB] bg-white shadow-sm">
                        <span className={`h-1.5 w-1.5 rounded-full ${heat.dot}`} />
                        <span className="text-[12px] font-bold text-[#1A1523]">{score}</span>
                      </div>
                    </div>
                  </td>

                  {/* Contact / Amount equivalent */}
                  <td className={`px-3 py-0 border-r text-right pr-6 ${borderClass}`}>
                    <div className="font-medium text-[#1A1523]">
                      {lead.phone || lead.email || "No contact"}
                    </div>
                    {lead.phone && lead.email && (
                      <div className="text-[11px] text-[#10B981] font-medium flex items-center justify-end gap-1 mt-0.5">
                        <ArrowUpIcon className="h-3 w-3" /> 2 contact
                      </div>
                    )}
                  </td>

                  {/* Stage */}
                  <td className={`px-3 py-0 border-r ${borderClass}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`h-3.5 w-3.5 rounded-full border-2 ${stage.ring} ${stage.fill}`} />
                      <span className="text-[#1A1523] font-medium truncate">{stage.label}</span>
                    </div>
                  </td>

                  {/* Received / Close Date */}
                  <td className={`px-3 py-0 border-r font-medium text-[#1A1523] ${borderClass}`}>
                    {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  
                  {/* Actions CTA */}
                  <td className="px-3 py-0">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="w-7 h-7 rounded bg-white border border-[#E5E7EB] hover:bg-[#F3F0FF] hover:border-[#7C3AED] hover:text-[#7C3AED] flex items-center justify-center transition-all text-[#6B7280]">
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="w-7 h-7 rounded bg-white border border-[#E5E7EB] hover:bg-[#ECFDF5] hover:border-[#10B981] hover:text-[#10B981] flex items-center justify-center transition-all text-[#6B7280]">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={() => setInspectLead(lead)} className="w-7 h-7 rounded bg-white border border-[#E5E7EB] hover:bg-[#F3F0FF] hover:border-[#7C3AED] hover:text-[#7C3AED] flex items-center justify-center transition-all text-[#6B7280]">
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

      {inspectLead && (
        <LeadDetailsModal lead={inspectLead} onClose={() => setInspectLead(null)} />
      )}
    </div>
  );
}

// Dummy icons
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
function ArrowUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  );
}
