"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { X, Save, ArrowLeft, Image as ImageIcon, Smartphone, Download, Code, Code2, Link as LinkIcon, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getWebsites } from "@/actions/websites";

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
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-indigo-600" /> How to Connect Your Website
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Choose one of the methods below to automatically send leads from your website forms directly into this CRM. You only need to set this up once!
              </p>
            </div>
            
            <div className="p-6 space-y-10">
              
              {/* Method 1: WordPress Plugin */}
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">1</span> 
                  Method 1: One-Click WP Plugin (Recommended)
                </h4>
                <div className="ml-8 text-sm text-slate-600 space-y-4">
                  <p>Download our auto-configured WordPress plugin. It automatically integrates with <strong>Elementor Pro Forms</strong> and <strong>Contact Form 7</strong> on your entire site.</p>
                  <ol className="list-decimal ml-4 space-y-2 text-slate-700">
                    <li>Click the download button below.</li>
                    <li>Go to your WordPress Admin Dashboard ➔ <strong>Plugins</strong> ➔ <strong>Add New</strong> ➔ <strong>Upload Plugin</strong>.</li>
                    <li>Upload the `.zip` file and click <strong>Activate</strong>. You're done!</li>
                  </ol>
                  <a href={`/api/websites/${site.id}/plugin`} download className="inline-flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm mt-2">
                    <Download className="w-4 h-4" /> Download Custom WP Plugin
                  </a>
                </div>
              </div>

              {/* Method 2: Manual PHP Snippet */}
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs">2</span> 
                  Method 2: PHP Snippet
                </h4>
                <div className="ml-8 text-sm text-slate-600 space-y-4">
                  <p>If you don't want to install a new plugin, you can paste this PHP snippet into the <strong>WPCode</strong> plugin or your theme's <code>functions.php</code> file. It provides 100% bulletproof server-side tracking.</p>
                  <div className="relative group">
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <button onClick={() => {
                        navigator.clipboard.writeText(`add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {\n    wp_remote_post( 'https://lead-crmsss.vercel.app/api/webhook/receive/${site.id}', [\n        'body' => wp_json_encode(array_map(function($f){return $f['value'];}, $record->get('fields'))),\n        'headers' => [ 'Content-Type' => 'application/json' ],\n        'blocking' => false\n    ]);\n}, 10, 2 );`);
                        toast.success("Snippet copied!");
                      }} className="p-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded transition-colors backdrop-blur-sm" title="Copy code">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <pre className="bg-[#1E1E1E] text-slate-300 p-4 rounded-lg text-[13px] overflow-x-auto leading-relaxed font-mono">
                      <code className="language-php">
{`add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {
    $fields = [];
    foreach ( $record->get( 'fields' ) as $id => $field ) {
        $fields[ $id ] = $field['value'];
    }
    wp_remote_post( 'https://lead-crmsss.vercel.app/api/webhook/receive/${site.id}', [
        'body' => wp_json_encode($fields),
        'headers' => [ 'Content-Type' => 'application/json' ],
        'blocking' => false
    ]);
}, 10, 2 );`}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Method 3: Direct Webhook */}
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs">3</span> 
                  Method 3: Direct Webhook URL
                </h4>
                <div className="ml-8 text-sm text-slate-600 space-y-4">
                  <p>Use this URL if you are pasting directly into Zapier, Make, or individual Elementor forms.</p>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 max-w-xl">
                    <code className="text-slate-800 font-mono text-[13px] truncate mr-4">
                      https://lead-crmsss.vercel.app/api/webhook/receive/{site.id}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://lead-crmsss.vercel.app/api/webhook/receive/${site.id}`);
                        toast.success("Webhook URL copied!");
                      }} 
                      className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs flex items-center gap-1.5 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
