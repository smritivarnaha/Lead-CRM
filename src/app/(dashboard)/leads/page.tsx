"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, Phone, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLeads, updateLeadStatus } from "@/actions/leads";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client for Realtime WebSockets
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Lead = {
  id: string;
  name: string;
  source: string;
  time: string;
  priority: "HIGH" | "NORMAL" | "LOW";
};

type Columns = {
  [key: string]: {
    name: string;
    items: Lead[];
  };
};

const emptyData: Columns = {
  NEW: { name: "New Leads", items: [] },
  CONTACTED: { name: "Contacted", items: [] },
  FOLLOW_UP: { name: "Follow Up", items: [] },
  CONVERTED: { name: "Converted", items: [] },
};

const priorityColors = {
  HIGH: "bg-red-50 text-red-700 border-red-200",
  NORMAL: "bg-blue-50 text-blue-700 border-blue-200",
  LOW: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function LeadsKanbanPage() {
  const [columns, setColumns] = useState<Columns>(emptyData);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // 1. Fetch existing real leads from the database
    const loadLeads = async () => {
      const res = await getLeads();
      if (res.success && res.leads) {
        const newCols = { ...emptyData };
        res.leads.forEach((l: any) => {
          const status = l.status || "NEW";
          if (newCols[status]) {
            newCols[status].items.push({
              id: l.id,
              name: l.fullName || "Unknown",
              source: l.source || "Website Form",
              time: new Date(l.createdAt).toLocaleDateString(),
              priority: "NORMAL",
            });
          }
        });
        setColumns(newCols);
      }
    };
    
    loadLeads();

    // 2. Setup Supabase Realtime WebSocket Listener
    const channel = supabase.channel('leads-channel');
    
    channel.on('broadcast', { event: 'new-lead' }, (payload) => {
      console.log('Realtime Lead Received!', payload);
      const newLead = payload.payload;
      
      setColumns((prev) => {
        const updated = { ...prev };
        updated.NEW.items = [{
          id: newLead.id,
          name: newLead.fullName || "Unknown",
          source: newLead.source || "Website Form",
          time: "Just now",
          priority: "NORMAL"
        }, ...updated.NEW.items];
        return updated;
      });
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId !== destination.droppableId) {
      const sourceColumn = columns[source.droppableId];
      const destColumn = columns[destination.droppableId];
      const sourceItems = [...sourceColumn.items];
      const destItems = [...destColumn.items];
      const [removed] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, removed);
      
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceColumn, items: sourceItems },
        [destination.droppableId]: { ...destColumn, items: destItems },
      });
      
      // Update Database
      updateLeadStatus(removed.id, destination.droppableId);
    } else {
      const column = columns[source.droppableId];
      const copiedItems = [...column.items];
      const [removed] = copiedItems.splice(source.index, 1);
      copiedItems.splice(destination.index, 0, removed);
      
      setColumns({
        ...columns,
        [source.droppableId]: { ...column, items: copiedItems },
      });
    }
  };

  if (!isMounted) return null; // Prevent hydration mismatch with DnD

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">Drag and drop leads to update their status.</p>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full items-start">
            {Object.entries(columns).map(([columnId, column]) => (
              <div key={columnId} className="flex flex-col flex-shrink-0 w-80 bg-slate-100/50 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-slate-700 text-sm">{column.name}</h3>
                  <Badge variant="secondary" className="bg-white text-slate-600 shadow-sm border-slate-200">
                    {column.items.length}
                  </Badge>
                </div>

                <Droppable droppableId={columnId}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "flex flex-col gap-3 min-h-[150px] transition-colors rounded-lg",
                        snapshot.isDraggingOver ? "bg-slate-200/50" : ""
                      )}
                    >
                      {column.items.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-3",
                                snapshot.isDragging ? "shadow-md border-blue-300 ring-1 ring-blue-300" : "border-slate-200",
                                "hover:border-slate-300 transition-all"
                              )}
                              style={{ ...provided.draggableProps.style }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="font-medium text-slate-900">{item.name}</div>
                                <button className="text-slate-400 hover:text-slate-600">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="bg-slate-100 px-2 py-1 rounded-md">{item.source}</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> {item.time}
                                </span>
                              </div>

                              <div className="flex items-center justify-between mt-1">
                                <div className="flex -space-x-2">
                                  <Avatar className="h-6 w-6 border-2 border-white">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`} />
                                    <AvatarFallback>UN</AvatarFallback>
                                  </Avatar>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priorityColors[item.priority])}>
                                    {item.priority}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
