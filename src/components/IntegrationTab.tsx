"use client";

import { useState, useEffect } from "react";
import { Copy, Download, LinkIcon } from "lucide-react";
import { toast } from "sonner";

export const SVGIcons = {
  WordPress: (props: any) => <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/WordPress_blue_logo.svg/1280px-WordPress_blue_logo.svg.png?_=20170312030453" alt="WordPress" {...props} />,
  GoogleSheets: (props: any) => <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Google_Sheets_2020_Logo.svg/960px-Google_Sheets_2020_Logo.svg.png" alt="Google Sheets" {...props} />,
  HTML: (props: any) => <img src="https://upload.wikimedia.org/wikipedia/commons/3/38/HTML5_Badge.svg" alt="HTML5" {...props} />,
  PHP: (props: any) => <img src="https://upload.wikimedia.org/wikipedia/commons/2/27/PHP-logo.svg" alt="PHP" {...props} />,
  Webhook: (props: any) => (
    <div {...props} className={`flex items-center justify-center bg-indigo-100 rounded-full ${props.className || ''}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[55%] h-[55%] text-indigo-600">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    </div>
  )
};

export default function IntegrationTab({ site, isGlobal = false }: { site: { id: string }, isGlobal?: boolean }) {
  const [activeMethod, setActiveMethod] = useState<string>("wordpress");
  const [dynamicSiteId, setDynamicSiteId] = useState<string>(site.id);
  const finalSiteId = dynamicSiteId || site.id;

  useEffect(() => {
    if (site.id) {
      setDynamicSiteId(site.id);
    }
  }, [site.id]);

  const handleSiteIdChange = (val: string) => {
    // Restrict spaces and non-alphanumeric characters (allow hyphens and underscores)
    const sanitized = val.replace(/[^a-zA-Z0-9-_]/g, "");
    if (val !== sanitized) {
      toast.error("Website ID can only contain letters, numbers, hyphens, and underscores. Spaces and special characters are not allowed.", {
        id: "id-validation-toast",
      });
    }
    setDynamicSiteId(sanitized);
  };

  const methods = [
    {
      id: "wordpress",
      title: "WordPress Plugin",
      desc: "One-click install for WP",
      icon: <SVGIcons.WordPress className="w-8 h-8 object-contain" />,
      color: "border-[#0073AA]"
    },
    {
      id: "sheets",
      title: "Google Sheets",
      desc: "Auto-sync rows & forms",
      icon: <SVGIcons.GoogleSheets className="w-8 h-8 object-contain" />,
      color: "border-[#0F9D58]"
    },
    {
      id: "html",
      title: "Custom HTML",
      desc: "Universal JS Snippet",
      icon: <SVGIcons.HTML className="w-8 h-8 object-contain" />,
      color: "border-[#E34F26]"
    },
    {
      id: "php",
      title: "PHP Snippet",
      desc: "Server-side WP Tracking",
      icon: <SVGIcons.PHP className="w-8 h-8 object-contain" />,
      color: "border-[#777BB4]"
    },
    {
      id: "webhook",
      title: "Direct Webhook",
      desc: "Zapier, Make.com, APIs",
      icon: <SVGIcons.Webhook className="w-8 h-8 shrink-0" />,
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
              <SVGIcons.WordPress className="w-6 h-6 object-contain" /> WordPress Plugin
            </h3>
            <p className="text-slate-600 mb-6">The easiest way to track leads from Elementor Pro Forms and Contact Form 7. No coding required.</p>
            
            <div className="bg-[#F0F6FC] border border-[#C8E1FF] rounded-xl p-5 mb-6">
              <ol className="list-decimal ml-4 space-y-3 text-slate-800 font-medium text-sm">
                <li>Click the download button below to get your custom-built plugin.</li>
                <li>Go to the WordPress Admin Dashboard ➔ <strong>Plugins</strong> ➔ <strong>Add New</strong> ➔ <strong>Upload Plugin</strong>.</li>
                <li>Upload the <code className="bg-white px-1.5 py-0.5 rounded text-xs border border-slate-200">.zip</code> file and click <strong>Activate</strong>. You're done!</li>
              </ol>
            </div>
            
            {isGlobal && (
              <div className="mb-5 flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">Enter Website ID for Plugin</label>
                <input 
                  type="text" 
                  value={dynamicSiteId}
                  onChange={(e) => handleSiteIdChange(e.target.value)}
                  placeholder="e.g. cm1a2b3c4d5e6f"
                  className="w-full max-w-md border border-slate-300 px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-500">Find this in your Websites list. Required to download the correct plugin.</p>
              </div>
            )}
            
            <a 
              href={`/api/websites/${finalSiteId}/plugin`} 
              download 
              onClick={(e) => {
                if (finalSiteId === "YOUR_WEBSITE_ID") {
                  e.preventDefault();
                  toast.error("Please enter a valid Website ID first.");
                }
              }}
              className={`inline-flex items-center justify-center gap-2 bg-[#0073AA] text-white hover:bg-[#005177] px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg w-full sm:w-auto ${finalSiteId === "YOUR_WEBSITE_ID" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Download className="w-4 h-4" /> Download Custom WP Plugin
            </a>
          </div>
        )}

        {activeMethod === "sheets" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.GoogleSheets className="w-6 h-6 object-contain" /> Google Sheets Sync
            </h3>
            <p className="text-slate-600 mb-6">Turn any Google Sheet into a live lead database. Perfect for Google Forms or manual entry.</p>
            
            <div className="bg-[#E6F4EA] border border-[#CEEAD6] rounded-xl p-5 mb-6">
              <ol className="list-decimal ml-4 space-y-3 text-[#0D652D] font-medium text-sm">
                <li>Open your Google Sheet and click <strong>Extensions ➔ Apps Script</strong>.</li>
                <li>Paste the code below, replacing everything, and click <strong>Save</strong>.</li>
                <li>Refresh your Google Sheet. You will now see a custom <strong>LeadFlow CRM</strong> menu at the top!</li>
              </ol>
            </div>

            {isGlobal && (
              <div className="mb-4">
                <label className="text-sm font-bold text-slate-700 block mb-1">Enter your Website ID to update the code below dynamically:</label>
                <input 
                  type="text" 
                  value={dynamicSiteId}
                  onChange={(e) => handleSiteIdChange(e.target.value)}
                  placeholder="YOUR_WEBSITE_ID"
                  className="w-full max-w-md border border-[#0F9D58] px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#0F9D58] outline-none"
                />
              </div>
            )}
            
            <CopyBox language="Google Apps Script (javascript)" code={`const WEBHOOK_URL = 'https://lead-crmsss.vercel.app/api/webhook/receive/${finalSiteId}';

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
              <SVGIcons.HTML className="w-6 h-6 object-contain" /> Universal HTML Form Snippet
            </h3>
            <p className="text-slate-600 mb-6">Works seamlessly with <strong>any HTML website, Framer, Webflow, or multi-step form</strong>. Just drop this script into the <code>&lt;head&gt;</code> or footer of your site.</p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900 mb-1">How it works:</p>
              This intelligent script automatically listens for any form submission on your website. When a user submits a form, it grabs all the inputs and instantly sends them to your CRM behind the scenes.
            </div>

            {isGlobal && (
              <div className="mb-4">
                <label className="text-sm font-bold text-slate-700 block mb-1">Enter your Website ID to update the snippet:</label>
                <input 
                  type="text" 
                  value={dynamicSiteId}
                  onChange={(e) => handleSiteIdChange(e.target.value)}
                  placeholder="YOUR_WEBSITE_ID"
                  className="w-full max-w-md border border-slate-300 px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#E34F26] outline-none"
                />
              </div>
            )}

            <CopyBox language="HTML Snippet (html)" code={"<script>\ndocument.addEventListener('submit', function(e) {\n  const form = e.target.closest('form');\n  if (!form) return;\n  \n  // 1. Automatically grab EVERY field in your HTML form\n  const formData = new FormData(form);\n  const data = Object.fromEntries(formData.entries());\n  data.page_url = window.location.href;\n\n  // 2. Send to CRM silently in the background\n  fetch('https://lead-crmsss.vercel.app/api/webhook/receive/" + finalSiteId + "', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(data),\n    keepalive: true // Ensures data sends perfectly even if the page redirects\n  }).catch(console.error);\n});\n" + "</sc" + "ript>"} />
          </div>
        )}

        {activeMethod === "php" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.PHP className="w-6 h-6 object-contain" /> PHP Snippet (WPCode)
            </h3>
            <p className="text-slate-600 mb-6">For advanced WordPress users. Paste this into your theme's <code>functions.php</code> or using the WPCode snippet plugin for ultra-fast server-side tracking.</p>
            
            {isGlobal && (
              <div className="mb-4">
                <label className="text-sm font-bold text-slate-700 block mb-1">Enter your Website ID to update the snippet:</label>
                <input 
                  type="text" 
                  value={dynamicSiteId}
                  onChange={(e) => handleSiteIdChange(e.target.value)}
                  placeholder="YOUR_WEBSITE_ID"
                  className="w-full max-w-md border border-slate-300 px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#777BB4] outline-none"
                />
              </div>
            )}
            
            <CopyBox language="PHP (functions.php)" code={`add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {
    $fields = [];
    foreach ( $record->get( 'fields' ) as $id => $field ) {
        $fields[ $id ] = $field['value'];
    }
    
    // Auto-detect IP and Page URL
    $fields['page_url'] = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
    $fields['ipAddress'] = isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0] : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '');
    
    // Post to CRM
    wp_remote_post( 'https://lead-crmsss.vercel.app/api/webhook/receive/${finalSiteId}', [
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
              <SVGIcons.Webhook className="w-6 h-6 shrink-0" /> Direct Webhook
            </h3>
            <p className="text-slate-600 mb-6">Connect to third-party automation tools like <strong>Zapier, Make.com, Jotform, or Typeform</strong>.</p>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-inner">
              <p className="text-sm font-semibold text-indigo-900 mb-4">Your Unique Webhook URL</p>
              
              {isGlobal && (
                <div className="mb-4 w-full max-w-2xl text-left">
                  <label className="text-sm font-bold text-slate-700 block mb-1">Enter Website ID:</label>
                  <input 
                    type="text" 
                    value={dynamicSiteId}
                    onChange={(e) => handleSiteIdChange(e.target.value)}
                    placeholder="YOUR_WEBSITE_ID"
                    className="w-full border border-slate-300 px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}

              <div className="flex w-full max-w-2xl items-center bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm">
                <code className="flex-1 text-slate-800 font-mono text-[13px] px-4 py-3 text-left overflow-x-auto whitespace-nowrap">
                  https://lead-crmsss.vercel.app/api/webhook/receive/{finalSiteId}
                </code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://lead-crmsss.vercel.app/api/webhook/receive/${finalSiteId}`);
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
