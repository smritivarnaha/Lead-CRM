"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Mail, LayoutTemplate, X, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { EmailBuilder } from "./EmailBuilder";
import { Button } from "@/components/ui/button";

const PRESET_TEMPLATES = [
  {
    name: "Welcome Series",
    subject: "Welcome to our community! 🎉",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #4f46e5;">Welcome, {{name}}!</h1>
  <p>We are thrilled to have you here.</p>
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;">Here's a quick guide to getting started...</p>
  </div>
  <a href="#" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
</div>`,
    designJson: ""
  },
  {
    name: "Promo Offer",
    subject: "Exclusive 20% OFF inside 🎁",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
  <h1 style="color: #e11d48;">Special Offer!</h1>
  <p style="font-size: 18px;">Get <strong>20% off</strong> your next purchase with code <strong>SAVE20</strong>.</p>
  <a href="#" style="background: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px; font-weight: bold;">Claim Discount</a>
</div>`,
    designJson: ""
  },
  {
    name: "Follow-Up Checkin",
    subject: "Checking in on your request",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Hi {{name}},</p>
  <p>I just wanted to follow up on your recent inquiry to make sure you got everything you needed.</p>
  <p>Let me know if you have any questions or want to jump on a quick call!</p>
  <br>
  <p>Best regards,</p>
  <p><strong>The Team</strong></p>
</div>`,
    designJson: ""
  }
];

export function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

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

  const handleSelectPreset = (preset: any | null) => {
    setIsGalleryOpen(false);
    if (preset) {
      // Open builder with preset pre-loaded
      setEditingTemplate({
        name: preset.name,
        subject: preset.subject,
        bodyHtml: preset.bodyHtml,
        designJson: preset.designJson
      });
    } else {
      // Open empty builder
      setEditingTemplate(null);
    }
    setIsBuilderOpen(true);
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
          onClick={() => setIsGalleryOpen(true)}
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
            onClick={() => setIsGalleryOpen(true)}
            className="text-indigo-600 font-semibold text-sm hover:underline"
          >
            + Browse Gallery & Create
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(t => (
            <div key={t.id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
              <div className="bg-slate-50 h-40 flex items-center justify-center border-b border-slate-200 relative overflow-hidden">
                {t.bodyHtml ? (
                  <div className="absolute inset-0 pointer-events-none transform scale-[0.35] origin-top-left w-[285%] h-[285%] bg-white" dangerouslySetInnerHTML={{ __html: t.bodyHtml }} />
                ) : (
                  <Mail className="w-10 h-10 text-slate-300" />
                )}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                  <button onClick={() => { setEditingTemplate(t); setIsBuilderOpen(true); }} className="bg-white text-indigo-700 p-2 rounded-lg hover:scale-105 transition-transform shadow-sm" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="bg-white text-red-600 p-2 rounded-lg hover:scale-105 transition-transform shadow-sm" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col bg-white z-10">
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

      {/* Template Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" /> Template Gallery
                </h3>
                <p className="text-sm text-slate-500 mt-1">Start from scratch or pick a ready-made layout.</p>
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
                  <p className="text-xs text-slate-500 mt-1">Blank canvas</p>
                </div>

                {/* Presets */}
                {PRESET_TEMPLATES.map((preset, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSelectPreset(preset)}
                    className="border border-slate-200 rounded-xl bg-white hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden h-56 group relative"
                  >
                    <div className="flex-1 bg-slate-100 relative overflow-hidden pointer-events-none">
                      <div className="absolute inset-0 transform scale-[0.3] origin-top-left w-[333%] h-[333%] bg-white" dangerouslySetInnerHTML={{ __html: preset.bodyHtml }} />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors" />
                    </div>
                    <div className="p-3 border-t border-slate-100 bg-white z-10">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{preset.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{preset.subject}</p>
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
