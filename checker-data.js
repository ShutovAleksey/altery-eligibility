// checker-data.js — Eligibility-checker data constants
//
// Pure data, no JSX. Loaded as a classic <script> in index.html before the
// inline text/babel block that defines screens & helpers. Exports everything
// to window via Object.assign at the bottom so the inline block (and any
// future extracted helpers/screens) can read these via the standard scope
// chain (e.g. `EC_COUNTRIES` resolves to `window.EC_COUNTRIES`).

const EC_COUNTRIES = [
  // Europe
  { code: "AD", name: "Andorra", region: "row", group: "europe" },
  { code: "AT", name: "Austria", region: "eu", group: "europe" },
  { code: "BE", name: "Belgium", region: "eu", group: "europe" },
  { code: "BG", name: "Bulgaria", region: "eu", group: "europe" },
  { code: "HR", name: "Croatia", region: "eu", group: "europe" },
  { code: "CY", name: "Cyprus", region: "eu", group: "europe" },
  { code: "CZ", name: "Czechia", region: "eu", group: "europe" },
  { code: "DK", name: "Denmark", region: "eu", group: "europe" },
  { code: "EE", name: "Estonia", region: "eu", group: "europe" },
  { code: "FI", name: "Finland", region: "eu", group: "europe" },
  { code: "FR", name: "France", region: "eu", group: "europe" },
  { code: "DE", name: "Germany", region: "eu", group: "europe" },
  { code: "GI", name: "Gibraltar", region: "row", group: "europe" },
  { code: "GR", name: "Greece", region: "eu", group: "europe" },
  { code: "GG", name: "Guernsey", region: "row", group: "europe", corporate: true },
  { code: "HU", name: "Hungary", region: "eu", group: "europe" },
  { code: "IS", name: "Iceland", region: "eu", group: "europe" },
  { code: "IE", name: "Ireland", region: "eu", group: "europe" },
  { code: "IM", name: "Isle of Man", region: "row", group: "europe", corporate: true },
  { code: "IT", name: "Italy", region: "eu", group: "europe" },
  { code: "JE", name: "Jersey", region: "row", group: "europe" },
  { code: "LV", name: "Latvia", region: "eu", group: "europe" },
  { code: "LI", name: "Liechtenstein", region: "eu", group: "europe" },
  { code: "LT", name: "Lithuania", region: "eu", group: "europe" },
  { code: "LU", name: "Luxembourg", region: "eu", group: "europe" },
  { code: "MT", name: "Malta", region: "eu", group: "europe" },
  { code: "MD", name: "Moldova", region: "row", group: "europe" },
  { code: "MC", name: "Monaco", region: "row", group: "europe" },
  { code: "NL", name: "Netherlands", region: "eu", group: "europe" },
  { code: "MK", name: "North Macedonia", region: "row", group: "europe" },
  { code: "NO", name: "Norway", region: "eu", group: "europe" },
  { code: "PL", name: "Poland", region: "eu", group: "europe" },
  { code: "PT", name: "Portugal", region: "eu", group: "europe" },
  { code: "RO", name: "Romania", region: "eu", group: "europe" },
  { code: "SM", name: "San Marino", region: "row", group: "europe" },
  { code: "SK", name: "Slovakia", region: "eu", group: "europe" },
  { code: "SI", name: "Slovenia", region: "eu", group: "europe" },
  { code: "ES", name: "Spain", region: "eu", group: "europe" },
  { code: "SE", name: "Sweden", region: "eu", group: "europe" },
  { code: "CH", name: "Switzerland", region: "row", group: "europe" },
  { code: "UA", name: "Ukraine", region: "row", group: "europe" },
  { code: "GB", name: "United Kingdom", region: "uk", group: "europe" },
  // Asia & Pacific
  { code: "AM", name: "Armenia", region: "row", group: "asia" },
  { code: "AU", name: "Australia", region: "row", group: "asia" },
  { code: "AZ", name: "Azerbaijan", region: "row", group: "asia", corporate: true },
  { code: "BN", name: "Brunei Darussalam", region: "row", group: "asia", corporate: true },
  { code: "CX", name: "Christmas Island", region: "row", group: "asia", corporate: true },
  { code: "CC", name: "Cocos (Keeling) Islands", region: "row", group: "asia", corporate: true },
  { code: "GE", name: "Georgia", region: "row", group: "asia" },
  { code: "HK", name: "Hong Kong", region: "row", group: "asia" },
  { code: "JP", name: "Japan", region: "row", group: "asia" },
  { code: "KZ", name: "Kazakhstan", region: "row", group: "asia" },
  { code: "KG", name: "Kyrgyzstan", region: "row", group: "asia" },
  { code: "MY", name: "Malaysia", region: "row", group: "asia", corporate: true },
  { code: "MH", name: "Marshall Islands", region: "row", group: "asia", corporate: true },
  { code: "NR", name: "Nauru", region: "row", group: "asia", corporate: true },
  { code: "NZ", name: "New Zealand", region: "row", group: "asia" },
  { code: "NU", name: "Niue", region: "row", group: "asia", corporate: true },
  { code: "PW", name: "Palau", region: "row", group: "asia", corporate: true },
  { code: "PH", name: "Philippines", region: "row", group: "asia", corporate: true },
  { code: "SG", name: "Singapore", region: "row", group: "asia" },
  { code: "LK", name: "Sri Lanka", region: "row", group: "asia" },
  { code: "TH", name: "Thailand", region: "row", group: "asia" },
  { code: "UZ", name: "Uzbekistan", region: "row", group: "asia" },
  // Americas
  { code: "AI", name: "Anguilla", region: "row", group: "americas", corporate: true },
  { code: "AG", name: "Antigua and Barbuda", region: "row", group: "americas", corporate: true },
  { code: "AW", name: "Aruba", region: "row", group: "americas", corporate: true },
  { code: "BS", name: "Bahamas", region: "row", group: "americas", corporate: true },
  { code: "BB", name: "Barbados", region: "row", group: "americas", corporate: true },
  { code: "BZ", name: "Belize", region: "row", group: "americas", corporate: true },
  { code: "BM", name: "Bermuda", region: "row", group: "americas", corporate: true },
  { code: "CA", name: "Canada", region: "row", group: "americas" },
  { code: "KY", name: "Cayman Islands", region: "row", group: "americas", corporate: true },
  { code: "CR", name: "Costa Rica", region: "row", group: "americas", corporate: true },
  { code: "CW", name: "Curaçao", region: "row", group: "americas", corporate: true },
  { code: "DM", name: "Dominica", region: "row", group: "americas", corporate: true },
  { code: "DO", name: "Dominican Republic", region: "row", group: "americas", corporate: true },
  { code: "GD", name: "Grenada", region: "row", group: "americas", corporate: true },
  { code: "HN", name: "Honduras", region: "row", group: "americas", corporate: true },
  { code: "MS", name: "Montserrat", region: "row", group: "americas", corporate: true },
  { code: "PA", name: "Panama", region: "row", group: "americas", corporate: true },
  { code: "PR", name: "Puerto Rico", region: "row", group: "americas", corporate: true },
  { code: "KN", name: "Saint Kitts and Nevis", region: "row", group: "americas", corporate: true },
  { code: "LC", name: "Saint Lucia", region: "row", group: "americas", corporate: true },
  { code: "VC", name: "Saint Vincent and the Grenadines", region: "row", group: "americas", corporate: true },
  { code: "SX", name: "Sint Maarten (Dutch part)", region: "row", group: "americas", corporate: true },
  { code: "TC", name: "Turks and Caicos Islands", region: "row", group: "americas", corporate: true },
  { code: "US", name: "United States", region: "row", group: "americas", corporate: true },
  { code: "VG", name: "Virgin Islands, British", region: "row", group: "americas", corporate: true },
  // Africa & Middle East
  { code: "GH", name: "Ghana", region: "row", group: "mea", corporate: true },
  { code: "IL", name: "Israel", region: "row", group: "mea" },
  { code: "MU", name: "Mauritius", region: "row", group: "mea", corporate: true },
  { code: "NG", name: "Nigeria", region: "row", group: "mea", corporate: true },
  { code: "SA", name: "Saudi Arabia", region: "mena", group: "mea" },
  { code: "SC", name: "Seychelles", region: "row", group: "mea" },
  { code: "ZA", name: "South Africa", region: "row", group: "mea" },
  { code: "AE", name: "United Arab Emirates", region: "mena", group: "mea" },
];

const EC_CORRIDOR_GROUPS = [
  { id: "europe",   labelKey: "ec.corridor.group.europe" },
  { id: "apac",     labelKey: "ec.corridor.group.apac" },
  { id: "mena",     labelKey: "ec.corridor.group.mena" },
  { id: "americas", labelKey: "ec.corridor.group.americas" },
  { id: "africa",   labelKey: "ec.corridor.group.africa" },
  { id: "other",    labelKey: "ec.corridor.group.other" },
];

const EC_CORRIDORS = [
  { code: "GB", group: "europe" }, { code: "EU", group: "europe" },
  { code: "CH", group: "europe" }, { code: "TR", group: "europe" },
  { code: "UA", group: "europe" },
  { code: "HK", group: "apac" }, { code: "SG", group: "apac" },
  { code: "CN", group: "apac" }, { code: "IN", group: "apac" },
  { code: "JP", group: "apac" }, { code: "KR", group: "apac" },
  { code: "AU", group: "apac" }, { code: "APAC", group: "apac" },
  { code: "AE", group: "mena" }, { code: "SA", group: "mena" }, { code: "IL", group: "mena" },
  { code: "US", group: "americas" }, { code: "CA", group: "americas" },
  { code: "LATAM", group: "americas" },
  { code: "ZA", group: "africa" }, { code: "AFRICA", group: "africa" },
  { code: "ROW", group: "other" },
];

// ── Q2 industries ─────────────────────────────────────────────────
// Categories Altery actually serves per altery.com/business — plus
// explicit crypto sub-types (we onboard crypto-native businesses,
// that's a core value prop). Labels chosen to match how competitors
// and Altery itself frame these verticals publicly:
//   • "SaaS / AI / Software" — merged from separate ai + saas (most
//     AI startups self-describe as SaaS, so two options created
//     decision friction without information gain).
//   • "Marketing / Ad networks / Affiliate" — broadened from "media"
//     to capture affiliate-vertical explicitly (Payset, INXY and
//     Altery's own /business page all surface affiliate as a core
//     served niche).
//   • "Gaming / Game dev / Esports" — INXY top-tier category, also
//     on Altery's /business page under "Digital products" and
//     "Entertainment". Deliberately separate from gambling so users
//     don't conflate the two (a game-dev studio is not iGaming).
//   • "Crypto: mining / staking" — Altery's /business "Financial"
//     section explicitly lists "Cryptocurrency mining"; previous
//     six crypto sub-types missed it.
//   • "Gambling / Betting / iGaming" — added "iGaming" to the
//     blocked label so the contrast with served "Gaming" is sharp.
const EC_INDUSTRIES = [
  // ── Digital business segments — self-serve review path ────────────
  // Aligned with ICP personas from the Altery Business 2026 strategy
  // doc: each segment maps to a tailored result page tone and plan
  // recommendation. Order is "most common digital businesses first"
  // — SaaS/apps/games lead because they make up the bulk of inbound
  // demand for cross-border digital business banking. Marketplace
  // and e-commerce follow as adjacent segments.
  { value: "saas",        labelKey: "ec.ind.saas",        risk: "ok" },         // Digital Founder
  { value: "apps",        labelKey: "ec.ind.apps",        risk: "ok" },         // App Publisher / AI App
  { value: "games",       labelKey: "ec.ind.games",       risk: "ok" },         // Game Studio Operator
  { value: "edtech",      labelKey: "ec.ind.edtech",      risk: "ok" },         // EdTech Platform Operator
  { value: "marketplace", labelKey: "ec.ind.marketplace", risk: "ok" },         // Marketplaces & platforms
  { value: "ecom",        labelKey: "ec.ind.ecom",        risk: "ok" },         // E-commerce & digital goods
  { value: "prof",        labelKey: "ec.ind.prof",        risk: "ok" },         // Professional services
  // ── Specialist review path ────────────────────────────────────────
  // These segments need manual review before account opening but
  // Altery actively onboards them. Result page caveats set the
  // expectation that review is structured, not a black box ("Caveats
  // now, not after KYB" promise from the intro screen).
  { value: "creator",     labelKey: "ec.ind.creator",     risk: "specialist" }, // Creator / influencer platforms
  { value: "affiliate",   labelKey: "ec.ind.affiliate",   risk: "specialist" }, // Affiliate / performance marketing
  { value: "crypto",      labelKey: "ec.ind.crypto",      risk: "specialist", crypto: true }, // Crypto-native Operator
  // ── Fallback ──────────────────────────────────────────────────────
  // Most users find themselves in segments above; "Other" exists for
  // genuinely adjacent businesses we'd still consider (e.g. fintech
  // tooling, compliance SaaS, niche cross-border services).
  { value: "other",       labelKey: "ec.ind.other",       risk: "ok" },
  // ── Blocked (Fast no's, not slow no's — see intro screen card 3) ─
  // Visible in the dropdown deliberately: the intro screen promises
  // we'll tell users in 60 seconds, not after a week of document
  // uploads. Hiding these would break that promise — better to be
  // transparent up-front.
  { value: "gambling",    labelKey: "ec.ind.gambling",    risk: "blocked" },
  { value: "adult",       labelKey: "ec.ind.adult",       risk: "blocked" },
  { value: "weapons",     labelKey: "ec.ind.weapons",     risk: "blocked" },
  { value: "lending",     labelKey: "ec.ind.lending",     risk: "blocked" },
];

const EC_BUSINESS_TYPES = [
  { value: "ltd", labelKey: "ec.bt.ltd" },
  { value: "llc", labelKey: "ec.bt.llc" },
  { value: "plc", labelKey: "ec.bt.plc" },
  { value: "fz", labelKey: "ec.bt.fz" },
  { value: "branch", labelKey: "ec.bt.branch" },
  { value: "sole", labelKey: "ec.bt.sole" },
];

// ── Services multi-select (Q3) ────────────────────────────────────
// What does the user want to do with Altery? Second-strongest signal
// after industry for plan-tier recommendation. Pro/Ultra services
// drive upsell; crypto rails trigger specialist review.
//
// Ordering: universal-to-specialist top to bottom. accounts/crossBorder
// are default-on (universal needs for any digital business looking at
// Altery); local/fx/cards/multiUser are common; mass/multiEntity/api
// are advanced; crypto is specialist.
//
// `tier` field semantics:
//   "core"       — available on all plans, doesn't push tier
//   "starter"    — basic feature, doesn't push above Starter
//   "pro"        — strongly hints Pro tier (mass, cards, multiEntity)
//   "ultra"      — strongly hints Ultra tier (api)
//   "specialist" — triggers specialist review path (crypto rails)
const EC_SERVICES = [
  { value: "accounts",    titleKey: "ec.svc.accounts.title",    bodyKey: "ec.svc.accounts.body",    tier: "core" },
  { value: "crossBorder", titleKey: "ec.svc.crossBorder.title", bodyKey: "ec.svc.crossBorder.body", tier: "starter" },
  { value: "local",       titleKey: "ec.svc.local.title",       bodyKey: "ec.svc.local.body",       tier: "starter" },
  { value: "fx",          titleKey: "ec.svc.fx.title",          bodyKey: "ec.svc.fx.body",          tier: "core" },
  { value: "cards",       titleKey: "ec.svc.cards.title",       bodyKey: "ec.svc.cards.body",       tier: "pro" },
  { value: "multiUser",   titleKey: "ec.svc.multiUser.title",   bodyKey: "ec.svc.multiUser.body",   tier: "starter" },
  { value: "mass",        titleKey: "ec.svc.mass.title",        bodyKey: "ec.svc.mass.body",        tier: "pro" },
  { value: "multiEntity", titleKey: "ec.svc.multiEntity.title", bodyKey: "ec.svc.multiEntity.body", tier: "pro" },
  { value: "api",         titleKey: "ec.svc.api.title",         bodyKey: "ec.svc.api.body",         tier: "ultra" },
  { value: "crypto",      titleKey: "ec.svc.crypto.title",      bodyKey: "ec.svc.crypto.body",      tier: "specialist" },
];

// Single source of truth for the questionnaire length. Used by EcApp
// (state/routing), EcQuestionHeader (eyebrow), and interpolated into
// ec.q.eyebrow + ec.intro.lead translations as {total}. Adding or
// removing a question = bump this number; no string edits needed.
const TOTAL_STEPS = 5;

// Region grouping for the Q1 country picker. Replaces an earlier
// "popular countries" heuristic that implied traffic data we don't
// actually have. Groups chunk the 97-country list by geography so
// users find their region first, then the country within it —
// matches the Q4 corridor-group pattern (visual + label consistency)
// and reuses ec.corridor.group.* translations.
//
// Order rationale: not based on assumed user volumes (don't have the
// data), but on Altery's licensing footprint. Europe first because it
// contains all three EU-passport markets plus UK·FCA. MEA next
// because it holds Altery's UAE·DFSA entity. Asia & Americas after —
// those are served via UK passport for corporate structures only.
// EC_COUNTRIES.group values: "europe" | "mea" | "asia" | "americas".
// We map "mea" → "mena" label and "asia" → "apac" label since the
// corridor-group translations use those names.
const COUNTRY_REGION_GROUPS = [
  { groupKey: "europe",   labelKey: "ec.corridor.group.europe"   },
  { groupKey: "mea",      labelKey: "ec.corridor.group.mena"     },
  { groupKey: "asia",     labelKey: "ec.corridor.group.apac"     },
  { groupKey: "americas", labelKey: "ec.corridor.group.americas" },
];

const EC_VOLUME_BANDS = [
  { idx: 0, value: 5000 }, { idx: 1, value: 30000 },
  { idx: 2, value: 75000 }, { idx: 3, value: 175000 },
  { idx: 4, value: 375000 }, { idx: 5, value: 750000 },
  { idx: 6, value: 3000000 }, { idx: 7, value: 7000000 },
];

// ── Fee schedule (canonical, from altery.com/fees/business) ───────
// Real Altery business-account fees. Altery's published schedule is
// region-tiered — same fees regardless of plan tier (Starter/Pro/
// Ultra), only the monthly subscription and the plan-level perks
// (FX cap, SWIFT cap) differ across tiers. Region key:
//   • "ukEu" — businesses registered in UK or any EU member state
//   • "row"  — Rest of the World (everyone else)
// Routing derived from entity.id: uk + eu entities → ukEu, mena → row.
// Values are FORMATTED strings matching altery.com display, kept
// verbatim so they survive copy review without re-translation. If
// Altery updates fees, this constant is the single source-of-truth
// to keep in sync (link: https://altery.com/fees/business).
const EC_FEE_SCHEDULE = {
  ukEu: {
    accountOpening:  "Free",
    accountClosure:  "Free",
    inactivity:      "£4.99/mo",
    internal:        "Free",
    sepa:            "€/£/$ 0.50",
    fp:              "£/$/€ 0.50",
    fedwire:         "$10 / €8.80 / £8",
    achUsd:          "1%, min $1 (>$100)",
    swiftGbpOut:     "£20",
    swiftEurOut:     "€30",
    swiftUsdOut:     "$30",
    swiftIn:         "£10 / €15 / $20",
    exchange:        "On request",
  },
  row: {
    accountOpening:  "£100",
    accountClosure:  "Free",
    inactivity:      "£9.99/mo",
    internal:        "Free",
    sepa:            "€2 / £2 / $2 + 0.10%, max €30 / £25 / $35",
    fp:              "£2 / $2.50 / €2.50 + 0.10%, max £25 / €30 / $35",
    fedwire:         "Currently unavailable",
    achUsd:          "Currently unavailable",
    swiftGbpOut:     "£30 + 0.15%, max £150",
    swiftEurOut:     "€35 + 0.15%, max €180",
    swiftUsdOut:     "$40 + 0.15%, max $200",
    swiftIn:         "£10 / €15 / $20",
    exchange:        "On request",
  },
};
// Region derivation: UK + EU entities route to UK-EU schedule;
// MENA (and any other non-EU entity) routes to RoW schedule.
function ecFeeRegion(entity) {
  if (!entity) return "ukEu";
  return entity.id === "mena" ? "row" : "ukEu";
}

// Real Altery plan data, from the public pricing page:
//   • Starter — £50/mo, SMEs under €100K/mo volume
//   • Pro     — £100/mo, growing businesses under €1M/mo
//   • Ultra   — £300/mo, high-volume operations above €1M/mo
// Prices are GBP (default for UK incorporation; the comparison page
// notes "based on country of incorporation: GBP, EUR, USD" — the
// pricing currency localises in production). Fees use real numbers
// pulled from the full comparison table: UK Faster Pay, SEPA, SWIFT
// (compound fee + %), FX markup, and bulk-transfer availability.
// Chess piece icons (pawn/knight/rook) match Altery's brand language —
// the chess hierarchy maps to plan tier progression.
const EC_PLANS = {
  starter: {
    id: "starter", nameKey: "ec.plan.starter", iconKey: "pawn",
    price: "£50", cycleKey: "ec.plan.cycleMo",
    taglineKey: "ec.plan.starter.tagline",
    fitKey: "ec.plan.starter.fit",
    // First perk (currency/IBAN coverage) is now rendered at the
    // entity level via entity.currencyPerkKey — entity-specific copy
    // is more accurate than the generic "Local IBANs in all base
    // currencies" we used to ship here. Remaining perks are the
    // plan-tier differentiators (SWIFT breadth, FX markup, trial).
    perkKeys: ["ec.plan.starter.p2", "ec.plan.starter.p3", "ec.plan.starter.p4"],
    fees: {
      fasterPay: "£1",
      sepa:      "€2",
      swift:     "€15 + 0.5%",
      fxMarkup:  "up to 0.8%",
      bulk:      false,
    },
  },
  pro: {
    id: "pro", nameKey: "ec.plan.pro", iconKey: "knight",
    price: "£100", cycleKey: "ec.plan.cycleMo",
    taglineKey: "ec.plan.pro.tagline",
    fitKey: "ec.plan.pro.fit",
    perkKeys: ["ec.plan.pro.p1", "ec.plan.pro.p2", "ec.plan.pro.p3", "ec.plan.pro.p4", "ec.plan.pro.p5"],
    fees: {
      fasterPay: "£1",
      sepa:      "€1",
      swift:     "€10 + 0.25%",
      fxMarkup:  "up to 0.7%",
      bulk:      true,
    },
  },
  ultra: {
    id: "ultra", nameKey: "ec.plan.ultra", iconKey: "rook",
    price: "£300", cycleKey: "ec.plan.cycleMo",
    taglineKey: "ec.plan.ultra.tagline",
    fitKey: "ec.plan.ultra.fit",
    perkKeys: ["ec.plan.ultra.p1", "ec.plan.ultra.p2", "ec.plan.ultra.p3", "ec.plan.ultra.p4", "ec.plan.ultra.p5"],
    fees: {
      fasterPay: "£0.5",
      sepa:      "€0.5",
      swift:     "€10 + 0.15%",
      fxMarkup:  "up to 0.5%",
      bulk:      true,
    },
  },
};

// ── "Built to back your business" perks carousel ──────────────────
// Five Altery Business solutions surfaced on the result page as a
// 3S-Money-style horizontal scroll-snap slider. Each card is a tall
// portrait (280×400) with a full-bleed photographic image, a
// three-stop dark gradient overlay for text legibility, and a white
// title+body anchored to the bottom. Hover triggers a subtle 4%
// image zoom (800ms ease) and 3px card lift — the signature
// premium-fintech touch.
//
// Images live in /images/ alongside index.html. Stored as AVIF
// (where the source asset is AVIF) or WebP, both modern formats
// with universal support in Claude's target browsers (Chrome 85+,
// Safari 16.4+, Firefox 113+). The onError handler in EcPerks
// collapses a card to title+body if an image fails to load —
// no broken-image icon ever shows.
//
// Perk-to-image mapping:
//   multiEntity      → perk-global-accounts (Earth + flags)
//   multiUser        → perk-team-access (people + plus icon)
//   currencyExchange → perk-fx (FX widget on building backdrop)
//   businessCards    → perk-cards (Altery Visa + UnionPay cards)
//   permissions      → perk-permissions (role-based access UI)
const EC_PERKS = [
  {
    key: "multiEntity",
    imageUrl: "./images/perk-global-accounts.avif",
    titleKey: "ec.r.perks.multiEntity.title",
    bodyKey:  "ec.r.perks.multiEntity.body",
  },
  {
    key: "multiUser",
    imageUrl: "./images/perk-team-access.avif",
    titleKey: "ec.r.perks.multiUser.title",
    bodyKey:  "ec.r.perks.multiUser.body",
  },
  {
    key: "currencyExchange",
    imageUrl: "./images/perk-fx.avif",
    titleKey: "ec.r.perks.currencyExchange.title",
    bodyKey:  "ec.r.perks.currencyExchange.body",
  },
  {
    key: "businessCards",
    imageUrl: "./images/perk-cards.webp",
    titleKey: "ec.r.perks.businessCards.title",
    bodyKey:  "ec.r.perks.businessCards.body",
  },
  {
    key: "permissions",
    imageUrl: "./images/perk-permissions.webp",
    titleKey: "ec.r.perks.permissions.title",
    bodyKey:  "ec.r.perks.permissions.body",
  },
];

// Hero identifier — picks the most operationally relevant account from
// the entity (always accounts[0] in our data; ordered by relevance per
// entity). For UK it's GBP local (sort code + account number), for EU
// it's the SEPA-reachable IBAN, for MENA it's USD/AE-IBAN. Skipped for
// SWIFT-only primaries (we don't fake a local-rail identifier).
function ecHeroIdentifier(entity) {
  const acct = entity?.accounts?.[0];
  if (!acct || acct.type === "swift-only") return null;
  if (acct.type === "iban") {
    const f = acct.fields.find((x) => x.labelKey === "ec.account.iban");
    return f ? { currency: acct.currency, value: f.value, kind: "iban" } : null;
  }
  if (acct.type === "local") {
    const sort = acct.fields.find((x) => x.labelKey === "ec.account.sortCode")?.value;
    const accountNo = acct.fields.find((x) => x.labelKey === "ec.account.accountNo")?.value;
    const value = [sort, accountNo].filter(Boolean).join(" · ");
    return value ? { currency: acct.currency, value, kind: "local" } : null;
  }
  return null;
}

// Mask the trailing portion of an account identifier with vertically-
// centred middle dots (·····). Replaces the old "Preview" badge — the
// dots themselves communicate "this isn't your real number" while
// preserving the IBAN/sort-code format as a trust signal. Splits on
// whitespace, replaces the last token: with `n` dots if the token is
// short (≤n), or with `last (length-n) chars + n dots` if longer.
// Behaviour by entity:
//   • UK GBP local "23-14-70 · 1234 5678" → "23-14-70 · 1234 ····"
//   • UK EUR IBAN  "GB29 ALTY ... 9268 19" → "GB29 ALTY ... 9268 ····"
//   • EU EUR IBAN  "CY17 ... 0052 7600"    → "CY17 ... 0052 ····"
function maskTailDots(s, n = 4) {
  if (!s) return s;
  const parts = s.split(/(\s+)/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] && !/^\s+$/.test(parts[i])) {
      const t = parts[i];
      parts[i] = t.length > n
        ? t.slice(0, -n) + "·".repeat(n)
        : "·".repeat(n);
      break;
    }
  }
  return parts.join("");
}

// ── Account preview data ──────────────────────────────────────────
// Per-entity, per-currency account identifiers + rails. Values are
// example placeholders — real numbers are issued at signup. Format is
// jurisdiction-correct so the preview reads as authentic:
//   - GBP local on UK entity: sort code + 8-digit account
//   - EUR via SEPA-reachable IBAN (CY for EU entity, GB IBAN for UK)
//   - USD/AED via DIFC IBAN on MENA entity
//   - "swift-only" rows render as honest "Via SWIFT correspondent"
//     instead of a fake local IBAN — matches the reality that not
//     every entity has a domestic-rail relationship for every currency.
const EC_ENTITIES = {
  uk: {
    id: "uk",
    nameKey: "ec.entity.uk.name",
    licenceKey: "ec.entity.uk.licence",
    noteKey: "ec.entity.uk.note",
    currencyPerkKey: "ec.entity.uk.currencyPerk",
    countries: ["GB", "IE", "NL", "DE"],
    accounts: [
      {
        currency: "GBP",
        type: "local",
        rails: ["Faster Payments", "BACS", "CHAPS"],
        fields: [
          { labelKey: "ec.account.sortCode",  value: "23-14-70" },
          { labelKey: "ec.account.accountNo", value: "1234 5678" },
          { labelKey: "ec.account.bic",       value: "ALTYGB22", muted: true },
        ],
      },
      {
        currency: "EUR",
        type: "iban",
        rails: ["SEPA", "SWIFT"],
        fields: [
          { labelKey: "ec.account.iban", value: "GB29 ALTY 6016 1331 9268 19" },
          { labelKey: "ec.account.bic",  value: "ALTYGB22", muted: true },
        ],
      },
      {
        currency: "USD",
        type: "swift-only",
        rails: ["SWIFT"],
        fields: [],
      },
    ],
    region: "uk",
  },
  eu: {
    id: "eu",
    nameKey: "ec.entity.eu.name",
    licenceKey: "ec.entity.eu.licence",
    noteKey: "ec.entity.eu.note",
    currencyPerkKey: "ec.entity.eu.currencyPerk",
    countries: ["DE", "FR", "NL", "IT", "ES", "IE"],
    accounts: [
      {
        currency: "EUR",
        type: "iban",
        rails: ["SEPA Instant", "SEPA", "SWIFT"],
        fields: [
          { labelKey: "ec.account.iban", value: "CY17 0020 0128 0000 0012 0052 7600" },
          { labelKey: "ec.account.bic",  value: "BCYPCY2NXXX", muted: true },
        ],
      },
      {
        currency: "GBP",
        type: "swift-only",
        rails: ["SWIFT"],
        fields: [],
      },
      {
        currency: "USD",
        type: "swift-only",
        rails: ["SWIFT"],
        fields: [],
      },
    ],
    region: "eu",
  },
  mena: {
    id: "mena",
    nameKey: "ec.entity.mena.name",
    licenceKey: "ec.entity.mena.licence",
    noteKey: "ec.entity.mena.note",
    currencyPerkKey: "ec.entity.mena.currencyPerk",
    countries: ["AE", "SA", "EG", "TR"],
    accounts: [
      {
        currency: "USD",
        type: "iban",
        rails: ["SWIFT"],
        fields: [
          { labelKey: "ec.account.iban", value: "AE07 0331 2345 6789 0123 456" },
          { labelKey: "ec.account.bic",  value: "EBILAEAD", muted: true },
        ],
      },
      {
        currency: "AED",
        type: "iban",
        rails: ["UAEFTS", "SWIFT"],
        fields: [
          { labelKey: "ec.account.iban", value: "AE52 0331 0987 6543 2109 876" },
          { labelKey: "ec.account.bic",  value: "EBILAEAD", muted: true },
        ],
      },
      {
        currency: "EUR",
        type: "swift-only",
        rails: ["SWIFT"],
        fields: [],
      },
    ],
    region: "mena",
  },
};

// Export all 13 names to window so other scripts can reference them
// unqualified.
Object.assign(window, {
  EC_COUNTRIES, EC_CORRIDOR_GROUPS, EC_CORRIDORS, EC_INDUSTRIES,
  EC_BUSINESS_TYPES, EC_SERVICES, TOTAL_STEPS, COUNTRY_REGION_GROUPS,
  EC_VOLUME_BANDS, EC_FEE_SCHEDULE, EC_PLANS, EC_PERKS, EC_ENTITIES,
});
