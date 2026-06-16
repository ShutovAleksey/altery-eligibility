/* global React, useT, Button, Tag, Alert, SelectableListItem, Input, Select,
          Icon, Flag, Title, Field, WhyWeAsk,
          EC_COUNTRIES, EC_INDUSTRIES, EC_SERVICES,
          EC_CHIP_REGIONS, EC_CHIP_REGION_ORDER, EC_CHIP_REGION_FLAG,
          EC_VOLUME_BANDS, EC_TX_BANDS, EC_DISPLAY_REGIONS, EC_COUNTRY_TO_REGION, EC_REGION_ORDER,
          EC_FEE_SCHEDULE, EC_PLANS, EC_ENTITIES, TOTAL_STEPS,
          ecRecommend, ecOutcomesForSavings, ecVolumeHintKey,
          ecFormatVolume, ecCurrencyFlag, ecCurrencyName, ecEstimateTxCount,
          EcFeesModal, EcPlanComparisonModal, EcHandoffModal, EcCallbackForm */
// checker-screens.jsx — the eligibility-checker question screens, result
// screens, and the supporting EcIco decorative-icon set.
//
// Loaded as <script type="text/babel" src="/checker-screens.jsx"> in
// /index.html after /checker-atoms.jsx; defines and exports to window:
//
//   EcIco            — checker-specific decorative SVG icon map
//   EcIntro          — landing card
//   EcQuestionHeader — shared header above each question
//   EcCountry        — Q1 country/region picker
//   EcIndustry       — Q2 industry + business type
//   EcServices       — Q3 services
//   EcVolume         — Q4 monthly volume + tx count
//   EcCorridors      — Q5 payment corridors
//   EcResult         — dispatcher to EcResultApproved / EcResultBlocked
//   EcResultApproved — full approved-recommendation page
//   EcResultBlocked  — soft-decline result page
//
// All cross-module dependencies (DS components, data constants, helpers,
// modals) are resolved at render time through the standard scope chain
// (i.e. via the window exports those modules set).
//
// We DO NOT redeclare useState/useEffect/etc. here. The inline text/babel
// block in /index.html owns the top-level `const { useState, … } = React;`.
// Each script's top-level `let`/`const` lands in the same per-realm Global
// Lexical Declarations slot — redeclaring across files throws
// "Identifier 'useState' has already been declared" at appendChild.
// Function bodies in this file resolve `useState`, `useEffect`, etc. at
// render time via free-variable lookup into that single shared slot.

const EcIco = {
  arrowRight: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="M3.5 8h9m0 0L8.5 4m4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrowLeft: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="M12.5 8h-9m0 0 4-4m-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  globe: (p) => <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M3 12h18M12 3c2.5 3 4 6 4 9s-1.5 6-4 9c-2.5-3-4-6-4-9s1.5-6 4-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  bolt: (p) => <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  alert: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 4.5v4M8 10.7v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  // Information icon — same 16x16 grid as alert for visual parity.
  // Dot sits at the top (y≈5.2), vertical stroke below (y≈7→10.5),
  // mirroring the conventional "i" glyph. Used in the crypto-reroute
  // callout to signal "here's an explanation" rather than "warning".
  info: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5.2v.3M8 7v3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  // ─── Intro value-card + eyebrow icons ───────────────────
  // Outline-stroke 1.6 icons aligned with the rest of the EcIco family.
  //   • route / eye / ban — kept (used elsewhere in the checker).
  //   • sparkles — 4-point star plus two accent dots. Lives inline with
  //     the intro eyebrow ("Personalised plan · 90 seconds") to give a
  //     small but unmistakable "this is built just for you" cue before
  //     the user reads the title.
  //   • target — concentric rings with a solid centre dot. Communicates
  //     "calibrated to you / aimed at your situation" for Row 1 of the
  //     intro value list ("A plan tailored to your business"). Stronger
  //     than the previous "route" icon, which read more like wayfinding.
  //   • stack — three offset layers. Communicates "a kit of products
  //     stacked together" for Row 2 ("Every product we'd open for you")
  //     — fits the products-on-offer story better than the previous
  //     "bolt" icon, which read as speed/energy.
  route: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4"/><path d="M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5"/></svg>,
  eye: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/></svg>,
  ban: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M5.7 5.7l12.6 12.6"/></svg>,
  sparkles: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 4l1.8 5.4l5.4 1.8l-5.4 1.8l-1.8 5.4l-1.8 -5.4l-5.4 -1.8l5.4 -1.8z"/><circle cx="19" cy="5" r="1.2" fill="currentColor" stroke="none"/><circle cx="20" cy="18" r="0.9" fill="currentColor" stroke="none"/></svg>,
  target: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>,
  stack: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l9 5l-9 5l-9 -5z"/><path d="M3 12l9 5l9 -5"/><path d="M3 17l9 5l9 -5"/></svg>,
  search: (p) => <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6"/><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  copy: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M3.5 10.5V4.5A1.5 1.5 0 0 1 5 3h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  close: (p) => <svg viewBox="0 0 16 16" fill="none" {...p}><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  // ─── Q5 / crypto-routing icons ───────────────────────────
  // banknote — represents fiat-only operations. Outlined rect with a
  // centred coin-like circle, no currency glyph so it's currency-neutral.
  banknote: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="6" cy="12" r="0.9" fill="currentColor"/>
      <circle cx="18" cy="12" r="0.9" fill="currentColor"/>
    </svg>
  ),
  // token — circular coin with the Bitcoin sign (₿, Unicode U+20BF) inside.
  // The ₿ glyph is the universal shorthand for "crypto" across consumer
  // and B2B fintech UIs (Stripe, Revolut, N26, CashApp all use it the
  // same way), so even though Altery handles crypto broadly — not just
  // BTC — the symbol earns instant recognition that an abstract shape
  // can't. We draw it stroke-only with currentColor, deliberately NOT
  // adopting Bitcoin's brand orange (#F7931A) — the symbol is borrowed,
  // the brand is not. Pairs visually with the banknote icon: paper
  // currency vs digital coin, same line-icon weight, same neutral
  // colour story.
  token: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/>
      {/* Bitcoin sign — vertical stem, two D-bumps stacked,
          top/bottom strokes extending past the B that make it ₿ */}
      <path d="M9.7 7.5 V16.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M9.7 8 H12.6 A2 2 0 0 1 12.6 12 H9.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.7 12 H13 A2 2 0 0 1 13 16 H9.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.6 6 V7.5 M11.6 16.5 V18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  // reroute — flow goes right and bends down. Used in the result-page
  // callout when EU + crypto re-routes to UK. Reads as "this path got
  // redirected" without any negative connotation.
  reroute: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 7 H13 A4 4 0 0 1 17 11 V17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 14 L17 17 L20 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  // ─── Plan tier icons ─────────────────────────────────────
  // Chess pieces from Tabler Icons (MIT-licensed, tabler.io/icons) —
  // Starter = Pawn, Pro = Knight, Ultra = Rook. The progression of
  // chess pieces by rank maps to plan tiers; metaphor is operational
  // (climbing capability), not decorative.
  // Outline stroke-based style at 1.6px stroke — matches the rest of
  // the EcIco family (alert, search, copy, close, arrowLeft, etc.)
  // for visual consistency. Renders perfectly at any size because
  // path data was grid-aligned by Tabler's design system. Sits in an
  // accent-soft rounded square via the .ec-plan__icon container.
  pawn: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3a3 3 0 0 1 3 3c0 1.113 -.6 2.482 -1.5 3l1.5 7h-6l1.5 -7c-.9 -.518 -1.5 -1.887 -1.5 -3a3 3 0 0 1 3 -3"/>
      <path d="M8 9h8"/>
      <path d="M6.684 16.772a1 1 0 0 0 -.684 .949v1.279a1 1 0 0 0 1 1h10a1 1 0 0 0 1 -1v-1.28a1 1 0 0 0 -.684 -.948l-2.316 -.772h-6l-2.316 .772"/>
    </svg>
  ),
  knight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 16l-1.447 .724a1 1 0 0 0 -.553 .894v2.382h12v-2.382a1 1 0 0 0 -.553 -.894l-1.447 -.724h-8z"/>
      <path d="M9 3l1 3l-3.491 2.148a1 1 0 0 0 .524 1.852h2.967l-2.073 6h7.961l.112 -5c0 -3 -1.09 -5.983 -4 -7c-1.94 -.678 -2.94 -1.011 -3 -1z"/>
    </svg>
  ),
  rook: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 16l-1.447 .724a1 1 0 0 0 -.553 .894v2.382h12v-2.382a1 1 0 0 0 -.553 -.894l-1.447 -.724h-8"/>
      <path d="M8 16l1 -9h6l1 9"/>
      <path d="M6 4l.5 3h11l.5 -3"/>
      <path d="M10 4v3"/>
      <path d="M14 4v3"/>
    </svg>
  ),
};

// ════════════════════════════════════════════════════════════════════════
//  Screens
// ════════════════════════════════════════════════════════════════════════

// ── Sidebar (replaces the previous top header) ──────────────────
// Layout: a 240px fixed-width left column on desktop, dark-navy
// background, holds the brand, the section eyebrow, the 5 step
// indicators and the language switcher. On screens below 900px the
// sidebar collapses to a single-row top bar (CSS-driven) so mobile
// doesn't lose 30% of horizontal real estate to chrome.
//
// Step states:
//   - intro (step 0)            → all 5 dots in "todo" (preview of journey)
//   - question N (step 1..5)    → dots <N done, dot N current, others todo
//   - result (step 6)           → all 5 dots done
function EcSidebar({ step, totalSteps, blockedAt, maxStep, onStepClick }) {
  const t = useT();
  const onResult = step > totalSteps;
  // A blocked result means the user jumped straight from the gating
  // question — anything after that question was never asked. `blockedAt`
  // is only honoured when actually on the result screen; mid-flow
  // back-navigation after a block still highlights the current question
  // normally.
  const showBlocked = onResult && blockedAt;
  // Highest question index the user has reached this session. Stays put
  // when they navigate back via sidebar — so revisiting Q1 from Q5
  // doesn't downgrade Q2-Q5 to 'todo'.
  const reached = maxStep || 0;
  const stepLabels = [
    "ec.sidebar.step1", "ec.sidebar.step2", "ec.sidebar.step3",
    "ec.sidebar.step4", "ec.sidebar.step5",
  ];
  return (
    <aside className="ec-sidebar" aria-label="Eligibility checker navigation">
      <div className="ec-sidebar__top">
        <div className="ec-sidebar__logo">
          <svg width="71" height="24" viewBox="0 0 71 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Altery">
            <path d="M20.2378 0H17.5293V18.2069H20.2378V0Z" fill="#FFFFFF"/>
            <path d="M36.4338 12.8929C36.6753 14.9064 38.3425 16.2271 40.764 16.2271C42.1093 16.2271 43.8027 15.7163 44.6091 14.8027L46.4113 16.5502C44.8916 18.0381 42.8366 18.8516 40.7096 18.8071C36.3511 18.8071 33.5547 16.0402 33.5547 11.7944C33.5547 7.54872 36.3787 4.89038 40.5204 4.89038C44.6621 4.89038 47.7015 7.49581 47.1916 12.8971L36.4338 12.8936V12.8929ZM44.5293 10.5542C44.3683 8.45952 42.8345 7.35823 40.6023 7.35823C38.6201 7.23477 36.8568 8.60486 36.4874 10.5542H44.5293Z" fill="#FFFFFF"/>
            <path d="M29.4084 15.7785C28.287 15.782 27.7369 14.9618 27.7369 13.6756V7.66316H31.5212V5.34419H27.7631V1.50464H25.0514V5.34136H22.5703V7.65892H25.0514V13.6713C25.0514 16.6828 26.6339 18.2719 29.4106 18.2048H31.5233V15.7729L29.4091 15.7785H29.4084Z" fill="#FFFFFF"/>
            <path d="M11.4503 5.38683V6.5041C8.48915 4.04329 4.087 4.44156 1.61866 7.39369C-0.849682 10.3458 -0.450194 14.7345 2.51097 17.1954C5.09951 19.3467 8.86106 19.3467 11.4496 17.1954V18.2125H14.1442V5.38683H11.4496H11.4503ZM6.9817 16.3044C4.51406 16.3044 2.51309 14.3095 2.51309 11.8494C2.51309 9.38927 4.51406 7.3944 6.9817 7.3944C9.44933 7.3944 11.4503 9.38927 11.4503 11.8494C11.4503 14.3095 9.44933 16.3044 6.9817 16.3044Z" fill="#FFFFFF"/>
            <path d="M70.5706 5.1954L62.4684 23.9999H59.502L61.4874 19.4059C61.9172 18.4123 61.9299 17.2881 61.5227 16.2846L57.0283 5.19257H60.1535L62.3675 11.2594L63.647 14.9064L65.0282 11.3116L67.5796 5.19116L70.5706 5.1954Z" fill="#FFFFFF"/>
            <path d="M55.3485 5.17542H55.3175C53.8946 5.17542 52.6666 5.70841 52.0741 6.94993V5.11597H49.5801V18.2821H52.2556V10.9583C52.2057 9.26237 53.4822 7.82196 55.1634 7.67898H56.276V5.17896L55.3485 5.17613V5.17542Z" fill="#FFFFFF"/>
          </svg>
        </div>
        <div className="ec-sidebar__label">{t("ec.header.eyebrow")}</div>
      </div>

      <ol className="ec-sidebar__steps">
        {stepLabels.map((labelKey, i) => {
          const n = i + 1;
          // Blocked-result branch: mark only the gating question (and
          // anything before it) as done; subsequent steps stay 'todo'.
          // Outside the blocked case: done = (n <= maxStep AND n !==
          // current), current = (n === step), else todo.
          const state = showBlocked
                        ? (n <= blockedAt ? "done" : "todo")
                      : n === step              ? "current"
                      : n <= reached            ? "done"
                      :                           "todo";
          const statusKey = state === "current" ? "ec.sidebar.status.current"
                          : state === "done"    ? "ec.sidebar.status.done"
                          : null;
          // Done steps are clickable — user can jump back to edit any
          // answer they've already given. Current step is where they
          // already are; todo steps haven't been visited yet, so no
          // navigation affordance for either.
          const isClickable = state === "done" && typeof onStepClick === "function";
          const num = (
            <span className="ec-sidebar__step__num" aria-hidden="true">
              {state === "done" ? (
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                  <path d="M3.5 8.5 6.5 11.5 12.5 5.5" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : n}
            </span>
          );
          const body = (
            <span className="ec-sidebar__step__body">
              <span className="ec-sidebar__step__label">{t(labelKey)}</span>
              {statusKey && <span className="ec-sidebar__step__status">{t(statusKey)}</span>}
            </span>
          );
          return (
            <li key={n}
                className={`ec-sidebar__step is-${state}${isClickable ? " is-clickable" : ""}`}
                aria-current={state === "current" ? "step" : undefined}>
              {isClickable ? (
                <button type="button"
                        className="ec-sidebar__step__btn"
                        onClick={() => onStepClick(n)}
                        aria-label={t("ec.sidebar.editStep", { label: t(labelKey) })}>
                  {num}{body}
                </button>
              ) : (
                <>{num}{body}</>
              )}
            </li>
          );
        })}
      </ol>

      <div className="ec-sidebar__lang">
        <LangSwitcher onDark={true} anchorRight={false} dropUp={true} />
      </div>

      {/* Decorative currency stack — visually anchors the "GBP, EUR
          and USD accounts from day one" claim from intro value-row 2.
          Position: absolute bottom-right on desktop; hidden on mobile
          where the sidebar collapses to a 56px top-pill that can't
          host an illustration. aria-hidden + alt="" because purely
          decorative — screen readers should ignore. */}
      <img
        className="ec-sidebar__deco"
        src="/images/sidebar-currencies.png"
        alt=""
        aria-hidden="true"
      />
    </aside>
  );
}

function EcApp() {
  const t = useT();
  const [step, setStep] = useState(0);
  // Highest step ever reached this session. Used by EcSidebar so that
  // back-navigation (whether via the back-arrow or via a sidebar click)
  // doesn't visually downgrade later steps to 'todo' — the user's
  // answers persist, so the sidebar should reflect that.
  const [maxStep, setMaxStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  // First-touch UTM capture — runs once on mount. The helper is a
  // no-op if there's nothing in the URL AND nothing in sessionStorage,
  // so it's safe to call unconditionally. Once stored, every downstream
  // handoff (PDF/email link, /setup redirect) embeds these in the
  // payload. Stored value is read again at email/handoff time so we
  // don't need to thread it through component state.
  useEffect(() => { ecCaptureAndStoreUtms(); }, []);

  // Scroll to the top of the page on every step transition. Without
  // this, a user who scrolled mid-question (e.g. inspected the
  // services list on Q3, scrolled, then hit Continue) lands at the
  // same vertical offset on the next question — and has to manually
  // scroll up to read its header. Same applies to the result screen
  // and to back-navigation via the sidebar. Use 'auto' (instant) not
  // 'smooth' — a smooth animation between two question screens reads
  // as a glitch, and on mobile with an open keyboard it stutters.
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  // Deep-link entry: the PDF/email "request a callback" button links to
  // /?contact=1 with the visitor's email + checker context as params. When
  // present we skip the quiz entirely and render the standalone callback
  // form (prefilled) — a confirmation step, so an email client prefetching
  // the link can't create a lead; only submitting the form writes it.
  const contactEntry = useMemo(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get("contact") !== "1") return null;
      return {
        email: p.get("email") || "",
        context: {
          checker_entity:                 p.get("entity")  || undefined,
          checker_plan:                   p.get("plan")    || undefined,
          checker_monthly_volume_gbp:     p.get("volume")  || undefined,
          checker_est_annual_savings_gbp: p.get("savings") || undefined,
        },
      };
    } catch (e) { return null; }
  }, []);

  const [country, setCountry] = useState(null);
  // Flat ICP-aligned industry list — see EC_INDUSTRIES. Business type
  // dropped on purpose: KYB captures legal form during onboarding where
  // it actually matters, asking it on a pre-onboarding eligibility
  // check was friction without conversion signal value.
  const [industry, setIndustry] = useState("");
  // services: multi-select of products/use-cases the user wants.
  // Drives plan tier hint (Pro for mass / api, Ultra for multiCompany,
  // specialist review for crypto rails) and result page perk emphasis
  // ordering. Starts empty — the user explicitly ticks what
  // applies. Pre-selecting "accounts"/"crossBorder" looked smart on
  // paper but biases the recommendation before any input, and leaves
  // a confusing "why are these already checked?" signal for fresh
  // visitors who haven't read the question yet.
  const [services, setServices] = useState(new Set());
  // Q4 captures volume + tx count separately for incoming and outgoing —
  // gives a more accurate picture of total throughput than a single
  // combined slider. Recommendation engine reads the sum.
  const [volumeInIdx,  setVolumeInIdx]  = useState(1); // €50k – €200k default
  const [volumeOutIdx, setVolumeOutIdx] = useState(1);
  const [txInIdx,      setTxInIdx]      = useState(1); // 20 – 100 default
  const [txOutIdx,     setTxOutIdx]     = useState(1);
  // Q5 — two parallel sets: regions where money comes in from, and
  // regions it flows out to. Recommendation engine reads both and
  // computes breadth from the union.
  const [corridorsIn,  setCorridorsIn]  = useState(new Set());
  const [corridorsOut, setCorridorsOut] = useState(new Set());
  const totalSteps = TOTAL_STEPS;
  const monthlyVolume = (EC_VOLUME_BANDS[volumeInIdx]?.value || 0) + (EC_VOLUME_BANDS[volumeOutIdx]?.value || 0);
  const monthlyTx     = (EC_TX_BANDS[txInIdx]?.value || 0) + (EC_TX_BANDS[txOutIdx]?.value || 0);
  const recommendation = useMemo(() =>
    ecRecommend({ countryCode: country, industry, monthlyVolume, corridorsIn: [...corridorsIn], corridorsOut: [...corridorsOut], monthlyTx, services: [...services], volumeInIdx, volumeOutIdx, txInIdx, txOutIdx }),
  [country, industry, monthlyVolume, corridorsIn, corridorsOut, monthlyTx, services, volumeInIdx, volumeOutIdx, txInIdx, txOutIdx]);

  // Step navigation. Steps:
  //   0 intro · 1 country · 2 industry · 3 services · 4 volume · 5 corridors · 6 result
  // Country leads because regulatory entity routing is the single
  // strongest predictor of the rest of the experience; asking it first
  // also lets the user feel "this is for them" before any commitment.
  const back  = () => {
    setDirection("back");
    // From a blocked result, back jumps to whichever question caused
    // the block (country=1 / industry=2). The user never visited the
    // remaining questions because of the short-circuit, so stepping
    // back through ghost screens would be disorienting.
    if (step === 6 && recommendation.kind === "blocked") {
      setStep(recommendation.reason === "country" ? 1 : 2);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };
  const next  = () => {
    setDirection("forward");
    setStep((s) => {
      const ns = Math.min(totalSteps + 1, s + 1);
      setMaxStep((m) => Math.max(m, ns));
      return ns;
    });
  };
  // Sidebar deep-link: clickable done-step jumps directly to that
  // question. Direction-aware animation but doesn't reset maxStep —
  // the user's later answers are still in state, so the sidebar
  // continues showing those steps as done.
  const goToStep = (n) => {
    setDirection(n < step ? "back" : "forward");
    setStep(n);
  };
  const reset = () => { setDirection("back");    setStep(0); setMaxStep(0); };
  // Short-circuit handler used by EcIndustry when the picked industry
  // is one we can't onboard (gambling/adult/weapons/lending). Jumps
  // straight to step 6 (result); ecRecommend returns kind:"blocked"
  // regardless of the unanswered later questions, so EcResultBlocked
  // renders cleanly with just the industry context.
  // Short-circuit to the result screen from a gating question
  // (blocked country on Q1, blocked industry on Q2). We do NOT
  // advance `maxStep` here — the user has not actually answered the
  // intervening questions, and bumping maxStep to 6 would make the
  // sidebar mark Q2-Q5 as "done" when the user navigates back from
  // the blocked result. On the result screen itself, the sidebar
  // uses the `blockedAt` branch (not maxStep) so the visual still
  // shows the gating question's badge correctly.
  const jumpToResult = () => { setDirection("forward"); setStep(6); };

  // Which question caused a soft-decline, if any. Used by EcSidebar to
  // avoid marking all 5 steps as done when the user actually only
  // completed up to question N before being short-circuited.
  const blockedAt = recommendation.kind === "blocked"
    ? (recommendation.reason === "country" ? 1 : 2)
    : null;

  if (contactEntry) {
    return (
      <div className="ec-app ec-app--contact">
        <main className="ec-main">
          <div className="ec-content fade-in ec-callback-standalone">
            <Title display title={t("ec.callback.title")} lead={t("ec.callback.standaloneLead")} />
            <EcCallbackForm email={contactEntry.email} context={contactEntry.context} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="ec-app">
      <EcSidebar step={step} totalSteps={totalSteps} blockedAt={blockedAt} maxStep={maxStep} onStepClick={goToStep} />
      <main className="ec-main" data-direction={direction}>
        {step === 0 && <EcIntro onStart={next} />}
        {step === 1 && <EcCountry value={country} onChange={setCountry} onBack={() => { setDirection("back"); setStep(0); }} onNext={next} onBlocked={jumpToResult} />}
        {step === 2 && <EcIndustry country={country} industry={industry} setIndustry={setIndustry} onBack={back} onNext={next} onBlocked={jumpToResult} />}
        {step === 3 && <EcServices country={country} services={services} setServices={setServices} onBack={back} onNext={next} />}
        {step === 4 && <EcVolume
          volumeInIdx={volumeInIdx} setVolumeInIdx={setVolumeInIdx}
          volumeOutIdx={volumeOutIdx} setVolumeOutIdx={setVolumeOutIdx}
          txInIdx={txInIdx} setTxInIdx={setTxInIdx}
          txOutIdx={txOutIdx} setTxOutIdx={setTxOutIdx}
          onBack={back} onNext={next} />}
        {step === 5 && <EcCorridors
          corridorsIn={corridorsIn} setCorridorsIn={setCorridorsIn}
          corridorsOut={corridorsOut} setCorridorsOut={setCorridorsOut}
          onBack={back} onNext={next} />}
        {step === 6 && <EcResult rec={recommendation} onBack={back} onReset={reset} />}
      </main>
    </div>
  );
}

function EcIntro({ onStart }) {
  const t = useT();
  return (
    <div className="ec-content fade-in">
      {/* Eyebrow with an inline sparkle icon — visual "this is built
          specifically for you" cue before the user reads the title.
          Title accepts JSX as `eyebrow`, so we compose a span here
          instead of inserting markup into the i18n string. */}
      <Title display
        eyebrow={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <EcIco.sparkles style={{ width: 14, height: 14 }} aria-hidden="true" />
            {t("ec.intro.eyebrow")}
          </span>
        }
        title={t("ec.intro.title")}
        lead={t("ec.intro.lead", { total: TOTAL_STEPS })} />

      <div className="ec-value">
        {/* Sales-led ordering — three claims, narrowing from setup to
            wallet: (1) we tailor a plan to you, (2) here is what we
            would open and which products you'd get, (3) here is the
            monthly cost. Illustrations are decorative; alt left empty
            so screen readers don't double-read the bullet titles. */}
        <div className="ec-value__row">
          <img className="ec-value__art" src="images/intro/value-tailored.png" alt="" width="56" height="56" />
          <div>
            <div className="ec-value__title">{t("ec.intro.value1.title")}</div>
            <div className="ec-value__body">{t("ec.intro.value1.body")}</div>
          </div>
        </div>
        <div className="ec-value__row">
          <img className="ec-value__art" src="images/intro/value-features.png" alt="" width="56" height="56" />
          <div>
            <div className="ec-value__title">{t("ec.intro.value2.title")}</div>
            <div className="ec-value__body">{t("ec.intro.value2.body")}</div>
          </div>
        </div>
        <div className="ec-value__row">
          <img className="ec-value__art" src="images/intro/value-clarity.png" alt="" width="56" height="56" />
          <div>
            <div className="ec-value__title">{t("ec.intro.value3.title")}</div>
            <div className="ec-value__body">{t("ec.intro.value3.body")}</div>
          </div>
        </div>
      </div>

      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={onStart} iconRight="arrowRight">
          {t("ec.intro.cta")}
        </Button>
      </div>

      {/* Quiet trust footnote — three commitments (no signup / no credit
          check / licensed EMI). Sits directly under the CTA as closing
          reassurance. The product-showcase carousel that used to live
          between CTA and trust was removed: value-row 2 already covers
          products in text ('GBP/EUR/USD accounts, FX corridors, mass
          payouts, cards, crypto'), and post-CTA content slows the
          conversion path without adding signal beyond what's already
          above. */}
      <div className="ec-intro__trust">{t("ec.intro.trust")}</div>
      {/* Indicative-result caveat — same line shown on the result page;
          surfaced up front so the user knows the outcome is subject to
          onboarding/compliance review before they invest the 90 seconds. */}
      <p className="ec-intro__disclaimer">{t("ec.r.disclaimer")}</p>
    </div>
  );
}

function EcQuestionHeader({ num, title, lead, doodle }) {
  const t = useT();
  return (
    <>
      {/* Optional brand doodle introducing the step — Altery Design
          System onboarding pattern (block above the eyebrow / title).
          Caller passes the doodle file basename without extension;
          we resolve to /images/doodles/<name>.svg. */}
      {doodle && (
        <span className="ec-doodle ec-doodle--block">
          <img src={`/images/doodles/${doodle}.svg`} alt="" aria-hidden="true" />
        </span>
      )}
      <div className="ec-eyebrow">
        <span className="ec-eyebrow__num">{num}</span>
        {t("ec.q.eyebrow", { n: num, total: TOTAL_STEPS })}
      </div>
      <Title title={title} lead={lead} />
    </>
  );
}

// Q1 country picker. Renders exactly like the DS <Select> used in
// EcIndustry (button trigger + chevron-down caret + drop-down listbox
// with accent-soft selection state + check icon on the right) plus two
// additions on top: a search input at the top of the menu, and a Flag
// in every row. Same tokens, same hover, same keyboard model — the
// only thing this component does on its own is filter the option list
// against `query`. Auto-advance stays in EcCountry's handleSelect.
function EcCountrySelect({ value, onChange, options, nameOf, label, placeholder }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((c) => c.code === value);

  const filtered = useMemo(() => {
    const ql = query.trim().toLowerCase();
    if (!ql) return options;
    return options.filter((c) =>
      nameOf(c).toLowerCase().includes(ql) ||
      c.name.toLowerCase().includes(ql) ||
      c.code.toLowerCase().includes(ql),
    );
  }, [options, query, nameOf]);

  // Outside pointer or Escape closes. Touchstart added so iOS Safari
  // taps on whitespace outside the dropdown reliably close it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Reset transient state on close.
  useEffect(() => { if (!open) { setQuery(""); setActiveIdx(0); } }, [open]);

  // Focus the search field on open so typing-to-filter just works.
  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);

  // When `query` shrinks the filtered list past the previous activeIdx
  // we'd otherwise highlight nothing; clamp back to a valid row.
  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIdx]);

  // Keep keyboard-active option scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    if (node) node.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  const handlePick = (code) => { onChange(code); setOpen(false); };

  const onTriggerKey = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  };
  const onSearchKey = (e) => {
    if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(filtered.length - 1, i + 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === "Home")      { e.preventDefault(); setActiveIdx(0); }
    else if (e.key === "End")       { e.preventDefault(); setActiveIdx(Math.max(0, filtered.length - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[activeIdx];
      if (c) handlePick(c.code);
    }
  };

  // Trigger border colour mirrors DS Select exactly:
  //   open    → accent
  //   hover   → muted-2
  //   default → border
  const triggerBorder = open ? "var(--c-accent)" : hover ? "var(--c-muted-2)" : "var(--c-border)";

  return (
    <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", gap: "var(--s-1)", position: "relative" }}>
      {label && (
        <label htmlFor="ec-country-trigger"
          style={{ fontSize: 13, fontWeight: "var(--fw-medium)", color: "var(--c-ink-2)" }}>
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id="ec-country-trigger"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? "ec-country-menu" : undefined}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 44, padding: "0 14px", borderRadius: "var(--r-md)",
          border: `1px solid ${triggerBorder}`,
          background: "var(--c-surface)",
          cursor: "pointer", width: "100%",
          color: "var(--c-ink)",
          boxShadow: open ? "var(--sh-focus)" : "none",
          transition: "all var(--motion-fast)", textAlign: "left",
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "var(--s-2)",
          color: selected ? "var(--c-ink)" : "var(--c-muted)",
          fontSize: "var(--fs-body)", minWidth: 0,
        }}>
          {selected
            ? <Flag code={selected.code} size={20} />
            : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flex: "0 0 auto" }}>
                <path d="M10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z" fill="white"/>
                <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM16 13H11L10 11H7.5V16H6V5H12L13 7H16V13Z" fill="#B7BDC6"/>
              </svg>
            )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected ? nameOf(selected) : (placeholder || t("ec.q2.input.placeholder"))}
          </span>
        </span>
        <Icon name="chevronDown" size={16} color="var(--c-muted)"
          style={{ transition: "transform var(--motion-base)", transform: open ? "rotate(180deg)" : "none" }}
          aria-hidden="true" />
      </button>

      {open && (
        <div
          id="ec-country-menu"
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 40,
            background: "var(--c-surface)", borderRadius: "var(--r-md)",
            border: "1px solid var(--c-border-soft)",
            boxShadow: "var(--sh-3)", padding: 4,
            display: "flex", flexDirection: "column",
            maxHeight: 360, overflow: "hidden",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px",
            borderBottom: "1px solid var(--c-border-soft)",
            marginBottom: 4,
          }}>
            <EcIco.search style={{ width: 16, height: 16, color: "var(--c-muted)", flex: "0 0 auto" }} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
              onKeyDown={onSearchKey}
              placeholder={t("ec.q2.input.placeholder")}
              autoComplete="off"
              spellCheck="false"
              aria-controls="ec-country-listbox"
              // .input-bare opts out of the global input:focus-visible
              // ring (--sh-focus). The search field sits inside the menu
              // panel that already has its own border/shadow, so a 3px
              // blue glow on top looked stacked and noisy.
              className="input-bare"
              // fontSize: 16 — iOS Safari auto-zooms on any focused input
              // whose computed font-size is < 16px. The page's body size
              // is 14px (--fs-body), which would trigger zoom-in on tap
              // and clip half the panel out of view. 16px on the search
              // field is the safest universally-supported guard; the
              // visual delta vs surrounding 14-15px text is invisible.
              style={{
                flex: 1, minWidth: 0,
                background: "transparent", font: "inherit", color: "var(--c-ink)",
                fontSize: 16,
              }}
            />
          </div>
          <ul
            ref={listRef}
            id="ec-country-listbox"
            role="listbox"
            style={{ margin: 0, padding: 0, listStyle: "none", overflowY: "auto", flex: 1 }}
          >
            {filtered.length === 0 ? (
              <li style={{ padding: "14px 12px", fontSize: 13, color: "var(--c-muted)", textAlign: "center" }}>
                {t("ec.q2.empty.title")}
              </li>
            ) : (
              filtered.map((c, i) => {
                const on = value === c.code;
                const active = i === activeIdx;
                return (
                  <li
                    key={c.code}
                    data-idx={i}
                    role="option"
                    aria-selected={on}
                    onMouseEnter={() => setActiveIdx(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePick(c.code)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "10px 12px",
                      background: on ? "var(--c-accent-soft)" : active ? "var(--c-surface-hover)" : "transparent",
                      color: "var(--c-ink)", fontSize: "var(--fs-body)",
                      borderRadius: "var(--r-sm)", cursor: "pointer",
                    }}
                  >
                    <Flag code={c.code} size={20} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {nameOf(c)}
                    </span>
                    {on && <Icon name="check" size={14} color="var(--c-accent)" aria-hidden="true" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function EcCountry({ value, onChange, onBack, onNext, onBlocked }) {
  const t = useT();
  // t() falls back to the raw ISO code when no `ec.country.XX` key
  // exists in either the current language or the EN dict. For new
  // ISO 3166-1 entries that we haven't localized yet, surface the
  // canonical English name from EC_COUNTRIES instead of the bare code
  // so the picker reads "Afghanistan" rather than "AF".
  const nameOf = (c) => {
    const localized = t("ec.country." + c.code);
    return localized === c.code ? c.name : localized;
  };
  const collator = useMemo(() => new Intl.Collator(undefined, { sensitivity: "base" }), []);
  // Sort once per language switch — the combobox keeps countries in a
  // single A→Z list (region grouping is gone), so the Collator handles
  // diacritics correctly for whatever locale the user has active.
  const options = useMemo(
    () => EC_COUNTRIES.slice().sort((a, b) => collator.compare(nameOf(a), nameOf(b))),
    [collator, t], // t identity changes per language → re-sort
  );

  // Picked country object — drives Continue button's routing decision
  // (blocked jurisdictions short-circuit to EcResultBlocked, the same
  // path EcIndustry uses for blocked industries).
  const picked = EC_COUNTRIES.find((x) => x.code === value);
  const isBlocked = picked?.risk === "blocked";

  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.back")}
      </button>
      <EcQuestionHeader num="1" title={t("ec.q2.title")} lead={t("ec.q2.lead")} />

      <EcCountrySelect
        label={t("ec.q2.input.label")}
        value={value}
        onChange={onChange}
        options={options}
        nameOf={nameOf}
      />

      {/* Inline soft-decline — fires the instant a non-serviceable country
          is picked, so the user learns why before acting. The primary
          button below switches from "Continue" to a decline CTA. */}
      {isBlocked && (
        <Alert tone="danger" title={t("ec.q2.alert.blocked.title")}>
          {t("ec.q2.alert.blocked.body", { country: nameOf(picked) })}
        </Alert>
      )}

      <WhyWeAsk>{t("ec.q2.why")}</WhyWeAsk>

      <div className="ob-actions">
        <Button
          variant="primary"
          size="xl"
          onClick={isBlocked ? onBlocked : onNext}
          iconRight={isBlocked ? undefined : "arrowRight"}
          disabled={!value}
        >
          {isBlocked ? t("ec.blocked.cta") : t("common.continue")}
        </Button>
      </div>
    </div>
  );
}

function EcIndustry({ country, industry, setIndustry, onBack, onNext, onBlocked }) {
  const t = useT();
  const ind = EC_INDUSTRIES.find((i) => i.value === industry);
  // Crypto is jurisdiction-gated (see crypto-jurisdictions): no-crypto markets
  // (UK/US/JP/NL) get a soft warning but can continue; EEA-except-NL is served
  // quietly (no banner); MENA + the rest of RoW get the open welcome.
  const cc = EC_COUNTRIES.find((x) => x.code === country);
  const cryptoNoGo   = !!(ind?.crypto && cc?.noCrypto);
  const cryptoOpenCC = !!(ind?.crypto && cc && !cc.noCrypto && cc.region !== "eu");
  // UAE incorporations frequently arrive worried that free-zone (DMCC,
  // ADGM, JAFZA…) vs onshore status will be a blocker. It isn't — DIFC-
  // licensed Altery MENA serves both. Banner only fires once the user
  // is committed to UAE (Q1) so it doesn't surface for unrelated picks.
  const showFreezone = country === "AE";
  // If the user picks a blocked industry, Continue still works (lands
  // on EcResultBlocked) but the inline danger Alert appears the moment
  // they pick, so they don't have to press Continue to learn.
  const isBlocked = ind?.risk === "blocked";

  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.back")}
      </button>
      <EcQuestionHeader num="2" title={t("ec.q1.title")} lead={t("ec.q1.lead")} />

      <Select
        label={t("ec.q1.field.industry")}
        value={industry}
        onChange={setIndustry}
        placeholder={t("ec.q1.field.industryPh")}
        options={EC_INDUSTRIES.map((i) => ({ value: i.value, label: t(i.labelKey) }))}
      />

      {/* Inline soft-decline — fires the instant a blocked industry is
          picked, so the user gets the answer before pressing Continue. */}
      {isBlocked && (
        <Alert tone="warning" title={t("ec.q1.alert.blocked.title")}>
          {t("ec.q1.alert.blocked.body", { industry: t(ind.labelKey).toLowerCase() })}
        </Alert>
      )}

      {/* Crypto industry — jurisdiction-aware. No-crypto markets (UK/US/JP/NL)
          get a soft warning but can still continue; open markets (MENA + RoW)
          get the welcome; EEA-except-NL is served quietly, so no banner. */}
      {!isBlocked && cryptoNoGo && (
        <Alert tone="warning" title={t("ec.crypto.blocked.title")}>
          {t("ec.crypto.blocked.body")}
        </Alert>
      )}
      {!isBlocked && cryptoOpenCC && (
        <Alert tone="info" title={t("ec.q1.alert.crypto.title")}>
          {t("ec.q1.alert.crypto.body")}
        </Alert>
      )}

      {/* Industry-specific reassurance — same tone as the crypto alert.
          Triggers via `reassureKey` on the industry definition. */}
      {!isBlocked && !ind?.crypto && ind?.reassureKey && (
        <Alert tone="info" title={t(ind.reassureKey + ".title")}>
          {t(ind.reassureKey + ".body", { category: t(ind.labelKey).toLowerCase() })}
        </Alert>
      )}

      {/* UAE free-zone reassurance — country-conditional, AND only
          when no industry banner is already showing. Two stacked
          info-tone banners read as over-reassurance / wall-of-text;
          the industry banner is more specific to what the user just
          picked, so it takes priority. Freezone still fires alone
          for UAE users on segments that don't have an industry-
          specific banner (e-commerce, professional services, other). */}
      {showFreezone && !isBlocked && !ind?.crypto && !ind?.reassureKey && (
        <Alert tone="info" title={t("ec.q1.alert.freezone.title")}>
          {t("ec.q1.alert.freezone.body")}
        </Alert>
      )}

      <WhyWeAsk>{t("ec.q1.why")}</WhyWeAsk>

      <div className="ob-actions">
        <Button
          variant="primary"
          size="xl"
          onClick={isBlocked ? onBlocked : onNext}
          iconRight={isBlocked ? undefined : "arrowRight"}
          disabled={!industry}
        >
          {isBlocked ? t("ec.blocked.cta") : t("common.continue")}
        </Button>
      </div>
    </div>
  );
}

// ── Q3 / services multi-select ─────────────────────────────────────
// "Which Altery services do you want to use?" — the second-strongest
// signal after industry for plan-tier recommendation. Selecting Mass
// payouts or Cards pushes the user toward Pro; selecting API access
// pushes toward Ultra; selecting crypto ramps triggers the
// specialist-review path. Defaults pre-tick accounts + crossBorder
// (universal needs for any digital business considering Altery), so
// the user only ticks the specialist extras they actually need.
//
// UX pattern matches the reference screenshot: large clickable rows
// with title + body, custom checkbox left-anchored. Whole row is
// clickable, keyboard-navigable, ARIA-tagged as role="checkbox".
function EcServices({ country, services, setServices, onBack, onNext }) {
  const t = useT();
  const toggle = (value) => {
    setServices((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };
  const count = services.size;
  // Crypto rail is jurisdiction-gated — not offered in UK/US/JP/NL (see
  // crypto-jurisdictions). Warn when ticked there; the user can still continue.
  const cc = EC_COUNTRIES.find((x) => x.code === country);
  const cryptoNoGo = services.has("crypto") && cc?.noCrypto;
  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.back")}
      </button>
      <EcQuestionHeader num="3" title={t("ec.q3.title")} lead={t("ec.q3.lead")} />

      <div className="ec-services" role="group" aria-label={t("ec.q3.title")}>
        {EC_SERVICES.map((s) => {
          const on = services.has(s.value);
          return (
            <div
              key={s.value}
              className={"ec-service" + (on ? " is-on" : "")}
              onClick={() => { if (!s.soon) toggle(s.value); }}
              role="checkbox"
              aria-checked={s.soon ? undefined : on}
              aria-disabled={s.soon || undefined}
              tabIndex={s.soon ? -1 : 0}
              style={s.soon ? { opacity: 0.62, cursor: "default" } : undefined}
              onKeyDown={(e) => {
                if (!s.soon && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  toggle(s.value);
                }
              }}
            >
              <span className="ec-service__check" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <div className="ec-service__text">
                <div className="ec-service__title">
                  {t(s.titleKey)}
                  {s.soon && (
                    <span style={{ marginLeft: 8, verticalAlign: "middle" }}>
                      <Tag tone="blue" size="sm">{t("ec.svc.soon")}</Tag>
                    </span>
                  )}
                </div>
                <div className="ec-service__body">{t(s.bodyKey)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {cryptoNoGo && (
        <Alert tone="warning" title={t("ec.crypto.blocked.title")}>
          {t("ec.crypto.blocked.body")}
        </Alert>
      )}

      <WhyWeAsk>{t("ec.q3.why")}</WhyWeAsk>

      <div className="ec-actions ec-actions--end">
        <Button variant="primary" size="xl" onClick={onNext} iconRight="arrowRight"
                disabled={count === 0}>
          {t("common.continue")}
        </Button>
      </div>
      {/* Crypto-asset legal disclosure — Altery itself does not provide
          crypto-asset services; the crypto Q3 option routes to Synterra
          Innovations Ltd (FINTRAC-registered). Reuses the .ec-intro__disclaimer
          style so it reads as the same kind of fine print as the regulatory
          line on the intro screen. */}
      <p className="ec-intro__disclaimer">{t("ec.q3.cryptoDisclosure")}</p>
    </div>
  );
}

// Volume slider — discrete band picker rendered as a continuous-feeling
// range input. Reused twice in EcVolume (incoming + outgoing). Keeping
// it slider-only here because volumes have an intuitive linear-ish
// monotonic mental model ("low → high"), while tx counts are picked
// from a small finite set that reads better in a Select.
function EcVolumeSlider({ idx, setIdx, labelKey, id }) {
  const t = useT();
  const band = EC_VOLUME_BANDS[idx];
  const maxIdx = EC_VOLUME_BANDS.length - 1;
  return (
    <div className="ec-slider">
      <div className="ec-slider__head">
        <span className="ec-slider__label" id={id}>{t(labelKey)}</span>
        <span className="ec-slider__value" aria-live="polite">{t(band.labelKey)}</span>
      </div>
      <div className="ec-slider__track">
        <span className="ec-slider__rail" aria-hidden="true" />
        <span className="ec-slider__fill" aria-hidden="true"
              style={{ width: `${(idx / maxIdx) * 100}%` }} />
        <input
          className="ec-slider__input"
          type="range"
          min="0" max={maxIdx} step="1"
          value={idx}
          onChange={(e) => setIdx(parseInt(e.target.value, 10))}
          aria-labelledby={id}
          aria-valuetext={t(band.labelKey)}
        />
      </div>
      <div className="ec-slider__ticks" aria-hidden="true">
        <span>£0</span><span>£200k</span><span>£1M</span><span>£5M+</span>
      </div>
    </div>
  );
}

function EcVolume({ volumeInIdx, setVolumeInIdx, volumeOutIdx, setVolumeOutIdx, txInIdx, setTxInIdx, txOutIdx, setTxOutIdx, onBack, onNext }) {
  const t = useT();
  const txOptions = EC_TX_BANDS.map((b) => ({ value: b.idx, label: t(b.labelKey) }));
  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.back")}
      </button>
      <EcQuestionHeader num="4" title={t("ec.q4.title")} lead={t("ec.q4.lead")} />

      <div className="ec-flow-section">
        <h3 className="ec-flow-section__head">{t("ec.q4.section.in")}</h3>
        <EcVolumeSlider idx={volumeInIdx} setIdx={setVolumeInIdx}
          labelKey="ec.q4.vol.in.label" id="ec-q4-vol-in" />
        <Select
          label={t("ec.q4.tx.in.label")}
          value={txInIdx}
          onChange={(v) => setTxInIdx(v)}
          options={txOptions}
        />
      </div>

      <div className="ec-flow-section">
        <h3 className="ec-flow-section__head">{t("ec.q4.section.out")}</h3>
        <EcVolumeSlider idx={volumeOutIdx} setIdx={setVolumeOutIdx}
          labelKey="ec.q4.vol.out.label" id="ec-q4-vol-out" />
        <Select
          label={t("ec.q4.tx.out.label")}
          value={txOutIdx}
          onChange={(v) => setTxOutIdx(v)}
          options={txOptions}
        />
      </div>

      <WhyWeAsk>{t("ec.q4.why")}</WhyWeAsk>

      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={onNext} iconRight="arrowRight">
          {t("common.continue")}
        </Button>
      </div>
    </div>
  );
}

// Country-level multi-select used twice on Q5 (incoming / outgoing).
// Trigger reads as a Select; opening reveals a search input + countries
// grouped by the 4-region display taxonomy. Selected countries surface
// as removable pills under the trigger.
function EcCountryMultiSelect({ value, onChange, label, placeholder }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  const nameOf = (code) => {
    const c = EC_COUNTRIES.find((x) => x.code === code);
    if (!c) return code;
    const localized = t("ec.country." + code);
    return localized === code ? c.name : localized;
  };

  const collator = useMemo(() => new Intl.Collator(undefined, { sensitivity: "base" }), []);

  // Grouped, filtered, alpha-sorted-per-language list. Sanctioned
  // jurisdictions (risk:"blocked") are filtered OUT — on Q5 corridors
  // it's a trap UX to show countries we can't service; the user either
  // picks one and gets booted, or skips it and proceeds, with KYB and
  // TM catching real exposure either way. Q1 incorporation picker is
  // intentionally NOT filtered — that's where a sanctioned-HQ user
  // self-identifies and gets the fast-no.
  const grouped = useMemo(() => {
    const ql = query.trim().toLowerCase();
    const out = [];
    for (const region of EC_REGION_ORDER) {
      const codes = EC_DISPLAY_REGIONS[region]
        .filter((code) => {
          const c = EC_COUNTRIES.find((x) => x.code === code);
          if (!c) return false;
          if (c.risk === "blocked") return false;
          if (!ql) return true;
          return nameOf(code).toLowerCase().includes(ql)
              || c.name.toLowerCase().includes(ql)
              || code.toLowerCase().includes(ql);
        })
        .sort((a, b) => collator.compare(nameOf(a), nameOf(b)));
      if (codes.length) out.push({ region, codes });
    }
    return out;
  }, [query, t, collator]);

  // Close on outside pointer or Escape. We listen on both mousedown and
  // touchstart so iOS Safari behaves consistently — without touchstart
  // the menu sometimes stayed open after a tap on whitespace outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === "Escape") { setOpen(false); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);
  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const toggle = (code) => {
    const next = new Set(value);
    next.has(code) ? next.delete(code) : next.add(code);
    onChange(next);
  };
  const removeOne = (code) => {
    const next = new Set(value);
    next.delete(code);
    onChange(next);
  };

  const count = value.size;

  return (
    <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", gap: "var(--s-1)", position: "relative" }}>
      {label && <label style={{ fontSize: 13, fontWeight: "var(--fw-medium)", color: "var(--c-ink-2)" }}>{label}</label>}

      <button
        type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 44, padding: "0 14px", borderRadius: "var(--r-md)",
          border: `1px solid ${open ? "var(--c-accent)" : "var(--c-border)"}`,
          background: "var(--c-surface)", cursor: "pointer", width: "100%",
          color: "var(--c-ink)",
          boxShadow: open ? "var(--sh-focus)" : "none",
          transition: "all var(--motion-fast)", textAlign: "left",
        }}>
        <span style={{
          color: count ? "var(--c-ink)" : "var(--c-muted)",
          fontSize: "var(--fs-body)",
        }}>
          {count > 0
            ? t("ec.q5.selected_count", { n: count })
            : (placeholder || t("ec.q5.placeholder"))}
        </span>
        <Icon name="chevronDown" size={16} color="var(--c-muted)"
          style={{ transition: "transform var(--motion-base)", transform: open ? "rotate(180deg)" : "none" }} aria-hidden="true" />
      </button>

      {count > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {[...value].map((code) => (
            <span key={code} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 8px 4px 6px",
              borderRadius: 999, background: "var(--c-accent-soft)",
              fontSize: 12, fontWeight: 500, color: "var(--c-primary)",
            }}>
              <Flag code={code} size={14} />
              <span>{nameOf(code)}</span>
              <button type="button" onClick={() => removeOne(code)}
                aria-label={`Remove ${nameOf(code)}`}
                style={{ background: "transparent", border: 0, padding: 0, margin: 0, cursor: "pointer", color: "var(--c-primary)", display: "inline-flex" }}>
                <EcIco.close style={{ width: 12, height: 12 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 40,
          background: "var(--c-surface)", borderRadius: "var(--r-md)",
          border: "1px solid var(--c-border-soft)",
          boxShadow: "var(--sh-3)", padding: 4,
          display: "flex", flexDirection: "column",
          maxHeight: 420, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderBottom: "1px solid var(--c-border-soft)", marginBottom: 4,
          }}>
            <EcIco.search style={{ width: 16, height: 16, color: "var(--c-muted)", flex: "0 0 auto" }} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("ec.q2.input.placeholder")}
              autoComplete="off" spellCheck="false"
              className="input-bare"
              // fontSize: 16 — see EcCountrySelect's search field for
              // why (iOS auto-zoom guard on tap-focus).
              style={{ flex: 1, minWidth: 0, background: "transparent", font: "inherit", color: "var(--c-ink)", fontSize: 16 }}
            />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {grouped.length === 0 ? (
              <div style={{ padding: "14px 12px", fontSize: 13, color: "var(--c-muted)", textAlign: "center" }}>
                {t("ec.q2.empty.title")}
              </div>
            ) : (
              grouped.map(({ region, codes }) => (
                <div key={region}>
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    color: "var(--c-muted)", textTransform: "uppercase",
                    letterSpacing: ".04em",
                    padding: "10px 12px 4px",
                  }}>
                    {t("ec.region." + region)}
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {codes.map((code) => {
                      const on = value.has(code);
                      return (
                        <li key={code}>
                          <button
                            type="button" role="option" aria-selected={on}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => toggle(code)}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "8px 12px",
                              background: on ? "var(--c-accent-soft)" : "transparent",
                              color: "var(--c-ink)", fontSize: "var(--fs-body)",
                              borderRadius: "var(--r-sm)", cursor: "pointer",
                              border: 0, textAlign: "left", margin: "2px 4px",
                              width: "calc(100% - 8px)",
                            }}>
                            <Flag code={code} size={20} />
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {nameOf(code)}
                            </span>
                            {on && <Icon name="check" size={14} color="var(--c-accent)" aria-hidden="true" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Region chip picker (Q5) ────────────────────────────────────────
// Each chip is a region (UK+EEA / Middle East / South Asia / APAC /
// North America / Latin America / Africa). Selection is a `Set<string>`
// of region IDs and/or ISO-country codes — outlier countries (added via
// "+ Add specific country") live in the same set so downstream logic
// (ecRecommend's corridor-breadth signal) just counts entries.
function EcRegionChips({ value, onChange, label, ariaLabel }) {
  const t = useT();
  const [adding, setAdding] = useState(false);

  const toggleRegion = (regionId) => {
    const next = new Set(value);
    next.has(regionId) ? next.delete(regionId) : next.add(regionId);
    onChange(next);
  };
  const addOutlier = (code) => {
    const next = new Set(value);
    next.add(code);
    onChange(next);
    setAdding(false);
  };
  const removeOutlier = (code) => {
    const next = new Set(value);
    next.delete(code);
    onChange(next);
  };

  // Selected items split into regions vs individual outlier countries.
  // Regions are keys of EC_CHIP_REGIONS; ISO codes are 2-letter strings
  // that match an EC_COUNTRIES entry. Anything else is ignored.
  const isRegionId = (id) => Object.prototype.hasOwnProperty.call(EC_CHIP_REGIONS, id);
  const outliers = [...value].filter((id) => !isRegionId(id));

  // Search-add countries: full EC_COUNTRIES list minus sanctioned and
  // minus countries already covered by selected regions (no double-add).
  const coveredByRegions = useMemo(() => {
    const set = new Set();
    for (const regionId of value) {
      if (isRegionId(regionId)) {
        for (const code of (EC_CHIP_REGIONS[regionId] || [])) set.add(code);
      }
    }
    return set;
  }, [value]);
  const addOptions = useMemo(() => {
    return EC_COUNTRIES
      .filter((c) => c.risk !== "blocked")
      .filter((c) => !coveredByRegions.has(c.code))
      .filter((c) => !value.has(c.code));
  }, [coveredByRegions, value]);

  const nameOf = (c) => {
    const localized = t("ec.country." + c.code);
    return localized === c.code ? c.name : localized;
  };

  return (
    <div className="ec-region-chips" role="group" aria-label={ariaLabel}>
      {label && <div className="ec-region-chips__label">{label}</div>}

      <div className="ec-region-chips__grid">
        {EC_CHIP_REGION_ORDER.map((regionId) => {
          const on = value.has(regionId);
          return (
            <button
              key={regionId}
              type="button"
              className={"ec-region-chip" + (on ? " is-on" : "")}
              onClick={() => toggleRegion(regionId)}
              aria-pressed={on}
            >
              {(() => {
                // Flag spec can be a single ISO code or an array (stacked
                // pair). Array form is used for blocs that don't map to a
                // single country flag — e.g. UK+EEA stacks GB+EU.
                const spec = EC_CHIP_REGION_FLAG[regionId];
                const codes = Array.isArray(spec) ? spec : [spec];
                return (
                  <span className={"ec-region-chip__flag"
                                  + (codes.length > 1 ? " is-dual" : "")}
                        aria-hidden="true">
                    {codes.map((code, idx) => (
                      <span key={code}
                            className={"ec-region-chip__flagItem"
                                      + (idx > 0 ? " is-secondary" : "")}>
                        <Flag code={code} size={22} />
                      </span>
                    ))}
                  </span>
                );
              })()}
              <span className="ec-region-chip__label">{t("ec.region." + regionId)}</span>
              {on && (
                <span className="ec-region-chip__check" aria-hidden="true">
                  <EcIco.check style={{ width: 12, height: 12 }} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {outliers.length > 0 && (
        <div className="ec-region-chips__outliers" aria-label={t("ec.q5.outliers.aria")}>
          {outliers.map((code) => {
            const c = EC_COUNTRIES.find((x) => x.code === code);
            const label = c ? nameOf(c) : code;
            return (
              <span key={code} className="ec-outlier-chip">
                <Flag code={code} size={14} />
                <span>{label}</span>
                <button type="button" onClick={() => removeOutlier(code)}
                        aria-label={t("ec.q5.outliers.remove", { country: label })}>
                  <EcIco.close style={{ width: 11, height: 11 }} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {adding ? (
        <div className="ec-region-chips__addPicker">
          <EcCountrySelect
            value=""
            onChange={addOutlier}
            options={addOptions}
            nameOf={nameOf}
            label=""
            placeholder={t("ec.q5.addCountry.placeholder")}
          />
          <button type="button" className="ec-region-chips__addCancel"
                  onClick={() => setAdding(false)}>
            {t("common.cancel")}
          </button>
        </div>
      ) : (
        <button type="button" className="ec-region-chips__addBtn"
                onClick={() => setAdding(true)}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>{t("ec.q5.addCountry")}</span>
        </button>
      )}
    </div>
  );
}

function EcCorridors({ corridorsIn, setCorridorsIn, corridorsOut, setCorridorsOut, onBack, onNext }) {
  const t = useT();
  // Asymmetric in/out mode — off by default. 90% of businesses operate
  // symmetrically (or the union is what ecRecommend uses anyway), so we
  // ask one combined question. Power users with crypto-OTC / split-flow
  // marketplaces flip the toggle to flag asymmetric flows.
  const [asymmetric, setAsymmetric] = useState(false);

  // Sync corridorsOut to corridorsIn whenever asymmetric is off — this
  // way the handoff payload always carries both even though the UI
  // only asked once. ecRecommend's corridor-breadth signal reads union,
  // so duplication is harmless.
  useEffect(() => {
    if (!asymmetric) setCorridorsOut(new Set(corridorsIn));
  }, [asymmetric, corridorsIn, setCorridorsOut]);

  const canContinue = corridorsIn.size > 0;

  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.back")}
      </button>
      <EcQuestionHeader num="5" title={t("ec.q5.title")} lead={t("ec.q5.lead")} />

      <EcRegionChips
        value={corridorsIn}
        onChange={setCorridorsIn}
        label={asymmetric ? t("ec.q5.section.in") : null}
        ariaLabel={t("ec.q5.regions.aria")}
      />

      <label className="ec-q5-asym">
        <input type="checkbox"
               checked={asymmetric}
               onChange={(e) => setAsymmetric(e.target.checked)} />
        <span>{t("ec.q5.asymmetric.toggle")}</span>
      </label>

      {asymmetric && (
        <EcRegionChips
          value={corridorsOut}
          onChange={setCorridorsOut}
          label={t("ec.q5.section.out")}
          ariaLabel={t("ec.q5.regions.outAria")}
        />
      )}

      <WhyWeAsk>{t("ec.q5.why")}</WhyWeAsk>

      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={onNext} iconRight="arrowRight"
                disabled={!canContinue}>
          {t("common.continue")}
        </Button>
      </div>
    </div>
  );
}

function EcResult({ rec, onBack, onReset }) {
  if (rec.kind === "blocked") return <EcResultBlocked rec={rec} onBack={onBack} onReset={onReset} />;
  return <EcResultApproved rec={rec} onBack={onBack} onReset={onReset} />;
}

function EcResultApproved({ rec, onBack, onReset }) {
  const t = useT();
  const { entity } = rec;
  const recommendedPlan = rec.plan;

  // Plan comparison modal — local state, opens on "Compare all plans →"
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [feesOpen, setFeesOpen] = useState(false);

  // Handoff modal — used now only for the "Email this proposal as PDF"
  // path on the result page (mounts directly at the email stage).
  // The primary "Continue to setup" CTA goes straight to onboarding —
  // no commit-stage interstitial. See goToOnboarding below + the modal's
  // initialStage prop in EcHandoffModal.
  const [handoffOpen, setHandoffOpen] = useState(false);


  // User can override the algorithm's recommendation via the comparison
  // modal. null = "use recommendation as-is". Selecting the recommended
  // plan again (it reappears in the modal with "Originally recommended"
  // badge) sets selectedPlanId === recommendedPlan.id, and isOnRecommended
  // flips back to true → eyebrow reverts to "Recommended for your business".
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  const activePlan = selectedPlanId ? EC_PLANS[selectedPlanId] : recommendedPlan;
  const isOnRecommended = !selectedPlanId || selectedPlanId === recommendedPlan.id;
  const planName = t(activePlan.nameKey);

  // Direction of the override relative to the recommended plan.
  // "up"   = user picked a higher-tier plan than recommended (e.g. Pro→Ultra)
  // "down" = user picked a lower-tier plan than recommended  (e.g. Pro→Starter)
  // We surface a tier-specific explanation in the not-recommended notice
  // because the trade-off is different in each direction:
  //   up   → lower per-tx fees but capacity/features they may not need
  //   down → looks cheaper on paper but caps below their volume or
  //          misses services they said they need
  // Without this, the projection in the savings card can read as if the
  // higher tier is always the better deal — which is misleading when the
  // recommendation is calibrated to actual usage rather than raw cost.
  const PLAN_TIER = { starter: 0, pro: 1, ultra: 2 };
  const altDirection = (PLAN_TIER[activePlan.id] ?? 0) > (PLAN_TIER[recommendedPlan.id] ?? 0)
    ? "up"
    : "down";

  // Onboarding redirect — used by both the primary CTA (direct) and the
  // handoff modal's email-stage "Send & continue" CTA. One base64url
  // payload in ?p= carries every checker answer (plan, entity, volume,
  // industry, services, corridors, cryptoActive, ref). The same URL
  // shape powers email forwards and device hops — see ecBuildHandoffURL
  // in checker-helpers.js for the payload schema.
  const goToOnboarding = () => {
    window.location.href = ecBuildHandoffURL(rec, activePlan);
  };

  const entityName = t(entity.nameKey);
  const entityLicence = t(entity.licenceKey);
  const entityNote = t(entity.noteKey);

  // Primary identifier for the hero IBAN chip — the operationally most
  // relevant account for this entity. UK → GBP local, EU → EUR IBAN,
  // MENA → USD AE-IBAN. May be null if entity's primary is SWIFT-only
  // (then we just don't show the chip — better than faking a number).
  const heroIban = ecHeroIdentifier(entity);
  const heroIbanFlag = heroIban ? ecCurrencyFlag(heroIban.currency) : null;

  // The result page no longer renders a computed cost projection — the
  // "Your monthly cost" total scaled with volume into a figure that scared
  // high-volume users, so it was replaced (Jun 2026) by the published-rate
  // card, which reads straight off activePlan.fees / .price. The
  // ecComputeCostBreakdown helper still backs the PDF (it computes its own
  // figures internally), so on-screen and PDF surfaces are now decoupled by
  // design. See the savings/rates reframe memory.
  // Top "Edit my answers" back-link removed — "Start over" in the
  // action footer covers the same use-case more visibly. Edit-vs-Start
  // pair was duplicating intent without giving the user a clearer
  // way out.
  return (
    <div className="ec-content fade-in">
      <div className="ec-r">
        {/* ───── Hero ─────────────────────────────────────────────────
            Dark gradient card (navy → midnight) with eyebrow + two-line
            title (entity in white, "is built for the X plan" in light
            blue accent) + lead paragraph + 2 pills (entity status, +
            crypto-fluent for crypto users) + IBAN preview chip. */}
        <header className="ec-r__hero">
          <div className="ec-r__hero__inner">
            <div className="ec-r__heroEyebrow">
              {t(isOnRecommended ? "ec.r.eyebrow" : "ec.r.eyebrow.selected")}
            </div>
            <h1 className="ec-r__heroTitle">
              <span className="ec-r__heroTitle__entity">{entityName}</span>
              <span className="ec-r__heroTitle__rest">
                {t("ec.r.title.middle")} <b>{planName}</b>{t("ec.r.title.after")}
              </span>
            </h1>
            <p className="ec-r__heroLead">
              {t("ec.entity." + entity.id + ".lead")}
            </p>

            <div className="ec-r__pills">
              <span className="ec-r__pill">
                {t("ec.r.entity.status", { licence: entityLicence })}
              </span>
              {/* Verifiable regulator reference — clickable deep link
                  to the public register. Lets visitors confirm the
                  licence claim without leaving the page, and answers
                  the recurring "can I read the licence number anywhere"
                  prospect question with "yes — here". */}
              {entity.regulatory && (
                <a className="ec-r__pill ec-r__pill--reg"
                   href={entity.regulatory.registerUrl}
                   target="_blank" rel="noopener noreferrer"
                   title={t("ec.r.entity.regHint")}>
                  {entity.regulatory.refLabel}
                  <Icon name="external" size={12} style={{ marginLeft: 4 }} aria-hidden="true" />
                </a>
              )}
              {rec.cryptoOpen && (
                <span className="ec-r__pill">
                  <EcIco.token style={{ width: 14, height: 14 }} aria-hidden="true" />
                  {t("ec.r.crypto.fluent")}
                </span>
              )}
            </div>

            {heroIban && (
              <div className="ec-r__iban" aria-label={`${heroIban.currency} account preview`}>
                <div className="ec-r__iban__chip">
                  {heroIbanFlag && (
                    <span className="ec-r__iban__flag">
                      <Flag code={heroIbanFlag} size={22} />
                    </span>
                  )}
                  <span className="ec-r__iban__currency">{heroIban.currency}</span>
                  <span className="ec-r__iban__sep" aria-hidden="true" />
                  <span className="ec-r__iban__body">{maskTailDots(heroIban.value)}</span>
                </div>
                <div className="ec-r__iban__caption">
                  {t("ec.r.iban.caption", { currency: heroIban.currency })}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ───── Plan → Savings, stacked full-width ─────────────
            Reordered from the side-by-side grid: visitor reads
            (1) what entity/account we'll open (hero) → (2) what
            plan suits them at what price (plan card) → (3) what
            it saves vs a typical bank (savings card). Linear
            decision narrative instead of forcing the eye to
            choose between two cards. */}
          <section className="ec-r__card ec-r__plan2">
            <div className="ec-r__planHead">
              <div>
                <div className="ec-r__cardEyebrow">{t("ec.r.plan.eyebrow", { plan: planName })}</div>
              </div>
              <div className="ec-r__planPrice">
                <span className="ec-r__planPrice__amount">
                  {activePlan.priceKey ? t(activePlan.priceKey) : activePlan.price}
                </span>
                <span className="ec-r__planPrice__cycle">{t(activePlan.cycleKey)}</span>
              </div>
            </div>
            {/* planFit hoisted out of .ec-r__planHead so the fit-description
                line spans the full card width instead of being squeezed by
                the price column on the right. */}
            <div className="ec-r__planFit">{t(activePlan.fitKey)}</div>
            {/* Soft notice — shown only when the user has switched away
                from the algorithm's recommendation via the comparison
                modal. Contextual ("this plan you're reading is not the
                best fit"), reassuring tone (info icon, not warning),
                with a one-click revert to the originally recommended
                plan. The savings card above and the perks list below
                are already recalculated against the active plan, so
                the user can compare apples-to-apples before deciding. */}
            {!isOnRecommended && (
              <div className="ec-r__planAlt" role="status">
                <span className="ec-r__planAlt__icon" aria-hidden="true">
                  <EcIco.info style={{ width: 14, height: 14 }} />
                </span>
                <div className="ec-r__planAlt__title">
                  {t("ec.r.plan.notRecommended." + altDirection + ".title", {
                    recommended: t(recommendedPlan.nameKey),
                    selected:    planName,
                  })}
                </div>
                <div className="ec-r__planAlt__text">
                  {t("ec.r.plan.notRecommended." + altDirection + ".body", {
                    recommended: t(recommendedPlan.nameKey),
                    selected:    planName,
                  })}
                </div>
                <button
                  type="button"
                  className="ec-r__planAlt__switch"
                  onClick={() => setSelectedPlanId(null)}
                >
                  {t("ec.r.plan.notRecommended.switchBack", { recommended: t(recommendedPlan.nameKey) })}
                </button>
              </div>
            )}
            <ul className="ec-r__perks">
              {activePlan.perkKeys.slice(0, 7).map((k, i) => {
                // The "Everything in <prev plan>" perk (Pro.p1, Ultra.p1)
                // referenced a plan the user hadn't seen — read as upsell
                // trick. Make it a button that opens the comparison modal,
                // so the user can verify what's actually included rather
                // than take it on faith.
                const isInheritedFromPrev =
                  k === "ec.plan.pro.p1" || k === "ec.plan.ultra.p1";
                return (
                  <li className="ec-r__perk" key={i}>
                    <span className="ec-r__perk__tick" aria-hidden="true">
                      <EcIco.check style={{ width: 11, height: 11 }} />
                    </span>
                    {isInheritedFromPrev ? (
                      <button type="button" className="ec-r__perk__link"
                              onClick={() => setComparisonOpen(true)}>
                        {t(k)}
                      </button>
                    ) : (
                      <span>{t(k)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="ec-r__planFoot">
              <button type="button" className="ec-r__planFoot__link" onClick={() => setComparisonOpen(true)}>
                {t("ec.r.plan.compareAll")}
              </button>
              <span className="ec-r__planFoot__sub">{t("ec.r.plan.switch")}</span>
            </div>
          </section>

          {/* Rate card (Jun 2026, 3rd pass): show Altery's published unit
              RATES from the plan tariff — small, attractive numbers — instead
              of a total monthly bill, which scales with volume and reads as a
              scary figure (a high-volume Ultra user saw ~€54k/mo). No total,
              no competitor, no savings claim — just "here's how little each
              rail costs, sanity-check it yourself". Reads off activePlan so
              it tracks the user's plan choice in the comparison modal. */}
          {activePlan && activePlan.fees && (
            <section className="ec-r__card ec-r__savings">
              <div className="ec-r__cardEyebrow">
                {t("ec.r.rates.head", { plan: planName })}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "12px 0 4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--c-ink-2)" }}>
                  <span>{t("ec.r.method.line.subscription")}</span>
                  <span style={{ fontWeight: 600, color: "var(--c-ink)" }}>{activePlan.priceKey ? t(activePlan.priceKey) : activePlan.price}</span>
                </div>
                {[["fxMarkup", activePlan.fees.fxMarkup], ["fasterPay", activePlan.fees.fasterPay], ["sepa", activePlan.fees.sepa], ["swift", activePlan.fees.swift], ["swiftCap", activePlan.fees.swiftCap], ["swiftIn", activePlan.fees.swiftIn], ["cardUk", activePlan.fees.cardUk], ["cardEu", activePlan.fees.cardEu], ["cardRow", activePlan.fees.cardRow]].filter((row) => row[1]).map((row) => (
                  <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--c-ink-2)" }}>
                    <span>{t("ec.r.plan.compare.fee." + row[0])}</span>
                    <span style={{ fontWeight: 600, color: "var(--c-ink)" }}>{row[1]}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "var(--c-ink-2)", opacity: 0.85, margin: "8px 0 0" }}>
                {t("ec.r.rates.openingFee")}
              </p>

              <p className="ec-r__savings__note">
                {t("ec.r.rates.caption", { plan: planName })}
              </p>

              {/* Altery-owned value lines (no competitor comparison). Crypto
                  deliberately omitted (jurisdiction-gated). */}
              <ul style={{ listStyle: "none", margin: "14px 0 2px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {["transparency", "speed", "reach", "acceptance"].map((k) => (
                  <li key={k} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: "18px", color: "var(--c-ink-2)" }}>
                    <EcIco.check style={{ width: 15, height: 15, flex: "0 0 auto", marginTop: 1, color: "var(--c-success)" }} />
                    <span>{t("ec.r.value." + k)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

        {/* The product-showcase slider that used to sit here moved to
            the intro screen (EcIntro) — it serves as a pre-quiz teaser
            of what Altery covers, more useful before the visitor invests
            90 seconds in answering than as a re-recap after they already
            saw the savings number. The result page now reads as a
            transactional decision surface (hero → savings → plan →
            coverage → caveats → action), uninterrupted by promo cards. */}

        {/* The "Supported countries" strip used to render here. Removed:
            by the time the user reaches the result page they've already
            picked their country (Q1) and corridors (Q5), so seeing a row
            of arbitrary entity-country flags + "+100 more via SWIFT" was
            redundant reassurance that ate ~120px of vertical real estate
            without contributing to the conversion path. */}

        {/* The capability matrix (Altery wins / Roughly equal /
            Where bank may still win) lives only in the PDF + email
            now — too dense for the live result page, but exactly the
            right considered-evaluation surface for a CFO opening the
            full proposal. See ecBuildAnalysisHTML in checker-pdf.js
            for the PDF render and buildEmailHTML in api/send-analysis
            for the email render. UI keeps the savings card + plan
            card + caveats only. */}

        {/* ───── Action bar — primary CTA goes DIRECTLY to onboarding
            (no commit-stage interstitial modal). Secondary button opens
            EcHandoffModal at the email stage for the "Get your full
            proposal" PDF capture flow. */}
        <section className="ec-r__action">
          <div className="ec-r__action__primary">
            <Button
              variant="primary"
              size="xl"
              iconRight="arrowRight"
              onClick={goToOnboarding}
            >
              {t("ec.r.cta.continue")}
            </Button>
            <button
              type="button"
              className="ec-r__action__secondary"
              onClick={() => setHandoffOpen(true)}
            >
              <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }} aria-hidden="true">
                <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="m2.5 4.5 5.5 4 5.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("ec.r.cta.email")}
            </button>
          </div>
          <div className="ec-r__action__foot">
            <button className="ec-r__action__reset" onClick={onReset} type="button">
              {t("common.startOver")}
            </button>
            <span className="ec-r__action__sep" aria-hidden="true" />
            <span>
              {t("ec.support.questionsPrefix")}{" "}
              <a href={"mailto:" + t("ec.support.email")}>{t("ec.support.email")}</a>
            </span>
          </div>
        </section>
      </div>

      {/* Modals — unchanged, mounted conditionally; portaled to body. */}
      {comparisonOpen && (
        <EcPlanComparisonModal
          activePlanId={activePlan.id}
          recommendedPlanId={recommendedPlan.id}
          onSelect={(planId) => {
            setSelectedPlanId(planId === recommendedPlan.id ? null : planId);
            setComparisonOpen(false);
          }}
          onClose={() => setComparisonOpen(false)}
        />
      )}

      {feesOpen && (
        <EcFeesModal
          plan={activePlan}
          entity={entity}
          onClose={() => setFeesOpen(false)}
        />
      )}

      {handoffOpen && (
        <EcHandoffModal
          rec={rec}
          initialStage="email"
          onClose={() => setHandoffOpen(false)}
          onContinueToSetup={() => { setHandoffOpen(false); goToOnboarding(); }}
        />
      )}
    </div>
  );
}
function EcResultBlocked({ rec, onBack, onReset }) {
  const t = useT();
  const lang = window.__I18N.getLang();
  // Two block reasons share the same screen scaffolding; only the
  // accent token, title fragments and lead copy differ.
  const isCountry = rec.reason === "country";
  // Both reasons use a single interpolated title sentence (correct word
  // order per language); the key noun is accented in the JSX by splitting
  // on it. `accent` is the country name (title-case proper noun) or the
  // lowercased industry label (reads naturally mid-sentence;
  // toLocaleLowerCase handles non-Latin scripts incl. the Turkish İ→i case).
  let accent, title, lead;
  if (isCountry) {
    const c = rec.country;
    const localized = t("ec.country." + c.code);
    accent = localized === c.code ? c.name : localized;
    title  = t("ec.b.country.title", { country: accent });
    lead   = t("ec.b.country.lead");
  } else {
    accent = t(rec.reasonKey).toLocaleLowerCase(lang);
    title  = t("ec.b.industry.title", { industry: accent });
    lead   = t("ec.b.lead");
  }
  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.editAnswers")}
      </button>
      <div className="ec-result ec-result--guarded">
        <div className="ec-result__hero">
          <div className="ec-result__heroEyebrow">{t("ec.b.eyebrow")}</div>
          <h1 className="ec-result__heroTitle">
            {(() => {
              const idx = title.indexOf(accent);
              if (idx === -1) return title;
              return (
                <>
                  {title.slice(0, idx)}
                  <span className="ec-result__hero__accent">{accent}</span>
                  {title.slice(idx + accent.length)}
                </>
              );
            })()}
          </h1>
          <p className="ec-result__heroLead">{lead}</p>
        </div>
        <div className="ec-caveats">
          <div className="ec-caveats__head">{t("ec.b.head")}</div>
          <ul className="ec-caveats__list">
            <li className="ec-caveats__row">
              <span className="ec-tagslot"><Tag tone="blue" size="sm">{t("ec.b.row1.tag")}</Tag></span>
              <span>{t("ec.b.row1.text")}</span>
            </li>
          </ul>
        </div>
        <div className="ec-actions">
          <Button variant="primary" size="xl" onClick={onReset}>{t("common.startOver")}</Button>
          {/* Soft-decline cohort: open the user's mail client to sales@ so
              they can describe their setup. Blocked businesses fall outside
              the self-serve funnel, so a direct email beats a booking link.
              Native anchor (href) instead of window.location.href so the
              mailto handler fires reliably across browsers. */}
          <Button variant="outline" size="xl" href="mailto:sales@altery.com">
            {t("common.contactTeam")}
          </Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  EcApp,
  EcIco,
  EcIntro, EcQuestionHeader,
  EcCountry, EcIndustry, EcServices, EcVolume, EcCorridors,
  EcResult,
  EcResultApproved, EcResultBlocked,
});
