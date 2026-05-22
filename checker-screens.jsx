/* global React, useT, Button, Tag, Alert, SelectableListItem, Input, Select,
          Icon, Flag, Title, Field, WhyWeAsk,
          EC_COUNTRIES, EC_INDUSTRIES, EC_BUSINESS_TYPES, EC_SERVICES,
          EC_VOLUME_BANDS, EC_CORRIDOR_GROUPS, EC_CORRIDORS, EC_PERKS,
          EC_FEE_SCHEDULE, EC_PLANS, EC_ENTITIES, TOTAL_STEPS, COUNTRY_REGION_GROUPS,
          ecRecommend, ecComputeCostBreakdown, ecOutcomesForSavings, ecVolumeHintKey,
          ecFormatVolume, ecCurrencyFlag, ecCurrencyName, ecEstimateTxCount,
          EcFeesModal, EcBankHistory, EcPerks, EcPlanComparisonModal, EcHandoffModal,
          EcPaymentModal, EcAccountPreview */
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
//   EcCrypto         — Q6 crypto exposure (currently elided in flow)
//   EcResult         — dispatcher to EcResultApproved / EcResultBlocked
//   EcAccountPreview — currency cards on the result page
//   EcAccountCard    — single currency identifier card
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

function EcApp() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [country, setCountry] = useState(null);
  const [industry, setIndustry] = useState("");
  const [businessType, setBusinessType] = useState("");
  // services: multi-select of products/use-cases the user wants.
  // Drives plan tier hint (Pro for mass/cards/multiEntity, Ultra for
  // API, specialist review for crypto rails) and result page perk
  // emphasis ordering. Starts empty — the user explicitly ticks what
  // applies. Pre-selecting "accounts"/"crossBorder" looked smart on
  // paper but biases the recommendation before any input, and leaves
  // a confusing "why are these already checked?" signal for fresh
  // visitors who haven't read the question yet.
  const [services, setServices] = useState(new Set());
  const [volumeIdx, setVolumeIdx] = useState(2);
  const [corridors, setCorridors] = useState(new Set());
  const [txCount, setTxCount] = useState("med");
  const totalSteps = TOTAL_STEPS;
  const monthlyVolume = EC_VOLUME_BANDS[volumeIdx]?.value || 0;
  const recommendation = useMemo(() =>
    ecRecommend({ countryCode: country, industry, businessType, monthlyVolume, corridors: [...corridors], txCount, services: [...services] }),
  [country, industry, businessType, monthlyVolume, corridors, txCount, services]);

  // Step navigation. Steps:
  //   0 intro · 1 industry · 2 country · 3 services · 4 volume · 5 corridors · 6 result
  // Older flows had a "Q6 crypto" and "Q7 bank-history (optional)" step;
  // both were removed — the first felt redundant after Q1 industry + Q3
  // services already declared crypto, the second never produced any value
  // beyond a local UI state because no downstream consumer read it.
  const back  = () => {
    setDirection("back");
    // From a blocked-industry result, back jumps straight to the
    // industry question — the user never visited Q2..Q5 because of the
    // short-circuit in EcIndustry's onBlocked handler, so stepping back
    // through ghost screens would be disorienting.
    if (step === 6 && recommendation.kind === "blocked") {
      setStep(1);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };
  const next  = () => { setDirection("forward"); setStep((s) => Math.min(totalSteps + 1, s + 1)); };
  const reset = () => { setDirection("back");    setStep(0); };
  // Short-circuit handler used by EcIndustry when the picked industry
  // is one we can't onboard (gambling/adult/weapons/lending). Jumps
  // straight to step 6 (result); ecRecommend returns kind:"blocked"
  // regardless of the unanswered later questions, so EcResultBlocked
  // renders cleanly with just the industry context.
  const jumpToResult = () => { setDirection("forward"); setStep(6); };

  return (
    <div className="ec-app">
      <header className="ec-header">
        <div className="ec-header__brand">
          <svg width="71" height="24" viewBox="0 0 71 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Altery">
            <path d="M20.2378 0H17.5293V18.2069H20.2378V0Z" fill="#FFFFFF"/>
            <path d="M36.4338 12.8929C36.6753 14.9064 38.3425 16.2271 40.764 16.2271C42.1093 16.2271 43.8027 15.7163 44.6091 14.8027L46.4113 16.5502C44.8916 18.0381 42.8366 18.8516 40.7096 18.8071C36.3511 18.8071 33.5547 16.0402 33.5547 11.7944C33.5547 7.54872 36.3787 4.89038 40.5204 4.89038C44.6621 4.89038 47.7015 7.49581 47.1916 12.8971L36.4338 12.8936V12.8929ZM44.5293 10.5542C44.3683 8.45952 42.8345 7.35823 40.6023 7.35823C38.6201 7.23477 36.8568 8.60486 36.4874 10.5542H44.5293Z" fill="#FFFFFF"/>
            <path d="M29.4084 15.7785C28.287 15.782 27.7369 14.9618 27.7369 13.6756V7.66316H31.5212V5.34419H27.7631V1.50464H25.0514V5.34136H22.5703V7.65892H25.0514V13.6713C25.0514 16.6828 26.6339 18.2719 29.4106 18.2048H31.5233V15.7729L29.4091 15.7785H29.4084Z" fill="#FFFFFF"/>
            <path d="M11.4503 5.38683V6.5041C8.48915 4.04329 4.087 4.44156 1.61866 7.39369C-0.849682 10.3458 -0.450194 14.7345 2.51097 17.1954C5.09951 19.3467 8.86106 19.3467 11.4496 17.1954V18.2125H14.1442V5.38683H11.4496H11.4503ZM6.9817 16.3044C4.51406 16.3044 2.51309 14.3095 2.51309 11.8494C2.51309 9.38927 4.51406 7.3944 6.9817 7.3944C9.44933 7.3944 11.4503 9.38927 11.4503 11.8494C11.4503 14.3095 9.44933 16.3044 6.9817 16.3044Z" fill="#FFFFFF"/>
            <path d="M70.5706 5.1954L62.4684 23.9999H59.502L61.4874 19.4059C61.9172 18.4123 61.9299 17.2881 61.5227 16.2846L57.0283 5.19257H60.1535L62.3675 11.2594L63.647 14.9064L65.0282 11.3116L67.5796 5.19116L70.5706 5.1954Z" fill="#FFFFFF"/>
            <path d="M55.3485 5.17542H55.3175C53.8946 5.17542 52.6666 5.70841 52.0741 6.94993V5.11597H49.5801V18.2821H52.2556V10.9583C52.2057 9.26237 53.4822 7.82196 55.1634 7.67898H56.276V5.17896L55.3485 5.17613V5.17542Z" fill="#FFFFFF"/>
          </svg>
          <div className="ec-header__divider" />
          <div className="ec-header__eyebrow">{t("ec.header.eyebrow")}</div>
        </div>
        <div className="ec-header__right">
          {/* Step counter and "no signup yet" reassurance previously
              lived here, but both were duplicates: the step number is
              shown more prominently on each question's eyebrow, and the
              no-signup reassurance is already covered by the intro
              page's lead copy. Removing them frees up the header on
              mobile (where space was already tight) and trusts each
              surface to do its own job. */}
          <LangSwitcher onDark={true} anchorRight={true} />
        </div>
      </header>
      <main className="ec-main" data-direction={direction}>
        {step === 0 && <EcIntro onStart={next} />}
        {step === 1 && <EcIndustry industry={industry} setIndustry={setIndustry} businessType={businessType} setBusinessType={setBusinessType} onBack={() => { setDirection("back"); setStep(0); }} onNext={next} onBlocked={jumpToResult} />}
        {step === 2 && <EcCountry value={country} onChange={setCountry} onBack={back} onNext={next} />}
        {step === 3 && <EcServices services={services} setServices={setServices} onBack={back} onNext={next} />}
        {step === 4 && <EcVolume volumeIdx={volumeIdx} setVolumeIdx={setVolumeIdx} txCount={txCount} setTxCount={setTxCount} onBack={back} onNext={next} />}
        {step === 5 && <EcCorridors corridors={corridors} setCorridors={setCorridors} onBack={back} onNext={next} />}
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
            monthly cost. Row 3 (cost) carries the success-green
            accent because that's the line that closes the sale.
            Icons: target = calibrated to you, stack = kit of products,
            banknote = money. */}
        <div className="ec-value__row">
          <span className="ec-value__icon"><EcIco.target style={{ width: 18, height: 18 }} /></span>
          <div>
            <div className="ec-value__title">{t("ec.intro.value1.title")}</div>
            <div className="ec-value__body">{t("ec.intro.value1.body")}</div>
          </div>
        </div>
        <div className="ec-value__row">
          <span className="ec-value__icon" style={{ background: "var(--c-warning-soft)", color: "var(--c-warning)" }}><EcIco.stack style={{ width: 18, height: 18 }} /></span>
          <div>
            <div className="ec-value__title">{t("ec.intro.value2.title")}</div>
            <div className="ec-value__body">{t("ec.intro.value2.body")}</div>
          </div>
        </div>
        <div className="ec-value__row">
          <span className="ec-value__icon" style={{ background: "var(--c-success-soft)", color: "var(--c-success)" }}><EcIco.banknote style={{ width: 18, height: 18 }} /></span>
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

      {/* Quiet trust footnote below the CTA — three commitments that
          remove friction from clicking the button ("nothing to sign up",
          "no credit hit"), backed by a small regulator stamp at the end.
          Subdued styling on purpose: this is reassurance, not branding. */}
      <div className="ec-intro__trust">{t("ec.intro.trust")}</div>
    </div>
  );
}

function EcQuestionHeader({ num, title, lead }) {
  const t = useT();
  return (
    <>
      <div className="ec-eyebrow">
        <span className="ec-eyebrow__num">{num}</span>
        {t("ec.q.eyebrow", { n: num, total: TOTAL_STEPS })}
      </div>
      <Title title={title} lead={lead} />
    </>
  );
}

function EcCountry({ value, onChange, onBack, onNext }) {
  const t = useT();
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const isSearching = ql !== "";

  const matches = (c) => {
    if (!ql) return true;
    const localized = t("ec.country." + c.code);
    return (
      localized.toLowerCase().includes(ql) ||
      c.name.toLowerCase().includes(ql) ||
      c.code.toLowerCase().includes(ql)
    );
  };

  // Only Corporate-only countries get a right-side tag now. The previous
  // entity-routing tags (FCA · Altery Ltd / CBC · Altery EU / DFSA · Altery
  // MENA / Manual review) leaked internal entity structure into a question
  // where the user just picks a country — routing is our concern, not theirs.
  const metaFor = (c) => c.corporate ? t("ec.q2.tag.corporate") : null;

  const nameOf = (c) => t("ec.country." + c.code);
  const collator = useMemo(() => new Intl.Collator(undefined, { sensitivity: "base" }), []);

  // Two view modes:
  //   "search"  — q is non-empty: flat alphabetised list of matches
  //   "grouped" — q is empty: countries split into 4 region sections
  // No "popular" mode and no "Show all" toggle — both relied on
  // assumed data we don't have. The region grouping is purely
  // geographic and matches the corridor-group structure used on Q4.
  const searchResults = isSearching
    ? EC_COUNTRIES.filter(matches).slice().sort((a, b) => collator.compare(nameOf(a), nameOf(b)))
    : null;

  const groupedSections = !isSearching
    ? COUNTRY_REGION_GROUPS
        .map((g) => ({
          ...g,
          countries: EC_COUNTRIES
            .filter((c) => c.group === g.groupKey)
            .sort((a, b) => collator.compare(nameOf(a), nameOf(b))),
        }))
        .filter((g) => g.countries.length > 0)
    : null;

  const totalCount = EC_COUNTRIES.length;
  const matchCount = isSearching ? searchResults.length : totalCount;

  // Auto-advance: clicking a country sets the value AND moves to the
  // next step in one motion. This is the headline UX win for Q1 —
  // the country row IS the submit button. React 18 batches the
  // onChange/onNext state updates in the same render so the
  // recommendation memo sees the new country before Q2 renders. No
  // separate Continue button on this screen — would be vestigial.
  const handleSelect = (code) => {
    onChange(code);
    onNext();
  };

  // Corporate-only footnote shows when at least one currently-visible
  // country is corporate-only. In grouped mode that's always true
  // (there are corporate-only countries in Asia & Americas regions).
  // In search mode it depends on whether matches include any. Hiding
  // the footnote when no corporate countries are on screen prevents
  // a caveat about info the user can't see.
  const visible = isSearching ? searchResults : EC_COUNTRIES;
  const showCorporateNote = visible.some((c) => c.corporate);

  const renderRow = (c) => {
    const meta = metaFor(c);
    return (
      <button
        key={c.code}
        type="button"
        role="option"
        aria-selected={value === c.code}
        className="ec-country-row"
        onClick={() => handleSelect(c.code)}
      >
        <Flag code={c.code} size={24} />
        <span className="ec-country-row__name">{nameOf(c)}</span>
        {meta && <span className="ec-country-row__meta">{meta}</span>}
      </button>
    );
  };

  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.back")}
      </button>
      <EcQuestionHeader num="2" title={t("ec.q2.title")} lead={t("ec.q2.lead")} />

      <Input
        label={t("ec.q2.input.label")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("ec.q2.input.placeholder")}
        icon="search"
        hint={isSearching
          ? t("ec.q2.input.hintMatch", { n: matchCount, total: totalCount })
          : t("ec.q2.input.hintTotal", { n: totalCount })}
      />

      {isSearching ? (
        searchResults.length === 0 ? (
          <div className="ec-country-empty">
            <EcIco.search style={{ width: 18, height: 18, marginTop: 2 }} />
            <div>
              <div className="ec-country-empty__title">{t("ec.q2.empty.title")}</div>
              <div className="ec-country-empty__lead">{t("ec.q2.empty.lead")}</div>
            </div>
          </div>
        ) : (
          <div className="ec-country-list" role="listbox" aria-label={t("ec.q2.input.label")}>
            {searchResults.map(renderRow)}
          </div>
        )
      ) : (
        <div className="ec-country-groups">
          {groupedSections.map((g) => (
            <div key={g.groupKey} className="ec-country-group">
              <div className="ec-country-section-head">{t(g.labelKey)}</div>
              <div className="ec-country-list" role="listbox" aria-label={t(g.labelKey)}>
                {g.countries.map(renderRow)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCorporateNote && (
        <div className="ec-country-footnote">
          {t("ec.q2.footnote.corporate")}
        </div>
      )}

      {/* No Continue button on Q1 — every country row is itself a
          submit-and-advance control via handleSelect. Adding a "Next"
          that requires a separate tap after selection would be
          vestigial. Returning from Q2 with a country still selected:
          user taps it again (idempotent) → re-advances. */}
    </div>
  );
}

function EcIndustry({ industry, setIndustry, businessType, setBusinessType, onBack, onNext, onBlocked }) {
  const t = useT();
  const ind = EC_INDUSTRIES.find((i) => i.value === industry);
  // If the user picks an industry we can't onboard (gambling, adult,
  // weapons, unregulated lending) there is no point asking the next four
  // questions — country/services/volume/corridors won't change the
  // outcome. We short-circuit straight to EcResultBlocked, which the
  // soft-decline result screen handles end-to-end. The earlier inline
  // danger Alert is gone too: showing it AND letting the user continue
  // through the remaining questions was a worse UX than just landing
  // them on the explanation page immediately.
  const isBlocked = ind?.risk === "blocked";
  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.back")}
      </button>
      <EcQuestionHeader num="1" title={t("ec.q1.title")} lead={t("ec.q1.lead")} />

      <div className="ec-twocol">
        <Select
          label={t("ec.q1.field.industry")}
          value={industry}
          onChange={(v) => setIndustry(v)}
          placeholder={t("ec.q1.field.industryPh")}
          options={EC_INDUSTRIES.map((i) => ({ value: i.value, label: t(i.labelKey) }))}
        />
        <Select
          label={t("ec.q1.field.businessType")}
          value={businessType}
          onChange={(v) => setBusinessType(v)}
          placeholder={t("ec.q1.field.businessTypePh")}
          options={EC_BUSINESS_TYPES.map((b) => ({ value: b.value, label: t(b.labelKey) }))}
        />
      </div>

      {/* Crypto-native welcome — replaces the old orange "individual
          review" warning. Crypto-native businesses are a core target
          segment, not an exception we tolerate. Tone is info (blue,
          brand-aligned), copy interpolates the specific category so it
          reads "We onboard [crypto exchange / OTC desk] regularly" —
          demonstrating we differentiate the categories instead of
          lumping them. */}
      {ind?.crypto && (
        <Alert tone="info" title={t("ec.q1.alert.crypto.title")}>
          {t("ec.q1.alert.crypto.body", { category: t(ind.labelKey).toLowerCase() })}
        </Alert>
      )}

      <div className="ob-actions">
        <Button
          variant="primary"
          size="xl"
          onClick={isBlocked ? onBlocked : onNext}
          iconRight="arrowRight"
          disabled={!industry || !businessType}
        >
          {t("common.continue")}
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
function EcServices({ services, setServices, onBack, onNext }) {
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
              onClick={() => toggle(s.value)}
              role="checkbox"
              aria-checked={on}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
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
                <div className="ec-service__title">{t(s.titleKey)}</div>
                <div className="ec-service__body">{t(s.bodyKey)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ec-actions ec-actions--end">
        <Button variant="primary" size="xl" onClick={onNext} iconRight="arrowRight"
                disabled={count === 0}>
          {t("common.continue")}
        </Button>
      </div>
    </div>
  );
}

function EcVolume({ volumeIdx, setVolumeIdx, txCount, setTxCount, onBack, onNext }) {
  const t = useT();
  const band = EC_VOLUME_BANDS[volumeIdx];
  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.back")}
      </button>
      <EcQuestionHeader num="4" title={t("ec.q4.title")} lead={t("ec.q4.lead")} />

      <div className="ec-slider">
        <div className="ec-slider__head">
          <span className="ec-slider__label" id="ec-slider-label">{t("ec.q4.slider.label")}</span>
          <span className="ec-slider__value" aria-live="polite">{t("ec.q4.vol." + band.idx)}</span>
        </div>
        <div className="ec-slider__track">
          <span className="ec-slider__rail" aria-hidden="true" />
          <span className="ec-slider__fill" aria-hidden="true"
                style={{ width: `${(volumeIdx / (EC_VOLUME_BANDS.length - 1)) * 100}%` }} />
          <input
            className="ec-slider__input"
            type="range"
            min="0" max={EC_VOLUME_BANDS.length - 1} step="1"
            value={volumeIdx}
            onChange={(e) => setVolumeIdx(parseInt(e.target.value, 10))}
            aria-labelledby="ec-slider-label"
            aria-valuetext={t("ec.q4.vol." + band.idx)}
          />
        </div>
        <div className="ec-slider__ticks" aria-hidden="true">
          <span>€0</span><span>€100k</span><span>€500k</span><span>€5m+</span>
        </div>
      </div>

      <Field label={t("ec.q4.tx.label")}>
        <div className="ec-chips" role="radiogroup" aria-label={t("ec.q4.tx.label")} style={{ paddingTop: 6 }}>
          {[
            { v: "low",   k: "ec.q4.tx.low" },
            { v: "med",   k: "ec.q4.tx.med" },
            { v: "high",  k: "ec.q4.tx.high" },
            { v: "vhigh", k: "ec.q4.tx.vhigh" },
          ].map((o) => (
            <button key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={txCount === o.v}
                    className={"ec-chip" + (txCount === o.v ? " is-on" : "")}
                    onClick={() => setTxCount(o.v)}>
              {t(o.k)}
            </button>
          ))}
        </div>
      </Field>

      <WhyWeAsk>{t("ec.q4.why")}</WhyWeAsk>

      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={onNext} iconRight="arrowRight" disabled={!txCount}>
          {t("common.continue")}
        </Button>
      </div>
    </div>
  );
}

function EcCorridors({ corridors, setCorridors, onBack, onNext }) {
  const t = useT();
  const tog = (code) => {
    const next = new Set(corridors);
    next.has(code) ? next.delete(code) : next.add(code);
    setCorridors(next);
  };
  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.back")}
      </button>
      <EcQuestionHeader num="5" title={t("ec.q5.title")} lead={t("ec.q5.lead")} />

      <Field label={t("ec.q5.field.label")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 6 }}>
          {EC_CORRIDOR_GROUPS.map((g) => {
            const items = EC_CORRIDORS.filter((c) => c.group === g.id);
            if (!items.length) return null;
            return (
              <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: "var(--c-muted)", textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}>
                  {t(g.labelKey)}
                </div>
                <div className="ec-chips">
                  {items.map((c) => {
                    const hasFlag = !["APAC", "LATAM", "AFRICA", "ROW"].includes(c.code);
                    return (
                      <button key={c.code} type="button"
                              aria-pressed={corridors.has(c.code)}
                              className={"ec-chip" + (corridors.has(c.code) ? " is-on" : "")}
                              onClick={() => tog(c.code)}>
                        <span className="ec-chip__flag"
                              style={!hasFlag
                                ? { background: "var(--c-accent-soft)", color: "var(--c-primary)",
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: 18, height: 18, borderRadius: "50%" }
                                : undefined}>
                          {hasFlag
                            ? <Flag code={c.code === "EU" ? "EU" : c.code} size={18} />
                            : <EcIco.globe style={{ width: 12, height: 12 }} />}
                        </span>
                        {t("ec.corridor." + c.code)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Field>

      {/* A "Restricted regions — flagged automatically" alert used to
          live here. It promised that sanctioned-jurisdiction profiles
          would be "explained at the result step" — but ecRecommend has
          no sanctions-screening logic, and EC_CORRIDORS already omits
          every sanctioned region (no RU/IR/BY/KP/SY). The alert was
          aspirational copy for a feature that doesn't exist, so it's
          been removed rather than left as a false promise. */}

      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={onNext} iconRight="arrowRight"
                disabled={corridors.size === 0}>
          {t("common.continue")}
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  EcCrypto — Q5 / crypto-exposure
//
//  Two big tappable cards: fiat-only vs crypto-involved. Captured as
//  a separate question (not folded into Q2 industry) because crypto
//  exposure is orthogonal to primary industry — a SaaS company that
//  accepts crypto payments is still "saas" for industry-risk purposes
//  but needs the crypto-capable entity. Q2's "crypto-native" industry
//  option remains valid; it just means a different thing (the business
//  itself is crypto-first), and routing-wise it should usually pair
//  with cryptoExposure === "yes".
//
//  Routing impact (handled in ecRecommend): if the user selects "yes"
//  AND their country is in the EU region, we re-route them from
//  Altery EU (Cyprus, CBC) to Altery Ltd (UK, FCA), because the
//  Cyprus EMI licence doesn't cover crypto-business onboarding. UK
//  is shown an inline alert on this screen too, so the routing
//  switch is never a surprise on the result page.
// ════════════════════════════════════════════════════════════════════════
function EcCrypto({ cryptoExposure, setCryptoExposure, country, onBack, onNext }) {
  const t = useT();
  const countryObj = country ? EC_COUNTRIES.find((c) => c.code === country) : null;
  const willReroute = cryptoExposure === "yes" && countryObj?.region === "eu";
  const countryName = countryObj ? t("ec.country." + countryObj.code) : "";

  const options = [
    { value: "none", icon: "banknote", titleKey: "ec.q6.opt.none.title", descKey: "ec.q6.opt.none.desc" },
    { value: "yes",  icon: "token",    titleKey: "ec.q6.opt.yes.title",  descKey: "ec.q6.opt.yes.desc"  },
  ];

  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.back")}
      </button>
      <EcQuestionHeader num="6" title={t("ec.q6.title")} lead={t("ec.q6.lead")} />

      <Field label={t("ec.q6.field.label")}>
        <div className="ec-cryptoOptions">
          {options.map((opt) => {
            const Ico = EcIco[opt.icon];
            const selected = cryptoExposure === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={"ec-cryptoCard" + (selected ? " is-on" : "")}
                onClick={() => setCryptoExposure(opt.value)}
                aria-pressed={selected}
              >
                <span className="ec-cryptoCard__iconWrap">
                  <Ico style={{ width: 22, height: 22 }} />
                </span>
                <span>
                  <span className="ec-cryptoCard__title">{t(opt.titleKey)}</span>
                  <span className="ec-cryptoCard__desc">{t(opt.descKey)}</span>
                </span>
                <span className="ec-cryptoCard__check" aria-hidden="true">
                  <EcIco.check style={{ width: 12, height: 12 }} />
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Preemptive transparency: if "yes" + EU country, tell the user
          right here that the routing will switch. Better than surprising
          them on the result page. Friendly tone — this is a normal
          business outcome, not a problem with their application. */}
      {willReroute && (
        <Alert tone="info" title={t("ec.q6.alert.reroute.title")}>
          {t("ec.q6.alert.reroute.body", { country: countryName })}
        </Alert>
      )}

      <div className="ob-actions">
        <Button variant="primary" size="xl" onClick={onNext} iconRight="arrowRight"
                disabled={!cryptoExposure}>
          {t("ec.q6.cta")}
        </Button>
      </div>
    </div>
  );
}

function EcResult({ rec, onBack, onReset }) {
  if (rec.kind === "blocked") return <EcResultBlocked rec={rec} onBack={onBack} onReset={onReset} />;
  return <EcResultApproved rec={rec} onBack={onBack} onReset={onReset} />;
}

// ──────────────────── Account preview ────────────────────
// Renders a stack of currency cards showing what the user's actual
// account identifiers will look like after onboarding. For currencies
// where the entity has a local rail (UK GBP, EU EUR, MENA AED/USD)
// the IBAN/sort-code is shown in monospace with realistic format.
// For SWIFT-only currencies (e.g. USD on UK entity) the card honestly
// says "Via SWIFT correspondent" instead of faking a local IBAN.
function EcAccountPreview({ entity }) {
  const t = useT();
  const lang = window.__I18N.getLang();
  // Split accounts so SWIFT-only currencies (those served via
  // correspondent banks rather than a local IBAN) are visually demoted
  // into their own sub-group rather than mixed with the first-class
  // local-rail accounts. Same EcAccountCard for both, but separator +
  // section header signal the operational difference. Pattern adapted
  // from 3S Money's split between supported/unsupported, but our case
  // is "supported with local rail" vs "supported via SWIFT" — both
  // work, just different cost/speed profiles. Honest framing matters.
  const localAccounts = entity.accounts.filter((a) => a.type !== "swift-only");
  const swiftAccounts = entity.accounts.filter((a) => a.type === "swift-only");
  return (
    <div className="ec-accounts">
      <div className="ec-accounts__head">
        <span className="ec-accounts__head__title">{t("ec.account.head")}</span>
        <span className="ec-accounts__head__note">{t("ec.account.previewNote")}</span>
      </div>
      {localAccounts.map((acc) => (
        <EcAccountCard key={acc.currency} account={acc} lang={lang} />
      ))}
      {swiftAccounts.length > 0 && (
        <div className="ec-accounts__swiftGroup">
          <div className="ec-accounts__swiftGroup__head">
            {t("ec.account.swiftGroupHead")}
          </div>
          {swiftAccounts.map((acc) => (
            <EcAccountCard key={acc.currency} account={acc} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

function EcAccountCard({ account, lang }) {
  const t = useT();
  const flagCode = ecCurrencyFlag(account.currency);
  const currencyName = ecCurrencyName(account.currency, lang);
  const isSwiftOnly = account.type === "swift-only";
  // Eligibility-checker scope: show currency identity + rails, NOT the
  // full account fields. Specific IBAN/sort code/BIC values are issued
  // at signup and will differ from any placeholder we'd render here,
  // so showing them would create false expectations and clutter a page
  // whose purpose is "can Altery serve my business?" not "what's my
  // exact account number?". The hero IBAN chip already carries one
  // labeled "Preview" value as a format-trust signal — that's enough.
  return (
    <div className={"ec-account" + (isSwiftOnly ? " ec-account--swift" : "")}>
      <div className="ec-account__header">
        {flagCode && (
          <span className="ec-account__header__flag">
            <Flag code={flagCode} size={24} />
          </span>
        )}
        <span className="ec-account__header__code">{account.currency}</span>
        <span className="ec-account__header__name">{currencyName}</span>
      </div>
      {account.rails.length > 0 && (
        <div className="ec-account__rails">
          {account.rails.map((r) => (
            <span key={r} className="ec-account__rail">{r}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EcFeesModal ────────────────────────────────────────────────
// Surfaces the canonical Altery fee schedule for the active plan
// and the entity the user will be routed to. Opens from the
// "View all fees" link on the plan card. Region (UK-EU vs RoW) is
// derived from entity.id via ecFeeRegion(). Plan-specific items
// — monthly fee, FX cap, SWIFT cap — come from EC_PLANS perk
// text, while all other rows are fixed from EC_FEE_SCHEDULE.
// Footer links to altery.com/fees/business so any number can be
// verified against the canonical source — prototype values stay
// honest, not invented.

function EcResultApproved({ rec, onBack, onReset }) {
  const t = useT();
  const { entity, caveats } = rec;
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

  // Payment modal — opens on "Set up this account" CTA. Hosts the Stripe
  // Payment Element with deferred-flow setup (window.Stripe poll-loaded).
  const [paymentOpen, setPaymentOpen] = useState(false);

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

  // Cost projection — drives the savings card. Same helper that builds
  // the PDF, so on-screen numbers match the email proposal exactly.
  // Returns null when the volume is too small for a meaningful projection;
  // we hide the whole savings card in that case (grid collapses to plan-only).
  //
  // We compute against a virtual rec that swaps in activePlan, so when the
  // user picks a different plan from the comparison modal the savings card
  // (and any downstream views built from `cost`) recompute live against the
  // new subscription. Only `rec.plan` changes inside the override — every
  // other input (volume, services, corridors) stays the user's actual
  // answers, so the projection still reflects how they operate.
  const activeRec = useMemo(
    () => ({ ...rec, plan: activePlan }),
    [rec, activePlan]
  );
  const cost = useMemo(() => ecComputeCostBreakdown(activeRec), [activeRec]);

  // Narrow no-break space (U+202F) as the thousands separator —
  // "€9 500" instead of "€9,500". European convention used across the
  // result-page typography.
  const NBSP = " ";
  const fmtNarrow = (n) => "€" + (n || 0).toLocaleString("en-US").replace(/,/g, NBSP);
  return (
    <div className="ec-content ec-content--wide fade-in">
      <button className="ob-link-back ec-r__backLink" onClick={onBack} type="button">
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.editAnswers")}
      </button>

      <div className="ec-r">
        {/* ───── Hero ─────────────────────────────────────────────────
            Dark gradient card (navy → midnight) with eyebrow + two-line
            title (entity in white, "is built for the X plan" in light
            blue accent) + lead paragraph + 2 pills (entity status, +
            crypto-fluent for crypto users) + IBAN preview chip. */}
        <header className="ec-r__hero">
          <div className="ec-r__hero__inner">
            <div className="ec-r__heroEyebrow">
              <span className="ec-r__heroEyebrow__dot" />
              {t(isOnRecommended ? "ec.r.eyebrow" : "ec.r.eyebrow.selected")}
            </div>
            <h1 className="ec-r__heroTitle">
              <span className="ec-r__heroTitle__entity">{entityName}</span>
              <span className="ec-r__heroTitle__rest">
                {t("ec.r.title.middle")} <b>{planName}</b>{t("ec.r.title.after")}
              </span>
            </h1>
            <p className="ec-r__heroLead">
              {t("ec.r.lead", { entity: entityName, licence: entityLicence, note: entityNote })}
            </p>

            <div className="ec-r__pills">
              <span className="ec-r__pill ec-r__pill--live">
                <span className="ec-r__pill__dot" />
                {t("ec.r.entity.status", { licence: entityLicence })}
              </span>
              {rec.cryptoActive && (
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

        {/* ───── Savings + Plan, side by side ────────────────────────
            Two equal cards on desktop; stack on narrow screens. */}
        <div className="ec-r__grid">
          {cost && cost.savings && cost.savings.monthly >= 100 && (
            <section className="ec-r__card ec-r__savings">
              <div className="ec-r__cardEyebrow">{t("ec.r.savings.head")}</div>
              <div className="ec-r__compare">
                <div className="ec-r__compare__col">
                  <div className="ec-r__compare__label">{t("ec.r.savings.bank")}</div>
                  <div className="ec-r__compare__amount ec-r__compare__amount--strike">{fmtNarrow(cost.bank.total)}</div>
                  <div className="ec-r__compare__cycle">{t("ec.r.savings.cycle")}</div>
                </div>
                <div className="ec-r__compare__arrow" aria-hidden="true">
                  <EcIco.arrowRight style={{ width: 20, height: 20 }} />
                </div>
                <div className="ec-r__compare__col ec-r__compare__col--us">
                  <div className="ec-r__compare__label">{t("ec.r.savings.altery")}</div>
                  <div className="ec-r__compare__amount">{fmtNarrow(cost.altery.total)}</div>
                  <div className="ec-r__compare__cycle">{t("ec.r.savings.cycle")}</div>
                </div>
              </div>
              <div className="ec-r__savingsHero">
                <div className="ec-r__savingsHero__label">{t("ec.r.savings.heroLabel")}</div>
                <div className="ec-r__savingsHero__amount">
                  {fmtNarrow(cost.savings.monthly)}<span className="ec-r__savingsHero__cycle">{t("ec.r.savings.cycle")}</span>
                </div>
                <div className="ec-r__savingsHero__year">
                  {t("ec.r.savings.year", { amount: fmtNarrow(cost.savings.annual) })}
                </div>
              </div>
              <p className="ec-r__savings__note">
                {t("ec.r.savings.note", { volume: ecFormatVolume(rec.monthlyVolume) })}
              </p>
            </section>
          )}

          <section className="ec-r__card ec-r__plan2">
            <div className="ec-r__planHead">
              <div>
                <div className="ec-r__cardEyebrow">{t("ec.r.plan.eyebrow", { plan: planName })}</div>
                <div className="ec-r__planFit">{t(activePlan.fitKey)}</div>
              </div>
              <div className="ec-r__planPrice">
                <span className="ec-r__planPrice__amount">
                  {activePlan.priceKey ? t(activePlan.priceKey) : activePlan.price}
                </span>
                <span className="ec-r__planPrice__cycle">{t(activePlan.cycleKey)}</span>
              </div>
            </div>
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
                <div className="ec-r__planAlt__body">
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
              {activePlan.perkKeys.slice(0, 5).map((k, i) => (
                <li className="ec-r__perk" key={i}>
                  <span className="ec-r__perk__tick" aria-hidden="true">
                    <EcIco.check style={{ width: 11, height: 11 }} />
                  </span>
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
            <div className="ec-r__planFoot">
              <button type="button" className="ec-r__planFoot__link" onClick={() => setComparisonOpen(true)}>
                {t("ec.r.plan.compareAll")}
              </button>
              <span className="ec-r__planFoot__sub">{t("ec.r.plan.switch")}</span>
            </div>
          </section>
        </div>

        {/* ───── EcPerks slider — kept from prior design per user
            request. Horizontal scroll-snap of Altery product capabilities
            (Multi-entity / Multi-user / API / Cards / Mass payments)
            with cover images. Sits between the grid (savings + plan)
            and the coverage strip. */}
        <EcPerks services={rec.services} />

        {/* ───── Coverage strip ─────────────────────────────────── */}
        <section className="ec-r__coverage">
          <div className="ec-r__cardEyebrow">{t("ec.r.cards.countries")}</div>
          <div className="ec-r__coverage__row">
            <div className="ec-r__coverage__flags">
              {entity.countries.map((c) => (
                <span key={c} className="ec-r__coverage__flag">
                  <Flag code={c} size={20} />
                  <span>{t("ec.country." + c)}</span>
                </span>
              ))}
            </div>
            <div className="ec-r__coverage__more">
              <span className="ec-r__coverage__moreIcon" aria-hidden="true">
                <EcIco.globe style={{ width: 14, height: 14 }} />
              </span>
              {t("ec.r.cards.countriesMore")}
            </div>
          </div>
        </section>

        {/* ───── Caveats (only if any) ──────────────────────────── */}
        {caveats.length > 0 && (
          <section className="ec-r__caveats">
            <div className="ec-r__cardEyebrow">
              <EcIco.alert style={{ width: 14, height: 14, marginRight: 6, verticalAlign: -2 }} aria-hidden="true" />
              {t("ec.r.caveats.head")}
            </div>
            <ul className="ec-r__caveatsList">
              {caveats.map((c, i) => (
                <li className="ec-r__caveatsRow" key={i}>
                  <Tag tone={c.tone} size="sm">{t(c.tagKey)}</Tag>
                  <span>{t(c.textKey, c.vars || {})}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

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

      {paymentOpen && (
        <EcPaymentModal
          activePlan={activePlan}
          onClose={() => setPaymentOpen(false)}
        />
      )}
    </div>
  );
}
function EcResultBlocked({ rec, onBack, onReset }) {
  const t = useT();
  // Industry name is interpolated as lowercase to read naturally inside
  // the sentence ("…can't open accounts for gambling right now"). Uses
  // toLocaleLowerCase to handle non-Latin scripts safely (Turkish "İ"→"i"
  // edge case especially).
  const industryLabel = t(rec.reasonKey).toLocaleLowerCase(window.__I18N.getLang());
  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.editAnswers")}
      </button>
      <div className="ec-result ec-result--guarded">
        <div className="ec-result__hero">
          <div className="ec-result__heroEyebrow">{t("ec.b.eyebrow")}</div>
          <h1 className="ec-result__heroTitle">
            {t("ec.b.title.a")}{" "}
            <span className="ec-result__hero__accent">{industryLabel}</span>{" "}
            {t("ec.b.title.b")}
          </h1>
          <p className="ec-result__heroLead">{t("ec.b.lead")}</p>
        </div>
        <div className="ec-caveats">
          <div className="ec-caveats__head">{t("ec.b.head")}</div>
          <ul className="ec-caveats__list">
            <li className="ec-caveats__row">
              <span className="ec-tagslot"><Tag tone="blue" size="sm">{t("ec.b.row1.tag")}</Tag></span>
              <span>{t("ec.b.row1.text")}</span>
            </li>
            <li className="ec-caveats__row">
              <span className="ec-tagslot"><Tag tone="grey" size="sm">{t("ec.b.row2.tag")}</Tag></span>
              <span>{t("ec.b.row2.text")}</span>
            </li>
          </ul>
        </div>
        <div className="ec-actions">
          <Button variant="primary" size="xl" onClick={onReset}>{t("ec.b.cta")}</Button>
          <Button variant="outline" size="xl"
                  onClick={() => window.open("mailto:business@altery.com", "_blank")}>
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
  EcCountry, EcIndustry, EcServices, EcVolume, EcCorridors, EcCrypto,
  EcResult, EcAccountPreview, EcAccountCard,
  EcResultApproved, EcResultBlocked,
});
