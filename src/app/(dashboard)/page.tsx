"use client";

import { useState, useEffect } from "react";
import { getLeads } from "@/actions/leads";
import {
  Settings2,
  Filter,
  ArrowRightToLine,
  ChevronDown,
  Columns3,
  AlignJustify,
  Layers,
  MoreHorizontal,
  LayoutGrid
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
};

// ─── STAGE CONFIG ───
const STAGE_STYLE: Record<string, { label: string; ring: string; fill: string }> = {
  NEW:         { label: "Prospecting",   ring: "border-[#7C3AED]", fill: "bg-transparent" },
  CONTACTED:   { label: "Requirement",   ring: "border-[#7C3AED]", fill: "bg-transparent" }, // like 1/4 filled but we can use gradients or solid for simplicity
  FOLLOW_UP:   { label: "Negotiation",   ring: "border-[#7C3AED]", fill: "bg-transparent" },
  CONVERTED:   { label: "Technical win", ring: "border-[#7C3AED]", fill: "bg-[#7C3AED]" },
  LOST:        { label: "Closed lost",   ring: "border-[#9CA3AF]", fill: "bg-[#9CA3AF]" },
  NO_RESPONSE: { label: "No response",   ring: "border-[#9CA3AF]", fill: "bg-transparent" },
};

// ─── HEAT/OHS CONFIG ───
const HEAT_STYLE: Record<string, { dot: string }> = {
  HOT:  { dot: "bg-[#10B981]" }, // Green in screenshot
  WARM: { dot: "bg-[#F59E0B]" }, // Orange in screenshot
  COLD: { dot: "bg-[#EF4444]" }, // Red in screenshot
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

  useEffect(() => {
    getLeads().then((res) => {
      if (res.success && res.leads) setLeads(res.leads);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* ─── TOOLBAR ─── */}
      <div 
        className="flex items-center justify-between px-4 py-2 bg-white border-b"
        style={{ borderColor: "#E8E4F3", flexShrink: 0 }}
      >
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center w-7 h-7 text-[#9CA3AF] hover:text-[#1A1523] transition-colors">
            <ArrowRightToLine className="h-4 w-4" strokeWidth={2} />
          </button>
          
          <div className="h-4 w-px bg-[#E8E4F3]" />
          
          <button className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-semibold text-[#1A1523] hover:bg-[#F7F5FF] rounded transition-colors">
            <UsersIcon className="h-4 w-4 text-[#9CA3AF]" />
            All leads
            <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF] ml-1" strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center gap-4 text-[13px] font-medium text-[#6B7280]">
          <button className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors">
            <Columns3 className="h-4 w-4" strokeWidth={1.75} /> Fields
          </button>
          <button className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors">
            <Filter className="h-4 w-4" strokeWidth={1.75} /> Filters
          </button>
          <button className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors">
            <AlignJustify className="h-4 w-4" strokeWidth={1.75} /> Row height
          </button>
          <button className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors">
            <Layers className="h-4 w-4" strokeWidth={1.75} /> Group by
          </button>
          <button className="flex items-center gap-1.5 hover:text-[#1A1523] transition-colors">
            <LayoutGrid className="h-4 w-4" strokeWidth={1.75} /> Layout
          </button>
        </div>
      </div>

      {/* ─── TABLE ─── */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-left border-collapse" style={{ tableLayout: "fixed" }}>
          {/* HEADERS */}
          <thead className="sticky top-0 bg-white z-10 border-b shadow-[0_1px_0_#E8E4F3]">
            <tr className="h-9 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
              <th className="w-[48px] px-4 py-0 border-r border-[#F3F0FF] text-center font-normal">
                <input type="checkbox" className="rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" />
              </th>
              <th className="w-[300px] px-3 py-0 border-r border-[#F3F0FF]">
                <div className="flex items-center justify-between">
                  NAME
                  <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} />
                </div>
              </th>
              <th className="w-[120px] px-3 py-0 border-r border-[#F3F0FF]">
                <div className="flex items-center justify-between">
                  HEAT
                  <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} />
                </div>
              </th>
              <th className="w-[180px] px-3 py-0 border-r border-[#F3F0FF]">
                <div className="flex items-center justify-between">
                  CONTACT
                  <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} />
                </div>
              </th>
              <th className="w-[180px] px-3 py-0 border-r border-[#F3F0FF]">
                <div className="flex items-center justify-between">
                  STAGE
                  <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} />
                </div>
              </th>
              <th className="w-[120px] px-3 py-0 border-r border-[#F3F0FF]">
                <div className="flex items-center justify-between">
                  RECEIVED
                  <ChevronDown className="h-3.5 w-3.5 text-[#D1D5DB]" strokeWidth={2} />
                </div>
              </th>
              <th className="w-[48px] px-0 py-0 border-[#F3F0FF]">
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
                  className="h-[52px] border-b hover:bg-[#F7F5FF] transition-colors"
                  style={{ borderColor: "#F3F0FF" }}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-0 border-r text-center" style={{ borderColor: "#F3F0FF" }}>
                    <input type="checkbox" className="rounded-sm border-[#D1D5DB] text-[#7C3AED] focus:ring-[#7C3AED]" />
                  </td>

                  {/* Name */}
                  <td className="px-3 py-0 border-r truncate" style={{ borderColor: "#F3F0FF" }}>
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="flex items-center justify-center h-6 w-6 rounded text-[11px] font-bold text-[#1A1523] flex-shrink-0"
                        style={{ background: logoBg }}
                      >
                        {char}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-[#1A1523] truncate leading-tight">
                          {lead.fullName}
                        </div>
                        <div className="text-[11px] text-[#6B7280] truncate leading-tight mt-0.5">
                          {lead.source || "Website Form"}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* OHS / Heat */}
                  <td className="px-3 py-0 border-r" style={{ borderColor: "#F3F0FF" }}>
                    <div className="flex justify-end pr-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#E8E4F3] bg-white">
                        <span className={`h-1.5 w-1.5 rounded-full ${heat.dot}`} />
                        <span className="text-[12px] font-medium text-[#1A1523]">{score}</span>
                      </div>
                    </div>
                  </td>

                  {/* Contact / Amount equivalent */}
                  <td className="px-3 py-0 border-r text-right pr-6" style={{ borderColor: "#F3F0FF" }}>
                    <div className="font-medium text-[#1A1523]">
                      {lead.phone || "No phone"}
                    </div>
                  </td>

                  {/* Stage */}
                  <td className="px-3 py-0 border-r" style={{ borderColor: "#F3F0FF" }}>
                    <div className="flex items-center gap-2">
                      <div className={`h-3.5 w-3.5 rounded-full border-2 ${stage.ring} ${stage.fill}`} />
                      <span className="text-[#1A1523] truncate">{stage.label}</span>
                    </div>
                  </td>

                  {/* Received / Close Date */}
                  <td className="px-3 py-0 border-r text-[#6B7280]" style={{ borderColor: "#F3F0FF" }}>
                    {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  
                  {/* Empty */}
                  <td className="px-0 py-0" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Dummy icon for "All leads"
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
