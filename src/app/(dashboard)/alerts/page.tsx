"use client";

import { useState } from "react";
import { SmsTemplatesTab } from "@/components/email/SmsTemplatesTab";
import { ClientEmailAlertsTab } from "@/components/email/ClientEmailAlertsTab";
import { useUser } from "@clerk/nextjs";
import { Mail, MessageSquare } from "lucide-react";

export default function ClientAlertsPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<"email" | "sms">("email");

  if (!isLoaded) return null;
  if (!user) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6 relative w-full h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1523] tracking-tight">Client Alerts</h1>
          <p className="text-slate-500 text-sm mt-1">Manage notification templates sent to you and your clients.</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl w-fit border border-slate-200/50">
          <button 
            onClick={() => setActiveTab("email")}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${activeTab === "email" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
          >
            <Mail className="w-4 h-4" />
            Email Alerts
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button 
            onClick={() => setActiveTab("sms")}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${activeTab === "sms" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
          >
            <MessageSquare className="w-4 h-4" />
            SMS Alerts
          </button>
        </div>
      </div>

      {activeTab === "email" ? <ClientEmailAlertsTab /> : <SmsTemplatesTab />}
    </div>
  );
}
