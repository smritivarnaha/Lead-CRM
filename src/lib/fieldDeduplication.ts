/**
 * Field Deduplication & Canonicalization Engine
 * 
 * Prevents duplicate/redundant fields (e.g. "Full Name" vs "Patient Name",
 * "Phone" vs "Mobile Number", "Email" vs "Patient Email") from appearing
 * in email alerts, SMS notifications, and lead detail views.
 */

export interface CleanLeadField {
  key: string;
  label: string;
  value: string;
  category: "name" | "phone" | "email" | "message" | "location" | "custom" | "technical";
}

export function formatFieldTitle(key: string): string {
  // Common healthcare & CRM field overrides
  const lower = key.toLowerCase().replace(/[\s_\-]+/g, "");
  if (lower === "patientname" || lower === "patient") return "Patient Name";
  if (lower === "fullname" || lower === "name") return "Full Name";
  if (lower === "mobilenumber" || lower === "mobile" || lower === "mobileno") return "Mobile Number";
  if (lower === "phonenumber" || lower === "phone" || lower === "phoneno") return "Phone Number";
  if (lower === "patientphone" || lower === "patientmobile") return "Patient Mobile";
  if (lower === "patientemail") return "Patient Email";
  if (lower === "emailaddress" || lower === "email") return "Email Address";
  if (lower === "medicalconcern" || lower === "symptoms") return "Medical Concern";

  return key
    .replace(/^[_\-]+/, "")
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function formatFieldValue(val: any): string {
  if (val === undefined || val === null || val === "") return "";
  if (Array.isArray(val)) return val.filter(Boolean).join(", ");
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val).trim();
}

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

const IGNORED_KEYS = new Set([
  "_redirect",
  "_honeypot",
  "redirect_url",
  "_wpcf7",
  "_wpcf7_version",
  "_wpcf7_locale",
  "_wpcf7_unit_tag",
  "_wpcf7_container_post",
  "_wpnonce",
  "g-recaptcha-response",
  "recaptcha",
  "cf-turnstile-response",
  "h-captcha-response",
  "site_url",
  "site_domain",
  "pageurl",
  "page_url",
  "pagetitle",
  "page_title",
  "action",
  "submit",
  "form_id",
  "form_name",
  "formid",
  "formname",
  "post_id",
  "step",
  "status",
  "priority",
  "temperature",
  "score",
  "createdat",
  "updatedat",
  "websiteid",
  "workspaceid",
  "assignedtoid",
  "followupat",
  "callnotes",
  "website_name",
  "websitename",
]);

export function getDeduplicatedFields(
  raw: Record<string, any> | string | null | undefined,
  primaryLeadData?: {
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    message?: string | null;
    city?: string | null;
    state?: string | null;
  }
): {
  allDeduplicatedFields: CleanLeadField[];
  customFieldsOnly: CleanLeadField[];
  technicalFields: CleanLeadField[];
} {
  let body: Record<string, any> = {};
  if (typeof raw === "string") {
    try {
      body = JSON.parse(raw);
    } catch {
      body = {};
    }
  } else if (raw && typeof raw === "object") {
    body = raw;
  }

  const primaryFullName = (primaryLeadData?.fullName || "").trim().toLowerCase();
  const primaryPhoneDigits = primaryLeadData?.phone ? normalizePhoneDigits(primaryLeadData.phone) : "";
  const primaryEmail = (primaryLeadData?.email || "").trim().toLowerCase();
  const primaryMessage = (primaryLeadData?.message || "").trim().toLowerCase();
  const primaryCity = (primaryLeadData?.city || "").trim().toLowerCase();
  const primaryState = (primaryLeadData?.state || "").trim().toLowerCase();

  const technicalFields: CleanLeadField[] = [];
  const customFieldsOnly: CleanLeadField[] = [];
  const allDeduplicatedFields: CleanLeadField[] = [];

  let nameField: CleanLeadField | null = null;
  let phoneField: CleanLeadField | null = null;
  let emailField: CleanLeadField | null = null;
  let messageField: CleanLeadField | null = null;
  let locationField: CleanLeadField | null = null;
  const generalCustomFields: CleanLeadField[] = [];

  const seenValues = new Set<string>();
  const seenLabels = new Set<string>();
  const seenPhoneDigits = new Set<string>();

  if (primaryPhoneDigits) seenPhoneDigits.add(primaryPhoneDigits);

  Object.entries(body).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    const strVal = formatFieldValue(v);
    if (!strVal || strVal === "—") return;

    const lowerK = k.toLowerCase().replace(/[\s_\-]+/g, "");
    const lowerVal = strVal.toLowerCase();

    // 1. Skip system & internal plugin keys
    if (
      IGNORED_KEYS.has(k.toLowerCase()) ||
      IGNORED_KEYS.has(lowerK) ||
      k.startsWith("_") ||
      lowerK.includes("recaptcha") ||
      lowerK.includes("turnstile")
    ) {
      return;
    }

    // 2. Technical & Tracking fields
    if (
      lowerK.startsWith("utm") ||
      ["ip", "ipaddress", "source", "useragent", "referer"].includes(lowerK)
    ) {
      technicalFields.push({
        key: k,
        label: formatFieldTitle(k),
        value: strVal,
        category: "technical",
      });
      return;
    }

    // 3. Name field detection & deduplication
    const isNameKey =
      (lowerK.includes("name") || lowerK.includes("patient") || lowerK === "naam") &&
      !["formname", "sitename", "filename", "pagename", "companyname", "doctorname", "hospitalname"].includes(lowerK);
    const isNameVal = primaryFullName && primaryFullName !== "unknown" && lowerVal === primaryFullName;

    if (isNameKey || isNameVal) {
      if (!nameField) {
        const label = lowerK.includes("patient") ? "Patient Name" : "Full Name";
        nameField = { key: k, label, value: strVal, category: "name" };
        seenValues.add(lowerVal);
      }
      return;
    }

    // 4. Phone field detection & deduplication
    const digits = normalizePhoneDigits(strVal);
    const isPhoneKey =
      lowerK.includes("phone") ||
      lowerK.includes("mobile") ||
      lowerK.includes("tel") ||
      lowerK.includes("whatsapp") ||
      lowerK === "contact" ||
      lowerK === "contactnumber" ||
      lowerK === "contactno" ||
      lowerK === "number";
    const isPhoneVal = digits.length >= 7 && ((primaryPhoneDigits && digits === primaryPhoneDigits) || seenPhoneDigits.has(digits));

    if (isPhoneKey || isPhoneVal) {
      if (!phoneField) {
        const label = lowerK.includes("patient") ? "Patient Mobile" : lowerK.includes("mobile") ? "Mobile Number" : "Phone Number";
        phoneField = { key: k, label, value: strVal, category: "phone" };
        seenPhoneDigits.add(digits);
        seenValues.add(lowerVal);
      }
      return;
    }

    // 5. Email field detection & deduplication
    const isEmailKey = lowerK.includes("email") || lowerK === "mail";
    const isEmailVal = (primaryEmail && lowerVal === primaryEmail) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal);

    if (isEmailKey || isEmailVal) {
      if (!emailField) {
        const label = lowerK.includes("patient") ? "Patient Email" : "Email Address";
        emailField = { key: k, label, value: strVal, category: "email" };
        seenValues.add(lowerVal);
      }
      return;
    }

    // 6. Message / Concern detection & deduplication
    const isMessageKey =
      lowerK.includes("message") ||
      lowerK.includes("query") ||
      lowerK.includes("comment") ||
      lowerK.includes("description") ||
      lowerK.includes("concern") ||
      lowerK.includes("symptom") ||
      lowerK.includes("enquiry") ||
      lowerK.includes("inquiry") ||
      lowerK === "msg" ||
      lowerK === "text" ||
      lowerK === "details";
    const isMessageVal = primaryMessage && lowerVal === primaryMessage;

    if (isMessageKey || isMessageVal) {
      if (!messageField) {
        const label = lowerK.includes("symptom") || lowerK.includes("concern") ? "Medical Concern" : "Message / Query";
        messageField = { key: k, label, value: strVal, category: "message" };
        seenValues.add(lowerVal);
      }
      return;
    }

    // 7. Location (City / State) detection & deduplication
    const isLocationKey =
      lowerK.includes("city") ||
      lowerK.includes("state") ||
      lowerK.includes("location") ||
      lowerK.includes("district") ||
      lowerK.includes("town");

    if (isLocationKey) {
      if (
        (primaryCity && lowerVal === primaryCity) ||
        (primaryState && lowerVal === primaryState) ||
        seenValues.has(lowerVal)
      ) {
        // Skip duplicate location value
        return;
      }
      if (!locationField) {
        locationField = { key: k, label: formatFieldTitle(k), value: strVal, category: "location" };
        seenValues.add(lowerVal);
      } else {
        generalCustomFields.push({ key: k, label: formatFieldTitle(k), value: strVal, category: "location" });
        seenValues.add(lowerVal);
      }
      return;
    }

    // 8. General Custom Fields (Age, Gender, Preferred Doctor, Appointment Date, etc.)
    // Guard against exact duplicate values already shown in name, phone, email, or message
    if (
      (primaryFullName && lowerVal === primaryFullName) ||
      (primaryEmail && lowerVal === primaryEmail) ||
      (primaryMessage && lowerVal === primaryMessage) ||
      (primaryCity && lowerVal === primaryCity) ||
      seenValues.has(lowerVal)
    ) {
      return;
    }

    const cleanLabel = formatFieldTitle(k);
    if (seenLabels.has(cleanLabel.toLowerCase())) {
      return;
    }

    seenLabels.add(cleanLabel.toLowerCase());
    seenValues.add(lowerVal);

    generalCustomFields.push({
      key: k,
      label: cleanLabel,
      value: strVal,
      category: "custom",
    });
  });

  // Assemble all unique fields in a logical, professional presentation order
  if (nameField) allDeduplicatedFields.push(nameField);
  if (phoneField) allDeduplicatedFields.push(phoneField);
  if (emailField) allDeduplicatedFields.push(emailField);
  if (locationField) allDeduplicatedFields.push(locationField);
  generalCustomFields.forEach((f) => allDeduplicatedFields.push(f));
  if (messageField) allDeduplicatedFields.push(messageField);

  // Custom fields for LeadDetailsModal (anything not already in standard Details/Header)
  generalCustomFields.forEach((f) => {
    customFieldsOnly.push(f);
  });

  return {
    allDeduplicatedFields,
    customFieldsOnly,
    technicalFields,
  };
}
