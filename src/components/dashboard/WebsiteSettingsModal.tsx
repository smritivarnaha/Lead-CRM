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
  const [activeTab, setActiveTab] = useState<"general" | "auto_reply" | "integration">("general");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrentSite(site);
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

              {/* Admin Email Card */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" /> Admin Email (Instant Lead Alerts)
                </h3>
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
