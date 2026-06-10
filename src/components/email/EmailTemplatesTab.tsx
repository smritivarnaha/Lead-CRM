"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Mail, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { EmailBuilder } from "./EmailBuilder";

export function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/email/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Template deleted.");
        fetchTemplates();
      } else {
        toast.error("Failed to delete template.");
      }
    } catch (e) {
      toast.error("Error deleting template.");
    }
  };

  const handleSaveTemplate = async (templateData: any) => {
    try {
      const url = templateData.id ? `/api/email/templates/${templateData.id}` : "/api/email/templates";
      const method = templateData.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(templateData.id ? "Template updated!" : "Template created!");
        setIsBuilderOpen(false);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        toast.error(data.error || "Failed to save template.");
      }
    } catch (e) {
      toast.error("Network error.");
    }
  };

  if (isBuilderOpen) {
    return (
      <EmailBuilder 
        initialData={editingTemplate} 
        onClose={() => { setIsBuilderOpen(false); setEditingTemplate(null); }}
        onSave={handleSaveTemplate}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Email Templates</h2>
          <p className="text-sm text-slate-500">Design beautiful emails for broadcasts and automations.</p>
        </div>
        <button 
          onClick={() => { setEditingTemplate(null); setIsBuilderOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Template
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-xl">
          <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No templates yet</h3>
          <p className="text-slate-500 text-sm mt-1 mb-6">Create your first template to use in broadcasts or auto-responders.</p>
          <button 
            onClick={() => { setEditingTemplate(null); setIsBuilderOpen(true); }}
            className="text-indigo-600 font-semibold text-sm hover:underline"
          >
            + Create your first template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(t => (
            <div key={t.id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
              <div className="bg-slate-50 h-32 flex items-center justify-center border-b border-slate-200 relative">
                <Mail className="w-10 h-10 text-slate-300" />
                <div className="absolute inset-0 bg-indigo-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                  <button onClick={() => { setEditingTemplate(t); setIsBuilderOpen(true); }} className="bg-white text-indigo-700 p-2 rounded-lg hover:scale-105 transition-transform" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="bg-white text-red-600 p-2 rounded-lg hover:scale-105 transition-transform" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h4 className="font-bold text-slate-900">{t.name}</h4>
                <p className="text-xs text-slate-500 mt-1 truncate">Subj: {t.subject}</p>
                <div className="mt-auto pt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Updated {new Date(t.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
