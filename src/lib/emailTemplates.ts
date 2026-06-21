export type EmailTheme = 
  | "modern_minimal" 
  | "corporate_blue" 
  | "healthcare_trust" 
  | "urgent_alert" 
  | "dark_mode_sleek" 
  | "playful_startup" 
  | "classic_crm" 
  | "elegant_serif" 
  | "tech_neon" 
  | "soft_pastel";

export const EMAIL_THEMES: { id: EmailTheme; name: string; description: string }[] = [
  { id: "modern_minimal", name: "Modern Minimal", description: "Clean, lots of whitespace, elegant typography" },
  { id: "corporate_blue", name: "Corporate Blue", description: "Professional, trustworthy, blue accents" },
  { id: "healthcare_trust", name: "Healthcare Trust", description: "Soft greens/teals, medical aesthetic" },
  { id: "urgent_alert", name: "Urgent Alert", description: "Red accents, high priority feel for fast response" },
  { id: "dark_mode_sleek", name: "Dark Mode Sleek", description: "Premium dark gray/black background with accents" },
  { id: "playful_startup", name: "Playful Startup", description: "Vibrant colors, rounded corners" },
  { id: "classic_crm", name: "Classic CRM", description: "Standard table layout, high density data" },
  { id: "elegant_serif", name: "Elegant Serif", description: "High-end aesthetic, serif fonts, gold/black colors" },
  { id: "tech_neon", name: "Tech Neon", description: "Cyber/tech aesthetic, monospace fonts" },
  { id: "soft_pastel", name: "Soft Pastel", description: "Friendly, approachable, soft color palettes" },
];

const FOOTER_TEXT = "Lead Automation CRM Developed By Rankved Healthcare Martech";

export function generateEmailHtml(theme: EmailTheme, title: string, htmlBody: string): string {
  // Common footer HTML to ensure consistency and beauty
  const getFooter = (color: string) => `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid ${color}; text-align: center;">
      <p style="font-size: 12px; color: #888; font-family: sans-serif; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">
        ${FOOTER_TEXT}
      </p>
    </div>
  `;

  // Base styling resets for email clients
  const baseHtml = (content: string, bgColor: string, fontFamily: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media only screen and (max-width: 600px) {
            .email-container { padding: 16px !important; }
            .email-body { padding: 8px !important; }
          }
        </style>
      </head>
      <body class="email-body" style="margin: 0; padding: 16px; background-color: ${bgColor}; font-family: ${fontFamily};">
        ${content}
      </body>
    </html>
  `;

  switch (theme) {
    case "modern_minimal":
      return baseHtml(`
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #eaeaea;">
          <h2 style="color: #111827; font-size: 24px; margin-top: 0; font-weight: 600; letter-spacing: -0.5px;">${title}</h2>
          <div style="color: #4b5563; font-size: 15px; line-height: 1.6; word-break: break-word;">
            ${htmlBody}
          </div>
          ${getFooter('#eaeaea')}
        </div>
      `, "#f9fafb", "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif");

    case "corporate_blue":
      return baseHtml(`
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div class="email-container" style="background: #1e3a8a; padding: 24px;">
            <h2 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 600;">${title}</h2>
          </div>
          <div class="email-container" style="padding: 24px; color: #334155; font-size: 15px; line-height: 1.6; word-break: break-word;">
            ${htmlBody}
            ${getFooter('#e2e8f0')}
          </div>
        </div>
      `, "#f1f5f9", "Helvetica, Arial, sans-serif");

    case "healthcare_trust":
      return baseHtml(`
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-top: 6px solid #0f766e; padding: 24px; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
          <h2 style="color: #115e59; font-size: 24px; margin-top: 0; border-bottom: 2px solid #ccfbf1; padding-bottom: 15px;">${title}</h2>
          <div style="color: #374151; font-size: 16px; line-height: 1.7; word-break: break-word;">
            ${htmlBody}
          </div>
          ${getFooter('#ccfbf1')}
        </div>
      `, "#f0fdfa", "Arial, sans-serif");

    case "urgent_alert":
      return baseHtml(`
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border: 2px solid #ef4444; border-radius: 8px;">
          <div style="display: flex; align-items: center; background: #fee2e2; padding: 15px 20px; border-radius: 6px; margin-bottom: 25px;">
            <h2 style="color: #b91c1c; font-size: 20px; margin: 0; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">🚨 ${title}</h2>
          </div>
          <div style="color: #1f2937; font-size: 15px; line-height: 1.6; word-break: break-word;">
            ${htmlBody}
          </div>
          ${getFooter('#fecaca')}
        </div>
      `, "#fef2f2", "system-ui, -apple-system, sans-serif");

    case "dark_mode_sleek":
      return baseHtml(`
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #1f2937; padding: 24px; border-radius: 12px; border: 1px solid #374151;">
          <h2 style="color: #f3f4f6; font-size: 24px; margin-top: 0; font-weight: 500;">${title}</h2>
          <div style="color: #d1d5db; font-size: 15px; line-height: 1.6; word-break: break-word;">
            ${htmlBody}
          </div>
          ${getFooter('#374151')}
        </div>
      `, "#111827", "Inter, sans-serif");

    case "playful_startup":
      return baseHtml(`
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 24px; box-shadow: 0 10px 25px rgba(124, 58, 237, 0.1);">
          <h2 style="color: #7c3aed; font-size: 28px; margin-top: 0; font-weight: 800;">✨ ${title}</h2>
          <div style="color: #4b5563; font-size: 16px; line-height: 1.6; word-break: break-word;">
            ${htmlBody}
          </div>
          ${getFooter('#ede9fe')}
        </div>
      `, "#f5f3ff", "'Nunito', 'Segoe UI', sans-serif");

    case "classic_crm":
      return baseHtml(`
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #cccccc; border-collapse: collapse;">
          <tr>
            <td class="email-container" style="background: #f4f4f4; padding: 16px 20px; border-bottom: 1px solid #cccccc;">
              <h2 style="color: #333333; font-size: 20px; margin: 0; font-family: Arial, sans-serif;">${title}</h2>
            </td>
          </tr>
          <tr>
            <td class="email-container" style="padding: 24px 20px; color: #555555; font-size: 14px; line-height: 1.5; font-family: Arial, sans-serif; word-break: break-word;">
              ${htmlBody}
              ${getFooter('#eeeeee')}
            </td>
          </tr>
        </table>
      `, "#ffffff", "Arial, sans-serif");

    case "elegant_serif":
      return baseHtml(`
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; font-size: 26px; margin-top: 0; font-weight: 400; text-align: center; border-bottom: 1px solid #d1d5db; padding-bottom: 20px;">${title}</h2>
          <div style="color: #4b5563; font-size: 16px; line-height: 1.8; margin-top: 30px; word-break: break-word;">
            ${htmlBody}
          </div>
          ${getFooter('#e5e7eb')}
        </div>
      `, "#f9fafb", "'Georgia', 'Times New Roman', serif");

    case "tech_neon":
      return baseHtml(`
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #000000; padding: 24px; border: 1px solid #22c55e; border-radius: 4px;">
          <h2 style="color: #4ade80; font-size: 22px; margin-top: 0; font-weight: normal;">> ${title}_</h2>
          <div style="color: #a3e635; font-size: 14px; line-height: 1.6; margin-top: 20px; word-break: break-word;">
            ${htmlBody}
          </div>
          ${getFooter('#166534')}
        </div>
      `, "#052e16", "'Courier New', Courier, monospace");

    case "soft_pastel":
      return baseHtml(`
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 16px; border: 2px solid #fce7f3;">
          <h2 style="color: #db2777; font-size: 24px; margin-top: 0; font-weight: 600;">${title}</h2>
          <div style="color: #64748b; font-size: 15px; line-height: 1.6; word-break: break-word;">
            ${htmlBody}
          </div>
          ${getFooter('#fce7f3')}
        </div>
      `, "#fff1f2", "'Quicksand', 'Helvetica Neue', sans-serif");

    default:
      // Fallback to modern minimal
      return generateEmailHtml("modern_minimal", title, htmlBody);
  }
}
