"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { X, Save, ArrowLeft, Image as ImageIcon, Smartphone, Mail, PhoneCall, Clock, CheckCircle2, Sparkles, Send, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getWebsites } from "@/actions/websites";
import IntegrationTab from "@/components/IntegrationTab";

export default function ClientSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const websiteId = params.websiteId as string;

  const [site, setSite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "auto_reply" | "integration">("general");

  useEffect(() => {
    getWebsites().then(res => {
      if (res.success && res.websites) {
        const found = res.websites.find((w: any) => w.id === websiteId);
        if (found) setSite(found);
      }
      setLoading(false);
    });
  }, [websiteId]);

  const handleSave = async (field: string, value: any) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Settings saved successfully.");
        setSite(data.website);
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
          setSite((prev: any) => ({ ...prev, [field]: base64String }));
          handleSave(field, base64String);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!site) return <div className="p-8">Client not found.</div>;

  return (
    <div className="flex-1 p-8 bg-[#FAFAFA] overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" className="mb-4 -ml-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{site.name} Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure client alerts, customer auto-responder, and webhook integrations.</p>
        </div>

        <div className="flex gap-4 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab("general")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "general" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            General Settings
          </button>
          <button 
            onClick={() => setActiveTab("auto_reply")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${activeTab === "auto_reply" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Customer Auto-Reply (Thank You Email)
          </button>
          <button 
            onClick={() => setActiveTab("integration")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "integration" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Integration Setup
          </button>
        </div>

        {activeTab === "general" ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-3 border-b border-slate-100 pb-6">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-500" /> Client Logo (Badge Icon)
              </h3>
              <p className="text-xs text-slate-500">
                Upload a logo for this client. It will be used as the Android Status Bar icon for their push notifications.
              </p>
              <div className="flex gap-4 items-center mt-2">
                <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center relative overflow-hidden group">
                  {site.logoUrl ? (
                    <>
                      <img src={site.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                      <button 
                        onClick={() => handleSave("logoUrl", null)}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
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
                  onChange={(e) => handleImageUpload(e, "logoUrl", 72)}
                  className="flex-1 text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            </div>

            <div className="space-y-3 border-b border-slate-100 pb-6">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500" /> Admin Email (Lead Alerts)
              </h3>
              <p className="text-xs text-slate-500">
                The email address(es) that receive new lead alerts when a customer submits a form (e.g. mediclags@gmail.com). Separate multiple emails with commas.
              </p>
              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  value={site.adminEmail || ""} 
                  onChange={(e) => setSite({ ...site, adminEmail: e.target.value })}
                  onBlur={(e) => handleSave("adminEmail", e.target.value)}
                  placeholder="e.g. client@example.com"
                  className="flex-1 text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                />
                <Button disabled={saving} onClick={() => handleSave("adminEmail", site.adminEmail)}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-500" /> Admin Phone Number (SMS Alerts)
              </h3>
              <p className="text-xs text-slate-500">
                The mobile number that will receive SMS alerts (via Fast2SMS) when this specific client gets a lead.
              </p>
              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  value={site.adminPhone || ""} 
                  onChange={(e) => setSite({ ...site, adminPhone: e.target.value })}
                  onBlur={(e) => handleSave("adminPhone", e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="flex-1 text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                />
                <Button disabled={saving} onClick={() => handleSave("adminPhone", site.adminPhone)}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </div>
          </div>
        ) : activeTab === "auto_reply" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Main Toggle Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Send Automatic Confirmation to Visitors</h3>
                    <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Auto-Responder
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xl">
                    When enabled, any visitor who provides an email address on your form will instantly receive a branded thank-you email with their received details, a direct call button, and your working hours.
                  </p>
                </div>
                <Switch 
                  checked={site.customerAutoReplyEnabled ?? false}
                  onCheckedChange={(val: boolean) => {
                    setSite({ ...site, customerAutoReplyEnabled: val });
                    handleSave("customerAutoReplyEnabled", val);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Controls */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Mail className="w-4 h-4 text-indigo-500" /> Email Content & Details
                </h4>

                {/* Subject Line */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Email Subject Line</span>
                    <span className="text-[11px] text-slate-400 font-normal">Supports {`{{name}}`}, {`{{company}}`}</span>
                  </label>
                  <input 
                    type="text"
                    value={site.customerEmailSubject || `Thank you for contacting {{company}} — We received your details!`}
                    onChange={(e) => setSite({ ...site, customerEmailSubject: e.target.value })}
                    onBlur={(e) => handleSave("customerEmailSubject", e.target.value)}
                    placeholder="e.g. Thank you for contacting {{company}} — We received your details!"
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Thank You Message Body */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Personalized Message Body</span>
                    <span className="text-[11px] text-slate-400 font-normal">Supports {`{{name}}`}, {`{{company}}`}</span>
                  </label>
                  <textarea 
                    rows={4}
                    value={site.customerEmailMessage || `Dear {{name}},\n\nThank you for reaching out to {{company}}. We have successfully received your enquiry.\n\nOur specialized team is reviewing your information and will contact you shortly.`}
                    onChange={(e) => setSite({ ...site, customerEmailMessage: e.target.value })}
                    onBlur={(e) => handleSave("customerEmailMessage", e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-200 p-3 outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  />
                </div>

                {/* Working Hours / Response Window */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> Working Hours / Response Window
                  </label>
                  <input 
                    type="text"
                    value={site.customerWorkingHours || "Mon - Sat: 9:00 AM - 7:00 PM"}
                    onChange={(e) => setSite({ ...site, customerWorkingHours: e.target.value })}
                    onBlur={(e) => handleSave("customerWorkingHours", e.target.value)}
                    placeholder="e.g. Mon - Sat: 9:00 AM - 7:00 PM"
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Informs visitors of your operating hours during which your team will contact them.
                  </p>
                </div>

                <div className="pt-2">
                  <Button 
                    disabled={saving} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    onClick={() => {
                      handleSave("customerEmailSubject", site.customerEmailSubject);
                      handleSave("customerEmailMessage", site.customerEmailMessage);
                      handleSave("customerWorkingHours", site.customerWorkingHours);
                    }}
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Auto-Responder Settings
                  </Button>
                </div>
              </div>

              {/* Interactive Live Email Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Visitor Email Live Preview
                  </h4>
                  <span className="text-[11px] text-slate-400">Interactive Preview</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md">
                  {/* Email Header Banner */}
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-center text-white">
                    <h3 className="text-lg font-bold tracking-tight">{site.name || "Our Team"}</h3>
                    <p className="text-xs text-indigo-100 mt-0.5">Details Received · We Will Contact You Soon</p>
                  </div>

                  {/* Email Body */}
                  <div className="p-5 space-y-4 text-slate-700 text-xs leading-relaxed">
                    <div className="whitespace-pre-line text-slate-800 font-medium">
                      {(site.customerEmailMessage || "Dear John Doe,\n\nThank you for reaching out to {{company}}. We have successfully received your enquiry.\n\nOur specialized team is reviewing your information and will contact you shortly.")
                        .replace(/{{name}}/g, "John Doe")
                        .replace(/{{company}}/g, site.name || "Our Team")}
                    </div>

                    {/* Submission Summary Box */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3.5 space-y-1.5 text-[11px]">
                      <p className="font-bold uppercase text-slate-500 text-[10px] tracking-wider">Summary of Your Submission:</p>
                      <div className="space-y-1 text-slate-600">
                        <div>• <strong>Name:</strong> John Doe</div>
                        <div>• <strong>Phone:</strong> +91 98765 43210</div>
                        <div>• <strong>Location:</strong> Mohali, Punjab</div>
                        <div>• <strong>Status:</strong> <span className="text-emerald-600 font-semibold">Received & In Queue</span></div>
                        <div>• <strong>Date Received:</strong> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                    </div>

                    {/* Response Window Badge */}
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200/70 rounded-lg text-emerald-800 text-[11px] flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>Response Window:</strong> Our team will contact you during working hours ({site.customerWorkingHours || "Mon - Sat: 9:00 AM - 7:00 PM"}).</span>
                    </div>

                    <div className="text-center pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      Automated confirmation sent by {site.name}. You do not need to reply to this email.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <IntegrationTab site={site} />
        )}
      </div>
    </div>
  );
}
