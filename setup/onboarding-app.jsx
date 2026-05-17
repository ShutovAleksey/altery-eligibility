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
  meta:     { token: null, startedAt: null, lastSavedAt: null },
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
function hydrateFormState(checkerParams) {
  try {
    const raw = window.localStorage.getItem(FORM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed._v === INITIAL_FORM_STATE._v) {
        // Per-slice deep-merge so newly-added fields inside an existing slice
        // (e.g. extending uboDraft from {role} → {role, firstName, …}) show up
        // even when the saved payload predates them. Arrays replace as-is.
        return mergeFormState(INITIAL_FORM_STATE, parsed);
      }
    }
  } catch (e) { /* storage unavailable / parse error → fall through to seed */ }
  return {
    ...INITIAL_FORM_STATE,
    auth: {
      ...INITIAL_FORM_STATE.auth,
      email: checkerParams.email || "",
    },
    plan: {
      selectedPlanId: checkerParams.plan || null,
      billingCurrency: checkerParams.currency || null,
    },
    meta: {
      ...INITIAL_FORM_STATE.meta,
      token: checkerParams.token || null,
      startedAt: new Date().toISOString(),
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
  useEffect(() => {
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

function App() {
  const [step, setStep] = useState("prep");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // formState — single source of truth for user-entered data, persisted to
  // localStorage so a reload mid-flow doesn't lose progress. Initialised below
  // (after checkerParams is computed, since the seed depends on URL params).

  // ── Eligibility-checker handoff ───────────────────────────────
  // When the user arrives from altery.com (eligibility checker → "Start
  // setup"), the checker passes their recommended plan, entity, session
  // token and email through URL params so we can skip the prep screen
  // and pre-fill what we already know. Defaults are safe if the user
  // lands here directly (e.g. via help-centre deep link).
  const checkerParams = _useMemo(() => {
    if (typeof window === "undefined") return {};
    const sp = new URLSearchParams(window.location.search);
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

  const idx = ALL_STEPS.indexOf(step);
  const next = () => setStep(ALL_STEPS[Math.min(ALL_STEPS.length - 1, idx + 1)]);
  const back = () => setStep(ALL_STEPS[Math.max(0, idx - 1)]);

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
      <ObHeader
        step={step}
        onClose={() => setStep("applications-list")}
        onSave={showSaveChip ? () => setShowSaveModal(true) : null}
      />
      <main className="ob-main">
        <div key={step}>{renderStep()}</div>
      </main>
      {showSaveModal && (
        <ResumeModal
          email={formState.auth.email || ""}
          lastSavedAt={formState.meta.lastSavedAt}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}

// ──────────────────── ResumeModal — "Save and continue later" ────────────────────
function ResumeModal({ email, lastSavedAt, onClose }) {
  const [emailVal, setEmailVal] = useState(email || "");
  const [sent, setSent] = useState(false);
  // Show the wall-clock time the last persist actually happened (from the
  // useFormState effect that writes to localStorage) — falling back to "just
  // now" if the modal opened before any save has been logged. Previously
  // this called `new Date()` and so always read as the moment the modal
  // opened, which made the "Saved automatically" line meaningless.
  const savedLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "just now";
  return (
    <div className="ob-modal-overlay" onClick={onClose}>
      <div className="ob-modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button className="ob-modal__close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        {!sent ? (
          <React.Fragment>
            <h3>Take a break — your progress is safe</h3>
            <p>Everything you've entered is already saved on your account. We'll send a link to pick up exactly where you left off.</p>
            <Input
              label="Send the resume link to"
              type="email"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
              placeholder="you@yourcompany.com"
            />
            {/* Stacked primary-on-top, ghost-below — same shape as the
                checker's handoff modal ("Start setup" full-width primary +
                "Or send me the full proposal" as a secondary link beneath).
                Matches the AlteryPay DS mobile "Stacked actions" pattern. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
              <Button variant="primary" size="lg" onClick={() => setSent(true)} iconRight="arrowRight" full>Send link</Button>
              <Button variant="ghost" size="lg" onClick={onClose} full>Keep working</Button>
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: "var(--c-muted)", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--c-success)", boxShadow: "0 0 0 4px rgba(10,159,82,.12)" }}/>
              Saved automatically · {savedLabel}
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
            <h3>Link sent to {emailVal}</h3>
            <p>The link works for 14 days. You can also log back in any time — your application will be waiting on the dashboard.</p>
            <div style={{ marginTop: 8 }}>
              <Button variant="primary" size="lg" onClick={onClose} full>Got it</Button>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
