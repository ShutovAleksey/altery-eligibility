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
//
// Since the opening-fee paywall, the email CTA is a resume link back to the
// CHECKER itself (/?resume=…), so the checker's own host must pass. The
// hard-coded hosts cover Vercel + altery.com; a self-hosted domain (e.g.
// after the Vercel → container move) comes from ALLOWED_ORIGINS, the same
// env var that already has to list that domain or its API POSTs are
// refused (lib/anti-spam.js). Keeping one list means one thing to set.
export const ALLOWED_SESSION_HOSTS = new Set([
  "altery-eligibility.vercel.app",
  "altery.com",
  "www.altery.com",
  "app.altery.com",   // external registration: what browsers still running the pre-paywall checker send
]);

// Read per call rather than at import so a test (or a hot env reload) sees
// the current value. Only https origins count, matching safeSessionLink.
//
// Vercel previews come from the deployment's own system env vars
// (VERCEL_URL and friends), not from a host pattern: "any *.vercel.app with
// altery in it" also matched hosts anyone can register (altery-pay.vercel.app),
// and this email goes out from our verified sender. With the CTA now leading
// to a card payment, a clone behind that link would be a convincing phish.
const VERCEL_HOST_VARS = ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"];
function deploymentSessionHosts() {
  const env = (typeof process !== "undefined" && process.env) || {};
  const hosts = new Set();
  for (const o of (env.ALLOWED_ORIGINS || "").split(",")) {
    try {
      const u = new URL(o.trim());
      if (u.protocol === "https:") hosts.add(u.host);
    } catch (e) { /* blank or malformed entry → ignore */ }
  }
  for (const k of VERCEL_HOST_VARS) {
    const v = env[k];
    if (typeof v === "string" && /^[a-z0-9.-]+$/i.test(v.trim())) hosts.add(v.trim().toLowerCase());
  }
  return hosts;
}

export function safeSessionLink(link) {
  if (typeof link !== "string") return "https://altery.com";
  try {
    const url = new URL(link);
    if (url.protocol !== "https:") return "https://altery.com";
    if (ALLOWED_SESSION_HOSTS.has(url.host)) return url.toString();
    if (deploymentSessionHosts().has(url.host)) return url.toString();
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
