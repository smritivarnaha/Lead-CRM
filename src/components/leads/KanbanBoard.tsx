"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Clock, ArrowRight, CheckCircle2, XCircle, HelpCircle, Mail, Phone, Eye, BellRing } from "lucide-react";

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
  smsSent?: boolean;
  pushSent?: boolean;
  followUpAt?: string | null;
  callNotes?: string | null;
  rawFields?: string | null;
};

// Re-use stage config
const STAGE_CONFIG: Record<string, { label: string; ring: string; fill: string; icon: any, bg: string }> = {
  NEW:         { label: "New Lead",      ring: "border-blue-500",   fill: "bg-transparent",  icon: HelpCircle,   bg: "bg-blue-50" },
  CONTACTED:   { label: "Contacted",     ring: "border-amber-500",  fill: "bg-transparent",  icon: Clock,        bg: "bg-amber-50" }, 
  BUSY:        { label: "Busy / No Answer", ring: "border-slate-500", fill: "bg-transparent", icon: HelpCircle, bg: "bg-slate-50" },
  FOLLOW_UP:   { label: "Follow Up Later", ring: "border-orange-500", fill: "bg-transparent",  icon: ArrowRight,   bg: "bg-orange-50" },
  CONVERTED:   { label: "Converted",     ring: "border-green-500",  fill: "bg-green-500",    icon: CheckCircle2, bg: "bg-green-50" },
  LOST:        { label: "Junk / Lost",   ring: "border-red-500",    fill: "bg-red-500",      icon: XCircle,      bg: "bg-red-50" },
};

// Determine score/heat like in Table
function getScore(lead: Lead) {
  if (lead.score) return lead.score;
  if (lead.temperature === "HOT") return 88;
  if (lead.temperature === "WARM") return 56;
  return 24;
}

const HEAT_STYLE: Record<string, { dot: string }> = {
  HOT:  { dot: "bg-[#10B981]" }, 
  WARM: { dot: "bg-[#F59E0B]" }, 
  COLD: { dot: "bg-[#EF4444]" }, 
};

export function KanbanBoard({ leads, onStatusChange, onInspect, onCallLog }: { leads: Lead[], onStatusChange: (id: string, status: string) => void, onInspect: (lead: Lead) => void, onCallLog?: (lead: Lead) => void }) {
  // @hello-pangea/dnd requires disabling strict mode rendering initially to avoid hydration mismatch
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => setIsBrowser(true), []);

  if (!isBrowser) return null;

  // Group leads by status
  const columns = Object.keys(STAGE_CONFIG).map(status => ({
    id: status,
    title: STAGE_CONFIG[status].label,
    bg: STAGE_CONFIG[status].bg,
    items: leads.filter(l => l.status === status)
  }));

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.droppableId === result.source.droppableId) return; // Reordering within same column not supported yet

    const leadId = result.draggableId;
    const newStatus = result.destination.droppableId;
    onStatusChange(leadId, newStatus);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full w-full gap-3 sm:gap-4 p-3 sm:p-6 overflow-x-auto snap-x snap-mandatory no-scrollbar bg-[#F9FAFB]">
        {columns.map(col => (
          <Droppable key={col.id} droppableId={col.id}>
            {(provided, snapshot) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`flex flex-col w-[280px] sm:w-[300px] snap-center flex-shrink-0 rounded-xl ${col.bg} border border-[#E5E7EB] shadow-sm transition-colors ${snapshot.isDraggingOver ? 'ring-2 ring-[#7C3AED]/30' : ''}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]/50 bg-white/50 rounded-t-xl">
                  <h3 className="font-semibold text-[14px] text-[#1A1523]">{col.title}</h3>
                  <span className="bg-white border border-[#E5E7EB] text-[#6B7280] text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {col.items.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {col.items.map((lead, index) => {
                    const score = getScore(lead);
                    const heat = HEAT_STYLE[lead.temperature] || HEAT_STYLE.WARM;
                    const char = lead.fullName.charAt(0).toUpperCase();
                    
                    return (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-4 rounded-lg border border-[#E5E7EB] shadow-sm group ${snapshot.isDragging ? 'shadow-lg ring-1 ring-[#7C3AED]' : 'hover:shadow-md hover:border-[#D1D5DB]'} transition-all`}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-[#F3F0FF] text-[13px] font-bold text-[#7C3AED]">
                                  {char}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-[14px] text-[#1A1523] truncate leading-tight cursor-pointer hover:text-[#7C3AED]" onClick={() => onInspect(lead)}>
                                    {lead.fullName}
                                  </h4>
                                  <div className="text-[12px] text-[#6B7280] truncate mt-0.5 flex items-center gap-1.5">
                                    <span>{lead.source || "Website Form"}</span>
                                    {(lead.smsSent || lead.pushSent) && (
                                      <>
                                        <span className="text-gray-300">•</span>
                                        <div className="flex items-center gap-1 bg-[#F7F5FF] px-1.5 py-0.5 rounded border border-[#E8E4F3]" title="Alerts Sent">
                                          {lead.smsSent && <Phone className="h-2.5 w-2.5 text-indigo-500" />}
                                          {lead.pushSent && <BellRing className="h-2.5 w-2.5 text-indigo-500" />}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 mb-4">
                              {lead.phone && (
                                <div className="flex items-center gap-2 text-[12.5px] text-[#4B5563]">
                                  <a href={`tel:${lead.phone}`} onClick={() => onCallLog && onCallLog(lead)} className="flex items-center gap-2 hover:text-[#7C3AED]">
                                    <Phone className="h-3.5 w-3.5 text-[#9CA3AF]" /> {lead.phone}
                                  </a>
                                </div>
                              )}
                              {lead.email && (
                                <div className="flex items-center gap-2 text-[12.5px] text-[#4B5563]">
                                  <Mail className="h-3.5 w-3.5 text-[#9CA3AF]" /> <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6]">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#E5E7EB] bg-slate-50">
                                <span className={`h-1.5 w-1.5 rounded-full ${heat.dot}`} />
                                <span className="text-[11px] font-bold text-[#1A1523]">{score}</span>
                              </div>
                              <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                {lead.email && (
                                  <a href={`mailto:${lead.email}`} className="w-7 h-7 rounded border border-[#E5E7EB] hover:bg-[#F3F0FF] hover:border-[#7C3AED] hover:text-[#7C3AED] flex items-center justify-center text-[#6B7280]">
                                    <Mail className="h-3 w-3" />
                                  </a>
                                )}
                                <button onClick={() => onInspect(lead)} className="w-7 h-7 rounded border border-[#E5E7EB] hover:bg-slate-50 flex items-center justify-center text-[#6B7280]">
                                  <Eye className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
