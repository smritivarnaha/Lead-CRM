"use client";

import { useState, useEffect } from "react";
import { Mail, Plus, Save, Trash2, Edit, X, Sparkles, Wand2, Code } from "lucide-react";
import { toast } from "sonner";

const CLIENT_EMAIL_PRESETS = [
  {
    name: "New Lead Alert (Professional)",
    subject: "🚨 New Lead Received: {{name}}",
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 20px; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
  .header { background: #4f46e5; color: #ffffff; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px 24px; color: #374151; }
  .lead-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-top: 20px; }
  .field { margin-bottom: 12px; }
  .field-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 0.05em; margin-bottom: 4px; }
  .field-value { font-size: 16px; font-weight: 500; color: #0f172a; margin: 0; }
  .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
  .btn { display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 24px; text-align: center; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Lead Received!</h1>
    </div>
    <div class="content">
      <p style="margin-top: 0; font-size: 16px; line-height: 1.5;">Great news! A new lead has just registered on your website. Here are the details:</p>
      
      <div class="lead-box">
        {{all_fields}}
      </div>
      
      <a href="https://crm.rankved.com/sign-in" class="btn">View Lead in CRM</a>
    </div>
    <div class="footer">
      Powered by LeadFlow CRM &copy; 2026
    </div>
  </div>
</body>
</html>`
  },
  {
    name: "Weekly Summary Digest",
    subject: "📊 Your Weekly Lead Summary",
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Inter', Helvetica, sans-serif; background-color: #fafafa; padding: 20px; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #eaeaea; border-radius: 8px; }
  .head { padding: 30px; text-align: center; border-bottom: 1px solid #eaeaea; }
  .head h2 { margin: 0; color: #111; }
  .body { padding: 30px; color: #444; line-height: 1.6; }
  .stats { display: flex; gap: 10px; margin-top: 20px; }
  .stat-box { flex: 1; background: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; }
  .stat-num { font-size: 28px; font-weight: bold; color: #2563eb; margin: 0; }
  .stat-title { font-size: 12px; text-transform: uppercase; color: #71717a; margin-top: 5px; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="head">
      <h2>Weekly Lead Digest</h2>
    </div>
    <div class="body">
      <p>Hello,</p>
      <p>Here is your weekly summary of lead generation activity across your websites.</p>
      
      <div class="stats">
        <div class="stat-box">
          <p class="stat-num">{{total_leads}}</p>
          <div class="stat-title">New Leads</div>
        </div>
        <div class="stat-box">
          <p class="stat-num">{{converted}}</p>
          <div class="stat-title">Converted</div>
        </div>
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">Log in to your dashboard to see the full breakdown and manage your pipeline.</p>
    </div>
  </div>
</body>
</html>`
  }
];

export function ClientEmailAlertsTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  // Custom states for HTML Code editor
  const [activeTab, setActiveTab] = useState<"visual" | "code">("visual");

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // Reusing the general templates endpoint but we could filter by type if needed
      // For now we'll just store them in the standard email templates table
      const res = await fetch("/api/email/templates");
      if (res.ok) {
        const data = await res.json();
        if(data.success) {
          // You might want a specific flag for "Client Alert" templates. 
          // Assuming all templates here for now, or just client ones if filtered.
          setTemplates(data.templates); 
        }
      }
    } catch (err) {
      toast.error("Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate.name || !editingTemplate.bodyHtml) {
      toast.error("Name and HTML content are required");
      return;
    }

    try {
      const isNew = !editingTemplate.id;
      const url = isNew ? "/api/email/templates" : `/api/email/templates/${editingTemplate.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingTemplate,
          // You could tag these as client alerts if your schema supports it
        })
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Alert Template ${isNew ? 'created' : 'updated'}!`);
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
    if (!confirm("Are you sure you want to delete this alert template?")) return;
    try {
      const res = await fetch(`/api/email/templates/${id}`, { method: "DELETE" });
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
        subject: preset.subject,
        bodyHtml: preset.bodyHtml
      });
    } else {
      setEditingTemplate({ name: "", subject: "", bodyHtml: "<html>\n<body>\n  <p>Hello {{name}}</p>\n</body>\n</html>" });
    }
    setIsEditing(true);
    setActiveTab("code");
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[800px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{editingTemplate?.id ? "Edit Client Alert Template" : "New Client Alert Template"}</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Template
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Template Name</label>
            <input 
              value={editingTemplate?.name || ""}
              onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-400"
              placeholder="e.g. New Lead Alert"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Email Subject</label>
            <input 
              value={editingTemplate?.subject || ""}
              onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-400"
              placeholder="e.g. 🚨 New Lead: {{name}}"
            />
          </div>
        </div>

        {/* Editor / Preview Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
          <button 
            onClick={() => setActiveTab("code")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "code" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Code className="w-4 h-4" /> HTML/CSS Editor
          </button>
          <button 
            onClick={() => setActiveTab("visual")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "visual" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Mail className="w-4 h-4" /> Visual Preview
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 rounded-xl border border-slate-200">
          {activeTab === "code" ? (
            <textarea 
              value={editingTemplate?.bodyHtml || ""}
              onChange={e => setEditingTemplate({...editingTemplate, bodyHtml: e.target.value})}
              className="w-full h-full p-4 font-mono text-[13px] bg-slate-900 text-slate-100 outline-none resize-none"
              spellCheck={false}
              placeholder="<html>...</html>"
            />
          ) : (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center p-8 overflow-y-auto">
              <div className="bg-white w-full max-w-2xl min-h-full rounded shadow-sm overflow-hidden">
                <iframe 
                  srcDoc={editingTemplate?.bodyHtml || ""}
                  className="w-full h-full min-h-[500px]"
                  title="Email Preview"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Client Email Alerts</h2>
          <p className="text-[13px] text-slate-500 mt-1">Manage HTML email templates sent to your clients (e.g. Lead Notifications).</p>
        </div>
        <button 
          onClick={() => setIsGalleryOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Alert Template
        </button>
      </div>
      
      <div className="p-6 flex-1 bg-white">
        {loading ? (
          <div className="text-center text-slate-400 py-10">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Mail className="h-10 w-10 text-indigo-200 mx-auto mb-3" />
            <p className="text-[15px] font-medium text-slate-700">No Alert Templates</p>
            <p className="text-[13px] mt-1 mb-4">Create your first HTML email alert template for your clients.</p>
            <button 
              onClick={() => setIsGalleryOpen(true)}
              className="text-indigo-600 font-semibold text-sm hover:underline"
            >
              Browse Gallery & Create &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(t => (
              <div key={t.id} className="border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 transition-all group flex flex-col bg-white shadow-sm">
                <div className="bg-slate-100 h-48 relative overflow-hidden border-b border-slate-200 flex items-center justify-center">
                  {t.bodyHtml ? (
                    <div className="absolute inset-0 transform scale-[0.4] origin-top-left w-[250%] h-[250%] bg-white pointer-events-none" dangerouslySetInnerHTML={{ __html: t.bodyHtml }} />
                  ) : (
                    <Mail className="w-8 h-8 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <button onClick={() => { setEditingTemplate(t); setIsEditing(true); }} className="bg-white text-indigo-700 p-2 rounded-lg hover:scale-105 transition-transform shadow-sm" title="Edit HTML">
                      <Code className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="bg-white text-red-600 p-2 rounded-lg hover:scale-105 transition-transform shadow-sm" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col z-10">
                  <h4 className="font-bold text-slate-800 text-[14px]">{t.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">Subj: {t.subject}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" /> Client Alerts Gallery
                </h3>
                <p className="text-sm text-slate-500 mt-1">Start from scratch or pick a professional HTML/CSS preset that avoids spam filters.</p>
              </div>
              <button onClick={() => setIsGalleryOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {/* Start from Scratch */}
                <div 
                  onClick={() => handleSelectPreset(null)}
                  className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col items-center justify-center h-64 text-center p-4 group"
                >
                  <Wand2 className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mb-3" />
                  <h4 className="font-bold text-slate-700 group-hover:text-indigo-700">Custom HTML</h4>
                  <p className="text-xs text-slate-500 mt-1">Write your own HTML & CSS</p>
                </div>

                {/* Presets */}
                {CLIENT_EMAIL_PRESETS.map((preset, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSelectPreset(preset)}
                    className="border border-slate-200 rounded-xl bg-white hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden h-64 group"
                  >
                    <div className="flex-1 bg-slate-100 relative overflow-hidden pointer-events-none">
                      <div className="absolute inset-0 transform scale-[0.4] origin-top-left w-[250%] h-[250%] bg-white" dangerouslySetInnerHTML={{ __html: preset.bodyHtml }} />
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
