"use client";

import { useState, useEffect } from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export const SVGIcons = {
  WordPress: (props: any) => (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/WordPress_blue_logo.svg/1280px-WordPress_blue_logo.svg.png?_=20170312030453"
      alt="WordPress"
      {...props}
    />
  ),
  GoogleSheets: (props: any) => (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Google_Sheets_2020_Logo.svg/960px-Google_Sheets_2020_Logo.svg.png"
      alt="Google Sheets"
      {...props}
    />
  ),
  HTML: (props: any) => (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/3/38/HTML5_Badge.svg"
      alt="HTML5"
      {...props}
    />
  ),
  PHP: (props: any) => (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/2/27/PHP-logo.svg"
      alt="PHP"
      {...props}
    />
  ),
  Webhook: (props: any) => (
    <div
      {...props}
      className={`flex items-center justify-center bg-indigo-100 rounded-full ${props.className || ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[55%] h-[55%] text-indigo-600"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    </div>
  ),
};

export default function IntegrationTab({
  site,
  isGlobal = false,
  activeMethodProp,
  hideTabBar = false,
}: {
  site: { id: string };
  isGlobal?: boolean;
  activeMethodProp?: string;
  hideTabBar?: boolean;
}) {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string | undefined;
  const isClient = role === "CLIENT";

  const [activeMethod, setActiveMethod] = useState<string>("wordpress");
  const [dynamicSiteId, setDynamicSiteId] = useState<string>(site.id || "YOUR_WEBSITE_ID");
  const finalSiteId = dynamicSiteId || site.id || "YOUR_WEBSITE_ID";
  const resolvedEndpointId =
    finalSiteId && finalSiteId !== "YOUR_WEBSITE_ID" && finalSiteId !== "undefined"
      ? finalSiteId
      : "auto";
  const [origin, setOrigin] = useState("https://crm.rankved.com");

  useEffect(() => {
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
    const sanitized = val.replace(/[^a-zA-Z0-9-_]/g, "");
    if (val !== sanitized) {
      toast.error(
        "Website ID can only contain letters, numbers, hyphens, and underscores. Spaces and special characters are not allowed.",
        {
          id: "id-validation-toast",
        }
      );
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
          className={`w-full ${options.isLargeWidth ? "" : "max-w-md"} border rounded-lg text-sm focus:ring-2 outline-none px-4 py-2 ${
            options.borderClass || "border-slate-300"
          } ${options.focusRingColorClass}`}
        />
        {options.description && <p className="text-xs text-slate-500 mt-1">{options.description}</p>}
      </div>
    );
  };

  const methods = [
    {
      id: "wordpress",
      title: "WordPress Plugin",
      desc: "One-click install for WP",
      icon: <SVGIcons.WordPress className="w-8 h-8 object-contain" />,
      color: "border-[#0073AA]",
    },
    {
      id: "sheets",
      title: "Google Sheets",
      desc: "Real-time Sheet Sync",
      icon: <SVGIcons.GoogleSheets className="w-8 h-8 object-contain" />,
      color: "border-[#0F9D58]",
    },
    {
      id: "html",
      title: "Custom HTML / JS",
      desc: "Universal Form Tracker",
      icon: <SVGIcons.HTML className="w-8 h-8 object-contain" />,
      color: "border-[#E34F26]",
    },
    {
      id: "php",
      title: "PHP Snippet",
      desc: "Server-side WP Tracking",
      icon: <SVGIcons.PHP className="w-8 h-8 object-contain" />,
      color: "border-[#777BB4]",
    },
    {
      id: "webhook",
      title: "Direct Webhook",
      desc: "Zapier, Make.com, APIs",
      icon: <SVGIcons.Webhook className="w-8 h-8 shrink-0" />,
      color: "border-indigo-500",
    },
  ];

  const CopyBox = ({ code, language = "javascript" }: { code: string; language?: string }) => (
    <div className="relative group rounded-xl overflow-hidden mt-4 border border-slate-700 shadow-xl text-left">
      <div className="absolute top-0 w-full flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm z-10">
        <span className="text-[11px] font-mono font-medium text-slate-400">{language}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast.success("Copied to clipboard!");
          }}
          className="flex items-center gap-1.5 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md transition-colors shadow-sm"
        >
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
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMethod(m.id)}
              className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all duration-200 bg-white hover:shadow-md ${
                activeMethod === m.id
                  ? `${m.color} shadow-sm bg-slate-50 scale-[1.02]`
                  : "border-slate-100 hover:border-slate-300 opacity-70 hover:opacity-100"
              }`}
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
              <SVGIcons.WordPress className="w-6 h-6 object-contain" /> WordPress Plugin (v2.0)
            </h3>
            <p className="text-slate-600 mb-6">
              Automatically captures leads from <strong>Elementor Pro Forms, Contact Form 7, WPForms, and Fluent Forms</strong> with full field label recognition.
            </p>

            <div className="bg-[#F0F6FC] border border-[#C8E1FF] rounded-xl p-5 mb-6">
              <ol className="list-decimal ml-4 space-y-3 text-slate-800 font-medium text-sm">
                <li>Click the download button below to get your pre-configured plugin.</li>
                <li>
                  Go to WordPress Admin Dashboard ➔ <strong>Plugins</strong> ➔ <strong>Add New</strong> ➔{" "}
                  <strong>Upload Plugin</strong>.
                </li>
                <li>
                  Upload the <code className="bg-white px-1.5 py-0.5 rounded text-xs border border-slate-200">.zip</code>{" "}
                  file and click <strong>Activate</strong>. All form submissions will now sync automatically!
                </li>
              </ol>
            </div>

            {renderWebsiteIdSection({
              focusRingColorClass: "focus:ring-blue-500",
              label: "Enter Website ID for Plugin",
              description: "Find this in your Websites list. Required to bind the plugin to your exact website.",
            })}

            <a
              href={`/api/websites/${finalSiteId}/plugin`}
              download
              onClick={(e) => {
                if (!finalSiteId || finalSiteId === "YOUR_WEBSITE_ID") {
                  e.preventDefault();
                  toast.error("Please enter a valid Website ID first.");
                }
              }}
              className={`inline-flex items-center justify-center gap-2 bg-[#0073AA] text-white hover:bg-[#005177] px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg w-full sm:w-auto ${
                !finalSiteId || finalSiteId === "YOUR_WEBSITE_ID" ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Download className="w-4 h-4" /> Download Custom WP Plugin
            </a>
          </div>
        )}

        {activeMethod === "sheets" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.GoogleSheets className="w-6 h-6 object-contain" /> Google Sheets Sync (Apps Script)
            </h3>
            <p className="text-slate-600 mb-6">
              Automatically push new rows from any Google Sheet (Google Forms, Meta Lead Ads, or manual sheets) into Rankved CRM in real time.
            </p>

            {renderWebsiteIdSection({
              focusRingColorClass: "focus:ring-emerald-500",
              label: "Enter Website ID for Google Sheets:",
            })}

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 mb-6 text-sm text-slate-700">
              <p className="font-bold text-emerald-950 mb-2">Setup in 3 simple steps:</p>
              <ol className="list-decimal ml-4 space-y-2 text-emerald-900">
                <li>
                  Open your Google Sheet and click <strong>Extensions</strong> ➔ <strong>Apps Script</strong>.
                </li>
                <li>Paste the code below and click the <strong>Save</strong> icon.</li>
                <li>
                  Click <strong>Triggers</strong> (clock icon on the left) ➔ <strong>Add Trigger</strong> ➔ choose{" "}
                  <code>onSheetChange</code> with event type <strong>On form submit</strong> (or <strong>On change</strong>).
                </li>
              </ol>
            </div>

            <CopyBox
              language="Google Apps Script (Code.gs)"
              code={`const WEBHOOK_URL = "${origin}/api/webhook/receive/${resolvedEndpointId}";

function onSheetChange(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  const payload = {
    source: "Google Sheets",
    form_name: sheet.getName()
  };

  for (let i = 0; i < headers.length; i++) {
    const key = String(headers[i] || "").trim();
    const val = values[i];
    if (key && val !== "" && val !== null && val !== undefined) {
      payload[key] = String(val).trim();
    }
  }

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}`}
            />
          </div>
        )}

        {activeMethod === "html" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 text-left space-y-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
                <SVGIcons.HTML className="w-6 h-6 object-contain" /> Option 1: Universal JS Form Auto-Tracker (Recommended)
              </h3>
              <p className="text-slate-600 mb-4">
                Paste this single script before <code>&lt;/body&gt;</code> on any website (HTML, Webflow, React, Wix, WordPress). It automatically captures <strong>all existing forms</strong> and extracts human-readable field labels without modifying your form HTML.
              </p>

              {renderWebsiteIdSection({
                focusRingColorClass: "focus:ring-orange-500",
                label: "Enter Website ID:",
              })}

              <CopyBox
                language="HTML (<script> Auto-Tracker)"
                code={`<script>
(function() {
  var WEBHOOK_URL = "${origin}/api/webhook/receive/${resolvedEndpointId}";
  document.addEventListener("submit", function(e) {
    var form = e.target;
    if (!form || form.tagName !== "FORM") return;
    try {
      var payload = {
        page_url: window.location.href,
        page_title: document.title,
        site_url: window.location.origin,
        form_name: form.getAttribute("name") || form.getAttribute("aria-label") || form.id || "Website Form"
      };
      var urlParams = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(function(utm) {
        if (urlParams.get(utm)) payload[utm] = urlParams.get(utm);
      });
      var elements = form.querySelectorAll("input, select, textarea");
      elements.forEach(function(el) {
        if (el.type === "password" || el.type === "submit" || el.type === "button" || el.type === "file") return;
        if ((el.type === "checkbox" || el.type === "radio") && !el.checked) return;
        var val = (el.value || "").trim();
        if (!val) return;
        var labelEl = el.id ? form.querySelector('label[for="' + el.id + '"]') : null;
        if (!labelEl && el.closest) labelEl = el.closest("label");
        var key = (labelEl ? labelEl.innerText : "") || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name || el.id;
        key = (key || "field").replace(/\\*/g, "").replace(/:$/, "").trim();
        if (payload[key]) {
          payload[key] = payload[key] + ", " + val;
        } else {
          payload[key] = val;
        }
      });
      var json = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        var blob = new Blob([json], { type: "application/json" });
        navigator.sendBeacon(WEBHOOK_URL, blob);
      } else {
        fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: json, keepalive: true });
      }
    } catch (err) {}
  }, true);
})();
</script>`}
              />
            </div>

            <div className="pt-6 border-t border-slate-200">
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                Option 2: Pure HTML Form (Zero JavaScript Required)
              </h4>
              <p className="text-slate-600 text-sm mb-4">
                Building a new form from scratch? Point its <code>action</code> directly to the webhook URL. Includes built-in spam honeypot protection and automatic redirect.
              </p>

              <CopyBox
                language="HTML (Form Structure)"
                code={`<!-- Rankved Lead Automation Form -->
<form action="${origin}/api/webhook/receive/${resolvedEndpointId}" method="POST">
  <!-- Optional redirect URL after submission -->
  <input type="hidden" name="_redirect" value="https://your-website.com/thank-you" />
  <input type="hidden" name="form_name" value="Appointment Booking Form" />

  <!-- Bot Spam Honeypot (keep hidden) -->
  <div style="display:none;" aria-hidden="true">
    <input type="text" name="_honeypot" value="" tabindex="-1" autocomplete="off" />
  </div>

  <label for="full_name">Patient / Full Name *</label>
  <input type="text" id="full_name" name="full_name" required />

  <label for="phone">Phone Number *</label>
  <input type="tel" id="phone" name="phone" required />

  <label for="email">Email Address</label>
  <input type="email" id="email" name="email" />

  <label for="department">Department / Speciality</label>
  <input type="text" id="department" name="department" />

  <label for="message">Medical Concern / Message</label>
  <textarea id="message" name="message" rows="3"></textarea>

  <button type="submit">Book Appointment</button>
</form>`}
              />
            </div>
          </div>
        )}

        {activeMethod === "php" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <SVGIcons.PHP className="w-6 h-6 object-contain" /> PHP Snippet (functions.php / WPCode)
            </h3>
            <p className="text-slate-600 mb-6">
              For WordPress developers. Paste this into your theme&apos;s <code>functions.php</code> or the WPCode plugin for server-side Elementor Pro &amp; Contact Form 7 tracking with human-readable field labels.
            </p>

            {renderWebsiteIdSection({
              focusRingColorClass: "focus:ring-[#777BB4]",
              label: "Enter your Website ID to update the snippet:",
            })}

            <CopyBox
              language="PHP (functions.php)"
              code={`// 1. Elementor Pro Forms -> Rankved CRM
add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {
    $fields = [];
    foreach ( $record->get( 'fields' ) as $id => $field ) {
        $val = isset( $field['value'] ) ? $field['value'] : '';
        if ( is_array( $val ) ) {
            $val = implode( ', ', $val );
        }
        $label = ! empty( $field['title'] ) ? $field['title'] : $id;
        $fields[ $label ] = $val;
    }

    $form_settings = $record->get( 'form_settings' );
    $form_name = isset( $form_settings['form_name'] ) ? $form_settings['form_name'] : 'Form';
    $fields['form_name'] = $form_name;
    $fields['source']    = 'WordPress Elementor - ' . $form_name;
    $fields['page_url']  = isset( $_SERVER['HTTP_REFERER'] ) ? $_SERVER['HTTP_REFERER'] : home_url();
    $fields['site_url']  = home_url();
    $fields['ipAddress'] = isset( $_SERVER['HTTP_X_FORWARDED_FOR'] )
        ? trim( explode( ',', $_SERVER['HTTP_X_FORWARDED_FOR'] )[0] )
        : ( isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : '' );

    wp_remote_post( '${origin}/api/webhook/receive/${resolvedEndpointId}', [
        'body'     => wp_json_encode( $fields ),
        'headers'  => [ 'Content-Type' => 'application/json; charset=utf-8' ],
        'blocking' => false,
    ]);
}, 10, 2 );`}
            />
          </div>
        )}

        {activeMethod === "webhook" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 text-center flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 mb-2 self-start">
              <SVGIcons.Webhook className="w-6 h-6 shrink-0" /> Direct Webhook
            </h3>
            <p className="text-slate-600 mb-6 self-start text-left">
              Connect directly to <strong>Elementor Webhook Action, Zapier, Make.com, Pabbly, Jotform, or Typeform</strong>. Accepts both JSON and Form-Data payloads.
            </p>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-inner w-full">
              <p className="text-sm font-semibold text-indigo-900 mb-4">Your Unique Webhook URL</p>

              {renderWebsiteIdSection({
                focusRingColorClass: "focus:ring-indigo-500",
                label: "Enter Website ID:",
                isLargeWidth: true,
              })}

              <div className="flex w-full max-w-2xl items-center bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm mt-2">
                <code className="flex-1 text-slate-800 font-mono text-[13px] px-4 py-3 text-left overflow-x-auto whitespace-nowrap">
                  {origin}/api/webhook/receive/{resolvedEndpointId}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${origin}/api/webhook/receive/${resolvedEndpointId}`);
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
