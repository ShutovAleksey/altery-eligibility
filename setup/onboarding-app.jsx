// Onboarding flow — main App
const { useMemo: _useMemo, useCallback: _useCallback, useReducer: _useReducer } = React;

// ─────────────────────────────────────────────────────────────────
// Type definitions (JSDoc — picked up by IDEs without a build step)
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {'starter'|'pro'|'ultra'} PlanId
 * @typedef {'GBP'|'EUR'} CurrencyCode
 * @typedef {'director'|'both'|'ubo'} UboRole
 * @typedef {string} IsoDate — local-time YYYY-MM-DD (no timezone shift)
 * @typedef {string} IsoTimestamp — ISO 8601 string
 * @typedef {string} Iso3166Alpha2 — country code, e.g. "GB"
 */

/**
 * @typedef AuthSlice
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} phone           - E.164 format from PhoneInput, or "" if blank
 * @property {boolean} tosAccepted
 * @property {boolean} marketingAccepted
 */

/**
 * @typedef ContactSlice
 * @property {Iso3166Alpha2|null} country — company's country of incorporation
 */

/**
 * @typedef BusinessSlice
 * @property {string} companyName
 * @property {string} tradingName
 * @property {string} companyNumber
 * @property {IsoDate|null} dateOfIncorporation
 * @property {string} address
 * @property {string} industry        - one of: tech | fin | ret | prof | mfg | med
 * @property {string} website
 */

/**
 * @typedef ActivitySlice
 * @property {string[]} inboundChannels   - subset of: sepa, swift, fps, cards, crypto
 * @property {string[]} outboundChannels  - same options as inbound
 */

/**
 * @typedef UboRecord
 * @property {string} id              - crypto.randomUUID()
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {IsoDate} dateOfBirth
 * @property {Iso3166Alpha2} country  - country of residence
 * @property {UboRole} role
 * @property {string} stakePercent    - empty for "director"; numeric string "1".."100"
 */

/**
 * @typedef UboDraft
 * @property {string|null} editingId  - UUID being edited, or null when adding new
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {IsoDate|null} dateOfBirth
 * @property {string} country
 * @property {UboRole} role
 * @property {string} stakePercent
 */

/**
 * @typedef PlanSlice
 * @property {PlanId|null} selectedPlanId
 * @property {CurrencyCode|null} billingCurrency
 */

/**
 * @typedef MetaSlice
 * @property {string|null} token       - session ID forwarded from the checker
 * @property {IsoTimestamp|null} startedAt
 * @property {IsoTimestamp|null} lastSavedAt - written on every persist
 */

/**
 * The persistent form-state object. Everything here survives a reload via
 * localStorage. Sensitive fields (password, 2FA code, card data) are
 * deliberately absent — those live in the screen-local React state.
 *
 * Extending the shape:
 *  - ADD new keys / slices freely; `hydrateFormState` deep-merges saved
 *    data over INITIAL_FORM_STATE so older payloads get the new defaults.
 *  - RENAME / REMOVE keys requires a `_v` bump (and saved data will reset
 *    for in-flight users).
 *
 * @typedef FormState
 * @property {number} _v
 * @property {AuthSlice} auth
 * @property {ContactSlice} contact
 * @property {BusinessSlice} business
 * @property {ActivitySlice} activity
 * @property {UboRecord[]} ubos
 * @property {UboDraft} uboDraft
 * @property {PlanSlice} plan
 * @property {MetaSlice} meta
 */

/**
 * @typedef CheckerParams
 * @property {string} plan       - lower-case PlanId or fallback "pro"
 * @property {string} entity     - "uk" | "eu" | "mena"
 * @property {string|null} token
 * @property {string|null} email
 * @property {string|null} volume - monthly volume estimate from the checker
 * @property {string} currency   - upper-case CurrencyCode or "GBP" fallback
 */

// localStorage key for the persisted onboarding form state. Bump the suffix
// (`:v2`, `:v3`, …) whenever the shape changes; hydration will refuse to load
// anything from an older version and the user will start fresh.
const FORM_STORAGE_KEY = "altery:ob:formState:v2";

// Master toggle for localStorage persistence. Turned OFF for now — we
// observed phantom-data confusion ("the form opens with data I never
// entered") because the localStorage payload survives across tests,
// reloads, and accidental returns to /setup. Save-and-continue still
// works via the emailed magic link (T7b) — that uses a server-signed
// HMAC token, not localStorage. Flip this back to true to re-enable
// auto-save on every formState change.
const PERSIST_TO_LOCALSTORAGE = false;

/** @type {UboDraft} */
const INITIAL_UBO_DRAFT = {
  editingId: null,
  firstName: "",
  lastName: "",
  email: "",
  dateOfBirth: null,
  country: "",
  role: "director",
  stakePercent: "",
};

/** @type {FormState} */
const INITIAL_FORM_STATE = {
  _v: 2,
  auth:     { firstName: "", lastName: "", email: "", phone: "", tosAccepted: false, marketingAccepted: false },
  contact:  { country: null },
  business: { companyName: "", tradingName: "", companyNumber: "", dateOfIncorporation: null, address: "", industry: "", website: "" },
  activity: { inboundChannels: [], outboundChannels: [] },
  ubos:     [],
  uboDraft: INITIAL_UBO_DRAFT,
  plan:     { selectedPlanId: null, billingCurrency: null },
  meta:     { token: null, startedAt: null, lastSavedAt: null, utm: null, checkerHints: null },
};

// Per-slice deep-merge so additive shape changes (new fields inside an
// existing slice) appear automatically for users whose saved payload predates
// the new field. Arrays replace as-is — never merge user-curated lists.
function mergeFormState(defaults, saved) {
  const out = { ...defaults };
  for (const key of Object.keys(saved || {})) {
    const dv = defaults[key];
    const sv = saved[key];
    if (Array.isArray(dv) || Array.isArray(sv)) {
      out[key] = sv;
    } else if (dv && typeof dv === "object" && sv && typeof sv === "object") {
      out[key] = { ...dv, ...sv };
    } else {
      out[key] = sv;
    }
  }
  return out;
}

/**
 * Read the persisted form state from localStorage, or build a fresh one
 * seeded from the eligibility-checker URL params (plan, currency, email,
 * token). Returns INITIAL_FORM_STATE + seed when storage is unavailable.
 *
 * @param {CheckerParams} checkerParams
 * @returns {FormState}
 */
// Checker industry vocabulary and KYB business-info dropdown vocabulary
// are now identical (saas / apps / games / edtech / marketplace / ecom /
// prof / creator / affiliate / crypto / other). Prefill is therefore a
// straight pass-through — no mapping table needed. The whitelist below
// is a defensive sanity check so an unexpected value (older payload,
// future segment, typo) doesn't leak into the dropdown's value slot.
const OB_INDUSTRY_VALUES = new Set([
  "saas", "apps", "games", "edtech", "marketplace",
  "ecom", "prof", "creator", "affiliate", "crypto", "other",
]);

// Derive the set of payment channels the user likely needs from their
// checker answers. The activity screen lets the user toggle these
// individually — we just want a sensible preselection.
//
// Mapping:
//   entity=uk    → fps  (Faster Payments Service is the UK domestic rail)
//   entity=eu    → sepa (Eurozone domestic rail)
//   any corridor outside the user's home region    → swift
//   services includes "cards"                       → cards
//   cryptoActive=true                                → crypto
//
// Same channels are pre-toggled for BOTH inbound and outbound because
// payment rails are bidirectional — if you receive SEPA, you also send
// SEPA. User can correct asymmetric flows on the screen.
function deriveChannelsFromChecker(checkerParams) {
  const channels = new Set();
  const entity = (checkerParams.entity || "").toLowerCase();
  const corridors = checkerParams.corridors || [];
  const services  = checkerParams.services  || [];

  if (entity === "uk") channels.add("fps");
  if (entity === "eu") channels.add("sepa");

  // Any corridor that isn't the user's own home region implies SWIFT.
  // Codes like "GB" / "EU" / region tags like "APAC" / "AFRICA" appear
  // in the checker corridors list.
  const homeRegion = entity === "uk" ? "GB"
                   : entity === "eu" ? "EU"
                   : null;
  if (corridors.some((c) => c !== homeRegion)) channels.add("swift");

  if (services.includes("cards"))     channels.add("cards");
  if (checkerParams.cryptoActive)     channels.add("crypto");

  return [...channels];
}

function hydrateFormState(checkerParams) {
  if (PERSIST_TO_LOCALSTORAGE) {
    try {
      const raw = window.localStorage.getItem(FORM_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed._v === INITIAL_FORM_STATE._v) {
          // Per-slice deep-merge so newly-added fields inside an existing slice
          // (e.g. extending uboDraft from {role} → {role, firstName, …}) show up
          // even when the saved payload predates them. Arrays replace as-is.
          // Saved state wins over checkerParams here on purpose — if the user
          // already started onboarding and edited their answers, a stale link
          // re-opened later must not overwrite their work.
          return mergeFormState(INITIAL_FORM_STATE, parsed);
        }
      }
    } catch (e) { /* storage unavailable / parse error → fall through to seed */ }
  }

  // Cherry-pick what we can confidently prefill from the checker payload.
  // Rule of thumb: only seed a screen-visible field when the source and
  // target vocabularies map cleanly (1:1) or when a lossy mapping still
  // produces a sensible default the user can verify on the screen.
  //   - country code → country code: 1:1, direct prefill
  //   - industry: lossy mapping via CHECKER_INDUSTRY_TO_OB, but the
  //     business-info screen surfaces the dropdown so user can correct
  //   - services / corridors / volume / cryptoActive: parked in
  //     meta.checkerHints; downstream screens can opt in to use them
  //     as suggestions, never forced.
  return {
    ...INITIAL_FORM_STATE,
    auth: {
      ...INITIAL_FORM_STATE.auth,
      email: checkerParams.email || "",
    },
    contact: {
      ...INITIAL_FORM_STATE.contact,
      country: checkerParams.country || null,
    },
    business: {
      ...INITIAL_FORM_STATE.business,
      industry: (checkerParams.industry && OB_INDUSTRY_VALUES.has(checkerParams.industry))
        ? checkerParams.industry
        : "",
    },
    activity: {
      ...INITIAL_FORM_STATE.activity,
      // Pre-toggle the payment rails the checker answers imply.
      // Both directions get the same set (rails are bidirectional);
      // user can untoggle asymmetric flows on the activity screen.
      inboundChannels:  deriveChannelsFromChecker(checkerParams),
      outboundChannels: deriveChannelsFromChecker(checkerParams),
    },
    plan: {
      selectedPlanId: checkerParams.plan || null,
      billingCurrency: checkerParams.currency || null,
    },
    meta: {
      ...INITIAL_FORM_STATE.meta,
      token: checkerParams.token || null,
      startedAt: new Date().toISOString(),
      // Marketing attribution. Priority order:
      //   1. UTMs embedded in the handoff payload (?p=) — carry the
      //      original first-touch from the checker landing, survive
      //      email forwards.
      //   2. UTMs captured directly on /setup (from a campaign that
      //      links here instead of the checker root).
      //   3. null when no UTMs were ever captured.
      utm: (checkerParams.utm && typeof checkerParams.utm === "object")
        ? checkerParams.utm
        : obGetStoredUtms(),
      // Non-form hints — preserved for screens that want to suggest a
      // default without overwriting user-visible fields. Never read
      // these as authoritative; they're advisory.
      checkerHints: {
        volume:           checkerParams.volume || null,
        industry:         checkerParams.industry || null,  // raw checker value (saas/apps/...)
        services:         checkerParams.services || [],
        corridors:        checkerParams.corridors || [],
        cryptoActive:     !!checkerParams.cryptoActive,
      },
    },
  };
}

// Stable ID for a newly-added UBO. randomUUID exists in all modern browsers
// we ship to (Safari 15.4+, Chrome 92+, Firefox 95+); falls back to a
// time+random string on the off-chance it's missing.
function makeUboId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ubo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────
// Reducer + actions
// ─────────────────────────────────────────────────────────────────
// All formState mutations route through dispatch + this reducer so the
// shape of every transition is documented in one place. Screen helpers
// (updateAuth, setCountry, …) are thin wrappers below.

/**
 * @typedef Action
 * @property {string} type
 * @property {*} [payload]
 */

/** @enum {string} */
const ACT = Object.freeze({
  AUTH_PATCH:          "auth/patch",
  BUSINESS_PATCH:      "business/patch",
  SET_COUNTRY:         "contact/setCountry",
  SET_INBOUND:         "activity/setInbound",
  SET_OUTBOUND:        "activity/setOutbound",
  UBO_DRAFT_PATCH:     "uboDraft/patch",
  UBO_DRAFT_LOAD:      "uboDraft/loadExisting",
  UBO_DRAFT_CLEAR:     "uboDraft/clear",
  UBO_DRAFT_SEED_AUTH: "uboDraft/seedFromAuth",
  UBO_DRAFT_COMMIT:    "ubos/commitDraft",
  UBOS_CONFIRM_SOLE:   "ubos/confirmSole",
  // Bulk replace — used by the resume-link flow to hydrate the full
  // form state from a server-validated payload. Action payload IS the
  // new state (already shape-checked by /api/load-progress).
  REPLACE_STATE:       "_internal/replaceState",
});

/**
 * @param {FormState} state
 * @param {Action}    action
 * @returns {FormState}
 */
function formReducer(state, action) {
  switch (action.type) {
    case ACT.AUTH_PATCH:
      return { ...state, auth: { ...state.auth, ...action.payload } };
    case ACT.BUSINESS_PATCH:
      return { ...state, business: { ...state.business, ...action.payload } };
    case ACT.SET_COUNTRY:
      return { ...state, contact: { ...state.contact, country: action.payload } };
    case ACT.SET_INBOUND:
      return { ...state, activity: { ...state.activity, inboundChannels: action.payload } };
    case ACT.SET_OUTBOUND:
      return { ...state, activity: { ...state.activity, outboundChannels: action.payload } };
    case ACT.UBO_DRAFT_PATCH:
      return { ...state, uboDraft: { ...state.uboDraft, ...action.payload } };
    case ACT.UBO_DRAFT_LOAD: {
      const target = state.ubos.find((u) => u.id === action.payload);
      if (!target) return state;
      return { ...state, uboDraft: { ...INITIAL_UBO_DRAFT, ...target, editingId: action.payload } };
    }
    case ACT.UBO_DRAFT_CLEAR:
      return { ...state, uboDraft: INITIAL_UBO_DRAFT };
    case ACT.UBO_DRAFT_SEED_AUTH:
      // Pre-fill the very first UBO from the auth section — the lead applicant
      // is almost always the first person added. Triggered by ScreenUboList's
      // "Add" when ubos.length === 0.
      return {
        ...state,
        uboDraft: {
          ...INITIAL_UBO_DRAFT,
          firstName: state.auth.firstName || "",
          lastName:  state.auth.lastName  || "",
          email:     state.auth.email     || "",
        },
      };
    case ACT.UBO_DRAFT_COMMIT: {
      // Append a new UBO, or replace the record being edited (when
      // uboDraft.editingId is set). Always resets the draft afterwards.
      const { editingId, ...fields } = state.uboDraft;
      const ubos = editingId
        ? state.ubos.map((u) => (u.id === editingId ? { ...u, ...fields } : u))
        : [...state.ubos, { id: makeUboId(), ...fields }];
      return { ...state, ubos, uboDraft: INITIAL_UBO_DRAFT };
    }
    case ACT.UBOS_CONFIRM_SOLE: {
      // Sole-director shortcut: replace the whole ubos array with one record
      // built from auth + the two inline fields (dob, country).
      const { dateOfBirth, country } = action.payload;
      return {
        ...state,
        ubos: [{
          id: makeUboId(),
          firstName: state.auth.firstName || "",
          lastName:  state.auth.lastName  || "",
          email:     state.auth.email     || "",
          dateOfBirth,
          country,
          role: "both",
          stakePercent: "100",
        }],
        uboDraft: INITIAL_UBO_DRAFT,
      };
    }
    case ACT.REPLACE_STATE: {
      // Merge the resumed payload over INITIAL_FORM_STATE so any fields
      // the saved snapshot predated (newly-added slices in a later
      // release) get sensible defaults instead of undefined. Then force
      // a fresh _v so the persistence layer's version check accepts it.
      return mergeFormState(INITIAL_FORM_STATE, { ...action.payload, _v: INITIAL_FORM_STATE._v });
    }
    default:
      return state;
  }
}

/**
 * React state hook that owns the persistent form-state pair. Backed by
 * useReducer so every mutation has a typed action name (handy in React
 * DevTools and for future logging/replay). Writes to localStorage on
 * every change with a fresh `lastSavedAt` timestamp; silently skips
 * persistence when storage is full / unavailable.
 *
 * @param {CheckerParams} checkerParams
 * @returns {[FormState, React.Dispatch<Action>]}
 */
function useFormState(checkerParams) {
  const [formState, dispatch] = _useReducer(formReducer, checkerParams, hydrateFormState);

  // When persistence is off, also actively wipe any leftover entry on
  // boot so stale data from before the toggle was flipped doesn't sit
  // around in browsers that already had it. One-shot per mount.
  useEffect(() => {
    if (PERSIST_TO_LOCALSTORAGE) return;
    try { window.localStorage.removeItem(FORM_STORAGE_KEY); } catch (e) {}
  }, []);

  useEffect(() => {
    if (!PERSIST_TO_LOCALSTORAGE) return;
    try {
      window.localStorage.setItem(
        FORM_STORAGE_KEY,
        JSON.stringify({
          ...formState,
          meta: { ...formState.meta, lastSavedAt: new Date().toISOString() },
        })
      );
    } catch (e) { /* quota / private-mode → silently skip persistence */ }
  }, [formState]);
  return [formState, dispatch];
}

// Exposed for ScreenSubmit (and the future /api/submit-kyb success handler):
// once the application is accepted server-side, wipe the local copy so a
// returning visitor gets a clean slate.
window.__obClearFormState = function clearFormState() {
  try { window.localStorage.removeItem(FORM_STORAGE_KEY); } catch (e) {}
};

const ALL_STEPS = [
  "prep",
  "welcome",
  "password",
  "verify",
  "phone",
  "country",
  "business-info",
  "activity",
  "documents",
  "ubo-list",
  "ubo-form",
  "review",
  "payment",
  "submit",
];

// Vestigial demo-state for screen variants that still consult
// `state === "empty" | "filled" | "default"` to decide their visual look
// (mostly the few not-yet-wired Select dropdowns on the Activity step and
// the ScreenSubmit branch chooser). Constant for now — when those screens
// migrate to real form state these refs disappear with them.
// Previously a `useTweaks` hook drove this via Figma EditMode postMessage
// integration; that surface (the Tweaks panel) has been removed.
const TWEAKS = Object.freeze({
  stateVariant: "default",
  submitState: "pending",
});

// First-touch UTM capture, inline copy of the checker-side helpers from
// checker-helpers.js. The setup app doesn't load checker-helpers.js so
// we keep a tiny local copy. Both surfaces write to the same
// sessionStorage key "altery:utm:v1" so a visitor who arrived on
// /?utm_source=... and then navigates to /setup keeps their first-touch
// record. If they land directly on /setup?utm_source=..., this captures
// from there.
const _UTM_FIELDS_OB  = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const _UTM_STORAGE_OB = "altery:utm:v1";

function obCaptureAndStoreUtms() {
  if (typeof window === "undefined") return null;
  let existing = null;
  try {
    const raw = window.sessionStorage.getItem(_UTM_STORAGE_OB);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && _UTM_FIELDS_OB.some((f) => parsed[f])) existing = parsed;
    }
  } catch (e) {}
  if (existing) return existing;

  const sp = new URLSearchParams(window.location.search);
  const out = {};
  let any = false;
  for (const k of _UTM_FIELDS_OB) {
    const v = sp.get(k);
    if (v) { out[k] = v.slice(0, 200); any = true; }
  }
  if (!any) return null;
  out.referrer = (document.referrer || "").slice(0, 500) || null;
  out.landedAt = new Date().toISOString();
  try { window.sessionStorage.setItem(_UTM_STORAGE_OB, JSON.stringify(out)); } catch (e) {}
  return out;
}

function obGetStoredUtms() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(_UTM_STORAGE_OB);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && _UTM_FIELDS_OB.some((f) => parsed[f])) return parsed;
  } catch (e) {}
  return null;
}

function App() {
  const [step, setStep] = useState("prep");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Capture first-touch UTMs as early as possible on mount. The helper
  // is a no-op when nothing's in the URL AND nothing's already stored.
  // Result is read again at handoff time from sessionStorage; no need
  // to thread through component state.
  useEffect(() => { obCaptureAndStoreUtms(); }, []);

  // formState — single source of truth for user-entered data, persisted to
  // localStorage so a reload mid-flow doesn't lose progress. Initialised below
  // (after checkerParams is computed, since the seed depends on URL params).

  // ── Eligibility-checker handoff ───────────────────────────────
  // Two URL shapes are accepted, in priority order:
  //
  //   1. ?p=<base64url-JSON> — current shape. One self-contained payload
  //      carrying every checker answer (plan, entity, volume, industry,
  //      services, corridors, cryptoActive, ref). Works across device
  //      switches, email forwards to colleagues, and "I'll come back
  //      later" because the link IS the state.
  //
  //   2. ?token=&plan=&entity=&currency=&volume= — legacy individual
  //      params. Kept as a fallback so emails/PDFs already in the wild,
  //      bookmarked URLs, and direct deep-links from older clients keep
  //      working with no breakage.
  //
  // Defaults are safe if the user lands on /setup with neither shape —
  // the prep checklist runs first and they pick everything by hand.
  const checkerParams = _useMemo(() => {
    if (typeof window === "undefined") return {};
    const sp = new URLSearchParams(window.location.search);

    // Path 1 — single base64url payload.
    const p = sp.get("p");
    if (p) {
      try {
        // base64url → base64 (atob accepts unpadded but standard libs differ;
        // re-add the "=" padding to be belt-and-braces). escape(atob(...))
        // pairs with the encoder's unescape(encodeURIComponent(...)) so UTF-8
        // round-trips cleanly.
        const pad = (4 - (p.length % 4)) % 4;
        const b64 = p.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
        const json = decodeURIComponent(escape(atob(b64)));
        const payload = JSON.parse(json);
        if (payload && payload.v === 1) {
          return {
            plan:         (payload.plan || "pro").toLowerCase(),
            entity:       (payload.entity || "uk").toLowerCase(),
            token:        payload.ref || null,
            // Email is only embedded when the link came from the
            // email-this-proposal flow (the user typed it into the
            // handoff modal). Forwarded copies carry the original
            // recipient's address, which is the right default; the
            // colleague can edit on the welcome screen if needed.
            email:        (payload.email && /\S+@\S+\.\S+/.test(payload.email)) ? payload.email : null,
            // ISO alpha-2; uppercased to match how the country screen
            // stores its selection internally (e.g. "DE", "GB"). null
            // when the checker didn't capture one (older payloads).
            country:      payload.country ? String(payload.country).toUpperCase() : null,
            volume:       payload.volume ? String(payload.volume) : null,
            currency:     (payload.currency || "GBP").toUpperCase(),
            industry:     payload.industry || null,
            services:     Array.isArray(payload.services)  ? payload.services  : [],
            corridors:    Array.isArray(payload.corridors) ? payload.corridors : [],
            cryptoActive: !!payload.cryptoActive,
            // Marketing attribution carried from the checker (or older
            // forwarded copies). null when no UTMs were captured upstream.
            utm:          (payload.utm && typeof payload.utm === "object") ? payload.utm : null,
          };
        }
      } catch (e) {
        // Malformed payload — fall through to legacy parsing below.
        if (typeof console !== "undefined") console.warn("[handoff] failed to decode ?p=", e);
      }
    }

    // Path 2 — legacy individual params (back-compat).
    return {
      plan:    (sp.get("plan") || "pro").toLowerCase(),       // starter | pro | ultra
      entity:  (sp.get("entity") || "uk").toLowerCase(),      // uk | eu | mena
      token:   sp.get("token") || null,                       // session id from checker
      email:   sp.get("email") || null,                       // pre-fill on welcome
      volume:  sp.get("volume") || null,                      // monthly volume estimate
      currency:(sp.get("currency") || "GBP").toUpperCase(),   // billing currency
    };
  }, []);

  // Persistent form state — survives reload. Backed by useReducer; the
  // helpers below are thin wrappers around typed dispatch actions so screen
  // call-sites stay terse (e.g. updateAuth({email}) instead of dispatch({
  // type: ACT.AUTH_PATCH, payload: {email} })).
  const [formState, dispatch] = useFormState(checkerParams);

  const updateAuth         = _useCallback((patch) => dispatch({ type: ACT.AUTH_PATCH,       payload: patch }), []);
  const updateBusiness     = _useCallback((patch) => dispatch({ type: ACT.BUSINESS_PATCH,   payload: patch }), []);
  const setCountry         = _useCallback((code)  => dispatch({ type: ACT.SET_COUNTRY,      payload: code  }), []);
  const setInboundChannels = _useCallback((arr)   => dispatch({ type: ACT.SET_INBOUND,      payload: arr   }), []);
  const setOutboundChannels= _useCallback((arr)   => dispatch({ type: ACT.SET_OUTBOUND,     payload: arr   }), []);
  const updateUboDraft     = _useCallback((patch) => dispatch({ type: ACT.UBO_DRAFT_PATCH,  payload: patch }), []);
  const saveUboDraft       = _useCallback(()      => dispatch({ type: ACT.UBO_DRAFT_COMMIT }),                  []);
  const loadUboIntoDraft   = _useCallback((id)    => dispatch({ type: ACT.UBO_DRAFT_LOAD,   payload: id    }), []);
  const clearUboDraft      = _useCallback(()      => dispatch({ type: ACT.UBO_DRAFT_CLEAR }),                   []);

  // Document uploads are deliberately NOT in formState/localStorage. The
  // raw File blobs can't survive serialisation, and persisting just the
  // filenames would falsely imply the file is still available after reload.
  // Until the backend (Phase 3) accepts uploads and returns server file IDs,
  // documents live in App-level state and reset on refresh — the user
  // re-picks them once after a reload, which mirrors how real KYB portals
  // behave before a server save is confirmed.
  const [docs, setDocs] = useState({});
  const setDoc = _useCallback(
    (id, file) => setDocs((d) => ({ ...d, [id]: file })),
    []
  );

  // If the visitor came from the checker (token present), skip the
  // generic prep screen and go straight to welcome — they've already
  // seen the "what you'll need" story in the checker. Otherwise the
  // standard prep checklist runs first.
  useEffect(() => {
    if (checkerParams.token) setStep("welcome");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resume from emailed magic link (T7b save-and-continue) ──────
  // The save-progress endpoint emails a URL of the shape
  // /setup?resume=<base64url-payload>.<sig>. On boot we hand the token
  // to /api/load-progress, which validates the HMAC + exp and returns
  // the decoded {email, step, state}. Success → REPLACE_STATE +
  // setStep; failure → silently clear the param (don't trash the
  // visitor's existing localStorage progress, just fall through to
  // whatever they had locally).
  //
  // History.replaceState scrubs the long token from the URL bar after
  // a successful load so the user doesn't share a copy of their KYB
  // state by accident.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const resumeToken = sp.get("resume");
    if (!resumeToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/load-progress?token=" + encodeURIComponent(resumeToken));
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data && data.state && data.step) {
          dispatch({ type: ACT.REPLACE_STATE, payload: data.state });
          setStep(data.step);
        } else {
          console.warn("[resume] token rejected:", data?.code || res.status);
        }
      } catch (err) {
        if (!cancelled) console.warn("[resume] load failed:", err);
      } finally {
        if (!cancelled) {
          sp.delete("resume");
          const newQs = sp.toString();
          const cleanURL = window.location.pathname + (newQs ? "?" + newQs : "") + window.location.hash;
          window.history.replaceState({}, "", cleanURL);
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effective step list — same as ALL_STEPS but with screens skipped
  // when the checker has already answered them. Filtering at runtime
  // keeps prev/next navigation linear; the omitted screens behave as
  // if they don't exist from a UX perspective. Today only "country"
  // gets skipped (when the checker captured an ISO country code that
  // already populated formState.contact.country during hydration).
  // Add more entries here as future screens become pre-answerable.
  const effectiveSteps = _useMemo(() => {
    return ALL_STEPS.filter((s) => {
      if (s === "country" && checkerParams.country) return false;
      return true;
    });
  }, [checkerParams.country]);

  // If the user lands directly on a step we've now filtered out
  // (e.g. /setup?step=country with country present in the payload),
  // bounce them forward to the next unfiltered step.
  useEffect(() => {
    if (!effectiveSteps.includes(step)) {
      const allIdx = ALL_STEPS.indexOf(step);
      const next = ALL_STEPS.slice(allIdx + 1).find((s) => effectiveSteps.includes(s));
      if (next) setStep(next);
    }
  }, [effectiveSteps, step]);

  const idx = effectiveSteps.indexOf(step);
  const next = () => setStep(effectiveSteps[Math.min(effectiveSteps.length - 1, idx + 1)]);
  const back = () => setStep(effectiveSteps[Math.max(0, idx - 1)]);

  const renderStep = () => {
    const s = TWEAKS.stateVariant;
    switch (step) {
      case "prep":          return <ScreenPrep next={next} />;
      case "welcome":       return <ScreenWelcome next={next} state={s}
                                      auth={formState.auth}
                                      updateAuth={updateAuth}/>;
      case "password":      return <ScreenPassword next={next} back={back} state={s}/>;
      case "verify":        return <ScreenVerify next={next} back={back} state={s}
                                      email={formState.auth.email}/>;
      case "phone":         return <ScreenPhone next={next} back={back} state={s}
                                      phone={formState.auth.phone}
                                      updateAuth={updateAuth}/>;
      case "country":       return <ScreenCountry next={next} back={back} state={s}
                                      country={formState.contact.country}
                                      onSelectCountry={setCountry}/>;
      case "business-info": return <ScreenBusinessInfo next={next} back={back} state={s}
                                      business={formState.business}
                                      updateBusiness={updateBusiness}/>;
      case "activity":      return <ScreenActivity next={next} back={back} state={s}
                                      inboundChannels={formState.activity.inboundChannels}
                                      outboundChannels={formState.activity.outboundChannels}
                                      onChangeInbound={setInboundChannels}
                                      onChangeOutbound={setOutboundChannels}/>;
      case "documents":     return <ScreenDocuments next={next} back={back}
                                      docs={docs} setDoc={setDoc}/>;
      case "ubo-list":      return <ScreenUboList
                                      // Continue on the list skips the form (the form is reached
                                      // only via Add/Edit) and goes straight to review.
                                      next={() => setStep("review")}
                                      back={back}
                                      ubos={formState.ubos}
                                      auth={formState.auth}
                                      onAddPerson={() => {
                                        if (formState.ubos.length === 0) {
                                          dispatch({ type: ACT.UBO_DRAFT_SEED_AUTH });
                                        } else {
                                          dispatch({ type: ACT.UBO_DRAFT_CLEAR });
                                        }
                                        setStep("ubo-form");
                                      }}
                                      onEditPerson={(id) => { loadUboIntoDraft(id); setStep("ubo-form"); }}
                                      onConfirmSole={(payload) => {
                                        dispatch({ type: ACT.UBOS_CONFIRM_SOLE, payload });
                                        setStep("review");
                                      }}/>;
      case "ubo-form":      return <ScreenUboForm
                                      onSave={() => { saveUboDraft(); setStep("ubo-list"); }}
                                      onCancel={() => { clearUboDraft(); setStep("ubo-list"); }}
                                      draft={formState.uboDraft}
                                      updateUboDraft={updateUboDraft}/>;
      case "review":        return <ScreenReview next={() => setStep("payment")} back={back} setStep={setStep}/>;
      case "payment":       return <ScreenActivation
                                      planId={checkerParams.plan}
                                      currency={checkerParams.currency}
                                      mode="presubmit"
                                      next={() => setStep("submit")}
                                      back={() => setStep("review")}
                                    />;
      case "submit":        return <ScreenSubmit state={TWEAKS.submitState} setStep={setStep}/>;
      case "applications-list": return <ApplicationsList setStep={setStep}/>;
      default: return null;
    }
  };

  // Set screen label for the current step
  useEffect(() => {
    document.body.dataset.screenLabel = `${ALL_STEPS.indexOf(step)+1}-${STEP_LABELS[step] || step}`;
  }, [step]);

  // Whether to show the persistent save chip (not on prep, payment,
  // status or list screens — payment is a sensitive page where the
  // user should focus on the form, not on saving progress).
  const showSaveChip = !["prep", "payment", "submit", "applications-list"].includes(step);

  return (
    <div className="ob-app">
      <ObSidebar
        step={step}
        onSave={showSaveChip ? () => setShowSaveModal(true) : null}
      />
      <main className="ob-main">
        <div key={step}>{renderStep()}</div>
      </main>
      {showSaveModal && (
        <ResumeModal
          email={formState.auth.email || ""}
          lastSavedAt={formState.meta.lastSavedAt}
          formState={formState}
          step={step}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}

// ──────────────────── ResumeModal — "Save and continue later" ────────────────────
function ResumeModal({ email, lastSavedAt, formState, step, onClose }) {
  const t = useT();
  const [emailVal, setEmailVal] = useState(email || "");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const savedLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : t("ob.resume.justNow");
  const emailValid = /\S+@\S+\.\S+/.test(emailVal);

  const handleSend = async () => {
    if (!emailValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // Strip transient/sensitive fields before serialising. uboDraft
      // is in-flight UI state and shouldn't survive a resume; documents
      // are File objects that don't JSON-serialise anyway and live in
      // App-level state per the existing comment in onboarding-app.jsx.
      const cleanState = { ...formState, uboDraft: INITIAL_UBO_DRAFT };
      const res = await fetch("/api/save-progress", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: emailVal.trim(), state: cleanState, step }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const key = data?.code === "payload_too_large" ? "ob.resume.err.tooLarge"
                  : data?.code === "bad_email"         ? "ob.resume.err.email"
                  :                                       "ob.resume.err.generic";
        setError(t(key));
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(t("ob.resume.err.network"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ob-modal-overlay" onClick={onClose}>
      <div className="ob-modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button className="ob-modal__close" onClick={onClose} aria-label={t("common.close") || "Close"}>
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        {!sent ? (
          <React.Fragment>
            <h3>{t("ob.resume.title")}</h3>
            <p>{t("ob.resume.body")}</p>
            <Input
              label={t("ob.resume.label")}
              type="email"
              value={emailVal}
              onChange={(e) => { setEmailVal(e.target.value); setError(null); }}
              placeholder={t("ob.resume.placeholder")}
              error={error || undefined}
              autoComplete="email"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
              <Button variant="primary" size="lg" onClick={handleSend} iconRight="arrowRight" full disabled={!emailValid || submitting}>
                {submitting ? t("ob.resume.sending") : t("ob.resume.send")}
              </Button>
              <Button variant="ghost" size="lg" onClick={onClose} full>{t("ob.resume.keep")}</Button>
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: "var(--c-muted)", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--c-success)", boxShadow: "0 0 0 4px rgba(10,159,82,.12)" }}/>
              {t("ob.resume.savedAt", { time: savedLabel })}
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div style={{
              width: 56, height: 56, borderRadius: 999,
              background: "var(--c-success-soft)", color: "var(--c-success)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none"><path d="m6 12 4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3>{t("ob.resume.sentTitle", { email: emailVal })}</h3>
            <p>{t("ob.resume.sentBody")}</p>
            <div style={{ marginTop: 8 }}>
              <Button variant="primary" size="lg" onClick={onClose} full>{t("ob.resume.gotIt")}</Button>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
