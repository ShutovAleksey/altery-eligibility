// Pure validators / sanitizers for the analysis email API (api/send-analysis.js).
// Extracted from the handler so the XSS-critical HTML escaping, the URL
// allow-lists, and the email-string sanitizer can be unit-tested in node
// (see test/sendAnalysisValidators.test.mjs). Keep this file dependency-free.

// Minimal HTML escape — every user-supplied string spliced into the email
// template MUST flow through this before reaching the HTML body. Email clients
// render the same tag set as browsers (script tags are usually stripped, but
// onerror on <img> can survive), so the same XSS rules apply.
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Allow-list for the post-email CTA's "Continue to setup" link. The client
// controls sessionLink; without an allow-list an attacker could POST
// sessionLink="https://phish.example.com/altery-clone" and the email — sent
// from our verified domain — would point its primary CTA at the attacker's
// domain. Anchored to our deployment host + the public production host.
export const ALLOWED_SESSION_HOSTS = new Set([
  "altery-eligibility.vercel.app",
  "altery.com",
  "www.altery.com",
]);

export function safeSessionLink(link) {
  if (typeof link !== "string") return "https://altery.com";
  try {
    const url = new URL(link);
    if (url.protocol !== "https:") return "https://altery.com";
    if (ALLOWED_SESSION_HOSTS.has(url.host)) return url.toString();
    // Accept any Vercel preview deploy of this project — they always sit
    // under *.vercel.app with "altery" in the host.
    if (url.host.endsWith(".vercel.app") && url.host.includes("altery")) return url.toString();
    return "https://altery.com";
  } catch (e) {
    return "https://altery.com";
  }
}

// Only accept booking URLs from the Google Calendar scheduling hosts we use.
// Anything else collapses to "" (no booking CTA) so a client-supplied URL
// can't repoint the link at an attacker page.
export function isAllowedBookingURL(url) {
  return (typeof url === "string"
    && /^https:\/\/(calendar\.app\.google|calendar\.google\.com)\//.test(url))
    ? url
    : "";
}

// Escape + length-cap every DISPLAY string the client sends for the email
// body (the localized copy bundle). `subject` is excluded — it's an email
// header, not HTML, handled by safeSubject. Returns a fresh object holding
// only escaped string values; non-strings and unknown shapes are dropped.
export function sanitizeEmailStrings(emailStrings, max = 400) {
  const out = {};
  if (!emailStrings || typeof emailStrings !== "object" || Array.isArray(emailStrings)) return out;
  for (const k of Object.keys(emailStrings)) {
    if (k === "subject") continue;
    const v = emailStrings[k];
    if (typeof v === "string") out[k] = escapeHtml(v.slice(0, max));
  }
  return out;
}

// Email subject is a header: strip CR/LF (header-injection) and length-cap.
// NOT HTML-escaped — it is never rendered as HTML.
export function safeSubject(raw, fallback, max = 120) {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.replace(/[\r\n]+/g, " ").slice(0, max);
  }
  return fallback;
}
