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
          <IntegrationTab site={site} />
        )}
      </div>
    </div>
  );
}

const SVGIcons = {
  WordPress: (props: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12.158 12.786l-2.698 7.84c.806.236 1.657.365 2.54.365 1.047 0 2.05-.18 2.986-.51-.024-.037-.046-.078-.065-.123l-2.762-7.57zM3.007 12c0 3.568 2.06 6.644 5.068 8.092L3.788 8.341c-.496 1.117-.78 2.36-.78 3.659zm14.602-5.464c0 1.25-.472 2.046-.866 2.827-.456.882-.866 1.65-.866 2.58 0 1.118.866 2.158 2.03 2.158.125 0 .245-.01.355-.034C17.65 17.643 15.1 20.35 12 20.35c-.477 0-.943-.04-1.396-.118l3.864-11.196c.205-.59.252-.818.252-1.077 0-.472-.252-.803-.803-.803-.095 0-.213.016-.34.047l-4.14 1.19c-.314.094-.487.393-.41.708.07.29.35.45.64.45.06 0 .13-.01.19-.02l.62-.16c.39-.1.61-.01.74.37l3.22 9.27-2.33-7.56c-.16-.47-.53-.74-.95-.74-.08 0-.15.01-.23.03l-.68.17c-.31.08-.62-.11-.71-.42-.08-.32.11-.64.43-.72l4.02-1.02c.11-.03.22-.04.34-.04.59 0 .86.35.86.85 0 .26-.06.51-.28 1.1l-1.95 5.64 1.55-4.52c.26-.74.63-1.63.63-2.6 0-1.01-.58-1.78-1.12-2.42zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22.8c-5.967 0-10.8-4.833-10.8-10.8S6.033 1.2 12 1.2 22.8 6.033 22.8 12 17.967 22.8 12 22.8z"/></svg>,
  GoogleSheets: (props: any) => <svg viewBox="0 0 48 48" {...props}><path fill="#0F9D58" d="M37,45H11c-1.657,0-3-1.343-3-3V6c0-1.657,1.343-3,3-3h19l10,10v29C40,43.657,38.657,45,37,45z"/><path fill="#87CEFA" d="M30,3H11C9.343,3,8,4.343,8,6v36c0,1.657,1.343,3,3,3h26c1.657,0,3-1.343,3-3V13L30,3z"/><path fill="#0F9D58" d="M30,3v10h10L30,3z"/><path fill="#FFF" d="M15,23h18v4H15V23z M15,31h18v4H15V31z M15,15h10v4H15V15z"/></svg>,
  HTML: (props: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M2.083 1.5l1.83 20.485L11.96 24l8.138-2.015L21.917 1.5H2.083zm17.062 19.34l-7.185 1.78-7.172-1.78-1.5-16.82h17.355l-1.498 16.82zm-3.036-12.78H7.314l-.19-2.128h11.23l-.19 2.128zm-2.016 4.39H8.563l-.15 1.66h5.308l-.348 3.882-3.328.898-3.328-.897-.212-2.378H4.63l.36 4.025 5.06 1.365 5.05-1.365.626-6.99z"/></svg>,
  PHP: (props: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M24 10.963c0 2.87-4.043 5.197-9.034 5.197h-2.03l-1.077 3.426h-2.58l1.074-3.426H5.405c-1.637 0-3.096-.46-4.04-1.22-.942-.76-1.364-1.802-1.364-2.937 0-1.127.425-2.164 1.353-2.92.93-.755 2.375-1.213 3.998-1.213h4.945c2.316 0 4.168.618 5.43 1.834 1.258 1.213 1.848 2.898 1.848 4.673H24zm-6.425 0c0-1.187-.393-2.31-1.218-3.104-.823-.794-2.023-1.2-3.525-1.2H8.38l-.683 2.176h4.453c1.072 0 1.884.288 2.454.84.57.552.822 1.282.822 2.052 0 .762-.245 1.484-.8 2.028-.553.543-1.354.823-2.4.823H7.727l-.686 2.18h3.315c1.474 0 2.66-.398 3.472-1.183.813-.787 1.2-1.9 1.2-3.076l1.547-1.536z"/></svg>,
  Webhook: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
};

function IntegrationTab({ site }: { site: any }) {
  const [activeMethod, setActiveMethod] = useState<string>("wordpress");

  const methods = [
    {
      id: "wordpress",
      title: "WordPress Plugin",
      desc: "One-click install for WP",
      icon: <SVGIcons.WordPress className="w-8 h-8 text-[#0073AA]" />,
      color: "border-[#0073AA]"
    },
    {
      id: "sheets",
      title: "Google Sheets",
      desc: "Auto-sync rows & forms",
      icon: <SVGIcons.GoogleSheets className="w-8 h-8" />,
      color: "border-[#0F9D58]"
    },
    {
      id: "html",
      title: "Custom HTML",
      desc: "Universal JS Snippet",
      icon: <SVGIcons.HTML className="w-8 h-8 text-[#E34F26]" />,
      color: "border-[#E34F26]"
    },
    {
      id: "php",
      title: "PHP Snippet",
      desc: "Server-side WP Tracking",
      icon: <SVGIcons.PHP className="w-8 h-8 text-[#777BB4]" />,
      color: "border-[#777BB4]"
    },
    {
      id: "webhook",
      title: "Direct Webhook",
      desc: "Zapier, Make.com, APIs",
      icon: <SVGIcons.Webhook className="w-8 h-8 text-indigo-500" />,
      color: "border-indigo-500"
    }
  ];

  const CopyBox = ({ code, language = "javascript" }: { code: string, language?: string }) => (
    <div className="relative group rounded-xl overflow-hidden mt-4 border border-slate-700 shadow-xl">
      <div className="absolute top-0 w-full flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm z-10">
        <span className="text-[11px] font-mono font-medium text-slate-400">{language}</span>
        <button onClick={() => {
          navigator.clipboard.writeText(code);
          toast.success("Copied to clipboard!");
        }} className="flex items-center gap-1.5 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition-colors shadow-sm">
          <Copy className="w-3.5 h-3.5" /> Copy Code
        </button>
      </div>
      <pre className="bg-[#1E1E1E] text-slate-300 p-5 pt-14 text-[13px] overflow-x-auto leading-relaxed font-mono max-h-96">
        <code>{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {methods.map(m => (
          <button 
            key={m.id}
            onClick={() => setActiveMethod(m.id)}
            className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all duration-200 bg-white hover:shadow-md ${activeMethod === m.id ? `${m.color} shadow-sm bg-slate-50 scale-[1.02]` : "border-slate-100 hover:border-slate-300 opacity-70 hover:opacity-100"}`}
          >
            {m.icon}
            <span className="mt-3 text-sm font-bold text-slate-900">{m.title}</span>
            <span className="mt-1 text-[11px] text-slate-500 leading-tight hidden md:block">{m.desc}</span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 min-h-[400px]">
        
        {activeMethod === "wordpress" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.WordPress className="w-6 h-6 text-[#0073AA]" /> WordPress Plugin
            </h3>
            <p className="text-slate-600 mb-6">The easiest way to track leads from Elementor Pro Forms and Contact Form 7. No coding required.</p>
            
            <div className="bg-[#F0F6FC] border border-[#C8E1FF] rounded-xl p-5 mb-6">
              <ol className="list-decimal ml-4 space-y-3 text-slate-800 font-medium text-sm">
                <li>Click the download button below to get your custom-built plugin.</li>
                <li>Go to your WordPress Admin Dashboard ➔ <strong>Plugins</strong> ➔ <strong>Add New</strong> ➔ <strong>Upload Plugin</strong>.</li>
                <li>Upload the <code className="bg-white px-1.5 py-0.5 rounded text-xs border border-slate-200">.zip</code> file and click <strong>Activate</strong>. You're done!</li>
              </ol>
            </div>
            
            <a href={`/api/websites/${site.id}/plugin`} download className="inline-flex items-center justify-center gap-2 bg-[#0073AA] text-white hover:bg-[#005177] px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg w-full sm:w-auto">
              <Download className="w-4 h-4" /> Download Custom WP Plugin
            </a>
          </div>
        )}

        {activeMethod === "sheets" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.GoogleSheets className="w-6 h-6" /> Google Sheets Sync
            </h3>
            <p className="text-slate-600 mb-6">Turn any Google Sheet into a live lead database. Perfect for Google Forms or manual entry.</p>
            
            <div className="bg-[#E6F4EA] border border-[#CEEAD6] rounded-xl p-5 mb-6">
              <ol className="list-decimal ml-4 space-y-3 text-[#0D652D] font-medium text-sm">
                <li>Open your Google Sheet and click <strong>Extensions ➔ Apps Script</strong>.</li>
                <li>Paste the code below, replacing everything, and click <strong>Save</strong>.</li>
                <li>Refresh your Google Sheet. You will now see a custom <strong>LeadFlow CRM</strong> menu at the top!</li>
              </ol>
            </div>
            
            <CopyBox language="Google Apps Script (javascript)" code={`const WEBHOOK_URL = 'https://lead-crmsss.vercel.app/api/webhook/receive/${site.id}';

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('LeadFlow CRM')
      .addItem('Push Selected Row to CRM', 'sendRowToCRM')
      .addToUi();
}

function sendRowToCRM() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveCell().getRow();
  if (row === 1) return SpreadsheetApp.getUi().alert("Please select a data row.");
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  var payload = {};
  for (var i = 0; i < headers.length; i++) {
    if (headers[i]) payload[headers[i]] = values[i];
  }
  
  UrlFetchApp.fetch(WEBHOOK_URL, {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  });
}`} />
          </div>
        )}

        {activeMethod === "html" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.HTML className="w-6 h-6 text-[#E34F26]" /> Universal HTML Form Snippet
            </h3>
            <p className="text-slate-600 mb-6">Works seamlessly with <strong>any HTML website, Framer, Webflow, or multi-step form</strong>. Just drop this script into the <code>&lt;head&gt;</code> or footer of your site.</p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900 mb-1">How it works:</p>
              This intelligent script automatically listens for any form submission on your website. When a user submits a form, it grabs all the inputs and instantly sends them to your CRM behind the scenes.
            </div>

            <CopyBox language="HTML Snippet (html)" code={`<script>
document.addEventListener('submit', function(e) {
  const form = e.target.closest('form');
  if (!form) return;
  
  // 1. Automatically grab EVERY field in your HTML form
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.page_url = window.location.href;

  // 2. Send to CRM silently in the background
  fetch('https://lead-crmsss.vercel.app/api/webhook/receive/${site.id}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true // Ensures data sends perfectly even if the page redirects
  }).catch(console.error);
});
</script>`} />
          </div>
        )}

        {activeMethod === "php" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.PHP className="w-6 h-6 text-[#777BB4]" /> PHP Snippet (WPCode)
            </h3>
            <p className="text-slate-600 mb-6">For advanced WordPress users. Paste this into your theme's <code>functions.php</code> or using the WPCode snippet plugin for ultra-fast server-side tracking.</p>
            
            <CopyBox language="PHP (functions.php)" code={`add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {
    $fields = [];
    foreach ( $record->get( 'fields' ) as $id => $field ) {
        $fields[ $id ] = $field['value'];
    }
    
    // Auto-detect IP and Page URL
    $fields['page_url'] = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
    $fields['ipAddress'] = isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0] : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '');
    
    // Post to CRM
    wp_remote_post( 'https://lead-crmsss.vercel.app/api/webhook/receive/${site.id}', [
        'body' => wp_json_encode($fields),
        'headers' => [ 'Content-Type' => 'application/json' ],
        'blocking' => false
    ]);
}, 10, 2 );`} />
          </div>
        )}

        {activeMethod === "webhook" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.Webhook className="w-6 h-6 text-indigo-500" /> Direct Webhook
            </h3>
            <p className="text-slate-600 mb-6">Connect to third-party automation tools like <strong>Zapier, Make.com, Jotform, or Typeform</strong>.</p>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-inner">
              <p className="text-sm font-semibold text-indigo-900 mb-4">Your Unique Webhook URL</p>
              
              <div className="flex w-full max-w-2xl items-center bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm">
                <code className="flex-1 text-slate-800 font-mono text-[13px] px-4 py-3 text-left overflow-x-auto whitespace-nowrap">
                  https://lead-crmsss.vercel.app/api/webhook/receive/{site.id}
                </code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://lead-crmsss.vercel.app/api/webhook/receive/${site.id}`);
                    toast.success("Webhook URL copied!");
                  }} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 px-6 py-4 h-full transition-colors shrink-0 border-l border-indigo-700"
                >
                  <Copy className="w-4 h-4" /> Copy URL
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
