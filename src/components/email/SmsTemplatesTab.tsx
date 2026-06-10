"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Plus, Save, Trash2, Edit, X, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

const SMS_PRESETS = [
  {
    name: "Welcome Text",
    content: "Hi {{name}}, welcome to LeadFlow! We're thrilled to have you here. Reply STOP to opt out."
  },
  {
    name: "Appointment Reminder",
    content: "Reminder: You have an appointment with us tomorrow. Please reply YES to confirm or NO to reschedule."
  },
  {
    name: "Promo Discount",
    content: "Hey {{name}}, don't miss out! Get 20% off your next purchase using code SAVE20. Valid for 48 hrs."
  },
  {
    name: "Check-in",
    content: "Hi {{name}}, just checking in to see if you received our email. Let us know if you need anything!"
  }
];

export function SmsTemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sms/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      toast.error("Failed to fetch SMS templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate.name || !editingTemplate.content) {
      toast.error("Name and content are required");
      return;
    }

    try {
      const isNew = !editingTemplate.id;
      const url = isNew ? "/api/sms/templates" : `/api/sms/templates/${editingTemplate.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate)
      });

      if (res.ok) {
        toast.success(`Template ${isNew ? 'created' : 'updated'}!`);
        setIsEditing(false);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        toast.error("Failed to save template");
      }
    } catch (err) {
      toast.error("Error saving template");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SMS template?")) return;
    try {
      const res = await fetch(`/api/sms/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Template deleted");
        fetchTemplates();
      }
    } catch (err) {
      toast.error("Error deleting template");
    }
  };

  const handleSelectPreset = (preset: any | null) => {
    setIsGalleryOpen(false);
    if (preset) {
      setEditingTemplate({
        name: preset.name,
        content: preset.content
      });
    } else {
      setEditingTemplate({ name: "", content: "" });
    }
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        <h2 className="text-lg font-bold mb-4">{editingTemplate?.id ? "Edit SMS Template" : "New SMS Template"}</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Template Name</label>
            <input 
              value={editingTemplate?.name || ""}
              onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-400"
              placeholder="e.g. Welcome Text"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
              Message Content
              <span className="text-slate-400 font-normal normal-case">{(editingTemplate?.content || "").length}/160 characters</span>
            </label>
            <textarea 
              value={editingTemplate?.content || ""}
              onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-400 min-h-[100px] resize-none"
              placeholder="Hi {{name}}, thanks for reaching out!"
              required
            />
            <div className="mt-2">
              <span className="text-[11px] text-slate-500 mr-2">Variables:</span>
              {['{{name}}', '{{source}}'].map(v => (
                <button 
                  key={v}
                  type="button"
                  onClick={() => {
                    setEditingTemplate({...editingTemplate, content: (editingTemplate?.content || "") + v});
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] mr-1 font-mono transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Template
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-lg font-bold text-slate-800">SMS Templates</h2>
          <p className="text-[13px] text-slate-500 mt-1">Manage reusable SMS messages with variables.</p>
        </div>
        <button 
          onClick={() => setIsGalleryOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Template
        </button>
      </div>
      
      <div className="p-6 flex-1 bg-white">
        {loading ? (
          <div className="text-center text-slate-400 py-10">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <MessageSquare className="h-10 w-10 text-indigo-200 mx-auto mb-3" />
            <p className="text-[15px] font-medium text-slate-700">No SMS Templates</p>
            <p className="text-[13px] mt-1 mb-4">Create your first SMS template to use in automations.</p>
            <button 
              onClick={() => setIsGalleryOpen(true)}
              className="text-indigo-600 font-semibold text-sm hover:underline"
            >
              Browse Gallery & Create &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <div key={t.id} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors group relative bg-white shadow-sm flex flex-col">
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                  <button onClick={() => { setEditingTemplate(t); setIsEditing(true); }} className="p-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:text-indigo-600 hover:border-indigo-300 shadow-sm">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:text-red-600 hover:border-red-300 shadow-sm">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="font-bold text-slate-800 text-[14px] mb-4 pr-12">{t.name}</h3>
                
                {/* iMessage style chat bubble preview */}
                <div className="bg-slate-100 rounded-xl p-4 flex flex-col gap-2 min-h-[120px] justify-end border border-slate-200 mt-auto">
                  <div className="self-end bg-blue-500 text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-[13px] leading-snug max-w-[90%] shadow-sm relative">
                    <span className="whitespace-pre-wrap">{t.content}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium self-end mr-1 mt-0.5">
                    160 chars
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SMS Template Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" /> SMS Gallery
                </h3>
                <p className="text-sm text-slate-500 mt-1">Start from scratch or pick a ready-made SMS preset.</p>
              </div>
              <button onClick={() => setIsGalleryOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Start from Scratch */}
                <div 
                  onClick={() => handleSelectPreset(null)}
                  className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col items-center justify-center h-56 text-center p-4 group"
                >
                  <Wand2 className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mb-3" />
                  <h4 className="font-bold text-slate-700 group-hover:text-indigo-700">Start from Scratch</h4>
                  <p className="text-xs text-slate-500 mt-1">Blank message</p>
                </div>

                {/* Presets */}
                {SMS_PRESETS.map((preset, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSelectPreset(preset)}
                    className="border border-slate-200 rounded-xl bg-white hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden h-56 group"
                  >
                    <div className="flex-1 bg-slate-50 p-4 flex flex-col justify-end">
                      <div className="self-end bg-blue-500 text-white px-3 py-2 rounded-2xl rounded-br-sm text-[11px] leading-snug max-w-[90%] shadow-sm overflow-hidden">
                        <span className="line-clamp-4">{preset.content}</span>
                      </div>
                    </div>
                    <div className="p-3 border-t border-slate-100 bg-white z-10">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{preset.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">SMS Text Message</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
