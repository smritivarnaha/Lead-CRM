"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Zap, Clock, PlayCircle, Settings, X, Save, ToggleLeft, ToggleRight, Mail } from "lucide-react";
import { toast } from "sonner";
import { useActiveProfile } from "@/components/providers/ActiveProfileProvider";

export function EmailAutomationsTab() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const { activeWebsiteId, websites } = useActiveProfile();
  // We use the workspace level automation toggle. Since we don't have workspace state directly exposed via ActiveProfileProvider easily here without fetching, we'll fetch it.
  const [globalEnabled, setGlobalEnabled] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [autoRes, tempRes, wsRes] = await Promise.all([
        fetch("/api/email/automations"),
        fetch("/api/email/templates"),
        fetch("/api/workspace/settings")
      ]);
      const autoData = await autoRes.json();
      const tempData = await tempRes.json();
      
      if (autoData.success) setAutomations(autoData.automations);
      if (tempData.success) setTemplates(tempData.templates);
      
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        if (wsData.success) setGlobalEnabled(wsData.workspace.emailAutomationsEnabled);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleGlobal = async () => {
    const newState = !globalEnabled;
    setGlobalEnabled(newState);
    try {
      // Mocking the call since we might not have built this specific endpoint yet
      await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAutomationsEnabled: newState })
      });
      toast.success(newState ? "Automations enabled globally" : "Automations paused globally");
    } catch (e) {
      setGlobalEnabled(!newState);
      toast.error("Failed to update global settings.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;
    try {
      const res = await fetch(`/api/email/automations/${id}`, { method: "DELETE" });
      if ((await res.json()).success) {
        toast.success("Automation deleted.");
        fetchData();
      }
    } catch (e) {
      toast.error("Error deleting automation.");
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/email/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current })
      });
      if ((await res.json()).success) {
        setAutomations(automations.map(a => a.id === id ? { ...a, isActive: !current } : a));
        toast.success(!current ? "Automation activated" : "Automation paused");
      }
    } catch (e) {
      toast.error("Network error.");
    }
  };

  const handleSave = async () => {
    if (!editingData.name || !editingData.templateId) {
      toast.error("Name and Template are required.");
      return;
    }
    setSaving(true);
    try {
      const url = editingData.id ? `/api/email/automations/${editingData.id}` : "/api/email/automations";
      const method = editingData.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingData)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingData.id ? "Automation updated!" : "Automation created!");
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error(data.error || "Failed to save.");
      }
    } catch (e) {
      toast.error("Error saving automation.");
    } finally {
      setSaving(false);
    }
  };

  const openModal = (data: any = {}) => {
    setEditingData({ trigger: "NEW_LEAD", delayMinutes: 0, isActive: true, ...data });
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Email Automations</h2>
          <p className="text-sm text-slate-500">Set up auto-responders and drip sequences.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-600">Global System</span>
            <button onClick={handleToggleGlobal} className={`transition-colors ${globalEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>
              {globalEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
            </button>
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> New Automation
          </button>
        </div>
      </div>

      {!globalEnabled && (
        <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800 flex items-start gap-3">
          <Settings className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <strong>Automations are globally paused.</strong>
            <p className="mt-1 text-amber-700">No automated emails will be sent out, even if individual rules are marked as active. Toggle the "Global System" switch above to resume sending.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading automations...</div>
      ) : automations.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-xl">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No automations yet</h3>
          <p className="text-slate-500 text-sm mt-1 mb-6">Create an auto-responder to welcome new leads instantly.</p>
          <button 
            onClick={() => openModal()}
            className="text-indigo-600 font-semibold text-sm hover:underline"
          >
            + Create your first automation
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {automations.map(a => (
            <div key={a.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${a.isActive ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-100 bg-slate-50 opacity-75'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                  {a.trigger === "NEW_LEAD" ? <PlayCircle className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    {a.name}
                    {!a.isActive && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Paused</span>}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-medium bg-slate-100 px-1.5 py-0.5 rounded"><Zap className="w-3 h-3" /> {a.trigger === "NEW_LEAD" ? "When Lead Received" : `Status changed to ${a.statusValue}`}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.delayMinutes === 0 ? "Send immediately" : `Wait ${a.delayMinutes} mins`}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {a.template?.name || "Missing Template"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleActive(a.id, a.isActive)} className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
                  {a.isActive ? "Pause" : "Activate"}
                </button>
                <button onClick={() => openModal(a)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">{editingData.id ? "Edit Automation" : "New Automation"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Automation Name</label>
                <input 
                  value={editingData.name || ""}
                  onChange={e => setEditingData({...editingData, name: e.target.value})}
                  placeholder="e.g. Instant Welcome Email"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Trigger Event</label>
                <select 
                  value={editingData.trigger || "NEW_LEAD"}
                  onChange={e => setEditingData({...editingData, trigger: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="NEW_LEAD">When a new lead is received</option>
                  <option value="STATUS_CHANGE">When lead status changes</option>
                </select>
              </div>

              {editingData.trigger === "STATUS_CHANGE" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Target Status</label>
                  <select 
                    value={editingData.statusValue || "CONTACTED"}
                    onChange={e => setEditingData({...editingData, statusValue: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="CONTACTED">Contacted</option>
                    <option value="NO_RESPONSE">No Response</option>
                    <option value="FOLLOW_UP">Follow Up Later</option>
                    <option value="CONVERTED">Converted</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Email Template to Send</label>
                <select 
                  value={editingData.templateId || ""}
                  onChange={e => setEditingData({...editingData, templateId: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>Select a template...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name} (Subj: {t.subject})</option>)}
                </select>
                {templates.length === 0 && <p className="text-xs text-amber-600 mt-1">You need to create a Template first in the Templates tab.</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Delay Time</label>
                <select 
                  value={editingData.delayMinutes || 0}
                  onChange={e => setEditingData({...editingData, delayMinutes: parseInt(e.target.value)})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value={0}>Send Immediately</option>
                  <option value={5}>Wait 5 Minutes</option>
                  <option value={60}>Wait 1 Hour</option>
                  <option value={1440}>Wait 1 Day</option>
                  <option value={4320}>Wait 3 Days</option>
                </select>
              </div>

            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Automation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
