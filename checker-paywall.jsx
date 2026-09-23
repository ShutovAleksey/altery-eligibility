/* global React, useT, Button, Input, Checkbox, Alert, Tag, Spinner, Icon, EcIco, EcCountrySelect, EcCosts */
// checker-paywall.jsx — the one-time account opening fee step (EcPaywall).
//
// Sits between the approved result page and the external registration app
// (app.altery.com). Founder decision 2026-09-23: after "yes, we can open your
// account" the visitor pays a one-time, non-refundable opening fee (card,
// Apple Pay or Google Pay) and only then continues to registration. One
// payment is one application; the page asks for no company details, because
// registration binds the company to the payment the first time the token is
// used. The server (api/opening-fee.js) is authoritative for the amount and
// issues a signed token after payment; that token rides to registration as
// ?opening=.
//
// Loaded as <script type="text/babel" src="/checker-paywall.jsx"> in
// /index.html right after /checker-modals.jsx. Exports to window:
//
//   EcPaywall — full-page paywall view, rendered by the approved result
//               screen (checker-screens.jsx) in place of the result when the
//               visitor clicks the main CTA
//
// The fee is announced before this page by structure, not captions: the
// sidebar's "Account opening" step, the result page's two-cell cost block
// and its "Continue to account opening" CTA (all in checker-screens.jsx).
// This page repeats the same cost block in its summary, so the visitor
// meets the same two figures with the same time labels a second time.
//
// Promo codes (founder decision, 2026-09-23): a code field sits under the
// work email. The server checks the code in Stripe ({action:"promo"}) and
// says what the fee comes to; a code that makes it free hides the card
// form and consent (nothing to charge, nothing to consent to) and the
// create call answers with the token itself; a partial discount keeps the
// card flow, with the Payment Element's amount updated to the discounted
// fee so Stripe accepts the confirm. One redemption per work email, kept
// by the server; a 400 promo_used / promo_invalid from create un-applies
// the code and lands under the same field.
//
// DS components (Button, Input, Checkbox, Alert, Tag, Spinner, Icon) and
// EcIco resolve at render time through the scope chain, like every other
// checker module. The opening-fee helpers (ecLoadOpeningFeeConfig,
// ecBuildResumeURL, ecBuildHandoffURL, ecTrack, EC_OPENING_FEE), the country
// list (EC_COUNTRIES), the checker's own country picker (EcCountrySelect)
// and the shared cost block (EcCosts, both /checker-screens.jsx) are read
// off window behind typeof guards instead: a missing helper must degrade
// (to the "payments unavailable" state, to billing in the country of
// incorporation, to a summary without the block), never to a ReferenceError
// on a page that takes money.
//
// useState/useEffect/useRef/useMemo are NOT redeclared here —
// /checker-flag-lang.jsx owns that destructure (see the collision note in
// CLAUDE.md).

const EC_PW_API = "/api/opening-fee";
const EC_PW_STRIPE_JS = "https://js.stripe.com/v3/";
// Registration entry used only if ecBuildHandoffURL is somehow missing, so a
// visitor who has already paid is never stranded on the success screen.
const EC_PW_REGISTRATION_FALLBACK = "https://app.altery.com/n/registration-corporate";

// Mirrors the server validators in lib/opening-fee.js. Checking client-side
// first keeps the create call (rate-limited per IP and per email) for
// submissions that can actually succeed.
const EC_PW_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EC_PW_PI_RE = /^pi_[A-Za-z0-9]{8,}$/;
const EC_PW_COUNTRY_RE = /^[A-Z]{2}$/;
// Fields the server can name in a 400 invalid_field that the visitor can
// fix here. The create call's `country` is the country of incorporation
// from the checker's first question, not the billing country picker, so a
// refusal of it (or of plan/entity/attemptId) reads as "not now".
const EC_PW_FIELD_IDS = {
  email: "ec-pw-email",
};
// Promo code field. Not in EC_PW_FIELD_IDS: the server refuses a code with
// its own errors (promo_invalid / promo_used), never as invalid_field.
const EC_PW_PROMO_ID = "ec-pw-promo";
// Mirrors normalizeCode in lib/opening-fee-promo.js; anything else is
// refused here without a call (the promo check is rate-limited per IP).
const EC_PW_PROMO_CODE_RE = /^[A-Z0-9_-]{3,32}$/;
// Server reasons with their own copy; anything else reads as "unavailable".
const EC_PW_PROMO_REASONS = {
  invalid: "ec.pw.promo.invalid",
  expired: "ec.pw.promo.expired",
  used: "ec.pw.promo.used",
};
// Payment Element method types that are wallets. Their sheet supplies the
// billing address, so our billing-country picker steps aside while one is
// selected (the country still goes to Stripe on confirm).
const EC_PW_WALLET_TYPES = { apple_pay: true, google_pay: true };

// Timings. The redirect delay is long enough to read "Payment received" and
// short enough not to feel stuck. Polling covers bank-side "processing"
// states (rare for cards) for ~3 minutes; after that the processing notice
// stays up and points to support, because charging again is never the fix.
const EC_PW_REDIRECT_MS = 1200;
const EC_PW_POLL_MS = 5000;
const EC_PW_POLL_MAX = 36;
const EC_PW_READY_TIMEOUT_MS = 20000;
// The server refuses a create whose form stamp is over 24 h old (lib/
// anti-spam.js). B2B visitors leave tabs open for days, so a stamp older
// than this moves to their next real interaction with the form.
const EC_PW_STAMP_MAX_AGE_MS = 23 * 60 * 60 * 1000;

// Tab-scoped record of each PaymentIntent this tab has handed to Stripe,
// keyed by the normalised work email (trimmed, lowercased: the same
// spelling the server stores). Written BEFORE confirmPayment: a lost
// response can arrive after Stripe took the money, and with the record the
// next click for the same email re-checks that PaymentIntent on the server
// instead of charging again (the token is deterministic per PI, so
// registration gets the same one). `state` only rises, from "sent" to
// "processing" / "succeeded", as Stripe or the server confirm the charge.
// The email and billing country ride along (`f`) while the outcome is open,
// so a failed 3-D Secure redirect can refill the form. A different email
// pays as normal: the fee is per application, and the email is the only
// thing this page knows the applicant by.
const EC_PW_ATTEMPTS_KEY = "altery:pw:attempts:v1";
const EC_PW_ATTEMPTS_MAX = 5;
const EC_PW_STATE_RANK = { sent: 0, processing: 1, succeeded: 2 };

// Stripe Appearance API mapped onto the DS tokens (checker.css :root) so the
// card fields read as our own Inputs: same 12px radius, border, hover and
// focus ring, label size and colour. Hex values because the iframe cannot
// see our CSS custom properties.
const EC_PW_APPEARANCE = {
  theme: "stripe",
  variables: {
    colorPrimary: "#002780",
    colorText: "#11141A",
    colorTextSecondary: "#69707C",
    colorTextPlaceholder: "#99A1B2",
    colorDanger: "#CD1918",
    colorBackground: "#FFFFFF",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
    fontSizeBase: "14px",
    borderRadius: "12px",
    // Same 16px rhythm as the card's own fields (email, billing country).
    gridRowSpacing: "16px",
  },
  rules: {
    // 20px label line + 4px gap + 44px input: the DS Input's measurements,
    // so Stripe's rows continue the email / country rows above them.
    ".Label": { fontSize: "13px", fontWeight: "500", color: "#31343A", lineHeight: "20px", marginBottom: "4px" },
    ".Input": { border: "1px solid #D7DAE0", boxShadow: "none", padding: "13px 14px" },
    ".Input:hover": { border: "1px solid #99A1B2" },
    ".Input:focus": { border: "1px solid #006FFF", boxShadow: "0 0 0 3px rgba(0, 111, 255, 0.30)" },
    ".Input--invalid": { border: "1px solid #CD1918", boxShadow: "none" },
    ".Error": { fontSize: "12px" },
  },
};
// Stripe.js fetches this stylesheet from our page, so the CSP connect-src
// must list fonts.googleapis.com (vercel.json, docs/DEPLOY.md §6).
const EC_PW_FONTS = [
  { cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" },
];

function ecPwLang() {
  try {
    return (window.__I18N && window.__I18N.getLang && window.__I18N.getLang()) || "en";
  } catch (e) { return "en"; }
}

// Analytics must never break the payment flow, so every call is wrapped.
// Props carry ids and codes only: no emails or card data.
function ecPwTrack(name, props) {
  try {
    if (typeof window.ecTrack === "function") window.ecTrack(name, props || {});
  } catch (e) { /* analytics is best-effort */ }
}

function ecPwFieldErrors(f) {
  const email = f.email.trim();
  return {
    // ".." passes the pattern, but the server refuses it (so does Stripe's
    // receipt_email), and finding out there costs a create call.
    email: email.length > 254 || !EC_PW_EMAIL_RE.test(email) || email.includes(".."),
  };
}

// Same normalisation the server applies before it stores the email, so
// "Ops@Northwind.example " and "ops@northwind.example" are one applicant
// for the attempt record.
function ecPwNormEmail(s) {
  return String(s || "").trim().toLowerCase();
}

// Same normalisation the server applies to a promo code (trimmed,
// uppercased; Stripe matches codes case-insensitively). Empty string when
// the input is not a code at all.
function ecPwNormCode(s) {
  const code = String(s || "").trim().toUpperCase();
  return EC_PW_PROMO_CODE_RE.test(code) ? code : "";
}

// Billing countries on offer: the checker's full list, the same set Stripe's
// own dropdown (which this picker replaces) offered. The "blocked" flag is
// about where the COMPANY is incorporated, and those companies never reach
// the paywall; it says nothing about the card. A UK company paying with a
// director's card billed in India must be able to pick India. Sanctioned
// card countries are screened by Stripe itself.
function ecPwBillableCountries() {
  const all = Array.isArray(window.EC_COUNTRIES) ? window.EC_COUNTRIES : [];
  return all.filter((c) => c && typeof c.code === "string");
}
function ecPwBillableCode(code) {
  if (typeof code !== "string" || !EC_PW_COUNTRY_RE.test(code)) return "";
  return ecPwBillableCountries().some((c) => c.code === code) ? code : "";
}

// Idempotency-Key for the create call. One per click: the server stamps
// terms_accepted_at at request time, so replaying an old key with new
// parameters would be rejected by Stripe rather than deduplicated.
function ecPwAttemptId() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  } catch (e) { /* fall through */ }
  try {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) { /* fall through */ }
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 14)).slice(0, 32);
}

// ── Attempt record (see EC_PW_ATTEMPTS_KEY). Best-effort: in a browser
// that refuses sessionStorage the component's in-memory copy still covers
// the current page.
function ecPwReadAttempts() {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(EC_PW_ATTEMPTS_KEY) || "{}");
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out = {};
    Object.keys(v).forEach((key) => {
      const a = v[key];
      if (a && typeof a.pi === "string" && EC_PW_PI_RE.test(a.pi) && EC_PW_STATE_RANK[a.state] != null) out[key] = a;
    });
    return out;
  } catch (e) { return {}; }
}
function ecPwWriteAttempts(all) {
  try {
    const kept = {};
    Object.keys(all)
      .sort((a, b) => (all[b].at || 0) - (all[a].at || 0))
      .slice(0, EC_PW_ATTEMPTS_MAX)
      .forEach((key) => { kept[key] = all[key]; });
    window.sessionStorage.setItem(EC_PW_ATTEMPTS_KEY, JSON.stringify(kept));
  } catch (e) { /* private mode */ }
}
// `key` is always ecPwNormEmail(email).
function ecPwAttemptFor(key) {
  return (key && ecPwReadAttempts()[key]) || null;
}
function ecPwAttemptByPi(pi) {
  const all = ecPwReadAttempts();
  const key = Object.keys(all).find((k) => all[k].pi === pi);
  return key ? Object.assign({ key: key }, all[key]) : null;
}
function ecPwSaveAttempt(key, pi, state, fields) {
  if (!key || !pi || EC_PW_STATE_RANK[state] == null) return;
  const all = ecPwReadAttempts();
  const prev = all[key] && all[key].pi === pi ? all[key] : null;
  const best = prev && EC_PW_STATE_RANK[prev.state] > EC_PW_STATE_RANK[state] ? prev.state : state;
  const entry = { pi: pi, state: best, at: Date.now() };
  // Once paid the fields are no longer needed, so they don't linger.
  const f = fields || (prev && prev.f);
  if (best !== "succeeded" && f) entry.f = f;
  all[key] = entry;
  ecPwWriteAttempts(all);
}
function ecPwDropAttempt(pi) {
  const all = ecPwReadAttempts();
  let changed = false;
  Object.keys(all).forEach((key) => {
    if (all[key].pi === pi) { delete all[key]; changed = true; }
  });
  if (changed) ecPwWriteAttempts(all);
}

async function ecPwPost(body) {
  try {
    const r = await fetch(EC_PW_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    let data = null;
    try { data = await r.json(); } catch (e) { data = null; }
    return { status: r.status, data: data };
  } catch (e) {
    return { status: 0, data: null };
  }
}

// Server-side confirmation, reduced to the outcomes the UI cares about.
// Only the server can say "paid": it re-reads the PaymentIntent from Stripe
// and checks amount, currency and kind before signing the token.
async function ecPwConfirm(piId) {
  const r = await ecPwPost({ action: "confirm", paymentIntentId: piId });
  const d = r.data || {};
  if (r.status === 200 && d.ok && d.token) return { kind: "paid", data: d };
  if (r.status === 402) return { kind: d.status === "processing" ? "processing" : "unpaid" };
  if (r.status === 404) return { kind: "notFound" };
  return { kind: "error", status: r.status };
}

// Stripe.js is loaded on demand, once, only when a visitor reaches the
// paywall with payments enabled, so the quiz itself never pays for it. A
// failed load clears the cached promise so "Try again" really retries.
let ecPwStripeJsPromise = null;
function ecPwLoadStripeJs() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (ecPwStripeJsPromise) return ecPwStripeJsPromise;
  ecPwStripeJsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!err && window.Stripe) { resolve(window.Stripe); return; }
      ecPwStripeJsPromise = null;
      if (s.parentNode) s.parentNode.removeChild(s);
      reject(err || new Error("Stripe.js loaded without window.Stripe"));
    };
    const timer = setTimeout(() => finish(new Error("Stripe.js load timeout")), 15000);
    s.src = EC_PW_STRIPE_JS;
    s.async = true;
    s.addEventListener("load", () => finish(null));
    s.addEventListener("error", () => finish(new Error("Stripe.js failed to load")));
    document.head.appendChild(s);
  });
  return ecPwStripeJsPromise;
}

// Stripe's return_url for the rare card that needs a full-page redirect
// (bank 3DS pages that can't run in Stripe's modal). The resume link rebuilds
// the result from the answers, and opening_return=1 tells the app shell to
// reopen this view, which then only has to confirm the PaymentIntent Stripe
// appends. The email rides along so it is pre-filled again even if this
// tab's attempt record (which also restores the billing country) is gone.
function ecPwReturnURL(rec, plan, email) {
  let base = null;
  try {
    if (typeof window.ecBuildResumeURL === "function") base = window.ecBuildResumeURL(rec, plan, null, { email: email });
  } catch (e) { base = null; }
  try {
    const u = new URL(base || "/", window.location.origin);
    u.searchParams.set("opening_return", "1");
    return u.toString();
  } catch (e) {
    return window.location.origin + "/?opening_return=1";
  }
}

function ecPwHandoffURL(rec, plan, opts) {
  try {
    if (typeof window.ecBuildHandoffURL === "function") return window.ecBuildHandoffURL(rec, plan, null, opts);
  } catch (e) { /* fall through to the bare registration link */ }
  const u = new URL(EC_PW_REGISTRATION_FALLBACK);
  if (opts && opts.openingToken) u.searchParams.set("opening", opts.openingToken);
  return u.toString();
}

// Turns the support address inside a translated sentence into a mailto link.
// The address is interpolated by t(), so splitting on it works in every
// language without extra i18n keys for "before" and "after" fragments.
function ecPwWithMailto(text, email) {
  if (!email || typeof text !== "string" || text.indexOf(email) === -1) return text;
  const parts = text.split(email);
  const out = [];
  parts.forEach((part, i) => {
    out.push(part);
    if (i < parts.length - 1) {
      out.push(<a key={"m" + i} className="ec-pw__mail" href={"mailto:" + email}>{email}</a>);
    }
  });
  // One <span>, not a fragment: the Alert and Input error rows are flex
  // containers, and as separate flex items the text before the link, the
  // link and the trailing full stop each landed on their own line.
  return <span>{out}</span>;
}

// initialEmail: the address the visitor already gave us in this tab (resume
// link, proposal email, callback form), kept by the approved result page in
// checker-screens.jsx. It only pre-fills: the field stays editable, and a
// later value never replaces what the visitor typed. onEmailChange
// (optional) reports each edit, so the result page can hand the typed
// address back if the visitor steps back and returns.
//
// returnPaymentIntentId / returnRedirectStatus: set only when Stripe sent the
// visitor back from a 3-D Secure redirect (payment_intent + redirect_status
// in the URL, read by the app shell in checker-screens.jsx).
function EcPaywall({ rec, plan, onBack, initialEmail, onEmailChange, returnPaymentIntentId, returnRedirectStatus }) {
  const t = useT();
  const activePlan = plan || (rec && rec.plan) || null;
  const entity = (rec && rec.entity) || null;
  const planId = activePlan ? activePlan.id : null;
  const entityId = entity ? entity.id : null;
  // Country of incorporation (checker question 1). The create call sends it
  // as today, and it is the billing country until the visitor picks another.
  const countryCode = rec && rec.country ? rec.country.code : null;
  const entityName = entity ? t(entity.nameKey) : "";
  const planName = activePlan ? t(activePlan.nameKey) : "";
  const supportEmail = t("ec.support.email");
  const returnPi = typeof returnPaymentIntentId === "string" && EC_PW_PI_RE.test(returnPaymentIntentId)
    ? returnPaymentIntentId
    : null;

  // Billing-country picker: the checker's own EcCountrySelect with Q1's
  // naming and A→Z order, so both pickers read alike in every language.
  // t() hands back the bare code when a name is missing; the English name
  // from EC_COUNTRIES stands in for it.
  const countryName = (c) => {
    const key = "ec.country." + c.code;
    const localized = t(key);
    return localized === c.code || localized === key ? c.name : localized;
  };
  // Keyed on the active language, not on t: useT() hands back the same
  // function in every language, so a [t] dependency would keep the old
  // language's order after a switch.
  const uiLang = ecPwLang();
  const billingOptions = useMemo(() => {
    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    return ecPwBillableCountries().sort((a, b) => collator.compare(countryName(a), countryName(b)));
  }, [uiLang]);
  const CountrySelect = typeof window.EcCountrySelect === "function" ? window.EcCountrySelect : null;
  // The result page's cost block, repeated here with the same figures.
  const Costs = typeof window.EcCosts === "function" ? window.EcCosts : null;
  const planPrice = activePlan ? (activePlan.priceKey ? t(activePlan.priceKey) : activePlan.price) : "";

  // Server config (enabled / preview / publishable key / amount). null while
  // loading; the result page already fetched it, so this is normally instant.
  const [config, setConfig] = useState(null);
  // Back from a redirect that may have failed: refill what the visitor typed
  // before leaving (kept with the attempt record), so a declined card doesn't
  // cost them the whole form. Consent is not restored: a new attempt means a
  // new PaymentIntent, and each one records its own acceptance.
  const [fields, setFields] = useState(() => {
    const back = returnPi ? ecPwAttemptByPi(returnPi) : null;
    const f = (back && back.f) || {};
    const str = (v) => (typeof v === "string" ? v : "");
    return {
      email: str(f.email) || initialEmail || "",
      country: ecPwBillableCode(f.country) || ecPwBillableCode(countryCode) || "",
    };
  });
  // Set by the first keystroke in the email field: from then on the value
  // is the visitor's, and no pre-fill may replace it.
  const emailTypedRef = useRef(false);
  // A wallet (Apple Pay / Google Pay) is the method selected in the Payment
  // Element; its sheet collects the billing address itself.
  const [walletSelected, setWalletSelected] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverInvalid, setServerInvalid] = useState(null);
  const [consent, setConsent] = useState(false);
  // Promo code: what is typed (shown uppercased) and where the check stands.
  // null (nothing applied) · { status: "checking" } · { status: "applied",
  // code, amount, display, free } (the server's own pricing of the fee) ·
  // { status: "error", reason } with reason "invalid" | "expired" | "used"
  // | "unavailable".
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState(null);
  // Guards the Apply click the way busyRef guards Pay: state is async.
  const promoBusyRef = useRef(false);
  // Phases: "form" (interactive) · "submitting" (create + Stripe confirm) ·
  // "confirming" (server confirm) · "processing" (bank still working, we
  // poll) · "confirmFailed" (server can't answer; see confirmIssue) ·
  // "success" (redirecting). The Stripe-return path starts in "confirming":
  // the payment step happened on Stripe's page, so there is nothing to fill
  // in unless it failed.
  const [phase, setPhase] = useState(returnPi ? "confirming" : "form");
  // What the confirmFailed panel may claim. "charged": Stripe itself said
  // the payment succeeded, so "it went through, don't pay again" is true.
  // "unknown": nobody has said so (lost response, server without keys), so
  // the panel only offers the re-check and support, never a claim either way.
  const [confirmIssue, setConfirmIssue] = useState("unknown");
  // Error/notice above the pay button: { kind } for our copy, { message } for
  // Stripe's own localised card error. Kinds keep copy re-translatable if the
  // visitor switches language while it is showing.
  const [notice, setNotice] = useState(null);
  const [stripeStatus, setStripeStatus] = useState("idle");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [success, setSuccess] = useState(null);
  // Anti-spam: honeypot + mount-time stamp, same contract as EcHandoffModal
  // and EcCallbackForm (see lib/anti-spam.js).
  const [honeypot, setHoneypot] = useState("");
  const formLoadedAt = useRef(Date.now());

  const mountRef = useRef(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const paymentElementRef = useRef(null);
  // Read when the Payment Element is (re)built, so a rebuild (language
  // switch, "Try again") keeps the billing country picked here.
  const countryRef = useRef(fields.country);
  countryRef.current = fields.country;
  // Same for the amount: a rebuild while a partial-discount code is applied
  // must start from the discounted fee, not the full one.
  const amountRef = useRef(0);
  // The PaymentIntent created for the current field values. A declined card
  // leaves it in requires_payment_method, which Stripe lets us confirm again
  // with a new card; reusing it keeps one PI per attempt instead of one per
  // retry (and stays under the per-email create rate limit).
  const intentRef = useRef(null);
  // Double-submit guard. State updates are async, a ref is not: two fast
  // clicks must never create two PaymentIntents.
  const busyRef = useRef(!!returnPi);
  const pendingPiRef = useRef(returnPi);
  // What Stripe has said about each PaymentIntent on this page ("processing"
  // / "succeeded"), mirrored into the attempt record when storage works.
  const evidenceRef = useRef({});
  const returnHandledRef = useRef(false);
  const pollRef = useRef({ timer: null, count: 0 });
  const redirectTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const viewedRef = useRef(false);
  const statusRef = useRef(null);
  // Read inside the Stripe language listener, which outlives renders.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const cardEmptyRef = useRef(true);
  // Id of an input to focus when the phase next returns to "form".
  const focusAfterRef = useRef(null);

  const enabled = !!(config && config.enabled && config.publishableKey);
  const preview = !!(config && !enabled && config.preview);
  const unavailable = !!config && !enabled && !preview;
  const feeDefaults = (typeof window.EC_OPENING_FEE === "object" && window.EC_OPENING_FEE) || {};
  // The full fee, as the server states it. With a code applied, the cost
  // block shows it struck through next to the discounted figure.
  const fee = (config && config.display) || feeDefaults.display || "";
  const applied = promo && promo.status === "applied" ? promo : null;
  const freeApplied = !!(applied && applied.free);
  const promoChecking = !!(promo && promo.status === "checking");
  // What is charged today, and its label: the server's discounted figure
  // when a code is applied, else the fee. `chargeAmount` is what the
  // Payment Element must be set to (a free code charges nothing, so the
  // Element, hidden then, keeps the full fee).
  const feeDisplay = applied ? applied.display : fee;
  const fullAmount = (config && Number.isInteger(config.amount) ? config.amount : feeDefaults.amount) || 0;
  const chargeAmount = applied && !applied.free ? applied.amount : fullAmount;
  const locked = phase === "confirming" || phase === "processing" || phase === "confirmFailed";
  const busy = phase === "submitting" || locked;
  // The tick gates the button (founder call, 2026-09-23): an active Pay
  // button next to an unticked consent read as if the box did nothing.
  // The sentence sits directly above, so a disabled button explains itself
  // without an error message.
  const canPay = !busy && !promoChecking && !!config && !unavailable && (preview || stripeStatus === "ready") && consent;
  // Free code: no card, no consent (nothing is charged); the email is all the
  // server needs, so the button follows the email alone.
  const canContinueFree = !busy && !promoChecking && !!config && !unavailable && !ecPwFieldErrors(fields).email;

  amountRef.current = chargeAmount;

  const freshenStamp = () => {
    if (Date.now() - formLoadedAt.current > EC_PW_STAMP_MAX_AGE_MS) formLoadedAt.current = Date.now();
  };

  // ── Lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    // Arriving from a long result page: start at the top of the paywall.
    try { window.scrollTo({ top: 0, behavior: "auto" }); } catch (e) { /* old browsers */ }
    return () => {
      mountedRef.current = false;
      clearTimeout(pollRef.current.timer);
      clearTimeout(redirectTimerRef.current);
    };
  }, []);

  // A pre-fill that arrives after mount fills the field only while it is
  // still empty and untouched: what the visitor typed always stays.
  useEffect(() => {
    if (emailTypedRef.current || typeof initialEmail !== "string" || !initialEmail) return;
    setFields((f) => (f.email ? f : Object.assign({}, f, { email: initialEmail })));
  }, [initialEmail]);

  useEffect(() => {
    let alive = true;
    const fallback = { enabled: false, preview: false, publishableKey: null };
    const load = () => {
      try {
        return typeof window.ecLoadOpeningFeeConfig === "function" ? window.ecLoadOpeningFeeConfig() : null;
      } catch (e) { return null; }
    };
    Promise.resolve(load())
      // A failed load is not cached by the helper; one more try here keeps a
      // blip (common right after a 3-D Secure redirect) from disabling the
      // card form for the whole visit.
      .then((c) => (c && c.failed ? Promise.resolve(load()).then((again) => again || c, () => c) : c))
      .then(
        (c) => { if (alive) setConfig(Object.assign({}, feeDefaults, c || fallback)); },
        () => { if (alive) setConfig(Object.assign({}, feeDefaults, fallback)); }
      );
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!config || viewedRef.current) return;
    viewedRef.current = true;
    ecPwTrack("paywall_viewed", { plan: planId, entity: entityId, preview: preview });
  }, [config]);

  // ── Stripe Payment Element ─────────────────────────────────────────
  // Deferred-intent flow: the Element renders from amount + currency alone,
  // and the PaymentIntent is only created when the visitor clicks Pay. That
  // way browsing the paywall creates nothing in Stripe, and the PI can carry
  // the email from this form in its metadata from the start.
  //
  // Card, Apple Pay and Google Pay (founder call, 2026-09-23). The wallets
  // are card payment methods, so paymentMethodTypes stays ["card"]; they are
  // tabs inside this same Element, never a separate express button, so the
  // consent checkbox and our own Pay button stay the single path to a
  // charge. Stripe shows them only over HTTPS on a domain registered with
  // Stripe (Dashboard, "Payment method domains"), to a browser with a wallet
  // set up: never on localhost, where the card tab is all there is.
  // Card sits first in paymentMethodOrder, so the tab selected on load is
  // always the card form our billing-country picker belongs to, whatever
  // order Stripe would otherwise pick for the device; the picker hides only
  // once a change event reports a wallet. Link stays off: it rendered its
  // own "save my info" block (email, phone, name) under the card, a second
  // email field right after ours.
  //
  // Billing country is ours, not Stripe's: country "never" hides the
  // Element's own dropdown, defaultValues hands it the country picked above
  // (it decides whether a postal-code field shows), setBillingCountry pushes
  // changes with update(), and submit() passes it on confirm, which Stripe
  // requires for a field set to "never".
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let paymentElement = null;
    let offLang = null;
    let ready = false;
    cardEmptyRef.current = true;
    setWalletSelected(false);
    setStripeStatus("loading");
    const readyTimer = setTimeout(() => {
      if (!cancelled && !ready) {
        setStripeStatus("failed");
        ecPwTrack("paywall_error", { code: "stripe_timeout" });
      }
    }, EC_PW_READY_TIMEOUT_MS);

    ecPwLoadStripeJs().then((StripeCtor) => {
      if (cancelled || !mountRef.current) return;
      const lang = ecPwLang();
      const stripe = StripeCtor(config.publishableKey, { locale: lang });
      const elements = stripe.elements({
        mode: "payment",
        amount: amountRef.current,
        currency: config.currency,
        paymentMethodTypes: ["card"],
        locale: lang,
        appearance: EC_PW_APPEARANCE,
        fonts: EC_PW_FONTS,
      });
      const peOptions = {
        layout: "tabs",
        paymentMethodOrder: ["card", "apple_pay", "google_pay"],
        wallets: { applePay: "auto", googlePay: "auto", link: "never" },
        fields: { billingDetails: { address: { country: "never" } } },
      };
      if (countryRef.current) {
        peOptions.defaultValues = { billingDetails: { address: { country: countryRef.current } } };
      }
      paymentElement = elements.create("payment", peOptions);
      paymentElement.on("ready", () => {
        ready = true;
        clearTimeout(readyTimer);
        if (!cancelled) setStripeStatus("ready");
      });
      paymentElement.on("loaderror", () => {
        clearTimeout(readyTimer);
        if (cancelled) return;
        setStripeStatus("failed");
        ecPwTrack("paywall_error", { code: "stripe_loaderror" });
      });
      // Editing the card clears a stale card error, so the red notice never
      // sits next to details the visitor has already corrected. The same
      // event says which method (card or a wallet) is selected.
      paymentElement.on("change", (e) => {
        cardEmptyRef.current = !!(e && e.empty);
        freshenStamp();
        if (cancelled) return;
        const type = e && e.value && e.value.type;
        setWalletSelected(!!(type && EC_PW_WALLET_TYPES[type]));
        setNotice((n) => (n && n.fromStripe ? null : n));
      });
      paymentElement.mount(mountRef.current);
      stripeRef.current = stripe;
      elementsRef.current = elements;
      paymentElementRef.current = paymentElement;
      // The iframe can't see our i18n runtime; push language switches to it.
      if (window.__I18N && typeof window.__I18N.onChange === "function") {
        offLang = window.__I18N.onChange((code) => {
          // Stripe words card errors in the Stripe instance's locale, so one
          // shown before the switch would now sit in the wrong language.
          if (!cancelled) setNotice((n) => (n && n.fromStripe ? null : n));
          // Only a rebuild moves that locale. Do it while the card fields
          // are empty, so nobody loses typed details to a language switch;
          // otherwise relabel the fields in place.
          if (phaseRef.current === "form" && cardEmptyRef.current) {
            setLoadAttempt((n) => n + 1);
            return;
          }
          try { elements.update({ locale: code }); } catch (e) { /* keep the current locale */ }
        });
      }
    }).catch(() => {
      clearTimeout(readyTimer);
      if (cancelled) return;
      setStripeStatus("failed");
      ecPwTrack("paywall_error", { code: "stripe_js" });
    });

    return () => {
      cancelled = true;
      clearTimeout(readyTimer);
      if (offLang) offLang();
      if (paymentElement) { try { paymentElement.destroy(); } catch (e) { /* already gone */ } }
      stripeRef.current = null;
      elementsRef.current = null;
      paymentElementRef.current = null;
    };
  }, [enabled, config, loadAttempt]);

  // Returning from a Stripe redirect: nothing to fill in, go straight to the
  // server confirm once the config is known. The server's answer wins;
  // Stripe's redirect_status only decides what may be said when the server
  // can't answer ("succeeded": the charge went through, "failed": the bank
  // refused and nothing was charged). If the payment turns out not to have
  // gone through, settle() drops back to the (refilled) form with the
  // declined notice.
  useEffect(() => {
    if (!returnPi || !config || returnHandledRef.current) return;
    returnHandledRef.current = true;
    const done = () => { busyRef.current = false; };
    // This server takes no payments, so there is no charge to confirm.
    if (preview) { setPhase("form"); done(); return; }
    if (returnRedirectStatus === "succeeded") noteCharge(returnPi, "succeeded");
    else if (returnRedirectStatus === "processing" || returnRedirectStatus === "pending") noteCharge(returnPi, "processing");
    settle(returnPi, "return").then(done, done);
  }, [config]);

  // The status panel replaces the form, which can leave the visitor scrolled
  // past the end of a now-shorter page. Bring the panel into view.
  useEffect(() => {
    if (locked && statusRef.current && statusRef.current.scrollIntoView) {
      try { statusRef.current.scrollIntoView({ block: "center", behavior: "auto" }); } catch (e) { /* ignore */ }
    }
  }, [locked]);

  // A field the server refused (failCreate) gets focus once the inputs are
  // enabled again.
  useEffect(() => {
    if (phase !== "form" || !focusAfterRef.current) return;
    const el = document.getElementById(focusAfterRef.current);
    focusAfterRef.current = null;
    if (el) el.focus();
  }, [phase]);

  // The Payment Element is built for one amount, and Stripe refuses a
  // confirm whose Elements amount differs from the PaymentIntent's. A
  // partial-discount code changes that amount, removing the code changes it
  // back; both are pushed in place (no remount, typed card details stay).
  useEffect(() => {
    const elements = elementsRef.current;
    if (!elements || !enabled || stripeStatus !== "ready") return;
    try { elements.update({ amount: chargeAmount }); } catch (e) { /* sent again right before submit */ }
  }, [chargeAmount, enabled, stripeStatus]);

  // ── Flow ───────────────────────────────────────────────────────────
  const failWith = (spec, code) => {
    setPhase("form");
    setNotice(spec);
    ecPwTrack("paywall_error", { code: code });
  };

  // Records what Stripe has said about a PaymentIntent. Never lowers it.
  const noteCharge = (piId, state) => {
    if (!piId || !EC_PW_STATE_RANK[state]) return;
    const cur = evidenceRef.current[piId];
    if (!cur || EC_PW_STATE_RANK[state] > EC_PW_STATE_RANK[cur]) evidenceRef.current[piId] = state;
    const a = ecPwAttemptByPi(piId);
    if (a) ecPwSaveAttempt(a.key, piId, state);
  };
  // "sent" (no word of a charge) · "processing" · "succeeded".
  const chargeEvidence = (piId) => {
    const mem = evidenceRef.current[piId] || "sent";
    const a = ecPwAttemptByPi(piId);
    const stored = (a && a.state) || "sent";
    return EC_PW_STATE_RANK[stored] > EC_PW_STATE_RANK[mem] ? stored : mem;
  };

  // `data` is the server's answer { token, email, country, plan, entity,
  // promo? } (confirm for a payment, create for a free code). Registration
  // gets the email the fee was paid with and the signed token; the company
  // is bound there, at first use of the token. `flags`: { preview } for the
  // keyless walk-through, { free, code } for a free-code redemption.
  const onPaid = (piId, data, flags) => {
    const d = data || {};
    const f = flags || {};
    const email = typeof d.email === "string" ? d.email : "";
    const url = ecPwHandoffURL(rec, activePlan, {
      email: email,
      openingToken: d.token || undefined,
    });
    if (piId) {
      evidenceRef.current[piId] = "succeeded";
      // Marked on the record this tab wrote for the PaymentIntent (a 3-D
      // Secure return may know it only by the server's email).
      const a = ecPwAttemptByPi(piId);
      ecPwSaveAttempt((a && a.key) || ecPwNormEmail(email), piId, "succeeded");
    }
    // Preview "payments" are not conversions and a free redemption has its
    // own event (paywall_free_redeemed); only real charges count as paid.
    if (!f.preview && !f.free) {
      ecPwTrack("paywall_paid", { plan: planId, entity: entityId, promo: typeof d.promo === "string" ? d.promo : undefined });
    }
    setSuccess({ url: url, free: !!f.free, code: f.code || null });
    setPhase("success");
    clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = setTimeout(() => { window.location.assign(url); }, EC_PW_REDIRECT_MS);
  };

  const schedulePoll = (piId) => {
    const p = pollRef.current;
    clearTimeout(p.timer);
    if (p.count >= EC_PW_POLL_MAX) return;
    p.count += 1;
    p.timer = setTimeout(() => { if (mountedRef.current) settle(piId, "poll"); }, EC_PW_POLL_MS);
  };

  // Turns a PaymentIntent into a token through the server, which alone can
  // say "paid". source: "inline" (Stripe just reported succeeded/processing
  // on this page) · "return" (back from a 3-D Secure redirect) · "recheck"
  // (confirmPayment gave no usable answer) · "retry" (Try again) · "poll"
  // (bank still processing) · "stored" (this tab already sent a PaymentIntent
  // for this email). Returns "paid" | "processing" | "unpaid" | "failed".
  const settle = async (piId, source) => {
    pendingPiRef.current = piId;
    if (source !== "poll" && source !== "stored") {
      setPhase("confirming");
      setNotice(null);
    }
    const res = await ecPwConfirm(piId);
    if (!mountedRef.current) return res.kind;
    if (res.kind === "paid") {
      onPaid(piId, res.data, null);
      return "paid";
    }
    if (res.kind === "processing") {
      noteCharge(piId, "processing");
      if (source !== "poll") pollRef.current.count = 0;
      setPhase("processing");
      schedulePoll(piId);
      return "processing";
    }
    const evidence = chargeEvidence(piId);
    // The server read the PaymentIntent from Stripe and it holds no charge.
    // (A PaymentIntent it doesn't know is only "not paid" if Stripe hasn't
    // told us otherwise on this page.)
    if (res.kind === "unpaid" || (res.kind === "notFound" && evidence === "sent")) {
      ecPwDropAttempt(piId);
      if (source === "stored") return "unpaid";
      failWith({ kind: "declined" }, "not_paid");
      return "unpaid";
    }
    // From here the server couldn't answer. What the visitor may be told
    // depends on what Stripe itself already said about this PaymentIntent.
    if (source === "poll" || evidence === "processing") {
      // Expected to be transient while the bank works; keep checking.
      if (source !== "poll") pollRef.current.count = 0;
      setPhase("processing");
      schedulePoll(piId);
      return "processing";
    }
    ecPwTrack("paywall_error", { code: "confirm_" + (res.status || "network") });
    if (evidence === "succeeded") {
      // Charged, no token yet. Never offer to pay again from here: retry
      // the confirm, or write to support.
      setConfirmIssue("charged");
      setPhase("confirmFailed");
      return "failed";
    }
    if (source === "stored") {
      // A new charge may only start once this one is known to be unpaid.
      failWith({ kind: "unavailable" }, "stored_unconfirmed");
      return "failed";
    }
    if (source === "return" && returnRedirectStatus === "failed") {
      // Stripe's own verdict on the redirect: the bank refused the
      // authentication, so nothing was charged and the form can reopen.
      ecPwDropAttempt(piId);
      failWith({ kind: "declined" }, "redirect_failed");
      return "unpaid";
    }
    // Nobody has said the charge happened (a lost response, a server with
    // no keys, a failed 3-D Secure): "your payment went through" would be a
    // guess, and so would "you haven't been charged". Keep the form closed
    // and offer the re-check and support.
    setConfirmIssue("unknown");
    setPhase("confirmFailed");
    return "failed";
  };

  const failCreate = (r) => {
    const d = r.data || {};
    const fixable = typeof d.field === "string" && Object.prototype.hasOwnProperty.call(EC_PW_FIELD_IDS, d.field);
    if (r.status === 400 && d.error === "invalid_field" && fixable) {
      // Focused by the effect once the form is interactive again: right now
      // the input is still disabled ("submitting") and can't take focus.
      focusAfterRef.current = EC_PW_FIELD_IDS[d.field];
      setPhase("form");
      setServerInvalid(d.field);
      ecPwTrack("paywall_error", { code: "invalid_" + d.field });
      return;
    }
    // Any other refused field (country of incorporation, plan, entity,
    // attemptId) comes from the checker, not from this form: nothing here
    // to correct, so it reads as "not now", but tracked by name.
    if (r.status === 400 && d.error === "invalid_field") {
      failWith({ kind: "unavailable" }, "invalid_" + (typeof d.field === "string" ? d.field.slice(0, 24) : "field"));
      return;
    }
    if (r.status === 400 && d.error === "terms_not_accepted") {
      setPhase("form");
      setConsent(false);
      ecPwTrack("paywall_error", { code: "terms_not_accepted" });
      return;
    }
    if (r.status === 400 && (d.error === "promo_used" || d.error === "promo_invalid")) {
      // The server re-checked the code against this email at the moment of
      // charging and refused it (redeemed in between, switched off in
      // Stripe). Un-apply it, so the fee and the card form come back at
      // full, and say why under the code field; the typed code stays so
      // the visitor sees which one it was.
      const reason = d.error === "promo_used" ? "used" : "invalid";
      focusAfterRef.current = EC_PW_PROMO_ID;
      intentRef.current = null;
      setPhase("form");
      setPromo({ status: "error", reason: reason });
      ecPwTrack("paywall_promo_rejected", { reason: reason, at: "create" });
      ecPwTrack("paywall_error", { code: d.error });
      return;
    }
    // The server doesn't say which anti-spam gate fired (by design). If the
    // stamp is over a day old it was the age gate: re-stamp, so the
    // visitor's next click goes through.
    if (d.code === "spam_check_failed") freshenStamp();
    // 503 not_configured, 429 rate limit, 502 stripe_error, anti-spam
    // rejects and network failures all read the same to a visitor: not now.
    failWith({ kind: "unavailable" }, d.error || d.code || ("http_" + (r.status || "network")));
  };

  // The create body, paid and free path alike. `promoCode` rides along only
  // when a code is applied (JSON.stringify drops the undefined), so without
  // one the request is exactly what it was before promo codes. The server
  // looks the code up and prices the fee itself; no amount is ever sent.
  const createBody = (email, promoCode) => ({
    action: "create",
    attemptId: ecPwAttemptId(),
    country: countryCode,
    email: email,
    plan: planId,
    entity: entityId,
    acceptedTerms: true,
    lang: ecPwLang(),
    website: honeypot,
    formLoadedAt: formLoadedAt.current,
    promoCode: promoCode || undefined,
  });

  // Free path: a code that brings the fee to zero. No card, so no Stripe.js,
  // no elements.submit() and no attempt record (there is no PaymentIntent
  // that could be charged twice). One create call, which the server answers
  // with the token itself after writing the redemption, then the same
  // success state and handoff as a payment. The preview shortcut does not
  // apply: with no card involved the server can be asked for real, and a
  // server without keys simply says so.
  const submitFree = async () => {
    if (busyRef.current || !applied || !applied.free) return;
    setSubmitted(true);
    setNotice(null);
    if (ecPwFieldErrors(fields).email) {
      ecPwTrack("paywall_error", { code: "validation" });
      const el = document.getElementById(EC_PW_FIELD_IDS.email);
      if (el) el.focus();
      return;
    }
    const email = fields.email.trim();
    ecPwTrack("paywall_submit", { plan: planId, entity: entityId, preview: preview, promo: applied.code });
    busyRef.current = true;
    setPhase("submitting");
    try {
      const r = await ecPwPost(createBody(email, applied.code));
      if (!mountedRef.current) return;
      if (r.status !== 200 || !r.data || r.data.free !== true || typeof r.data.token !== "string") {
        failCreate(r);
        return;
      }
      ecPwTrack("paywall_free_redeemed", { code: applied.code, plan: planId, entity: entityId });
      onPaid(null, r.data, { free: true, code: applied.code });
    } catch (err) {
      if (mountedRef.current) failWith({ kind: "unavailable" }, "exception");
    } finally {
      busyRef.current = false;
    }
  };

  const submit = async () => {
    if (busyRef.current || freeApplied) return;
    setSubmitted(true);
    setNotice(null);
    const errs = ecPwFieldErrors(fields);
    if (errs.email || !consent) {
      ecPwTrack("paywall_error", { code: "validation" });
      const el = errs.email ? document.getElementById(EC_PW_FIELD_IDS.email) : null;
      if (el) el.focus();
      return;
    }
    const clean = {
      email: fields.email.trim(),
      // Always set in practice (defaults to the country of incorporation);
      // the fallback only keeps confirm from going out without one.
      country: ecPwBillableCode(fields.country) || ecPwBillableCode(countryCode) || countryCode || "",
    };
    ecPwTrack("paywall_submit", { plan: planId, entity: entityId, preview: preview, promo: applied ? applied.code : undefined });
    busyRef.current = true;
    setPhase("submitting");

    // Preview (payments not configured on this server, e.g. localhost): walk
    // the full UI to the handoff so the flow can be reviewed end to end.
    // Nothing is charged and no token exists, which registration will treat
    // as unpaid; preview is never on when payments are enabled.
    if (preview) {
      redirectTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        onPaid(null, {
          email: clean.email,
          country: countryCode,
          plan: planId,
          entity: entityId,
          token: null,
        }, { preview: true });
      }, 700);
      return;
    }

    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) {
      busyRef.current = false;
      setStripeStatus("failed");
      failWith({ kind: "load" }, "stripe_missing");
      return;
    }

    const attemptKey = ecPwNormEmail(clean.email);
    try {
      // The amount the Element carries into confirm must be the one the
      // PaymentIntent will be created for; the effect above keeps them in
      // step, this repeats it at the moment it matters (synchronous, so the
      // click's gesture is untouched).
      try { elements.update({ amount: chargeAmount }); } catch (e) { /* the effect already set it */ }
      // FIRST await of the click, on purpose. It validates the card fields
      // and, with Apple Pay or Google Pay selected, opens the wallet sheet,
      // which the browser allows only inside the click's user gesture:
      // anything awaited before it (a fetch, the prior-attempt check below)
      // would let the gesture lapse and the sheet fail to open. It must also
      // precede creating the intent. Nothing has been sent for payment yet,
      // so no outcome here is a charge.
      const checked = await elements.submit();
      if (!mountedRef.current) return;
      if (checked && checked.error) {
        const e = checked.error;
        const own = (e.type === "card_error" || e.type === "validation_error") && e.message;
        failWith(own ? { message: e.message, fromStripe: true } : { kind: "declined" },
          "stripe_" + (e.code || e.type || "submit"));
        return;
      }

      // This tab already handed Stripe a PaymentIntent for this email:
      // settle that one first. Only a server-confirmed "not paid" lets a
      // second charge start.
      const stored = ecPwAttemptFor(attemptKey);
      if (stored) {
        const outcome = await settle(stored.pi, "stored");
        if (outcome !== "unpaid") return;
        if (!mountedRef.current) return;
      }

      // The billing country is not part of the key: it goes to Stripe on
      // confirm, not into the PaymentIntent, so changing it keeps the intent.
      // The promo code is: its PaymentIntent carries the discounted amount,
      // so applying or removing a code needs a new one.
      const key = JSON.stringify([attemptKey, countryCode, planId, entityId, applied ? applied.code : ""]);
      let intent = intentRef.current;
      if (!intent || intent.key !== key) {
        intentRef.current = null;
        const r = await ecPwPost(createBody(clean.email, applied ? applied.code : ""));
        if (!mountedRef.current) return;
        if (r.status === 200 && r.data && r.data.free === true && typeof r.data.token === "string") {
          // The code was re-priced as free on the server (edited in Stripe
          // since the check): nothing to charge, the token is already here.
          ecPwTrack("paywall_free_redeemed", { code: applied ? applied.code : undefined, plan: planId, entity: entityId });
          onPaid(null, r.data, { free: true, code: applied ? applied.code : null });
          return;
        }
        if (r.status !== 200 || !r.data || !r.data.clientSecret) { failCreate(r); return; }
        intent = { key: key, clientSecret: r.data.clientSecret, id: r.data.paymentIntentId };
        intentRef.current = intent;
        // The server's figure is the PaymentIntent's; if it differs from the
        // one checked earlier, the Element must follow it or confirm fails.
        if (Number.isInteger(r.data.amount) && r.data.amount !== chargeAmount) {
          try { elements.update({ amount: r.data.amount }); } catch (e) { /* confirm will report the mismatch */ }
        }
      }

      // Recorded before Stripe sees the card (see EC_PW_ATTEMPTS_KEY).
      ecPwSaveAttempt(attemptKey, intent.id, "sent", { email: clean.email, country: clean.country });

      // redirect "if_required": 3DS runs in Stripe's modal on this page for
      // almost every card; only the rare redirect-only bank leaves the page,
      // and comes back through the return_url path above. billing_details
      // carries the country the Element doesn't collect (country "never"),
      // for wallets too, and the email for the payment method's record.
      const result = await stripe.confirmPayment({
        elements: elements,
        clientSecret: intent.clientSecret,
        confirmParams: {
          return_url: ecPwReturnURL(rec, activePlan, clean.email),
          receipt_email: clean.email,
          payment_method_data: {
            billing_details: { email: clean.email, address: { country: clean.country } },
          },
        },
        redirect: "if_required",
      });
      if (!mountedRef.current) return;
      const err = result.error || null;
      const pi = err ? err.payment_intent : result.paymentIntent;
      if (pi && (pi.status === "succeeded" || pi.status === "processing")) {
        intentRef.current = null;
        noteCharge(pi.id, pi.status);
        await settle(pi.id, "inline");
        return;
      }
      if (err && (err.type === "card_error" || err.type === "validation_error")) {
        // Stripe's own, already localised and specific wording ("Your card
        // has insufficient funds"), and a sure sign nothing was charged. The
        // PaymentIntent is back in requires_payment_method and takes another
        // card on the next click.
        ecPwDropAttempt(intent.id);
        failWith(err.message ? { message: err.message, fromStripe: true } : { kind: "declined" },
          "stripe_" + (err.code || err.type));
        return;
      }
      if (pi && pi.status) {
        // Stripe returned the PaymentIntent itself, in a state that holds no
        // charge (e.g. canceled). Only requires_payment_method can be reused.
        ecPwDropAttempt(intent.id);
        if (pi.status !== "requires_payment_method") intentRef.current = null;
        failWith({ kind: "declined" }, "declined_" + pi.status);
        return;
      }
      // No usable answer: a connection lost mid-request or a Stripe API
      // error can arrive AFTER the charge, so it is never read as a decline.
      // The server reads the PaymentIntent from Stripe instead. The intent is
      // kept: re-confirming it can't charge twice, because Stripe refuses to
      // confirm a PaymentIntent that already succeeded.
      ecPwTrack("paywall_error", { code: "stripe_" + ((err && (err.code || err.type)) || "no_result") });
      await settle(intent.id, "recheck");
    } catch (err) {
      // The attempt record (if one was written) makes the next click
      // re-check with the server before any new charge.
      if (mountedRef.current) failWith({ kind: "unavailable" }, "exception");
    } finally {
      busyRef.current = false;
    }
  };

  const retryConfirm = async () => {
    if (busyRef.current || !pendingPiRef.current) return;
    busyRef.current = true;
    try { await settle(pendingPiRef.current, "retry"); } finally { busyRef.current = false; }
  };

  const handleBack = () => {
    ecPwTrack("paywall_back", { plan: planId, entity: entityId });
    if (onBack) onBack();
  };

  const setField = (k) => (e) => {
    const v = e.target.value;
    freshenStamp();
    setFields((f) => Object.assign({}, f, { [k]: v }));
    if (serverInvalid === k) setServerInvalid(null);
    if (k === "email") {
      emailTypedRef.current = true;
      if (typeof onEmailChange === "function") onEmailChange(v);
    }
  };
  // Our picker only offers billable countries; the Payment Element gets
  // the new one in place (no remount, typed card details stay), which also
  // shows or hides its postal-code field for that country.
  const setBillingCountry = (code) => {
    const next = ecPwBillableCode(code);
    if (!next || busyRef.current) return;
    freshenStamp();
    countryRef.current = next;
    setFields((f) => Object.assign({}, f, { country: next }));
    const pe = paymentElementRef.current;
    if (pe) {
      try {
        pe.update({ defaultValues: { billingDetails: { address: { country: next } } } });
      } catch (e) { /* the Element keeps its fields; confirm still sends the new country */ }
    }
  };
  const touch = (k) => () => setTouched((x) => Object.assign({}, x, { [k]: true }));
  const fieldErrs = ecPwFieldErrors(fields);
  const showErr = (k) => ((submitted || touched[k]) && fieldErrs[k]) || serverInvalid === k;

  // ── Promo code ─────────────────────────────────────────────────────
  const onPromoInput = (e) => {
    freshenStamp();
    // Uppercased as typed: that is the spelling the server checks and the
    // one the applied line will show.
    setPromoInput(e.target.value.toUpperCase());
    // Editing the code clears a stale verdict about the previous one.
    setPromo((p) => (p && p.status === "error" ? null : p));
  };
  const applyPromo = async () => {
    if (busyRef.current || promoBusyRef.current || applied) return;
    const code = ecPwNormCode(promoInput);
    // Nothing typed: nothing to do. Typed but not a code: refused here, the
    // server would say the same and the check is rate-limited.
    if (!code) {
      if (promoInput.trim()) {
        setPromo({ status: "error", reason: "invalid" });
        ecPwTrack("paywall_promo_rejected", { reason: "invalid" });
      }
      return;
    }
    promoBusyRef.current = true;
    freshenStamp();
    setPromo({ status: "checking" });
    const body = { action: "promo", code: code };
    // With the email the server also answers "used" now, before the card
    // form is filled; create re-checks it either way.
    if (!ecPwFieldErrors(fields).email) body.email = fields.email.trim();
    const r = await ecPwPost(body);
    promoBusyRef.current = false;
    if (!mountedRef.current) return;
    const d = r.data || {};
    if (r.status === 200 && d.valid === true && typeof d.code === "string"
        && Number.isInteger(d.amount) && typeof d.display === "string") {
      setPromo({ status: "applied", code: d.code, amount: d.amount, display: d.display, free: d.free === true });
      setPromoInput(d.code);
      ecPwTrack("paywall_promo_applied", { code: d.code, free: d.free === true });
      return;
    }
    // 200 {valid:false} carries a reason with its own copy; 503 (no keys on
    // this server), 429, 502 and a lost connection all read as unavailable.
    const reason = r.status === 200 && d.valid === false && EC_PW_PROMO_REASONS[d.reason] ? d.reason : "unavailable";
    setPromo({ status: "error", reason: reason });
    ecPwTrack("paywall_promo_rejected", { reason: reason });
  };
  const removePromo = () => {
    if (busyRef.current) return;
    freshenStamp();
    // A PaymentIntent created for the discounted fee must not be reused.
    intentRef.current = null;
    setPromo(null);
    setPromoInput("");
  };
  const onPromoKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    applyPromo();
  };
  const promoErrorText = (reason) => {
    const key = EC_PW_PROMO_REASONS[reason];
    if (key) return t(key);
    return ecPwWithMailto(t("ec.pw.error.unavailable", { email: supportEmail }), supportEmail);
  };

  const noticeText = (n) => {
    if (n.message) return n.message;
    if (n.kind === "declined") return t("ec.pw.error.declined");
    if (n.kind === "load") return t("ec.pw.error.load");
    return ecPwWithMailto(t("ec.pw.error.unavailable", { email: supportEmail }), supportEmail);
  };

  // ── Success ────────────────────────────────────────────────────────
  if (phase === "success" && success) {
    return (
      <div className="ec-content fade-in">
        <div className="ec-pw ec-pw--success" role="status" aria-live="polite">
          <span className="ec-doodle ec-doodle--block">
            <img src="/images/doodles/done.svg" alt="" aria-hidden="true" />
          </span>
          <div className="ec-pw__head">
            {/* A free code took no payment, so "Payment received" would be
                untrue; the headline names the code instead. */}
            <h1 className="ec-pw__title">
              {success.free && success.code
                ? t("ec.pw.success.freeTitle", { code: success.code })
                : t("ec.pw.success.title")}
            </h1>
            <p className="ec-pw__lead">{t("ec.pw.success.body")}</p>
          </div>
          {/* Fallback for browsers that block or delay the automatic hop. */}
          <Button variant="primary" size="xl" full iconRight="arrowRight"
                  onClick={() => { window.location.assign(success.url); }}>
            {t("ec.pw.success.cta")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Paywall ────────────────────────────────────────────────────────
  return (
    <div className="ec-content fade-in">
      <div className="ec-pw">
        <button type="button" className="ob-link-back ec-pw__back" onClick={handleBack}
                disabled={phase === "submitting" || phase === "confirming"}
                style={{ alignSelf: "flex-start" }}>
          <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("ec.pw.back")}
        </button>

        <header className="ec-pw__head">
          <div className="ec-eyebrow">{t("ec.pw.eyebrow")}</div>
          <h1 className="ec-pw__title">{t("ec.pw.title", { entity: entityName })}</h1>
        </header>

        {/* Summary: what they qualified for, then the same two-cell cost
            block as the result page (fee today · one-time, plan price
            after activation · monthly), so this screen adds no new
            number to the ones already agreed to. */}
        <section className="ec-pw__summary">
          <div className="ec-pw__summaryMain">
            <Tag tone="green" icon="check">{t("ec.pw.summary.eligible")}</Tag>
            <div className="ec-pw__entity">{entityName}</div>
          </div>
          {/* With a code applied the Today cell shows the discounted figure
              with the full fee struck through, and for a free code the
              label naming the code, so the summary states what is actually
              charged before the visitor reaches the button. */}
          {Costs && fee && (
            <Costs fee={feeDisplay} planPrice={planPrice} planName={planName}
                   feeWas={applied ? fee : undefined}
                   feeCaption={freeApplied ? t("ec.pw.promo.freeLabel", { code: applied.code }) : undefined} />
          )}
        </section>

        {!locked && (
          <section className="ec-pw__includes" aria-labelledby="ec-pw-includes-head">
            <h2 id="ec-pw-includes-head" className="ec-pw__includesHead">{t("ec.pw.includes.head")}</h2>
            <ul className="ec-pw__list">
              <li className="ec-pw__item">
                <span className="ec-pw__tick" aria-hidden="true"><EcIco.check style={{ width: 11, height: 11 }} /></span>
                <span>{t("ec.pw.includes.review")}</span>
              </li>
              <li className="ec-pw__item">
                <span className="ec-pw__tick" aria-hidden="true"><EcIco.check style={{ width: 11, height: 11 }} /></span>
                <span>{t("ec.pw.includes.team")}</span>
              </li>
              <li className="ec-pw__item">
                <span className="ec-pw__tick" aria-hidden="true"><EcIco.check style={{ width: 11, height: 11 }} /></span>
                <span>{t("ec.pw.includes.prefill")}</span>
              </li>
              <li className="ec-pw__item">
                <span className="ec-pw__tick" aria-hidden="true"><EcIco.check style={{ width: 11, height: 11 }} /></span>
                <span>{t("ec.pw.includes.noDeadline")}</span>
              </li>
            </ul>
          </section>
        )}

        {/* Status panel for everything after the card has been handed to
            Stripe: confirming, bank processing, or a server that can't
            answer yet. */}
        {locked && (
          <section ref={statusRef} className="ec-pw__card ec-pw__status" aria-live="polite">
            {phase !== "confirmFailed" && (
              <div className="ec-pw__statusRow">
                <span aria-hidden="true"><Spinner size={18} color="var(--c-primary)" /></span>
                <span>{t("ec.pw.cta.processing")}</span>
              </div>
            )}
            {phase === "processing" && (
              <Alert tone="info">
                {ecPwWithMailto(t("ec.pw.processing", { email: supportEmail }), supportEmail)}
              </Alert>
            )}
            {/* Info tone + role="alert" rather than the DS warning tone: the
                amber-on-peach warning palette is ~2.6:1 contrast, too faint
                for "you've been charged, don't pay again". The same box says
                only "try again or write to us" when nobody has confirmed a
                charge (confirmIssue "unknown"). */}
            {phase === "confirmFailed" && (
              <Alert tone="info" role="alert" icon="alert"
                     action={
                       <Button variant="outline" size="sm" iconLeft="refresh" onClick={retryConfirm}>
                         {t("ec.pw.error.retry")}
                       </Button>
                     }>
                {confirmIssue === "charged"
                  ? ecPwWithMailto(t("ec.pw.error.confirm", { email: supportEmail }), supportEmail)
                  : ecPwWithMailto(t("ec.pw.error.unavailable", { email: supportEmail }), supportEmail)}
              </Alert>
            )}
          </section>
        )}

        {/* The form stays mounted (only hidden) while locked, so the Stripe
            iframe survives a "not paid after all" outcome and the visitor
            can retry without the card form reloading. */}
        <div className="ec-pw__form" hidden={locked || undefined}>
          {/* One card for everything the payment needs, top to bottom: the
              work email (receipt, and the address registration pre-fills),
              the billing country, then Stripe's card fields. No company
              details: registration binds the company to the payment at
              first use of the token (founder decision 2026-09-23). */}
          <section className="ec-pw__card" aria-labelledby="ec-pw-pay-head">
            <h2 id="ec-pw-pay-head" className="ec-pw__sectionHead">{t("ec.pw.pay.head")}</h2>
            {/* Honeypot — invisible to humans, irresistible to dumb bots.
                Positioned off-screen rather than display:none so headless
                browsers reading computed styles still "see" it. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{
                position: "absolute",
                left: "-9999px",
                top: "auto",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
              }}
            />
            <Input
              id={EC_PW_FIELD_IDS.email}
              type="email"
              size="md"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              label={t("ec.pw.field.email.label")}
              placeholder={t("ec.pw.field.email.placeholder")}
              // No charge, no receipt: promising one under a free code would be untrue.
              hint={freeApplied ? undefined : t("ec.pw.field.email.hint")}
              value={fields.email}
              onChange={setField("email")}
              onBlur={touch("email")}
              disabled={busy}
              error={showErr("email") ? t("ec.pw.error.email") : undefined}
            />
            {/* Promo code, directly under the email: a code is redeemed
                against the work email (one redemption per address), so the
                two sit together. Checked live against the server, which
                looks the code up in Stripe and prices the fee; create
                re-checks it, and a refusal there lands under this same
                field. Enter applies, like the button. */}
            <div className="ec-pw__promo">
              <div className="ec-pw__promoRow">
                <div className="ec-pw__promoField">
                  <Input
                    id={EC_PW_PROMO_ID}
                    type="text"
                    size="md"
                    autoComplete="off"
                    maxLength={32}
                    label={t("ec.pw.promo.label")}
                    placeholder={t("ec.pw.promo.placeholder")}
                    value={promoInput}
                    onChange={onPromoInput}
                    onKeyDown={onPromoKeyDown}
                    disabled={busy || promoChecking || !!applied}
                    error={promo && promo.status === "error" ? promoErrorText(promo.reason) : undefined}
                  />
                </div>
                {!applied && (
                  <div className="ec-pw__promoAction">
                    {/* size "lg" is the DS Button at 44px, the Input's height. */}
                    <Button variant="outline" size="lg"
                            loading={promoChecking}
                            disabled={busy || promoChecking || !promoInput.trim()}
                            onClick={applyPromo}>
                      {promoChecking ? t("ec.pw.promo.checking") : t("ec.pw.promo.apply")}
                    </Button>
                  </div>
                )}
              </div>
              {/* Inline flow, not a flex row: on a 360px phone the sentence
                  wraps like a paragraph and the Remove link follows the last
                  word, instead of the tick, the text and the link each
                  taking a line of their own. */}
              {applied && (
                <p className="ec-pw__promoApplied" role="status">
                  <span className="ec-pw__promoTick" aria-hidden="true"><EcIco.check style={{ width: 12, height: 12 }} /></span>
                  <span>{t("ec.pw.promo.applied", { code: applied.code, amount: applied.display })}</span>
                  {" "}
                  <Button variant="link" size="sm" onClick={removePromo} disabled={busy}
                          style={{ fontSize: 13, lineHeight: "18px", fontWeight: 600, verticalAlign: "baseline" }}>
                    {t("ec.pw.promo.remove")}
                  </Button>
                </p>
              )}
            </div>
            {/* Billing country, between the email and the card fields. It
                steps aside while Apple Pay or Google Pay is selected (the
                wallet sheet has the billing address); submit() still sends
                it. `inert` while paying: the country must not change under
                a confirm already in flight. With a free code there is no
                charge and so no billing country to ask for. */}
            {CountrySelect && !walletSelected && !freeApplied && (
              <div className="ec-pw__country" inert={busy ? "" : undefined}>
                <CountrySelect
                  label={t("ec.pw.field.country.label")}
                  value={fields.country}
                  onChange={setBillingCountry}
                  options={billingOptions}
                  nameOf={countryName}
                />
              </div>
            )}
            {/* The payment method itself, in every state it can be in. All
                of it steps aside for a free code: nothing is charged. The
                Element's mount node stays in the tree (only hidden), so the
                Stripe iframe survives and comes back untouched when the
                code is removed. */}
            {!freeApplied && preview && <Alert tone="info">{t("ec.pw.preview")}</Alert>}
            {!freeApplied && preview && (
              <div className="ec-pw__placeholder">
                <Icon name="card" size={22} color="var(--c-muted-2)" />
                <span>{t("ec.pw.paymentPlaceholder")}</span>
              </div>
            )}
            {!freeApplied && unavailable && (
              <Alert tone="info" role="alert" icon="alert">
                {ecPwWithMailto(t("ec.pw.error.unavailable", { email: supportEmail }), supportEmail)}
              </Alert>
            )}
            {!freeApplied && (!config || (enabled && (stripeStatus === "idle" || stripeStatus === "loading"))) && (
              <div className="ec-pw__loading" role="status">
                <span aria-hidden="true"><Spinner size={16} color="var(--c-muted)" /></span>
                <span>{t("ec.pw.loading")}</span>
              </div>
            )}
            {!freeApplied && enabled && stripeStatus === "failed" && (
              <Alert tone="danger"
                     action={
                       <Button variant="outline" size="sm" iconLeft="refresh"
                               onClick={() => setLoadAttempt((n) => n + 1)}>
                         {t("ec.pw.error.retry")}
                       </Button>
                     }>
                {t("ec.pw.error.load")}
              </Alert>
            )}
            <div ref={mountRef} className="ec-pw__element"
                 hidden={!enabled || stripeStatus === "failed" || freeApplied || undefined} />
          </section>

          {/* Decision point. The consent sentence is the single legal
              statement on the page (charged once per application, non-
              refundable whatever the KYB outcome), placed exactly where
              the visitor commits rather than in a footnote or a separate
              notice box. The explicit tick is the evidence of that
              acknowledgement (stored server-side as terms_version +
              terms_accepted_at on the PaymentIntent). */}
          <div className="ec-pw__decision">
            {/* No consent for a free code: the sentence is about a charge
                that is not happening. The consent names the discounted
                amount when a partial code is applied: that is what is
                charged. */}
            {!freeApplied && (
              <div className="ec-pw__consent">
                <Checkbox
                  checked={consent}
                  onChange={(v) => { freshenStamp(); setConsent(!!v); }}
                  label={t("ec.pw.consent", { fee: feeDisplay })}
                  error={submitted && !consent ? t("ec.pw.consent.error") : undefined}
                  disabled={busy}
                  tone="primary"
                  style={{ alignItems: "flex-start" }}
                />
              </div>
            )}
            {notice && <Alert tone="danger">{noticeText(notice)}</Alert>}
            {/* whiteSpace/height override: the DS Button never wraps, and
                "Оплатить £100 и продолжить" runs past a 320px phone. With a
                free code the button is the handoff itself, so it carries
                the success screen's own label and keeps it while the
                server answers (the spinner says "working"; "Processing
                payment" would not be true). */}
            <Button
              variant="primary"
              size="xl"
              full
              iconRight={phase === "submitting" ? undefined : "arrowRight"}
              loading={phase === "submitting"}
              disabled={freeApplied ? !canContinueFree : !canPay}
              onClick={freeApplied ? submitFree : submit}
              style={{ whiteSpace: "normal", height: "auto", minHeight: 52, textAlign: "center" }}
            >
              {freeApplied
                ? t("ec.pw.success.cta")
                : phase === "submitting" ? t("ec.pw.cta.processing") : t("ec.pw.cta.pay", { fee: feeDisplay })}
            </Button>
            {!freeApplied && (
              <p className="ec-pw__secure">
                <Icon name="lock" size={14} />
                <span>{t("ec.pw.secure")}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EcPaywall });
