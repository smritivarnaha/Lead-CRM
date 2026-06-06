"use client";

import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Settings2, 
  Mail, 
  Phone, 
  Calendar,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadDetailsModal } from "./LeadDetailsModal";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Lead = any;

const ALL_COLUMNS = [
  { id: "name", label: "Lead Name" },
  { id: "contact", label: "Contact Info" },
  { id: "source", label: "Source / Medium" },
  { id: "status", label: "Pipeline Status" },
  { id: "priority", label: "Priority" },
  { id: "date", label: "Date Created" },
  { id: "value", label: "Est. Value" }
];

export function LeadsDataTable({ leads }: { leads: Lead[] }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // By default, show these columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "name", "contact", "source", "status", "date"
  ]);

  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev => 
      prev.includes(colId) 
        ? prev.filter(c => c !== colId)
        : [...prev, colId]
    );
  };

  const isVisible = (colId: string) => visibleColumns.includes(colId);

  return (
    <div className="flex flex-col gap-4">
      
      {/* Table Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Showing {leads.length} leads
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900 h-8 px-3">
            <Settings2 className="w-4 h-4" />
            Customize Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLUMNS.map(col => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={isVisible(col.id)}
                onCheckedChange={() => toggleColumn(col.id)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              {isVisible("name") && <TableHead className="font-semibold">Lead Name</TableHead>}
              {isVisible("contact") && <TableHead className="font-semibold">Contact Info</TableHead>}
              {isVisible("source") && <TableHead className="font-semibold">Source / Medium</TableHead>}
              {isVisible("status") && <TableHead className="font-semibold">Pipeline Status</TableHead>}
              {isVisible("priority") && <TableHead className="font-semibold">Priority</TableHead>}
              {isVisible("date") && <TableHead className="font-semibold">Date Created</TableHead>}
              {isVisible("value") && <TableHead className="font-semibold">Est. Value</TableHead>}
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  No leads found in the database.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-slate-50/50">
                  
                  {isVisible("name") && (
                    <TableCell>
                      <div className="font-medium text-slate-900">{lead.fullName || "Unknown"}</div>
                      {lead.city && <div className="text-xs text-slate-500">{lead.city}</div>}
                    </TableCell>
                  )}

                  {isVisible("contact") && (
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {lead.email && <div className="flex items-center gap-1.5 text-slate-600"><Mail className="w-3 h-3"/> {lead.email}</div>}
                        {lead.phone && <div className="flex items-center gap-1.5 text-slate-600"><Phone className="w-3 h-3"/> {lead.phone}</div>}
                        {!lead.email && !lead.phone && <span className="text-slate-400 text-xs">No contact info</span>}
                      </div>
                    </TableCell>
                  )}

                  {isVisible("source") && (
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700">{lead.source || "Website Form"}</span>
                        {lead.formName && <span className="text-xs text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded-md w-fit">{lead.formName}</span>}
                      </div>
                    </TableCell>
                  )}

                  {isVisible("status") && (
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50">{lead.status}</Badge>
                    </TableCell>
                  )}

                  {isVisible("priority") && (
                    <TableCell>
                      <Badge variant="secondary" className="bg-white">{lead.priority}</Badge>
                    </TableCell>
                  )}

                  {isVisible("date") && (
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                  )}

                  {isVisible("value") && (
                    <TableCell>
                      <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">$1,000</span>
                    </TableCell>
                  )}

                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <Eye className="w-4 h-4 mr-1.5" /> View
                    </Button>
                  </TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedLead && (
        <LeadDetailsModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
