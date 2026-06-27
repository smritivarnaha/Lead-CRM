"use client";

import { useState, useEffect } from "react";
import { Copy, Download, LinkIcon } from "lucide-react";
import { toast } from "sonner";

import { useUser } from "@clerk/nextjs";

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

export default function IntegrationTab({ site, isGlobal = false, activeMethodProp, hideTabBar = false }: { site: { id: string }, isGlobal?: boolean, activeMethodProp?: string, hideTabBar?: boolean }) {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string | undefined;
  const isClient = role === "CLIENT";

  const [activeMethod, setActiveMethod] = useState<string>("wordpress");
  const [dynamicSiteId, setDynamicSiteId] = useState<string>(site.id);
  const finalSiteId = dynamicSiteId || site.id;
  const [origin, setOrigin] = useState("https://crm.rankved.com");

  useEffect(() => {
    // Force to primary domain regardless of where it's loaded
    setOrigin("https://crm.rankved.com");
  }, []);

  useEffect(() => {
    if (activeMethodProp) {
      setActiveMethod(activeMethodProp);
    }
  }, [activeMethodProp]);

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

  const renderWebsiteIdSection = (options: {
    focusRingColorClass: string;
    label: string;
    borderClass?: string;
    isLargeWidth?: boolean;
    description?: string;
  }) => {
    if (isClient) {
      return (
        <div className="mb-5 flex flex-col gap-1.5 text-left">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Website ID</span>
          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg w-fit">
            {finalSiteId}
          </span>
        </div>
      );
    }

    if (!isGlobal) return null;

    return (
      <div className={`mb-5 flex flex-col gap-2 text-left ${options.isLargeWidth ? "w-full max-w-2xl" : ""}`}>
        <label className="text-sm font-bold text-slate-700 block">{options.label}</label>
        <input 
          type="text" 
          value={dynamicSiteId}
          onChange={(e) => handleSiteIdChange(e.target.value)}
          placeholder="YOUR_WEBSITE_ID"
          className={`w-full ${options.isLargeWidth ? "" : "max-w-md"} border rounded-lg text-sm focus:ring-2 outline-none px-4 py-2 ${options.borderClass || "border-slate-300"} ${options.focusRingColorClass}`}
        />
        {options.description && (
          <p className="text-xs text-slate-500 mt-1">{options.description}</p>
        )}
      </div>
    );
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
    <div className="relative group rounded-xl overflow-hidden mt-4 border border-slate-700 shadow-xl text-left">
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
      
      {!hideTabBar && (
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
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 min-h-[400px]">
        
        {activeMethod === "wordpress" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 text-left">
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
            
            {renderWebsiteIdSection({
              focusRingColorClass: "focus:ring-blue-500",
              label: "Enter Website ID for Plugin",
              description: "Find this in your Websites list. Required to download the correct plugin."
            })}
            
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

        {activeMethod === "html" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.HTML className="w-6 h-6 object-contain" /> Pure HTML Form (No JS Required)
            </h3>
            <p className="text-slate-600 mb-6">A bulletproof native HTML form. Zero Javascript needed, immune to ad-blockers, and handles redirects & honeypot spam protection automatically.</p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900 mb-2">How it works:</p>
              <ul className="list-disc ml-4 space-y-2 text-slate-600">
                <li>Copy the HTML structure below and style it however you want using CSS.</li>
                <li>Add any extra <code>&lt;input&gt;</code> fields you need (city, budget, date)—they will be automatically tracked.</li>
                <li>The hidden <code>_honeypot</code> field protects you from spam bots.</li>
              </ul>
            </div>

            <CopyBox language="HTML (Form Structure)" code={"<!-- \n  Rankved Lead Automation Form\n  Ensure the action points to the correct webhook.\n-->\n<form action=\"" + origin + "/api/webhook/receive/" + (finalSiteId === 'YOUR_WEBSITE_ID' ? 'auto' : finalSiteId) + "\" method=\"POST\">\n  \n  <!-- OPTIONAL: Where should the user be redirected after submitting? -->\n  <!-- If omitted, the CRM will auto-bounce the user back to the page they came from -->\n  <input type=\"hidden\" name=\"_redirect\" value=\"https://their-website.com/thank-you\" />\n\n  <!-- SPAM PREVENTION: Hide this field from users using CSS -->\n  <div style=\"display:none;\">\n    <label>Leave this empty:</label>\n    <input type=\"text\" name=\"_honeypot\" value=\"\" tabindex=\"-1\" autocomplete=\"off\" />\n  </div>\n\n  <!-- Standard Visible Fields -->\n  <label for=\"name\">Full Name</label>\n  <input type=\"text\" id=\"name\" name=\"name\" required />\n\n  <label for=\"phone\">Phone Number</label>\n  <input type=\"tel\" id=\"phone\" name=\"phone\" required />\n\n  <label for=\"email\">Email Address</label>\n  <input type=\"email\" id=\"email\" name=\"email\" />\n\n  <button type=\"submit\">Submit Lead</button>\n</form>"} />
          </div>
        )}

        {activeMethod === "php" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.PHP className="w-6 h-6 object-contain" /> PHP Snippet (WPCode)
            </h3>
            <p className="text-slate-600 mb-6">For advanced WordPress users. Paste this into your theme's <code>functions.php</code> or using the WPCode snippet plugin for ultra-fast server-side tracking.</p>
            
            {renderWebsiteIdSection({
              focusRingColorClass: "focus:ring-[#777BB4]",
              label: "Enter your Website ID to update the snippet:"
            })}
            
            <CopyBox language="PHP (functions.php)" code={`add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {
    $fields = [];
    foreach ( $record->get( 'fields' ) as $id => $field ) {
        $fields[ $id ] = $field['value'];
    }
    
    // Add Source Tag for Integrations Dashboard
    $form_settings = $record->get( 'form_settings' );
    $form_name = isset( $form_settings['form_name'] ) ? $form_settings['form_name'] : 'Form';
    $fields['source'] = 'WordPress Elementor - ' . $form_name;
    
    // Auto-detect IP and Page URL
    $fields['page_url'] = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
    $fields['ipAddress'] = isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0] : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '');
    
    // Post to CRM
    wp_remote_post( '${origin}/api/webhook/receive/${finalSiteId}', [
        'body' => wp_json_encode($fields),
        'headers' => [ 'Content-Type' => 'application/json' ],
        'blocking' => false
    ]);
}, 10, 2 );`} />
          </div>
        )}

        {activeMethod === "webhook" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 text-center flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2 self-start">
              <SVGIcons.Webhook className="w-6 h-6 shrink-0" /> Direct Webhook
            </h3>
            <p className="text-slate-600 mb-6 self-start text-left">Connect to third-party automation tools like <strong>Zapier, Make.com, Jotform, or Typeform</strong>.</p>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-inner w-full">
              <p className="text-sm font-semibold text-indigo-900 mb-4">Your Unique Webhook URL</p>
              
              {renderWebsiteIdSection({
                focusRingColorClass: "focus:ring-indigo-500",
                label: "Enter Website ID:",
                isLargeWidth: true
              })}

              <div className="flex w-full max-w-2xl items-center bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm mt-2">
                <code className="flex-1 text-slate-800 font-mono text-[13px] px-4 py-3 text-left overflow-x-auto whitespace-nowrap">
                  {origin}/api/webhook/receive/{finalSiteId}
                </code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${origin}/api/webhook/receive/${finalSiteId}`);
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
