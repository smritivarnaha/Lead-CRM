"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Save, 
  Image as ImageIcon, 
  Smartphone, 
  Mail, 
  Clock, 
  Sparkles, 
  Settings, 
  Layers, 
  Check, 
  ExternalLink,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import IntegrationTab from "@/components/IntegrationTab";

interface WebsiteSettingsModalProps {
  site: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedSite: any) => void;
}

export function WebsiteSettingsModal({ site, isOpen, onClose, onUpdate }: WebsiteSettingsModalProps) {
  const [currentSite, setCurrentSite] = useState<any>(site);
  const [activeTab, setActiveTab] = useState<"general" | "admin_email" | "auto_reply" | "integration">("general");
  const [saving, setSaving] = useState(false);

  const parseAdminAlertData = (siteData: any) => {
    let notice = `This verified lead was received from your website {{company}} via Rankved Healthcare Martech.`;
    let message = `You have received a new hot lead on {{company}}!\n\nReview the contact details below and connect immediately.`;
    let cta = `Open Lead in CRM`;

    if (siteData?.adminEmailTemplate) {
      if (typeof siteData.adminEmailTemplate === "string" && siteData.adminEmailTemplate.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(siteData.adminEmailTemplate);
          if (parsed.notice) notice = parsed.notice;
          if (parsed.message) message = parsed.message;
          if (parsed.cta) cta = parsed.cta;
        } catch (e) {
          message = siteData.adminEmailTemplate;
        }
      } else {
        message = siteData.adminEmailTemplate;
      }
    }
    return { notice, message, cta };
  };

  const initialAlertData = parseAdminAlertData(site);
  const [adminNotice, setAdminNotice] = useState<string>(initialAlertData.notice);
  const [adminMessage, setAdminMessage] = useState<string>(initialAlertData.message);
  const [adminCta, setAdminCta] = useState<string>(initialAlertData.cta);

  useEffect(() => {
    setCurrentSite(site);
    const data = parseAdminAlertData(site);
    setAdminNotice(data.notice);
    setAdminMessage(data.message);
    setAdminCta(data.cta);
  }, [site]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !currentSite) return null;

  const handleSave = async (field: string, value: any) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/websites/${currentSite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Settings saved successfully.");
        const updated = { ...currentSite, [field]: value };
        setCurrentSite(updated);
        if (onUpdate) onUpdate(updated);
      } else {
        toast.error("Failed to update.");
      }
    } catch (e) {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBatch = async (updates: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/websites/${currentSite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Settings saved successfully.");
        const updated = { ...currentSite, ...updates };
        setCurrentSite(updated);
        if (onUpdate) onUpdate(updated);
      } else {
        toast.error("Failed to update.");
      }
    } catch (e) {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string, maxSize: number = 192) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image is too large. Please select a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64String = canvas.toDataURL("image/png");
          handleSave(field, base64String);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden p-1 shadow-2xs">
              {currentSite.logoUrl ? (
                <img src={currentSite.logoUrl} alt={currentSite.name} className="w-full h-full object-contain rounded-lg" />
              ) : (
                <Globe className="w-5 h-5 text-indigo-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{currentSite.name}</h2>
                <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                  Configuration
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentSite.domain ? currentSite.domain.replace(/^https?:\/\//, '') : "Settings & Integrations"}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-slate-50/50 shrink-0 overflow-x-auto no-scrollbar">
          <button 
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === "general" 
                ? "border-indigo-600 text-indigo-700 font-bold" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>General Alerts</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab("admin_email")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === "admin_email" 
                ? "border-indigo-600 text-indigo-700 font-bold" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Mail className="w-4 h-4 text-indigo-500" />
            <span>Admin Email (Instant Lead Alerts)</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab("auto_reply")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === "auto_reply" 
                ? "border-indigo-600 text-indigo-700 font-bold" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Customer Auto-Reply (Thank You Email)</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab("integration")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === "integration" 
                ? "border-indigo-600 text-indigo-700 font-bold" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Integration & Webhooks</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "general" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Client Logo Card */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-500" /> Project Logo / Badge Icon
                </h3>
                <p className="text-xs text-slate-500">
                  Upload a brand logo for this project. Used for notification badges, emails, and tabs.
                </p>
                <div className="flex gap-4 items-center mt-2">
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center relative overflow-hidden group shadow-2xs">
                    {currentSite.logoUrl ? (
                      <>
                        <img src={currentSite.logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                        <button 
                          type="button"
                          onClick={() => handleSave("logoUrl", null)}
                          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                          title="Remove logo"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/png, image/webp"
                    onChange={(e) => handleImageUpload(e, "logoUrl", 96)}
                    className="flex-1 text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition-colors cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
              </div>

              {/* Admin Email Card with link to detailed tab */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-500" /> Admin Email (Instant Lead Alerts)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("admin_email")}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    Customize Format & Preview →
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  The email address(es) that receive new lead alerts whenever a visitor submits a form. Separate multiple emails with commas.
                </p>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    value={currentSite.adminEmail || ""} 
                    onChange={(e) => setCurrentSite({ ...currentSite, adminEmail: e.target.value })}
                    onBlur={(e) => handleSave("adminEmail", e.target.value)}
                    placeholder="e.g. alerts@yourdomain.com, admin@yourdomain.com"
                    className="flex-1 text-sm bg-white rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 shadow-2xs"
                  />
                  <Button 
                    disabled={saving} 
                    onClick={() => handleSave("adminEmail", currentSite.adminEmail)}
                    className="bg-[#1A1523] hover:bg-indigo-600 text-white text-xs font-semibold px-4"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                  </Button>
                </div>
              </div>

              {/* Admin Phone Card */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-500" /> Admin Phone Number (SMS Alerts)
                </h3>
                <p className="text-xs text-slate-500">
                  The mobile number that receives immediate SMS alerts (via Fast2SMS) when this specific project gets a lead.
                </p>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    value={currentSite.adminPhone || ""} 
                    onChange={(e) => setCurrentSite({ ...currentSite, adminPhone: e.target.value })}
                    onBlur={(e) => handleSave("adminPhone", e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="flex-1 text-sm bg-white rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 shadow-2xs"
                  />
                  <Button 
                    disabled={saving} 
                    onClick={() => handleSave("adminPhone", currentSite.adminPhone)}
                    className="bg-[#1A1523] hover:bg-indigo-600 text-white text-xs font-semibold px-4"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "admin_email" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Main Toggle Card */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Send Instant Email Alerts to Admins</h3>
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${
                        currentSite.emailAlertsEnabled !== false
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {currentSite.emailAlertsEnabled !== false ? "⚡ Instant Alerts Active" : "Alerts Paused"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-xl">
                      When enabled, your team will immediately receive a rich email alert with complete customer details every time a lead submits a form on this website.
                    </p>
                  </div>
                  <Switch 
                    checked={currentSite.emailAlertsEnabled !== false}
                    onCheckedChange={(val: boolean) => {
                      setCurrentSite({ ...currentSite, emailAlertsEnabled: val });
                      handleSave("emailAlertsEnabled", val);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Controls */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" /> Admin Alert Configuration
                    </h4>
                    <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      Rankved Martech Brand
                    </span>
                  </div>

                  {/* Recipient Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Recipient Admin Email(s)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Comma-separated</span>
                    </label>
                    <input 
                      type="text"
                      value={currentSite.adminEmail || ""}
                      onChange={(e) => setCurrentSite({ ...currentSite, adminEmail: e.target.value })}
                      placeholder="e.g. alerts@yourdomain.com, admin@yourdomain.com"
                      className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10.5px] text-slate-400">
                      The inbox(es) where hot lead notifications are delivered.
                    </p>
                  </div>

                  {/* Subject Line */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Email Subject Line</span>
                      <span className="text-[10px] text-slate-400 font-normal">Supports &#123;&#123;name&#125;&#125;, &#123;&#123;company&#125;&#125;, &#123;&#123;phone&#125;&#125;</span>
                    </label>
                    <input 
                      type="text"
                      value={currentSite.adminEmailSubject || `🔔 New Lead: {{name}} - {{company}}`}
                      onChange={(e) => setCurrentSite({ ...currentSite, adminEmailSubject: e.target.value })}
                      placeholder="e.g. 🔔 New Lead: {{name}} - {{company}}"
                      className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Website Source Notice / Client Identification */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Website Source Notice (Client Identification)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Supports &#123;&#123;company&#125;&#125;, &#123;&#123;url&#125;&#125;</span>
                    </label>
                    <textarea 
                      rows={2}
                      value={adminNotice}
                      onChange={(e) => setAdminNotice(e.target.value)}
                      placeholder="e.g. This verified lead was received from your website {{company}} via Rankved Healthcare Martech."
                      className="w-full text-xs rounded-lg border border-slate-200 p-2.5 outline-none focus:border-indigo-500 leading-relaxed resize-none font-sans"
                    />
                    <p className="text-[10.5px] text-slate-400">
                      Explicitly lets the client or admin know this lead originated from their specific website.
                    </p>
                  </div>

                  {/* Custom Alert Message / Header Note */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Custom Alert Message / Header Note</span>
                      <span className="text-[10px] text-slate-400 font-normal">Supports &#123;&#123;name&#125;&#125;, &#123;&#123;company&#125;&#125;</span>
                    </label>
                    <textarea 
                      rows={3}
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      placeholder="e.g. You have received a new hot lead on {{company}}! Review the contact details below and connect immediately."
                      className="w-full text-xs rounded-lg border border-slate-200 p-2.5 outline-none focus:border-indigo-500 leading-relaxed resize-none font-sans"
                    />
                  </div>

                  {/* Action CTA Button Label */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Action CTA Button Label</span>
                      <span className="text-[10px] text-slate-400 font-normal">Button Text</span>
                    </label>
                    <input 
                      type="text"
                      value={adminCta}
                      onChange={(e) => setAdminCta(e.target.value)}
                      placeholder="e.g. Open Lead in CRM"
                      className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Dynamic Placeholders */}
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dynamic Placeholders:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["{{name}}", "{{phone}}", "{{email}}", "{{company}}", "{{url}}", "{{source}}", "{{all_fields}}"].map((tag) => (
                        <code key={tag} className="text-[10.5px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                          {tag}
                        </code>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      disabled={saving} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 cursor-pointer"
                      onClick={() => {
                        const combinedTemplate = JSON.stringify({
                          notice: adminNotice,
                          message: adminMessage,
                          cta: adminCta,
                        });
                        handleSaveBatch({
                          adminEmail: currentSite.adminEmail,
                          adminEmailSubject: currentSite.adminEmailSubject,
                          adminEmailTemplate: combinedTemplate,
                          emailAlertsEnabled: currentSite.emailAlertsEnabled,
                        });
                      }}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Save Admin Alert Settings
                    </Button>
                  </div>
                </div>

                {/* Interactive Live Email Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Admin Email Live Preview
                    </h4>
                    <span className="text-[10.5px] text-slate-400">Interactive Preview</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    {/* Rankved Healthcare Martech Top Brand Bar */}
                    <div className="bg-white px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src="https://rankved.com/wp-content/uploads/2025/04/Rankved-Logo-Official-Black.avif" 
                          alt="Rankved Healthcare Martech" 
                          className="h-6 w-auto object-contain"
                        />
                      </div>
                      <span className="text-[9.5px] font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                        Lead Automation Engine
                      </span>
                    </div>

                    {/* Email Header Banner */}
                    <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-4 text-white">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                          ⚡ Hot Lead Alert
                        </span>
                        <span className="text-[10.5px] text-slate-300 font-medium">
                          {currentSite.name || "Our Team"}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold tracking-tight text-white leading-snug">
                        {(currentSite.adminEmailSubject || "🔔 New Lead: {{name}} - {{company}}")
                          .replace(/{{name}}/g, "John Doe")
                          .replace(/{{company}}/g, currentSite.name || "Our Team")
                          .replace(/{{phone}}/g, "+91 98765 43210")
                          .replace(/{{source}}/g, "Website Form")}
                      </h3>
                      <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1.5">
                        <span>Recipient: {currentSite.adminEmail || "alerts@yourdomain.com"}</span>
                      </p>
                    </div>

                    {/* Email Body */}
                    <div className="p-4 space-y-3.5 text-slate-700 text-xs leading-relaxed">
                      {/* Website Source Notice Box */}
                      <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                          <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Verified Website Lead Source</span>
                        </div>
                        <p className="text-[11.5px] text-emerald-950 font-medium leading-relaxed">
                          {(adminNotice || "This verified lead was received from your website {{company}} via Rankved Healthcare Martech.")
                            .replace(/{{company}}/g, currentSite.name || "Our Team")
                            .replace(/{{url}}/g, currentSite.domain ? currentSite.domain.replace(/^https?:\/\//, '') : "your-website.com")}
                        </p>
                      </div>

                      {/* Intro Message Note */}
                      <div className="whitespace-pre-line text-slate-800 font-medium text-[11.5px] bg-slate-50 border border-slate-200/70 rounded-lg p-3">
                        {(adminMessage || "You have received a new hot lead on {{company}}!\n\nReview the contact details below and connect immediately.")
                          .replace(/{{name}}/g, "John Doe")
                          .replace(/{{company}}/g, currentSite.name || "Our Team")
                          .replace(/{{source}}/g, "Website Form")}
                      </div>

                      {/* Lead Details Table */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-2 text-[11px]">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="font-bold uppercase text-slate-500 text-[9.5px] tracking-wider">Submitted Lead Details</span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Verified Submission
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-700">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Full Name:</span>
                            <span className="font-bold text-slate-900">John Doe</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Phone Number:</span>
                            <span className="font-bold text-indigo-600">+91 98765 43210</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Email Address:</span>
                            <span className="font-semibold text-slate-800">john.doe@example.com</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">City / Location:</span>
                            <span className="font-medium text-slate-800">Mohali, Punjab</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[10px] text-slate-400 block">Requirement / Message:</span>
                            <span className="text-slate-800">Interested in 3 BHK Luxury Apartment, please share brochure & pricing.</span>
                          </div>
                        </div>

                        {/* System Details */}
                        <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-500 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Source URL:</span>
                            <span className="text-indigo-600 font-mono">https://{currentSite.domain ? currentSite.domain.replace(/^https?:\/\//, '') : 'example.com'}/contact</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>IP Address:</span>
                            <span className="font-mono">103.45.22.89</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Received At:</span>
                            <span>{new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="pt-1 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 w-full bg-[#1A1523] text-white py-2 px-4 rounded-lg text-xs font-semibold shadow-xs">
                          <span>{adminCta || "Open Lead in CRM"}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Email Footer */}
                      <div className="text-center pt-2 border-t border-slate-100 text-[10px] text-slate-400 leading-tight space-y-1">
                        <div className="flex items-center justify-center">
                          <img 
                            src="https://rankved.com/wp-content/uploads/2025/04/Rankved-Logo-Official-Black.avif" 
                            alt="Rankved Healthcare Martech" 
                            className="h-3.5 w-auto object-contain opacity-70"
                          />
                        </div>
                        <p className="font-semibold text-slate-500">Lead Automation CRM Developed By Rankved Healthcare Martech</p>
                        <p>Dispatched instantly to {currentSite.adminEmail || "alerts@yourdomain.com"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "auto_reply" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Main Toggle Card */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Send Automatic Confirmation to Visitors</h3>
                      <span className="text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                        Active Auto-Reply
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-xl">
                      When enabled, any visitor who provides an email address on your form will instantly receive a branded thank-you email confirming their details.
                    </p>
                  </div>
                  <Switch 
                    checked={currentSite.customerAutoReplyEnabled ?? false}
                    onCheckedChange={(val: boolean) => {
                      setCurrentSite({ ...currentSite, customerAutoReplyEnabled: val });
                      handleSave("customerAutoReplyEnabled", val);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Controls */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" /> Email Content & Details
                  </h4>

                  {/* Subject Line */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Email Subject Line</span>
                      <span className="text-[10px] text-slate-400 font-normal">Supports {`{{name}}`}, {`{{company}}`}</span>
                    </label>
                    <input 
                      type="text"
                      value={currentSite.customerEmailSubject || `Thank you for contacting {{company}} — We received your details!`}
                      onChange={(e) => setCurrentSite({ ...currentSite, customerEmailSubject: e.target.value })}
                      placeholder="e.g. Thank you for contacting {{company}} — We received your details!"
                      className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Thank You Message Body */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Personalized Message Body</span>
                      <span className="text-[10px] text-slate-400 font-normal">Supports {`{{name}}`}, {`{{company}}`}</span>
                    </label>
                    <textarea 
                      rows={4}
                      value={currentSite.customerEmailMessage || `Dear {{name}},\n\nThank you for reaching out to {{company}}. We have successfully received your enquiry.\n\nOur specialized team is reviewing your information and will contact you shortly.`}
                      onChange={(e) => setCurrentSite({ ...currentSite, customerEmailMessage: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 p-3 outline-none focus:border-indigo-500 leading-relaxed resize-none font-sans"
                    />
                  </div>

                  {/* Working Hours / Response Window */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" /> Working Hours / Response Window
                    </label>
                    <input 
                      type="text"
                      value={currentSite.customerWorkingHours || "Mon - Sat: 9:00 AM - 7:00 PM"}
                      onChange={(e) => setCurrentSite({ ...currentSite, customerWorkingHours: e.target.value })}
                      placeholder="e.g. Mon - Sat: 9:00 AM - 7:00 PM"
                      className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10.5px] text-slate-400">
                      Informs visitors of your operating hours during which your team will contact them.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button 
                      disabled={saving} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2"
                      onClick={() => {
                        handleSaveBatch({
                          customerEmailSubject: currentSite.customerEmailSubject,
                          customerEmailMessage: currentSite.customerEmailMessage,
                          customerWorkingHours: currentSite.customerWorkingHours,
                        });
                      }}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Save Auto-Responder
                    </Button>
                  </div>
                </div>

                {/* Interactive Live Email Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Visitor Email Live Preview
                    </h4>
                    <span className="text-[10.5px] text-slate-400">Interactive Preview</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    {/* Email Header Banner */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-center text-white">
                      <h3 className="text-base font-bold tracking-tight">{currentSite.name || "Our Team"}</h3>
                      <p className="text-[11px] text-indigo-100 mt-0.5">Details Received · We Will Contact You Soon</p>
                    </div>

                    {/* Email Body */}
                    <div className="p-4 space-y-3.5 text-slate-700 text-xs leading-relaxed">
                      <div className="whitespace-pre-line text-slate-800 font-medium">
                        {(currentSite.customerEmailMessage || "Dear John Doe,\n\nThank you for reaching out to {{company}}. We have successfully received your enquiry.\n\nOur specialized team is reviewing your information and will contact you shortly.")
                          .replace(/{{name}}/g, "John Doe")
                          .replace(/{{company}}/g, currentSite.name || "Our Team")}
                      </div>

                      {/* Submission Summary Box */}
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1 text-[11px]">
                        <p className="font-bold uppercase text-slate-500 text-[9.5px] tracking-wider">Summary of Your Submission:</p>
                        <div className="space-y-1 text-slate-600">
                          <div>• <strong>Name:</strong> John Doe</div>
                          <div>• <strong>Phone:</strong> +91 98765 43210</div>
                          <div>• <strong>Location:</strong> Mohali, Punjab</div>
                          <div>• <strong>Status:</strong> <span className="text-emerald-600 font-semibold">Received & In Queue</span></div>
                          <div>• <strong>Date Received:</strong> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                      </div>

                      {/* Response Window Badge */}
                      <div className="p-2.5 bg-emerald-50/80 border border-emerald-200/70 rounded-lg text-emerald-800 text-[10.5px] flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>Response Window:</strong> Our team will contact you during working hours ({currentSite.customerWorkingHours || "Mon - Sat: 9:00 AM - 7:00 PM"}).</span>
                      </div>

                      <div className="text-center pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        Automated confirmation sent by {currentSite.name}. You do not need to reply to this email.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "integration" && (
            <div className="animate-in fade-in duration-200">
              <IntegrationTab site={currentSite} />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">Changes apply immediately upon saving.</span>
          <Button 
            variant="outline"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
