"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { X, Save, ArrowLeft, Image as ImageIcon, Smartphone, Download, Code, Code2, Link as LinkIcon, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [activeTab, setActiveTab] = useState<"general" | "integration">("general");

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
        toast.success("Client settings updated.");
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
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" className="mb-4 -ml-4" onClick={() => router.push("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{site.name} Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure client-specific notification routing.</p>
        </div>

        <div className="flex gap-4 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab("general")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "general" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            General Settings
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

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-500" /> Admin Phone Number
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
        ) : (
          <IntegrationTab site={site} />
        )}
      </div>
    </div>
  );
}
