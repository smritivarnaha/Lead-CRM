"use client";

import { X, Calendar, MapPin, Globe, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Lead = any;

export function LeadDetailsModal({ lead, onClose }: { lead: Lead, onClose: () => void }) {
  if (!lead) return null;

  // Attempt to parse rawFields
  let rawData = {};
  try {
    if (lead.rawFields) {
      rawData = JSON.parse(lead.rawFields);
    }
  } catch (e) {
    console.error("Failed to parse rawFields", e);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{lead.fullName || "Unknown Lead"}</h2>
              <Badge variant="outline" className="bg-white">{lead.status}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(lead.createdAt).toLocaleString()}</span>
              {lead.source && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {lead.source}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</div>
              <div className="text-sm font-medium text-slate-900">{lead.email || "Not provided"}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone Number</div>
              <div className="text-sm font-medium text-slate-900">{lead.phone || "Not provided"}</div>
            </div>
          </div>

          {/* Location & UTM */}
          <div className="grid grid-cols-2 gap-4">
            {(lead.city || lead.state) && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Location</div>
                <div className="text-sm font-medium text-slate-900">{[lead.city, lead.state].filter(Boolean).join(", ")}</div>
              </div>
            )}
            {lead.formName && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Form Submitted</div>
                <div className="text-sm font-medium text-blue-900">{lead.formName}</div>
              </div>
            )}
          </div>

          {/* Raw Form Fields */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500" /> All Captured Form Data
            </h3>
            {Object.keys(rawData).length > 0 ? (
              <div className="bg-slate-900 rounded-xl p-5 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-sm text-slate-500 bg-slate-50">
                No raw form data was captured for this lead.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
