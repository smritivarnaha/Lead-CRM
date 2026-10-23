/**
 * Field Deduplication, Payload Flattening & Canonicalization Engine
 *
 * 1. Flattens nested webhook payloads (Elementor Pro, CF7, WPForms, FluentForms, Jotform, Typeform, Make, Zapier).
 * 2. Extracts canonical lead fields (fullName, phone, email, city, state, message) without false positives
 *    (e.g. never confuses dates like "2026-10-25" with phone numbers, never confuses "patient_age" with patient name,
 *    and properly combines "first_name" + "last_name").
 * 3. Deduplicates fields by normalized value so redundant keys (e.g. "name" + "patient_name" with the same value,
 *    or "phone" + "mobile_number" with the same digits) appear once, while distinct fields (e.g. "Alternate Phone",
 *    "Patient Age", "Patient Gender", "Preferred Doctor", "Appointment Date", "Department") are NEVER lost.
 */

export interface CleanLeadField {
  key: string;
  label: string;
  value: string;
  category: "name" | "phone" | "email" | "message" | "location" | "custom" | "technical";
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
  "_wpcf7_posted_data_hash",
  "_wpnonce",
  "_wp_http_referer",
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
  "queried_id",
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
  "honeypot",
]);

const TECHNICAL_KEYS = new Set([
  "ip",
  "ipaddress",
  "ip_address",
  "source",
  "useragent",
  "user_agent",
  "referer",
  "referrer",
  "utmsource",
  "utmmedium",
  "utmcampaign",
  "utmcontent",
  "utmterm",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
]);

/**
 * Clean bracketed form keys like "form_fields[patient_name]" -> "patient_name"
 * or "wpforms[fields][1]" -> "field_1"
 */
export function cleanRawKeyName(rawKey: string): string {
  let k = rawKey.trim();
  const bracketMatches = [...k.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]).filter(Boolean);
  if (bracketMatches.length > 0) {
    const lastPart = bracketMatches[bracketMatches.length - 1];
    if (lastPart && !/^\d+$/.test(lastPart) && lastPart.toLowerCase() !== "value") {
      k = lastPart;
    } else if (bracketMatches.length >= 2) {
      k = bracketMatches[bracketMatches.length - 2];
    }
  }
  return k;
}

export function formatFieldTitle(key: string): string {
  const cleanedKey = cleanRawKeyName(key);
  const lower = cleanedKey.toLowerCase().replace(/[\s_\-]+/g, "");

  if (lower === "patientname") return "Patient Name";
  if (lower === "fullname" || lower === "name" || lower === "yourname" || lower === "naam") return "Full Name";
  if (lower === "firstname" || lower === "fname") return "First Name";
  if (lower === "lastname" || lower === "lname") return "Last Name";
  if (lower === "mobilenumber" || lower === "mobile" || lower === "mobileno") return "Mobile Number";
  if (lower === "phonenumber" || lower === "phone" || lower === "phoneno" || lower === "yourphone" || lower === "tel") return "Phone Number";
  if (lower === "patientphone" || lower === "patientmobile") return "Patient Mobile";
  if (lower === "whatsapp" || lower === "whatsappnumber" || lower === "whatsappno") return "WhatsApp Number";
  if (lower === "patientemail") return "Patient Email";
  if (lower === "emailaddress" || lower === "email" || lower === "youremail") return "Email Address";
  if (lower === "medicalconcern" || lower === "symptoms" || lower === "medicalsymptoms") return "Medical Concern";
  if (lower === "yourmessage" || lower === "message" || lower === "msg") return "Message";
  if (lower === "appointmentdate" || lower === "preferreddate") return "Appointment Date";
  if (lower === "appointmenttime" || lower === "preferredtime") return "Preferred Time";

  return cleanedKey
    .replace(/^[_\-]+/, "")
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function formatFieldValue(val: any): string {
  if (val === undefined || val === null || val === "") return "";
  if (Array.isArray(val)) {
    return val
      .map((item) => formatFieldValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof val === "object") {
    if ("value" in val && val.value !== undefined) {
      return formatFieldValue(val.value);
    }
    try {
      return Object.entries(val)
        .map(([k, v]) => `${formatFieldTitle(k)}: ${formatFieldValue(v)}`)
        .join(", ");
    } catch {
      return String(val);
    }
  }
  const str = String(val).trim();
  if (str === "[object File]" || str === "[object Object]") return "";
  return str;
}

/**
 * Flattens arbitrary webhook JSON / form payloads into a clean key -> string value map.
 * Supports Elementor Pro native webhooks (`fields: { id: { title, value } }`),
 * bracketed keys (`form_fields[name]`), and nested wrappers (`data`, `submission`, `fields`).
 */
export function flattenWebhookPayload(input: Record<string, any> | null | undefined): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const result: Record<string, string> = {};

  const setField = (rawKey: string, rawVal: any) => {
    const valStr = formatFieldValue(rawVal);
    if (!valStr) return;
    const key = cleanRawKeyName(rawKey);
    if (!key) return;
    if (result[key] && result[key] !== valStr) {
      result[key] = `${result[key]}, ${valStr}`;
    } else {
      result[key] = valStr;
    }
  };

  const processObject = (obj: Record<string, any>, prefix = "") => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null || v === "") continue;

      // Elementor / WPForms field descriptor object: { title/label, value, type }
      if (typeof v === "object" && !Array.isArray(v) && ("value" in v || "val" in v)) {
        const labelKey = v.title || v.label || v.name || v.id || k;
        const fieldVal = v.value !== undefined ? v.value : v.val;
        setField(String(labelKey), fieldVal);
        continue;
      }

      // Array of field descriptor objects: [{ name/title/label, value }]
      if (Array.isArray(v)) {
        const isDescriptorArray = v.every(
          (item) => item && typeof item === "object" && ("value" in item || "val" in item)
        );
        if (isDescriptorArray && v.length > 0) {
          for (const item of v) {
            const labelKey = item.title || item.label || item.name || item.id || k;
            const fieldVal = item.value !== undefined ? item.value : item.val;
            setField(String(labelKey), fieldVal);
          }
          continue;
        }
        // Normal array of primitives (e.g. checkbox values)
        setField(prefix ? `${prefix}_${k}` : k, v);
        continue;
      }

      // Nested container object (e.g. "fields", "form_fields", "data", "submission", "contact")
      if (typeof v === "object") {
        const lowerK = k.toLowerCase();
        const isWrapper = ["fields", "form_fields", "data", "submission", "payload", "body", "entry", "lead", "contact", "patient"].includes(lowerK);
        processObject(v, isWrapper ? "" : k);
        continue;
      }

      setField(prefix ? `${prefix}_${k}` : k, v);
    }
  };

  processObject(input);
  return result;
}

/**
 * Checks if a string looks like a date (e.g. 2026-10-25, 25/10/2026, 25-10-2026)
 * so we never mistake a date for a phone number.
 */
export function isLikelyDateOrTime(val: string): boolean {
  const s = val.trim();
  if (/^\d{4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,2}/.test(s)) return true;
  if (/^\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4}/.test(s)) return true;
  if (/^\d{1,2}:\d{2}(\s?[aApP][mM])?$/.test(s)) return true;
  return false;
}

export function normalizePhoneDigits(phone: string): string {
  if (isLikelyDateOrTime(phone)) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function isValidPhoneValue(val: string): boolean {
  const s = val.trim();
  if (isLikelyDateOrTime(s)) return false;
  if (!/^[\+\d\(\)][\d\s\-\(\)\.]{6,18}\d$/.test(s)) return false;
  const digits = s.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Key classification helpers (avoiding false positives like `patient_age` or `preferred_contact_time`)
 */
function isNonPersonNameKey(lowerNoSep: string): boolean {
  return [
    "formname",
    "sitename",
    "filename",
    "pagename",
    "companyname",
    "businessname",
    "clinicname",
    "hospitalname",
    "doctorname",
    "physicianname",
    "treatmentname",
    "servicename",
    "departmentname",
    "coursename",
    "productname",
    "planname",
    "projectname",
    "username",
    "domainname",
    "hostname",
  ].some((bad) => lowerNoSep.includes(bad));
}

function isPrimaryPersonNameKey(rawKey: string): boolean {
  const clean = cleanRawKeyName(rawKey);
  const lowerNoSep = clean.toLowerCase().replace(/[\s_\-]+/g, "");
  if (isNonPersonNameKey(lowerNoSep)) return false;

  // Do not match guardian/father/mother/spouse/reference name as the primary lead name if avoidable
  if (["father", "mother", "guardian", "spouse", "partner", "reference", "refer", "emergency"].some((w) => lowerNoSep.includes(w))) {
    return false;
  }

  const exactMatches = new Set([
    "name",
    "fullname",
    "yourname",
    "patientname",
    "patientfullname",
    "patient",
    "clientname",
    "customername",
    "contactname",
    "visitorname",
    "applicantname",
    "studentname",
    "leadname",
    "naam",
  ]);
  if (exactMatches.has(lowerNoSep)) return true;

  // Match keys ending with "name" (e.g. "enter_your_name", "user_full_name")
  if (lowerNoSep.endsWith("name") && !lowerNoSep.includes("first") && !lowerNoSep.includes("last") && !lowerNoSep.includes("middle")) {
    return true;
  }
  return false;
}

function isFirstNameKey(rawKey: string): boolean {
  const lowerNoSep = cleanRawKeyName(rawKey).toLowerCase().replace(/[\s_\-]+/g, "");
  return ["firstname", "fname", "givenname", "yourfirstname", "patientfirstname"].includes(lowerNoSep);
}

function isLastNameKey(rawKey: string): boolean {
  const lowerNoSep = cleanRawKeyName(rawKey).toLowerCase().replace(/[\s_\-]+/g, "");
  return ["lastname", "lname", "surname", "familyname", "yourlastname", "patientlastname"].includes(lowerNoSep);
}

function isPhoneFieldKey(rawKey: string): boolean {
  const lowerNoSep = cleanRawKeyName(rawKey).toLowerCase().replace(/[\s_\-]+/g, "");
  // Exclude non-phone fields that happen to have "contact" or "number"
  if (
    [
      "time",
      "date",
      "method",
      "mode",
      "preference",
      "person",
      "age",
      "pin",
      "zip",
      "aadhar",
      "pan",
      "policy",
      "gst",
      "room",
      "ward",
      "bed",
      "guest",
      "invoice",
      "order",
      "roll",
      "registration",
      "uhid",
    ].some((bad) => lowerNoSep.includes(bad))
  ) {
    return false;
  }

  return (
    lowerNoSep.includes("phone") ||
    lowerNoSep.includes("mobile") ||
    lowerNoSep.includes("whatsapp") ||
    lowerNoSep === "tel" ||
    lowerNoSep === "telephone" ||
    lowerNoSep === "cell" ||
    lowerNoSep === "contactnumber" ||
    lowerNoSep === "contactno" ||
    lowerNoSep === "mobno" ||
    lowerNoSep === "phno" ||
    lowerNoSep === "number" ||
    lowerNoSep === "contact"
  );
}

function isEmailFieldKey(rawKey: string): boolean {
  const lowerNoSep = cleanRawKeyName(rawKey).toLowerCase().replace(/[\s_\-]+/g, "");
  return lowerNoSep.includes("email") || lowerNoSep === "mail" || lowerNoSep === "e-mail";
}

function isCityFieldKey(rawKey: string): boolean {
  const lowerNoSep = cleanRawKeyName(rawKey).toLowerCase().replace(/[\s_\-]+/g, "");
  return ["city", "patientcity", "yourcity", "town", "district", "location", "address", "area", "locality"].includes(lowerNoSep);
}

function isStateFieldKey(rawKey: string): boolean {
  const lowerNoSep = cleanRawKeyName(rawKey).toLowerCase().replace(/[\s_\-]+/g, "");
  return ["state", "patientstate", "province", "region"].includes(lowerNoSep);
}

function isMessageFieldKey(rawKey: string): boolean {
  const lowerNoSep = cleanRawKeyName(rawKey).toLowerCase().replace(/[\s_\-]+/g, "");
  // Do NOT treat "enquiry_type" or "query_type" as the free-text message if avoidable
  if (lowerNoSep.includes("type") || lowerNoSep.includes("category") || lowerNoSep.includes("department") || lowerNoSep.includes("service")) {
    return false;
  }
  return [
    "message",
    "yourmessage",
    "comments",
    "comment",
    "query",
    "yourquery",
    "description",
    "msg",
    "details",
    "medicalconcern",
    "medicalsymptoms",
    "symptoms",
    "concern",
    "problem",
    "healthissue",
    "notes",
    "additionalinfo",
    "howcanwehelp",
  ].some((k) => lowerNoSep === k || lowerNoSep.includes(k));
}

/**
 * Extracts canonical lead columns (fullName, phone, email, city, state, message)
 * from a flattened webhook payload.
 */
export function extractCanonicalLeadData(flatBody: Record<string, string>) {
  const entries = Object.entries(flatBody).filter(([k, v]) => {
    const lowerK = cleanRawKeyName(k).toLowerCase();
    const lowerNoSep = lowerK.replace(/[\s_\-]+/g, "");
    return Boolean(v && !IGNORED_KEYS.has(lowerK) && !IGNORED_KEYS.has(lowerNoSep) && !k.startsWith("_"));
  });

  // 1. Email
  let email: string | null = null;
  for (const [k, v] of entries) {
    if (isEmailFieldKey(k) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
      email = v.trim();
      break;
    }
  }
  if (!email) {
    for (const [, v] of entries) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
        email = v.trim();
        break;
      }
    }
  }

  // 2. Phone
  let phone: string | null = null;
  for (const [k, v] of entries) {
    if (isPhoneFieldKey(k) && isValidPhoneValue(v)) {
      phone = v.trim();
      break;
    }
  }
  // Fallback: phone key with at least 7 digits (not a date)
  if (!phone) {
    for (const [k, v] of entries) {
      if (isPhoneFieldKey(k) && !isLikelyDateOrTime(v) && v.replace(/\D/g, "").length >= 7) {
        phone = v.trim();
        break;
      }
    }
  }
  // Final fallback: any value that strictly matches a 10-15 digit phone number
  if (!phone) {
    for (const [k, v] of entries) {
      const lowerNoSep = cleanRawKeyName(k).toLowerCase().replace(/[\s_\-]+/g, "");
      if (["pin", "zip", "aadhar", "pan", "date", "dob", "policy", "id"].some((w) => lowerNoSep.includes(w))) continue;
      if (isValidPhoneValue(v)) {
        phone = v.trim();
        break;
      }
    }
  }

  // 3. Full Name (Combine first_name + last_name first if present!)
  let firstName = "";
  let lastName = "";
  let explicitFullName = "";

  for (const [k, v] of entries) {
    if (!firstName && isFirstNameKey(k)) firstName = v.trim();
    if (!lastName && isLastNameKey(k)) lastName = v.trim();
    if (!explicitFullName && isPrimaryPersonNameKey(k) && !isValidPhoneValue(v) && !v.includes("@")) {
      explicitFullName = v.trim();
    }
  }

  const combinedFirstLast = [firstName, lastName].filter(Boolean).join(" ").trim();
  let fullName = explicitFullName || combinedFirstLast || "";

  // Fallback for Elementor forms with generic keys like `field_1` where value looks like a person's name
  if (!fullName) {
    for (const [k, v] of entries) {
      const lowerNoSep = cleanRawKeyName(k).toLowerCase().replace(/[\s_\-]+/g, "");
      if (
        TECHNICAL_KEYS.has(lowerNoSep) ||
        isEmailFieldKey(k) ||
        isPhoneFieldKey(k) ||
        isCityFieldKey(k) ||
        isStateFieldKey(k) ||
        isMessageFieldKey(k) ||
        ["age", "gender", "sex", "date", "time", "department", "service", "treatment", "doctor", "branch", "subject"].some((w) => lowerNoSep.includes(w))
      ) {
        continue;
      }
      const s = v.trim();
      if (
        s.length >= 2 &&
        s.length <= 50 &&
        !s.includes("@") &&
        !isValidPhoneValue(s) &&
        !isLikelyDateOrTime(s) &&
        !/^\d+$/.test(s) &&
        /^[a-zA-Z\u0900-\u097F\s\.\-']+$/.test(s)
      ) {
        fullName = s;
        break;
      }
    }
  }

  if (!fullName) fullName = "Unknown";

  // 4. City & State
  let city: string | null = null;
  let state: string | null = null;
  for (const [k, v] of entries) {
    if (!city && isCityFieldKey(k)) city = v.trim();
    if (!state && isStateFieldKey(k)) state = v.trim();
  }

  // 5. Message
  let message: string | null = null;
  for (const [k, v] of entries) {
    if (isMessageFieldKey(k)) {
      message = v.trim();
      break;
    }
  }

  return {
    fullName,
    phone,
    email,
    city,
    state,
    message,
  };
}

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
  let parsedObj: Record<string, any> = {};
  if (typeof raw === "string") {
    try {
      parsedObj = JSON.parse(raw);
    } catch {
      parsedObj = {};
    }
  } else if (raw && typeof raw === "object") {
    parsedObj = raw;
  }

  const body = flattenWebhookPayload(parsedObj);

  const primaryFullName = (primaryLeadData?.fullName || "").trim();
  const primaryFullNameLower = primaryFullName.toLowerCase();
  const primaryNameParts = new Set(
    primaryFullNameLower
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2)
  );

  const primaryPhone = (primaryLeadData?.phone || "").trim();
  const primaryPhoneDigits = primaryPhone ? normalizePhoneDigits(primaryPhone) : "";
  const primaryEmail = (primaryLeadData?.email || "").trim().toLowerCase();
  const primaryMessage = (primaryLeadData?.message || "").trim().toLowerCase();
  const primaryCity = (primaryLeadData?.city || "").trim().toLowerCase();
  const primaryState = (primaryLeadData?.state || "").trim().toLowerCase();

  const technicalFields: CleanLeadField[] = [];
  const customFieldsOnly: CleanLeadField[] = [];
  const allDeduplicatedFields: CleanLeadField[] = [];

  let nameField: CleanLeadField | null =
    primaryFullName && primaryFullNameLower !== "unknown"
      ? { key: "fullName", label: "Full Name", value: primaryFullName, category: "name" }
      : null;
  let phoneField: CleanLeadField | null = primaryPhone
    ? { key: "phone", label: "Phone Number", value: primaryPhone, category: "phone" }
    : null;
  let emailField: CleanLeadField | null = primaryLeadData?.email
    ? { key: "email", label: "Email Address", value: primaryLeadData.email.trim(), category: "email" }
    : null;
  let messageField: CleanLeadField | null = primaryLeadData?.message
    ? { key: "message", label: "Message / Query", value: primaryLeadData.message.trim(), category: "message" }
    : null;
  const locationParts = [primaryLeadData?.city, primaryLeadData?.state].filter(Boolean).join(", ");
  let locationField: CleanLeadField | null = locationParts
    ? { key: "location", label: "Location", value: locationParts, category: "location" }
    : null;

  const generalCustomFields: CleanLeadField[] = [];

  const seenKeyValPairs = new Set<string>();
  const seenPhoneDigits = new Set<string>();
  if (primaryPhoneDigits) seenPhoneDigits.add(primaryPhoneDigits);

  Object.entries(body).forEach(([k, v]) => {
    const strVal = formatFieldValue(v);
    if (!strVal || strVal === "—") return;

    const cleanK = cleanRawKeyName(k);
    const lowerK = cleanK.toLowerCase();
    const lowerNoSep = lowerK.replace(/[\s_\-]+/g, "");
    const lowerVal = strVal.toLowerCase();

    // 1. Skip system & internal plugin keys
    if (
      IGNORED_KEYS.has(lowerK) ||
      IGNORED_KEYS.has(lowerNoSep) ||
      cleanK.startsWith("_") ||
      lowerNoSep.includes("recaptcha") ||
      lowerNoSep.includes("turnstile") ||
      lowerNoSep.includes("nonce")
    ) {
      return;
    }

    // 2. Technical & Tracking fields
    if (lowerNoSep.startsWith("utm") || TECHNICAL_KEYS.has(lowerK) || TECHNICAL_KEYS.has(lowerNoSep)) {
      technicalFields.push({
        key: cleanK,
        label: formatFieldTitle(cleanK),
        value: strVal,
        category: "technical",
      });
      return;
    }

    // 3. Check if this field is the SAME as the primary Name (or First/Last name parts of primary Name)
    if (
      (isPrimaryPersonNameKey(cleanK) || isFirstNameKey(cleanK) || isLastNameKey(cleanK)) &&
      (lowerVal === primaryFullNameLower || primaryNameParts.has(lowerVal) || !nameField)
    ) {
      if (!nameField) {
        const label = lowerNoSep.includes("patient") ? "Patient Name" : "Full Name";
        nameField = { key: cleanK, label, value: strVal, category: "name" };
      } else if (lowerNoSep.includes("patient") && nameField.label === "Full Name") {
        nameField.label = "Patient Name";
      }
      return;
    }

    // 4. Check if this field is the SAME phone number as the primary Phone
    const digits = normalizePhoneDigits(strVal);
    if (digits.length >= 10 && seenPhoneDigits.has(digits)) {
      if (phoneField && lowerNoSep.includes("patient")) {
        phoneField.label = "Patient Mobile";
      }
      return;
    }
    if (!phoneField && isPhoneFieldKey(cleanK) && digits.length >= 7) {
      const label = lowerNoSep.includes("patient") ? "Patient Mobile" : lowerNoSep.includes("mobile") ? "Mobile Number" : "Phone Number";
      phoneField = { key: cleanK, label, value: strVal, category: "phone" };
      if (digits) seenPhoneDigits.add(digits);
      return;
    }
    if (digits.length >= 10) {
      seenPhoneDigits.add(digits);
    }

    // 5. Check if this field is the SAME email as the primary Email
    if (primaryEmail && lowerVal === primaryEmail) {
      if (emailField && lowerNoSep.includes("patient")) {
        emailField.label = "Patient Email";
      }
      return;
    }
    if (!emailField && (isEmailFieldKey(cleanK) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal))) {
      const label = lowerNoSep.includes("patient") ? "Patient Email" : "Email Address";
      emailField = { key: cleanK, label, value: strVal, category: "email" };
      return;
    }

    // 6. Check if this field is the SAME location (City / State)
    if (
      (isCityFieldKey(cleanK) || isStateFieldKey(cleanK)) &&
      (lowerVal === primaryCity || lowerVal === primaryState)
    ) {
      return;
    }

    // 7. Check if this field is the SAME message as the primary Message
    if (primaryMessage && lowerVal === primaryMessage) {
      if (messageField && (lowerNoSep.includes("symptom") || lowerNoSep.includes("concern"))) {
        messageField.label = "Medical Concern";
      }
      return;
    }
    if (!messageField && isMessageFieldKey(cleanK)) {
      const label = lowerNoSep.includes("symptom") || lowerNoSep.includes("concern") ? "Medical Concern" : "Message / Query";
      messageField = { key: cleanK, label, value: strVal, category: "message" };
      return;
    }

    // 8. Also skip generic field_1 / field_2 if its value is identical to primary name/phone/email/message/city
    if (
      lowerVal === primaryFullNameLower ||
      lowerVal === primaryEmail ||
      lowerVal === primaryMessage ||
      (primaryCity && lowerVal === primaryCity) ||
      (primaryState && lowerVal === primaryState)
    ) {
      return;
    }

    // 9. Preserve ALL other custom form fields (e.g. Patient Age, Gender, Department, Date, Time, Alternate Phone, etc.)
    const cleanLabel = formatFieldTitle(cleanK);
    const dedupSignature = `${cleanLabel.toLowerCase()}::${lowerVal}`;
    if (seenKeyValPairs.has(dedupSignature)) {
      return;
    }
    seenKeyValPairs.add(dedupSignature);

    generalCustomFields.push({
      key: cleanK,
      label: cleanLabel,
      value: strVal,
      category: "custom",
    });
  });

  if (nameField) allDeduplicatedFields.push(nameField);
  if (phoneField) allDeduplicatedFields.push(phoneField);
  if (emailField) allDeduplicatedFields.push(emailField);
  if (locationField) allDeduplicatedFields.push(locationField);
  generalCustomFields.forEach((f) => allDeduplicatedFields.push(f));
  if (messageField) allDeduplicatedFields.push(messageField);

  generalCustomFields.forEach((f) => {
    customFieldsOnly.push(f);
  });

  return {
    allDeduplicatedFields,
    customFieldsOnly,
    technicalFields,
  };
}
