// Onboarding flow — main App
const { useMemo: _useMemo, useCallback: _useCallback } = React;

// localStorage key for the persisted onboarding form state. Bump the suffix
// (`:v2`, `:v3`, …) whenever the shape changes; hydration will refuse to load
// anything from an older version and the user will start fresh.
const FORM_STORAGE_KEY = "altery:ob:formState:v2";

// Whitelist of fields that survive a reload. Sensitive material (password,
// 2FA code, card data) is deliberately absent — never persist those.
const INITIAL_FORM_STATE = {
  _v: 2,
  auth:     { firstName: "", lastName: "", email: "", phone: "", tosAccepted: false, marketingAccepted: false },
  contact:  { country: null },
  activity: { inboundChannels: [], outboundChannels: [] },
  uboDraft: { role: "director" },
  plan:     { selectedPlanId: null, billingCurrency: null },
  meta:     { token: null, startedAt: null, lastSavedAt: null },
};

function hydrateFormState(checkerParams) {
  try {
    const raw = window.localStorage.getItem(FORM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed._v === INITIAL_FORM_STATE._v) return parsed;
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

function useFormState(checkerParams) {
  const [formState, setFormState] = useState(() => hydrateFormState(checkerParams));
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
  return [formState, setFormState];
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

const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "stateVariant": "default",
  "submitState": "pending",
  "currency": "GBP",
  "selectedPlan": "pro"
}/*EDITMODE-END*/;

function useTweaks(defaults) {
  const [t, setT] = useState(defaults);
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "__edit_mode_load") {
        setT((prev) => ({ ...prev, ...e.data.values }));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  const set = (key, value) => {
    setT((prev) => {
      const next = typeof key === "object" ? { ...prev, ...key } : { ...prev, [key]: value };
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: typeof key === "object" ? key : { [key]: value } }, "*");
      return next;
    });
  };
  return [t, set];
}

function App() {
  const [step, setStep] = useState("prep");
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULS);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [celebration, setCelebration] = useState(null); // { message }
  const prevSectionRef = useRef(null);

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

  // Persistent form state — survives reload. Phase 1 covers country, activity
  // channels, current UBO role, and the URL-param handoff (plan/currency/email/
  // token). Other fields will move in here as we wire real inputs in Phase 2.
  const [formState, setFormState] = useFormState(checkerParams);

  const updateAuth = _useCallback(
    (patch) => setFormState((s) => ({ ...s, auth: { ...s.auth, ...patch } })),
    []
  );
  const setCountry = _useCallback(
    (code) => setFormState((s) => ({ ...s, contact: { ...s.contact, country: code } })),
    []
  );
  const setInboundChannels = _useCallback(
    (arr) => setFormState((s) => ({ ...s, activity: { ...s.activity, inboundChannels: arr } })),
    []
  );
  const setOutboundChannels = _useCallback(
    (arr) => setFormState((s) => ({ ...s, activity: { ...s.activity, outboundChannels: arr } })),
    []
  );
  const setUboRole = _useCallback(
    (role) => setFormState((s) => ({ ...s, uboDraft: { ...s.uboDraft, role } })),
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

  useEffect(() => {
    const handler = (e) => setStep(e.detail);
    window.addEventListener("ob-jump", handler);
    return () => window.removeEventListener("ob-jump", handler);
  }, []);

  // Detect when we cross a section boundary → trigger celebration toast
  useEffect(() => {
    const sec = getCurrentSection(step);
    const prev = prevSectionRef.current;
    if (prev && sec && prev.id !== sec.id) {
      // Find the index of the previous section to know which one was just completed
      const prevIdx = SECTIONS.findIndex((s) => s.id === prev.id);
      const newIdx = SECTIONS.findIndex((s) => s.id === sec.id);
      if (newIdx > prevIdx) {
        setCelebration({ message: `${prev.label} — done` });
      }
    }
    if (sec) prevSectionRef.current = sec;
  }, [step]);

  const idx = ALL_STEPS.indexOf(step);
  const next = () => setStep(ALL_STEPS[Math.min(ALL_STEPS.length - 1, idx + 1)]);
  const back = () => setStep(ALL_STEPS[Math.max(0, idx - 1)]);

  const renderStep = () => {
    const s = tweaks.stateVariant;
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
      case "business-info": return <ScreenBusinessInfo next={next} back={back} state={s}/>;
      case "activity":      return <ScreenActivity next={next} back={back} state={s}
                                      inboundChannels={formState.activity.inboundChannels}
                                      outboundChannels={formState.activity.outboundChannels}
                                      onChangeInbound={setInboundChannels}
                                      onChangeOutbound={setOutboundChannels}/>;
      case "documents":     return <ScreenDocuments next={next} back={back} state={s === "default" ? "complete" : s}/>;
      case "ubo-list":      return <ScreenUboList next={next} back={back} addPerson={() => setStep("ubo-form")}/>;
      case "ubo-form":      return <ScreenUboForm next={() => setStep("ubo-list")} back={() => setStep("ubo-list")} state={s}
                                      role={formState.uboDraft.role}
                                      onChangeRole={setUboRole}/>;
      case "review":        return <ScreenReview next={() => setStep("payment")} back={back} setStep={setStep}/>;
      case "payment":       return <ScreenActivation
                                      planId={checkerParams.plan}
                                      currency={checkerParams.currency}
                                      mode="presubmit"
                                      next={() => setStep("submit")}
                                      back={() => setStep("review")}
                                    />;
      case "submit":        return <ScreenSubmit state={tweaks.submitState} setStep={setStep}/>;
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
      {celebration && (
        <Celebrate message={celebration.message} onDone={() => setCelebration(null)} />
      )}
      {showSaveModal && (
        <ResumeModal
          email="anna@orbit.io"
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}

// ──────────────────── ResumeModal — "Save and continue later" ────────────────────
function ResumeModal({ email, onClose }) {
  const [emailVal, setEmailVal] = useState(email || "");
  const [sent, setSent] = useState(false);
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
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <Button variant="outline" size="lg" onClick={onClose} style={{ flex: 1 }}>Keep working</Button>
              <Button variant="primary" size="lg" onClick={() => setSent(true)} style={{ flex: 1 }}>Send link</Button>
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: "var(--c-muted)", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--c-success)", boxShadow: "0 0 0 4px rgba(10,159,82,.12)" }}/>
              Saved automatically · {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <Button variant="primary" size="lg" onClick={onClose} style={{ flex: 1 }}>Got it</Button>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
