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

const { useState, useEffect, useRef, useMemo, useLayoutEffect } = React;

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
  // ─── Intro value-card icons ──────────────────────────────
  // Three Tabler icons (MIT-licensed) used in the intro screen's
  // value cards. Chosen over generic globe/info/alert to give each
  // card a content-specific visual hook:
  //   • route — two waypoints with an S-curve path between them.
  //     Communicates "we route you to the right entity first time"
  //     for Card 1's "No 'wrong entity' restart" value-prop.
  //   • eye — classic eye shape with pupil. Communicates
  //     transparency / visibility for Card 2's "Caveats now, not
  //     after KYB" — we *show* you the limitations upfront.
  //   • ban — universal "prohibited" symbol (circle with diagonal
  //     slash). Communicates blocked / not-allowed for Card 3's
  //     "Fast no's, not slow no's" — clearer than a generic alert.
  // All three use stroke-width 1.6 to match the rest of EcIco's
  // outline family (chess pieces, search, copy, close, info).
  route: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4"/><path d="M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5"/></svg>,
  eye: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/></svg>,
  ban: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M5.7 5.7l12.6 12.6"/></svg>,
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
  // emphasis ordering. Default pre-selects "accounts" + "crossBorder"
  // — universal needs for any digital business looking at Altery, so
  // picking them up-front means a fresh user only ticks specialist
  // extras (mass/cards/multiUser/multiEntity/API/crypto).
  const [services, setServices] = useState(new Set(["accounts", "crossBorder"]));
  const [volumeIdx, setVolumeIdx] = useState(2);
  const [corridors, setCorridors] = useState(new Set());
  const [txCount, setTxCount] = useState("med");

  const totalSteps = TOTAL_STEPS;
  const monthlyVolume = EC_VOLUME_BANDS[volumeIdx]?.value || 0;
  const recommendation = useMemo(() =>
    ecRecommend({ countryCode: country, industry, businessType, monthlyVolume, corridors: [...corridors], txCount, services: [...services] }),
  [country, industry, businessType, monthlyVolume, corridors, txCount, services]);

  // Simple step navigation — no conditional skip needed. Q6 (Crypto
  // exposure) was removed because asking again after the user has
  // already declared their industry + services felt redundant in
  // both directions: crypto-native users see "do you handle crypto?"
  // as wasted friction; non-crypto users see it as an out-of-place
  // detour. Edge cases (a SaaS that accepts some USDC) flow to KYB
  // review during onboarding — rare enough to handle there.
  const back  = () => { setDirection("back");    setStep((s) => Math.max(0, s - 1)); };
  const next  = () => { setDirection("forward"); setStep((s) => Math.min(totalSteps + 1, s + 1)); };
  const reset = () => { setDirection("back");    setStep(0); };

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
        {step === 1 && <EcIndustry industry={industry} setIndustry={setIndustry} businessType={businessType} setBusinessType={setBusinessType} onBack={() => { setDirection("back"); setStep(0); }} onNext={next} />}
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
      <Title display
        eyebrow={t("ec.intro.eyebrow")}
        title={t("ec.intro.title")}
        lead={t("ec.intro.lead", { total: TOTAL_STEPS })} />

      <div className="ec-value">
        <div className="ec-value__row">
          <span className="ec-value__icon"><EcIco.route style={{ width: 18, height: 18 }} /></span>
          <div>
            <div className="ec-value__title">{t("ec.intro.value1.title")}</div>
            <div className="ec-value__body">{t("ec.intro.value1.body")}</div>
          </div>
        </div>
        <div className="ec-value__row">
          <span className="ec-value__icon" style={{ background: "var(--c-success-soft)", color: "var(--c-success)" }}><EcIco.eye style={{ width: 18, height: 18 }} /></span>
          <div>
            <div className="ec-value__title">{t("ec.intro.value2.title")}</div>
            <div className="ec-value__body">{t("ec.intro.value2.body")}</div>
          </div>
        </div>
        <div className="ec-value__row">
          <span className="ec-value__icon" style={{ background: "var(--c-warning-soft)", color: "var(--c-warning)" }}><EcIco.ban style={{ width: 18, height: 18 }} /></span>
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

  const metaFor = (c) =>
    c.corporate ? t("ec.q2.tag.corporate")
    : c.region === "uk"   ? t("ec.q2.tag.uk")
    : c.region === "eu"   ? t("ec.q2.tag.eu")
    : c.region === "mena" ? t("ec.q2.tag.mena")
    : t("ec.q2.tag.row");

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

  const renderRow = (c) => (
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
      <span className="ec-country-row__meta">{metaFor(c)}</span>
    </button>
  );

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

function EcIndustry({ industry, setIndustry, businessType, setBusinessType, onBack, onNext }) {
  const t = useT();
  const ind = EC_INDUSTRIES.find((i) => i.value === industry);
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

      {ind?.risk === "blocked" && (
        <Alert tone="danger" title={t("ec.q1.alert.blocked.title")}>
          {t("ec.q1.alert.blocked.body", { industry: t(ind.labelKey).toLowerCase() })}
        </Alert>
      )}
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
        <Button variant="primary" size="xl" onClick={onNext} iconRight="arrowRight"
                disabled={!industry || !businessType}>
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

  // Handoff modal — bridge between anonymous result and committed
  // onboarding. Captures email + reassurance summary before user
  // proceeds to Stripe payment setup. See EcHandoffModal docblock.
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

  const entityName = t(entity.nameKey);
  const entityLicence = t(entity.licenceKey);
  const entityNote = t(entity.noteKey);

  // Primary identifier for the hero IBAN chip — the operationally most
  // relevant account for this entity. UK → GBP local, EU → EUR IBAN,
  // MENA → USD AE-IBAN. May be null if entity's primary is SWIFT-only
  // (then we just don't show the chip — better than faking a number).
  const heroIban = ecHeroIdentifier(entity);
  const heroIbanFlag = heroIban ? ecCurrencyFlag(heroIban.currency) : null;

  return (
    <div className="ec-content fade-in">
      <button className="ob-link-back" onClick={onBack} type="button" style={{ alignSelf: "flex-start" }}>
        <EcIco.arrowLeft style={{ width: 14, height: 14 }} /> {t("common.editAnswers")}
      </button>

      <div className="ec-result">
        {/* Hero — solid navy, accent text via semantic span (not <b> for color) */}
        <div className="ec-result__hero">
          {/* Persona line — small framing tag for ICP-aligned industries.
              Names what the persona DOES (multi-platform revenue / store
              payouts / instructor pay), not what Altery offers. Sets up
              the whole result page as "we read your industry and tailored
              this". Skipped for generic industries (ecom/marketplace/
              prof/other) — they get the standard hero only. */}
          {rec.ind && ["saas","apps","games","edtech","affiliate","creator","crypto"].includes(rec.ind.value) && (
            <div className="ec-result__personaLine">
              {t("ec.r.persona." + rec.ind.value + ".line")}
            </div>
          )}
          <div className="ec-result__heroEyebrow">
            {t(isOnRecommended ? "ec.r.eyebrow" : "ec.r.eyebrow.selected")}
          </div>
          <h1 className="ec-result__heroTitle">
            <span className="ec-result__hero__accent">{entityName}</span><br />
            {t("ec.r.title.middle")}{" "}
            <span className="ec-result__hero__accent">{planName}</span>
            {t("ec.r.title.after")}
          </h1>
          <p className="ec-result__heroLead">
            {t("ec.r.lead", { entity: entityName, licence: entityLicence, note: entityNote })}
          </p>
          <div className="ec-result__badges">
            <div className="ec-result__entity">
              <span className="ec-result__dot" aria-hidden="true" />
              {t("ec.r.entity.status", { licence: entityLicence })}
            </div>
            {/* Crypto-fluent badge — shown for any user with crypto
                signal (industry = "Crypto & Web3" OR services include
                crypto rails), not just the EU→UK reroute case.
                UK/MENA/ROW crypto users get the same visible
                acknowledgment. The reroute callout below explains the
                entity change specifically when it happened; this badge
                is broader — "we work with crypto businesses, period". */}
            {rec.cryptoActive && (
              <div className="ec-result__cryptoBadge">
                <EcIco.token style={{ width: 14, height: 14 }} aria-hidden="true" />
                {t("ec.r.crypto.fluent")}
              </div>
            )}
          </div>

          {/* Primary identifier chip — the "this is your account" moment.
              Sits below the licence pill; flag + currency code + actual
              IBAN (or sort+account for UK GBP local) in monospace, with
              an explicit "Preview" badge so users don't mistake it for
              their real number. Skipped for SWIFT-only primaries. */}
          {heroIban && (
            <div className="ec-result__primaryIban" aria-label={`${heroIban.currency} ${heroIban.value}`}>
              {heroIbanFlag && (
                <span className="ec-result__primaryIban__flag">
                  <Flag code={heroIbanFlag} size={22} />
                </span>
              )}
              <span className="ec-result__primaryIban__currency">{heroIban.currency}</span>
              <span className="ec-result__primaryIban__sep" aria-hidden="true" />
              <span className="ec-result__primaryIban__value">{maskTailDots(heroIban.value)}</span>
            </div>
          )}
        </div>

        {/* Crypto-reroute callout — only when EU + crypto exposure forced
            a switch from Altery EU (Cyprus, CBC) to Altery Ltd (UK, FCA).
            Sits between the hero (which already shows the FINAL entity)
            and the account preview, so it reads as "here's why your
            entity is UK", not as a buried footnote. Caveats below are
            for things-to-know; this is a routing-decision explainer,
            which is a different category and deserves its own visual
            slot. We pass the country's localised name in so the body
            can read naturally ("Your Germany incorporation…"). */}
        {rec.cryptoReroute && (
          <div className="ec-result__reroute">
            <span className="ec-result__reroute__icon" aria-hidden="true">
              <EcIco.info style={{ width: 18, height: 18 }} />
            </span>
            <div className="ec-result__reroute__body">
              <div className="ec-result__reroute__title">
                {t("ec.r.reroute.title")}
              </div>
              <div className="ec-result__reroute__text">
                {t("ec.r.reroute.body", { country: rec.country ? t("ec.country." + rec.country.code) : "" })}
              </div>
            </div>
          </div>
        )}

        {/* "Your opportunity" hook block — the conversion lever.
            Computes the Altery-vs-bank monthly cost projection
            with the same helper that drives the PDF, so what the
            user sees on screen is exactly what arrives in their
            inbox. Two psychological levers stacked: (1) specific
            personalised numbers based on their stated volume,
            which converts generic marketing into "this is about
            me", and (2) loss framing ("leaving on the table"
            rather than "could save") because loss aversion is
            ~2× stronger than gain motivation. The closing line
            explicitly creates a curiosity gap that the email PDF
            resolves — driving capture rates on the handoff CTA. */}
        {(() => {
          const cost = ecComputeCostBreakdown(rec);
          if (!cost || cost.savings.monthly < 100) return null;
          const fmt = (n) => "€" + (n || 0).toLocaleString("en-US");
          return (
            <div className="ec-opportunity">
              <div className="ec-opportunity__eyebrow">{t("ec.r.opportunity.head")}</div>
              <p className="ec-opportunity__lead">
                {t("ec.r.opportunity.lead", {
                  volume: ecFormatVolume(rec.monthlyVolume),
                  bankCost: fmt(cost.bank.total),
                  alteryCost: fmt(cost.altery.total),
                })}
              </p>
              <div className="ec-opportunity__band">
                <div className="ec-opportunity__band__label">{t("ec.r.opportunity.leaving")}</div>
                <div className="ec-opportunity__band__row">
                  <div className="ec-opportunity__band__monthly">
                    {fmt(cost.savings.monthly)}
                    <span className="ec-opportunity__band__per">{t("ec.r.opportunity.perMonth")}</span>
                  </div>
                  <div className="ec-opportunity__band__annual">
                    {t("ec.r.opportunity.annualPrefix")} <strong>{fmt(cost.savings.annual)}</strong> {t("ec.r.opportunity.annualSuffix")}
                  </div>
                </div>
              </div>
              <div className="ec-opportunity__note">{t("ec.r.opportunity.note")}</div>
            </div>
          );
        })()}

        {/* "Why we recommend X" reasoning block — the gold-tier
            conversion moment. 3 dynamic bullets that cite the user's
            own answers back ("Your €175k/mo crosses…", "Mass payouts
            you selected…"). Generated in ecRecommend based on which
            signals pushed the user to this tier; rendered here as
            primary supporting evidence for the plan card below. */}
        {rec.reasoning && rec.reasoning.length > 0 && (
          <div className="ec-reasoning">
            <div className="ec-reasoning__head">
              {t("ec.r.reasoning.head", { plan: t(rec.plan.nameKey) })}
            </div>
            <ul className="ec-reasoning__list">
              {rec.reasoning.map((b, i) => (
                <li key={i} className="ec-reasoning__item">
                  <span className="ec-reasoning__check" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="ec-reasoning__text">{t(b.key, b.vars || {})}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Plan card — moved up from "after capabilities" to "right after
            hero/reroute" so price + perks land in the user's first
            visible scroll. The hero answers "what entity" + "which plan
            name"; this card answers "how much" + "what's included" —
            they're tightly coupled questions that should be adjacent.
            Layout: [icon-box] [name + tagline] ────── [price] / perks.
            Reflects active plan — recommended OR user-overridden via the
            comparison modal. */}
        <div className="ec-plan">
          <div className="ec-plan__head">
            <div className="ec-plan__nameBlock">
              <div className="ec-plan__iconBox">
                <EcPlanIcon iconKey={activePlan.iconKey} size={22} />
              </div>
              <div className="ec-plan__name">
                <b>{planName}</b>
                <span>{t(activePlan.taglineKey)}</span>
              </div>
            </div>
            <div className="ec-plan__price">
              {activePlan.priceKey ? t(activePlan.priceKey) : activePlan.price} <small>{t(activePlan.cycleKey)}</small>
            </div>
          </div>
          {/* "Suitable for" — extends the tagline with concrete customer-
              profile copy from plan.fitKey. Reuses the same translations
              the modal's compare-card uses (ec.r.plan.compare.fitsHead +
              ec.plan.*.fit) so the recommendation reads identically on
              the main card and inside the compare modal. */}
          <div className="ec-plan__fits">
            <div className="ec-plan__fits__head">{t("ec.r.plan.compare.fitsHead")}</div>
            <div className="ec-plan__fits__text">{t(activePlan.fitKey)}</div>
          </div>
          <div className="ec-plan__perks">
            {/* Entity-specific currency perk — sits at the top of the
                perks list using the same visual treatment as plan
                perks (check icon + line). Text varies by entity so
                user sees the actual currency/rail story for the
                jurisdiction they'll be routed to (UK gets GBP+EUR
                local, EU gets SEPA Instant, MENA gets USD+AED local).
                Replaces the old EcAccountPreview panel, which took
                ~450px to convey the same information visually. */}
            {entity.currencyPerkKey && (
              <div className="ec-plan__perk">
                <EcIco.check className="ec-plan__perk__tick" style={{ width: 16, height: 16 }} />
                <span>{t(entity.currencyPerkKey)}</span>
              </div>
            )}
            {activePlan.perkKeys.map((k, i) => (
              <div className="ec-plan__perk" key={i}>
                <EcIco.check className="ec-plan__perk__tick" style={{ width: 16, height: 16 }} />
                <span>{t(k)}</span>
              </div>
            ))}
          </div>
          {/* Fee preview — top 4 per-transaction fees inline so B2B
              users can estimate operational cost without opening the
              full fees modal. Values pulled from EC_FEE_SCHEDULE for
              the active entity's region (UK/EU vs RoW). FX markup is
              plan-tier-specific (Starter 0.8% / Pro 0.7% / Ultra 0.5%
              — canonical Altery data). "See full schedule →" link
              routes to the same EcFeesModal as the (now-removed)
              duplicate "View all fees" link previously did. */}
          {(() => {
            const region = ecFeeRegion(entity);
            const schedule = EC_FEE_SCHEDULE[region];
            const fxByPlan = { starter: "0.8%", pro: "0.7%", ultra: "0.5%" };
            const subscriptionPrice = activePlan.priceKey ? t(activePlan.priceKey) : activePlan.price;
            const subscriptionCycle = t(activePlan.cycleKey);
            return (
              <div className="ec-plan__feePreview">
                <div className="ec-plan__feePreview__head">
                  <span className="ec-plan__feePreview__title">{t("ec.r.fees.head")}</span>
                  <a
                    role="button"
                    tabIndex={0}
                    className="ec-plan__feePreview__link"
                    onClick={() => setFeesOpen(true)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFeesOpen(true); } }}
                  >
                    {t("ec.r.fees.seeAll")}
                  </a>
                </div>
                <div className="ec-plan__feePreview__list">
                  <div className="ec-plan__feePreview__row">
                    <span className="ec-plan__feePreview__label">{t("ec.r.fees.subscription")}</span>
                    <span className="ec-plan__feePreview__value">{subscriptionPrice} {subscriptionCycle}</span>
                  </div>
                  <div className="ec-plan__feePreview__row">
                    <span className="ec-plan__feePreview__label">{t("ec.r.plan.compare.fee.sepa")}</span>
                    <span className="ec-plan__feePreview__value">{schedule.sepa}</span>
                  </div>
                  <div className="ec-plan__feePreview__row">
                    <span className="ec-plan__feePreview__label">{t("ec.r.plan.compare.fee.swift")}</span>
                    <span className="ec-plan__feePreview__value">{schedule.swiftEurOut}</span>
                  </div>
                  <div className="ec-plan__feePreview__row">
                    <span className="ec-plan__feePreview__label">{t("ec.r.plan.compare.fee.fxMarkup")}</span>
                    <span className="ec-plan__feePreview__value">{fxByPlan[activePlan.id]}</span>
                  </div>
                </div>
              </div>
            );
          })()}
          {/* Secondary actions — Compare opens the plan-comparison
              modal. The old "View all fees" link was removed when
              the fee preview gained its own "See full schedule →"
              link inside the preview block — consolidating two
              fees-related actions into one. */}
          <div className="ec-plan__links">
            <a
              role="button"
              tabIndex={0}
              onClick={() => setComparisonOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setComparisonOpen(true); } }}
            >
              {t("ec.r.plan.compareAll")}
            </a>
          </div>
          <div className="ec-plan__switch">
            {t("ec.r.plan.switch")}
          </div>
        </div>

        {/* Supported countries — kept as compact list under plan */}
        <div className="ec-capabilities">
          <div className="ec-capabilities__section">
            <div className="ec-capabilities__head">{t("ec.r.cards.countries")}</div>
            <div className="ec-capabilities__items">
              {entity.countries.map((c) => (
                <div key={c} className="ec-capabilities__item">
                  <span className="ec-capabilities__item__flag"><Flag code={c} size={22} /></span>
                  <span className="ec-capabilities__item__name">{t("ec.country." + c)}</span>
                </div>
              ))}
              <div className="ec-capabilities__item ec-capabilities__item--more">
                <span className="ec-capabilities__item__flag" aria-hidden="true" style={{
                  background: "var(--c-bg-2)", display: "inline-flex",
                  alignItems: "center", justifyContent: "center"
                }}>
                  <EcIco.globe style={{ width: 14, height: 14, color: "var(--c-muted)" }} />
                </span>
                <span>{t("ec.r.cards.countriesMore")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Altery's actual product solutions surfaced as a horizontal
            scroll-snap slider — Multi-entity account, Multi-user
            access, API, Business cards, Mass payments. Copy + creative
            assets pulled directly from altery.com/business. Distinct
            from plan perks (which vary by tier and live in the plan
            card above) — these are entity-/plan-agnostic features. */}
        <EcPerks services={rec.services} />

        {/* Caveats — quiet section, no alert icon, no card chrome */}
        {caveats.length > 0 && (
          <div className="ec-caveats">
            <div className="ec-caveats__head">{t("ec.r.caveats.head")}</div>
            <ul className="ec-caveats__list">
              {caveats.map((c, i) => (
                <li className="ec-caveats__row" key={i}>
                  <span className="ec-tagslot"><Tag tone={c.tone} size="sm">{t(c.tagKey)}</Tag></span>
                  <span>{t(c.textKey, c.vars || {})}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bank rejection history — optional. Sales-gold signal:
            if user says yes, sales has a strong outreach hook. The
            block is deliberately subtle (muted card, secondary
            styling) so it never competes with the primary CTA. */}
        <EcBankHistory />

        <div className="ec-actions">
          <Button
            variant="primary"
            size="xl"
            iconRight="arrowRight"
            onClick={() => setHandoffOpen(true)}
          >
            {t("ec.r.cta.continue")}
          </Button>
          <Button variant="outline" size="xl" onClick={onReset}>
            {t("common.startOver")}
          </Button>
        </div>

        {/* Support footer — quiet, single-line. Lives below CTAs so it
            doesn't compete with the primary action but is reachable
            without scrolling past the recommendation. Pattern adapted
            from 3S Money's footer; their version also includes
            "Progress automatically saved" + phone number, both of
            which we skip here: we don't have session-resume yet, and
            a public hotline isn't set up. Honest minimum: an email
            channel. Both prefix text and email are localised so the
            support address can be region-specific in future without
            code changes. */}
        <div className="ec-support">
          <span>{t("ec.support.questionsPrefix")}</span>{" "}
          <a className="ec-support__link" href={"mailto:" + t("ec.support.email")}>
            {t("ec.support.email")}
          </a>
        </div>
      </div>

      {/* Plan comparison modal — mounted conditionally; portaled to body
          by the component itself to escape transform-creating ancestors. */}
      {comparisonOpen && (
        <EcPlanComparisonModal
          activePlanId={activePlan.id}
          recommendedPlanId={recommendedPlan.id}
          onSelect={(planId) => {
            // Selecting the recommended plan again clears the override
            // so the page reverts to "Recommended for your business"
            // framing. Selecting any other plan sets the override.
            setSelectedPlanId(planId === recommendedPlan.id ? null : planId);
            setComparisonOpen(false);
          }}
          onClose={() => setComparisonOpen(false)}
        />
      )}

      {/* Fees modal — canonical Altery fee schedule for the active
          plan and entity region. Opens from the "View all fees" link
          on the plan card. */}
      {feesOpen && (
        <EcFeesModal
          plan={activePlan}
          entity={entity}
          onClose={() => setFeesOpen(false)}
        />
      )}

      {/* Handoff modal — soft email capture before Stripe. Continue
          path chains to payment; email-only path stays in modal with
          success state. See EcHandoffModal docblock for full flow. */}
      {handoffOpen && (
        <EcHandoffModal
          rec={rec}
          onClose={() => setHandoffOpen(false)}
          onContinueToSetup={() => {
            setHandoffOpen(false);
            // Hand off to the onboarding flow (separate page at
            // /setup/). The user has already chosen the plan and
            // entity in the checker — pass both via URL params so
            // the onboarding can pre-fill the payment screen and
            // skip the generic prep checklist. Currency follows
            // the entity: GBP for UK, EUR for EU/MENA. Volume is
            // a hint, not yet used downstream. Payment happens at
            // the end of onboarding, before submit — replaces the
            // pre-onboarding Stripe modal.
            const params = new URLSearchParams({
              token:    ecGenProposalRef(),
              plan:     activePlan.id,
              entity:   rec.entity.id,
              currency: rec.entity.id === "uk" ? "GBP" : "EUR",
              volume:   String(rec.monthlyVolume || ""),
            });
            window.location.href = "/setup?" + params.toString();
          }}
        />
      )}

      {/* Payment modal — Stripe Payment Element on the active plan.
          Opens from the "Set up this account" CTA. Demo wiring; real
          charge requires backend PaymentIntent creation (marked TODO
          in EcPaymentModal.handlePay). */}
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
  EcIco,
  EcIntro, EcQuestionHeader,
  EcCountry, EcIndustry, EcServices, EcVolume, EcCorridors, EcCrypto,
  EcResult, EcAccountPreview, EcAccountCard,
  EcResultApproved, EcResultBlocked,
});
