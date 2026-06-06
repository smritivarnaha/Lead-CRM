"use client";

import { useState } from "react";
import { X, Phone, CheckCircle2, PhoneOff, ArrowRight } from "lucide-react";

export function CallLogModal({
  leadName,
  onClose,
  onSubmit,
}: {
  leadName: string;
  onClose: () => void;
  onSubmit: (status: string, notes: string, followUpAt: Date | null) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");

  const handleSubmit = () => {
    if (!status) return;

    let finalDate = null;
    if (status === "FOLLOW_UP" && followUpDate && followUpTime) {
      finalDate = new Date(`${followUpDate}T${followUpTime}`);
    } else if (status === "FOLLOW_UP" && followUpDate) {
      finalDate = new Date(followUpDate);
    }
    
    onSubmit(status, notes, finalDate);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-lg font-bold text-[#1A1523]">Log Call</h2>
            <p className="text-[13px] text-[#6B7280]">Calling {leadName}...</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-[#9CA3AF] hover:text-[#1A1523] transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div>
            <label className="block text-[13px] font-semibold text-[#1A1523] mb-3">How did the call go?</label>
            <div className="grid grid-cols-1 gap-2.5">
              <button 
                onClick={() => setStatus("CONTACTED")}
                className={`flex items-center justify-between px-4 py-3 border rounded-xl text-left transition-all ${status === "CONTACTED" ? "border-green-500 bg-green-50 ring-1 ring-green-500" : "border-[#E5E7EB] hover:border-green-300 hover:bg-green-50/50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === "CONTACTED" ? "bg-green-500 text-white" : "bg-green-100 text-green-600"}`}><CheckCircle2 className="h-4 w-4" /></div>
                  <div>
                    <div className={`text-[14px] font-bold ${status === "CONTACTED" ? "text-green-900" : "text-[#1A1523]"}`}>Answered</div>
                    <div className={`text-[12px] ${status === "CONTACTED" ? "text-green-700" : "text-[#6B7280]"}`}>Spoke to the lead</div>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => setStatus("BUSY")}
                className={`flex items-center justify-between px-4 py-3 border rounded-xl text-left transition-all ${status === "BUSY" ? "border-slate-500 bg-slate-50 ring-1 ring-slate-500" : "border-[#E5E7EB] hover:border-slate-300 hover:bg-slate-50/50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === "BUSY" ? "bg-slate-500 text-white" : "bg-slate-100 text-slate-600"}`}><PhoneOff className="h-4 w-4" /></div>
                  <div>
                    <div className={`text-[14px] font-bold ${status === "BUSY" ? "text-slate-900" : "text-[#1A1523]"}`}>No Answer / Busy</div>
                    <div className={`text-[12px] ${status === "BUSY" ? "text-slate-700" : "text-[#6B7280]"}`}>Left a voicemail or skipped</div>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => setStatus("FOLLOW_UP")}
                className={`flex items-center justify-between px-4 py-3 border rounded-xl text-left transition-all ${status === "FOLLOW_UP" ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500" : "border-[#E5E7EB] hover:border-orange-300 hover:bg-orange-50/50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === "FOLLOW_UP" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-600"}`}><ArrowRight className="h-4 w-4" /></div>
                  <div>
                    <div className={`text-[14px] font-bold ${status === "FOLLOW_UP" ? "text-orange-900" : "text-[#1A1523]"}`}>Need to Follow Up</div>
                    <div className={`text-[12px] ${status === "FOLLOW_UP" ? "text-orange-700" : "text-[#6B7280]"}`}>Will connect later</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {status === "FOLLOW_UP" && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200">
              <label className="block text-[13px] font-semibold text-[#1A1523] mb-2">When should we remind you?</label>
              <div className="flex gap-3">
                <input 
                  type="date" 
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#1A1523] focus:border-[#7C3AED] outline-none"
                />
                <input 
                  type="time" 
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-32 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#1A1523] focus:border-[#7C3AED] outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-semibold text-[#1A1523] mb-2">Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed?"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#1A1523] focus:border-[#7C3AED] outline-none min-h-[80px]"
            />
          </div>
        </div>

        <div className="p-5 border-t border-[#E5E7EB] bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-[#6B7280] hover:text-[#1A1523]">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={!status || (status === "FOLLOW_UP" && !followUpDate)}
            className="px-5 py-2 bg-[#7C3AED] text-white text-[13px] font-semibold rounded-lg hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Save Call Log
          </button>
        </div>
      </div>
    </div>
  );
}
