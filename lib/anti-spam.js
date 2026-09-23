// Low-cost spam defences for the unauthenticated public APIs.
// Layered on top of /lib/rate-limit.js — rate limit catches volume,
// these checks catch the cheap automated submissions a determined
// attacker would otherwise use to spread their requests across many
// IPs to stay under the rate limit.
//
// Three checks, all server-side, all cheap:
//
//   1. HONEYPOT — the client forms include a hidden <input name="
//      honeypot"> that humans never see (CSS-hidden, tabindex=-1,
//      aria-hidden). Scripted bots that fill every form field will
//      submit a non-empty value; reject those.
//
//   2. ORIGIN — modern browsers send Origin: on cross-origin POST.
//      If Origin is present but not in our allow-list, reject.
//      Missing Origin (server-to-server scripts, local curl) gets
//      a pass — those callers are gated by rate-limit alone, and
//      blocking them would break legitimate API tests.
//
//   3. TIME-GATE — client stamps formLoadedAt on mount and includes
//      it in the submit payload. If the gap between mount and
//      submit is under 3 seconds, the form was almost certainly
//      autofilled by a script rather than typed by a human.
//      Tolerant of slow networks (no upper bound).
//
// Returns { ok: true } or { ok: false, code: string, status: 400 }
// so the caller can early-return the same way it returns rate-limit
// rejections.

// Baseline origins the checker has shipped from. Extra production origins — e.g.
// a new subdomain after the Vercel → self-host migration — are added at deploy
// time via the ALLOWED_ORIGINS env var (comma-separated, full scheme+host, no
// trailing slash), so admins can point a new domain at the API without a code
// release. Trailing slashes are stripped defensively (browser Origin has none).
const ALLOWED_ORIGINS = new Set([
  "https://altery.com",
  "https://www.altery.com",
  "https://altery-eligibility.vercel.app",
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean),
]);

const MIN_FORM_AGE_MS = 3000;          // 3 s — humans take longer to fill a form
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000; // 24 h — reject stale tokens
const HONEYPOT_FIELD = "website";      // common name bots fill, invisible to users

// Vercel preview deploys stay usable for QA through the deployment's OWN
// hosts, which Vercel exposes to the function as system env vars. A pattern
// such as "any *.vercel.app with altery in it" also admitted anyone's
// project (altery-pay.vercel.app is free to register) and let a clone of the
// paywall call this API. Read per call: on Vercel they are fixed per
// deployment, and tests can set them.
const VERCEL_HOST_VARS = ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"];
function vercelDeploymentHosts() {
  const hosts = new Set();
  for (const k of VERCEL_HOST_VARS) {
    const v = typeof process !== "undefined" && process.env ? process.env[k] : "";
    if (typeof v === "string" && /^[a-z0-9.-]+$/i.test(v.trim())) hosts.add(v.trim().toLowerCase());
  }
  return hosts;
}

function isAllowedOrigin(origin) {
  if (!origin) return true;             // missing Origin → server-to-server, gated by rate-limit
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.protocol === "https:" && vercelDeploymentHosts().has(u.host)) return true;
  } catch (e) { /* invalid Origin string → reject */ }
  return false;
}

function checkAntiSpam(req) {
  const body = req.body || {};

  // 1. Honeypot — silent reject. Bots that fill EVERY field will trip
  // this; humans never see the field, so they never fill it.
  const honey = body[HONEYPOT_FIELD];
  if (typeof honey === "string" && honey.trim().length > 0) {
    return { ok: false, code: "honeypot", status: 400 };
  }

  // 2. Origin check — modern browsers always send Origin on POST.
  // Reject when present-but-mismatched; allow missing (for legitimate
  // server-side callers / local tests).
  if (!isAllowedOrigin(req.headers?.origin)) {
    return { ok: false, code: "bad_origin", status: 403 };
  }

  // 3. Time-gate — client sends `formLoadedAt` (Date.now() at mount).
  // We expect at least 3 s of human form-filling. Field is optional
  // for back-compat with older cached clients — only enforce when
  // present and clearly a script's submission. Stale submissions
  // (>24 h) likely come from a tampered cache, also reject.
  const loadedAt = Number(body.formLoadedAt);
  if (Number.isFinite(loadedAt) && loadedAt > 0) {
    const age = Date.now() - loadedAt;
    if (age < MIN_FORM_AGE_MS) {
      return { ok: false, code: "too_fast", status: 400 };
    }
    if (age > MAX_FORM_AGE_MS) {
      return { ok: false, code: "stale", status: 400 };
    }
  }

  return { ok: true };
}

// Helper for the API layer to early-return a uniform 400/403.
// Generic error message — never tells the bot WHICH check fired,
// because that lets them iterate. The code is for our own logs.
function sendAntiSpamReject(res, result) {
  // Sanitize the client-controlled XFF header before logging: strip CR/LF
  // and cap length so it can't forge or split our log lines (log injection).
  const xff = String(res.req?.headers?.["x-forwarded-for"] || "unknown")
    .replace(/[\r\n]+/g, " ").slice(0, 120);
  // eslint-disable-next-line no-console
  console.warn(`[anti-spam] rejected: ${result.code} from ip=${xff}`);
  return res.status(result.status || 400).json({
    error: "Request rejected.",
    code:  "spam_check_failed",
  });
}

export { checkAntiSpam, sendAntiSpamReject, HONEYPOT_FIELD };
