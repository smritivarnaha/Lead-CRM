import React, { useState } from "react";
import { X, Send, Sparkles, User, FileText, Gift, Mail } from "lucide-react";
import { toast } from "sonner";

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeadIds: string[];
}

const TEMPLATES = [
  { id: "welcome", label: "Welcome Series", icon: Sparkles, subject: "Welcome to LeadFlow!" },
  { id: "followup", label: "Quick Follow Up", icon: User, subject: "Following up on our last conversation" },
  { id: "offer", label: "Special Offer", icon: Gift, subject: "A special offer just for you" },
  { id: "newsletter", label: "Newsletter", icon: FileText, subject: "This month's updates" },
];

export function EmailComposer({ isOpen, onClose, selectedLeadIds }: EmailComposerProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleTemplateClick = (t: any) => {
    setActiveTemplate(t.id);
    setSubject(t.subject);
    setBody(`Hi {{First Name}},\n\nWe wanted to reach out regarding...\n\nBest,\nThe Team`);
  };

  const handleSend = async () => {
    setIsSending(true);
    
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          subject,
          body,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send emails");
        setIsSending(false);
        return;
      }

      // Success
      setIsSending(false);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        onClose();
        setSubject("");
        setBody("");
        setActiveTemplate(null);
      }, 2000);

    } catch (error) {
      console.error(error);
      toast.error("A network error occurred.");
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className={`relative w-full max-w-2xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] rounded-[28px] overflow-hidden flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          sent ? "scale-95 opacity-0" : "scale-100 opacity-100 animate-in slide-in-from-bottom-10 fade-in"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/50 bg-white/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-inner">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Compose Broadcast</h2>
              <p className="text-[13px] text-slate-500 font-medium">Sending to {selectedLeadIds.length} selected leads</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Templates Carousel */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">
              Quick Templates
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateClick(t)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border flex-shrink-0 transition-all duration-200 ${
                    activeTemplate === t.id 
                      ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm" 
                      : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <t.icon className={`h-4 w-4 ${activeTemplate === t.id ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className="text-[13px] font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-sm font-semibold text-slate-400">Subject</span>
              </div>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full pl-16 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl outline-none text-slate-900 font-medium transition-all text-[14px]"
                placeholder="What is this about?"
              />
            </div>

            <div className="relative flex-1 group min-h-[160px]">
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-full min-h-[160px] p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl outline-none text-slate-800 text-[14px] leading-relaxed resize-none transition-all"
                placeholder="Write your message here... Use {{First Name}} to personalize."
              />
              <div className="absolute bottom-4 left-4 flex gap-2">
                <button 
                  onClick={() => setBody(body + "{{First Name}}")}
                  className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-100/50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/50"
                >
                  + {"{{First Name}}"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] font-medium text-slate-400">
            Powered by LeadFlow Mailer
          </p>
          <button 
            onClick={handleSend}
            disabled={!subject || !body || isSending}
            className="group relative flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold shadow-lg shadow-slate-900/20 transition-all active:scale-95 overflow-hidden"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 group-active:opacity-50 transition-opacity duration-300 blur-md -z-10" />
            
            <span className="relative z-10">
              {isSending ? "Sending..." : "Send Now"}
            </span>
            {!isSending && (
              <Send className="relative z-10 h-4 w-4 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
            )}
          </button>
        </div>

        {/* Success Overlay */}
        {sent && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Emails Sent!</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Your broadcast is on its way.</p>
          </div>
        )}
      </div>
    </div>
  );
}
