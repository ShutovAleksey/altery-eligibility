// checker-helpers.js — eligibility-checker pure helpers.
//
// Functions that operate on the data constants (EC_COUNTRIES, EC_PLANS, …)
// but emit no JSX. Loaded as a classic <script> in /index.html right after
// /checker-data.js. Names escape via the explicit Object.assign(window, …)
// at the bottom; the inline text/babel block resolves them unqualified.
//
// One side effect at load time: enriches EC_ENTITIES entries with a
// `.currencies` array derived from their `.accounts` (kept for backward
// compatibility with call-sites that read the flat list).

// Helper — currency code → flag code for the round-flag preview. Keeps
// EUR as the EU flag, AED as UAE, etc.
const ecCurrencyFlag = (c) =>
  c === "USD" ? "US" : c === "GBP" ? "GB" :
  c === "EUR" ? "EU"  : c === "AED" ? "AE" : null;

// Localized currency display name via Intl.DisplayNames. Falls back to
// the bare code if the API or locale isn't available. No hand-translated
// dictionary needed — handles all 10 languages out of the box.
const ecCurrencyName = (code, lang) => {
  try {
    const dn = new Intl.DisplayNames([lang || "en"], { type: "currency" });
    return dn.of(code) || code;
  } catch (e) { return code; }
};

// Backward compat — old code referenced entity.currencies as a flat array
// for the "row" entity fallback elsewhere. Keep it derivable.
Object.values(EC_ENTITIES).forEach((e) => {
  e.currencies = e.accounts.map((a) => a.currency);
});

// Pure routing function — answers → recommendation. Easy to test in isolation.
function ecRecommend({ countryCode, industry, businessType, monthlyVolume, corridors, txCount, services }) {
  const country = EC_COUNTRIES.find((c) => c.code === countryCode);
  const ind = EC_INDUSTRIES.find((i) => i.value === industry);

  if (ind && ind.risk === "blocked") {
    return { kind: "blocked", reasonKey: ind.labelKey };
  }

  let entity;
  if (country?.region === "uk") entity = EC_ENTITIES.uk;
  else if (country?.region === "eu") entity = EC_ENTITIES.eu;
  else if (country?.region === "mena") entity = EC_ENTITIES.mena;
  else if (country?.region === "row") entity = EC_ENTITIES.uk;

  // Crypto detection — two sources, either sufficient:
  //   (1) Industry = "Crypto & Web3" (Q1)
  //   (2) Services include the combined "crypto" rail (Q3)
  // Q6 (Crypto exposure) was removed: asking after the user already
  // declared industry + services felt redundant in both directions.
  // Edge cases (non-crypto industry that handles some crypto via a
  // sidecar use case) flow to KYB review during onboarding — rare
  // enough to handle there rather than question all users for.
  const svcs = services || [];
  const cryptoFromServices = svcs.includes("crypto");
  const cryptoActive = ind?.crypto || cryptoFromServices;
  const cryptoReroute = cryptoActive && country?.region === "eu";
  if (cryptoReroute) entity = EC_ENTITIES.uk;

  // Plan tier decision — combines four signal sources:
  //   (1) Volume   — €100k/mo and €1M/mo are the canonical thresholds
  //   (2) Operational complexity — wide corridor mix or high tx count
  //   (3) Services — mass payouts/cards push to Pro, API to Ultra
  //   (4) Industry — affiliate/creator typically need Pro features
  //
  // We track WHICH signals fired in `tierSignals` so the reasoning
  // block can cite them by name ("Your €175k/mo volume crosses
  // Starter's €100k limit" vs generic "Pro is recommended"). The
  // signals also feed result-page caveats and perks ordering.
  const svcSet = new Set(svcs);
  const tierSignals = {
    volumePro:        monthlyVolume >= 100000,
    volumeUltra:      monthlyVolume >= 1000000,
    corridorsBreadth: (corridors?.length || 0) >= 4,
    txHigh:           txCount === "high",
    // Pro-tier services: mass payouts and cards have always pushed
    // to Pro; multiEntity is new — managing 2+ legal entities is
    // operational complexity Starter isn't designed for.
    servicesPro:      svcSet.has("mass") || svcSet.has("cards") || svcSet.has("multiEntity"),
    servicesUltra:    svcSet.has("api"),
    industryPro:      industry === "affiliate" || industry === "creator",
  };
  const needsPro = tierSignals.volumePro || tierSignals.corridorsBreadth ||
                   tierSignals.txHigh || tierSignals.servicesPro ||
                   tierSignals.industryPro;
  const needsUltra = tierSignals.volumeUltra || tierSignals.servicesUltra;
  let plan = EC_PLANS.starter;
  if (needsPro)   plan = EC_PLANS.pro;
  if (needsUltra) plan = EC_PLANS.ultra;

  const caveats = [];
  // Crypto-fluent caveat — fires for any crypto-native category. Tone
  // switched from "orange" (warning/conditional) to "blue" (informational/
  // confident) because Altery actively onboards these businesses. Copy
  // signals operational specifics ("specialist KYB lane, Synterra Connect")
  // instead of the old "we'll review individually" hedge.
  if (ind?.crypto) {
    caveats.push({ tagKey: "ec.cav.crypto.tag", textKey: "ec.cav.crypto.text", tone: "blue" });
  }
  // Performance-marketing caveat — affiliate and creator platforms need
  // a structured-review explanation. Copy borrows from the Tone of Voice
  // doc: "Performance marketing businesses need clearer traffic and
  // payout evidence" — confident, specific, not gatekeeping.
  if (industry === "affiliate" || industry === "creator") {
    caveats.push({
      tagKey: "ec.cav.performance.tag",
      textKey: "ec.cav.performance.text",
      tone: "blue",
      vars: { industry: window.__I18N.t(ind.labelKey).toLowerCase() },
    });
  }
  if (country?.region === "row" && country?.code !== "US") {
    caveats.push({
      tagKey: "ec.cav.row.tag", textKey: "ec.cav.row.text", tone: "blue",
      vars: { country: window.__I18N.t("ec.country." + country.code) },
    });
  }
  if (entity?.id === "mena") {
    caveats.push({ tagKey: "ec.cav.mena.tag", textKey: "ec.cav.mena.text", tone: "orange" });
  }
  if (plan.id === "ultra") {
    caveats.push({ tagKey: "ec.cav.ultra.tag", textKey: "ec.cav.ultra.text", tone: "blue" });
  }

  // ── Reasoning bullets — "Why we recommend this plan" ──────────────
  // The single most important addition for conversion: instead of just
  // showing "Recommended: Pro" we show 3 sentences explaining WHY,
  // citing the user's own answers back ("Your €175k/mo crosses…",
  // "Mass payouts you selected…"). Each candidate is priority-weighted;
  // we sort and take the top 3 so the most relevant reasons surface
  // first. Volume is anchored at priority 10 (always present when
  // available); service-specific reasons at 7-9; complexity at 5-6;
  // closers at 3-4.
  const reasoning = [];
  const fmtVol = (n) => {
    if (n >= 1000000) return `€${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/, '')}M`;
    if (n >= 1000)    return `€${Math.round(n / 1000)}k`;
    return `€${n}`;
  };
  const volStr = fmtVol(monthlyVolume);
  // Volume-anchored bullet (always present, highest priority)
  if (plan.id === "starter") {
    reasoning.push({ key: "ec.reasoning.volume.starter", vars: { volume: volStr }, priority: 10 });
  } else if (plan.id === "pro" && tierSignals.volumePro) {
    reasoning.push({ key: "ec.reasoning.volume.pro", vars: { volume: volStr }, priority: 10 });
  } else if (plan.id === "ultra" && tierSignals.volumeUltra) {
    reasoning.push({ key: "ec.reasoning.volume.ultra", vars: { volume: volStr }, priority: 10 });
  }
  // Service-driven bullets
  if (svcSet.has("api")) {
    reasoning.push({ key: "ec.reasoning.services.api", priority: 9 });
  }
  if (svcSet.has("mass") && plan.id !== "starter") {
    reasoning.push({ key: "ec.reasoning.services.mass", priority: 8 });
  }
  if (svcSet.has("cards") && plan.id !== "starter") {
    reasoning.push({ key: "ec.reasoning.services.cards", priority: 7 });
  }
  // Industry-driven
  if (tierSignals.industryPro && plan.id !== "starter") {
    reasoning.push({ key: "ec.reasoning.industry.payouts", priority: 6 });
  }
  // Complexity
  if (tierSignals.corridorsBreadth) {
    reasoning.push({ key: "ec.reasoning.complexity.corridors", vars: { n: corridors.length }, priority: 5 });
  }
  if (tierSignals.txHigh && plan.id !== "starter") {
    reasoning.push({ key: "ec.reasoning.complexity.tx", priority: 5 });
  }
  // Savings / value (when applicable)
  if (svcSet.has("fx") && plan.id !== "starter") {
    reasoning.push({ key: "ec.reasoning.savings.fx", priority: 4 });
  }
  // Closers
  if (plan.id === "starter") {
    reasoning.push({ key: "ec.reasoning.upgrade.path", priority: 3 });
  }
  if (plan.id === "ultra" && svcSet.has("api")) {
    reasoning.push({ key: "ec.reasoning.api.advance", priority: 3 });
  }
  // Sort by priority and take top 3
  const reasoningTop = reasoning
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  return { kind: "approved", entity, plan, caveats, country, ind, monthlyVolume, cryptoReroute, cryptoActive, services: svcs, tierSignals, reasoning: reasoningTop };
}

// Derive a transaction-count assumption from the monthly volume
// band. Real txCount sits in EcApp state but we don't thread it
// through ecRecommend → rec, so we infer from volume. These are
// averages — the PDF labels them "estimated", and customers who
// care about precision will adjust during onboarding.
function ecEstimateTxCount(monthlyVolume) {
  if (!monthlyVolume) return 20;
  if (monthlyVolume < 10000)    return 5;
  if (monthlyVolume < 100000)   return 20;
  if (monthlyVolume < 500000)   return 40;
  if (monthlyVolume < 1000000)  return 80;
  return 150;
}

// The full Altery-vs-typical-bank cost projection. This is the
// single most important calculation in the whole experience —
// it's the number that goes to the customer's CFO, the number
// they remember six weeks later, the anchor that justifies the
// switching cost. Coefficients are deliberately conservative so
// we under-promise: real savings for most digital businesses
// are larger, but the math we show has to survive scrutiny.
//
// Assumptions documented inline so future-us can audit them:
function ecComputeCostBreakdown(rec) {
  const vol = rec?.monthlyVolume || 0;
  if (vol < 1000) return null;  // not enough to project credibly

  // 60% of monthly volume assumed to be FX-touching (cross-border
  // or non-base-currency). Conservative — many digital businesses
  // run higher. Subscription-revenue SaaS in EUR may run lower
  // (~20-40%), high-growth marketplaces often run >80%.
  const fxVolume = vol * 0.60;

  // Altery rails (from public fees page, business plan tier):
  const ALTERY_FX_MARKUP  = 0.0065;  // 0.65% — mid of 0.5–0.7% Pro range
  const ALTERY_SWIFT_FLAT = 10;       // €10 per outgoing
  const ALTERY_SWIFT_PCT  = 0.0025;   // + 0.25% of tx value
  const ALTERY_LOCAL      = 1;        // €1 per SEPA/FPS

  // Industry-average traditional business bank (HSBC/Barclays/
  // Deutsche/Santander SMB tier — public retail business pricing,
  // averaged):
  const BANK_FX_MARKUP   = 0.025;     // 2.5% — typical mid of 2–4% spread
  const BANK_SWIFT_FLAT  = 40;        // €40 per outgoing — typical
  const BANK_LOCAL       = 0.5;       // €0.50 — bank local cheaper but
                                      // requires sep. account per currency

  const txCount  = ecEstimateTxCount(vol);
  const avgTxVal = vol / Math.max(txCount, 1);

  // Local payments — assume 60% of tx are local SEPA/FPS, 40%
  // cross-border SWIFT. Tunes the math toward digital businesses
  // doing mostly EU↔EU and UK↔UK with cross-border on top.
  const localTxCount = Math.round(txCount * 0.6);
  const swiftTxCount = txCount - localTxCount;

  // Plan subscription — taken straight from rec.plan.price. We
  // strip currency symbol and parse, defaulting to 0 if it's a
  // free tier or starter.
  const planNumeric = (() => {
    const raw = String(rec.plan?.price || "").replace(/[^\d.]/g, "");
    return parseFloat(raw) || 0;
  })();

  const altery = {
    subscription: planNumeric,
    fx:           Math.round(fxVolume * ALTERY_FX_MARKUP),
    swift:        Math.round(swiftTxCount * ALTERY_SWIFT_FLAT + swiftTxCount * avgTxVal * ALTERY_SWIFT_PCT),
    local:        Math.round(localTxCount * ALTERY_LOCAL),
  };
  altery.total = altery.subscription + altery.fx + altery.swift + altery.local;

  const bank = {
    fx:    Math.round(fxVolume * BANK_FX_MARKUP),
    swift: Math.round(swiftTxCount * BANK_SWIFT_FLAT),
    local: Math.round(localTxCount * BANK_LOCAL),
  };
  bank.total = bank.fx + bank.swift + bank.local;

  // Round savings to the nearest €100 for clean presentation.
  // Numbers like "€9,547/month" look fake-precise; "€9,500/month"
  // reads as the considered estimate it actually is.
  const rawMonthly = Math.max(bank.total - altery.total, 0);
  const monthly    = Math.round(rawMonthly / 100) * 100;
  const annual     = monthly * 12;

  return {
    altery, bank,
    savings: { monthly, annual },
    meta: { txCount, fxVolumePct: 60, fxVolume: Math.round(fxVolume) },
  };
}

// Translate an annual-savings number into 1-3 tangible business
// outcomes the customer can visualize. Engages future-self
// simulation — the savings number stops being abstract and
// becomes "a senior hire" or "9 months of runway". Buckets
// chosen for digital-business ICP (founders, ops leads, CFOs).
function ecOutcomesForSavings(annual) {
  if (!annual || annual < 12000) return [];

  const outcomes = [];

  // Hire — UK/EU senior loaded cost ~€100-130k. We say "around"
  // because rounding precisely would over-claim.
  if (annual >= 80000) {
    outcomes.push({ key: "ec.pdf.outcomes.hire", value: Math.round(annual / 110000 * 10) / 10 });
  } else if (annual >= 40000) {
    outcomes.push({ key: "ec.pdf.outcomes.hireMid", value: null });
  }

  // Runway — assume ~€10k/mo burn for early-stage, scales with
  // savings amount (bigger savings → likely bigger company).
  const runwayMonths = annual >= 200000 ? 4
                     : annual >= 100000 ? 6
                     : annual >= 50000  ? 9
                     : 12;
  outcomes.push({ key: "ec.pdf.outcomes.runway", value: runwayMonths });

  // Marketing — one quarter of growth budget.
  outcomes.push({ key: "ec.pdf.outcomes.marketing", value: Math.round(annual / 4 / 1000) });

  return outcomes;
}


// Map monthly volume to a translation key that describes where
// the customer sits in the plan ladder. Sales advisor voice —
// these aren't gates but contextual pointers: "at your scale,
// multi-entity becomes worth it" etc. Buckets chosen to align
// roughly with the plan thresholds without being identical
// (Starter caps ~€100k, Pro covers up to ~€1M, Ultra beyond),
// so the hint reinforces rather than restates the recommended
// plan reason.
function ecVolumeHintKey(monthlyVolume) {
  if (!monthlyVolume || monthlyVolume < 10000) return "ec.pdf.volumeHint.starter";
  if (monthlyVolume < 100000)  return "ec.pdf.volumeHint.standard";
  if (monthlyVolume < 1000000) return "ec.pdf.volumeHint.high";
  return "ec.pdf.volumeHint.scale";
}

// Format a monthly-volume number into a human-readable euro string.
// We pick en-US separators ("750,000") for cross-locale legibility —
// some European conventions use "750.000" but that looks like a
// decimal to anglophone readers and back-and-forth is risky in a
// commercial document.
function ecFormatVolume(num) {
  if (!num || num < 1000) return "—";
  try {
    return new Intl.NumberFormat("en-US").format(Math.round(num));
  } catch (e) {
    return String(Math.round(num));
  }
}

// Estimate monthly savings vs traditional banks.
//   • FX markup differential: Altery 0.5–0.7% vs banks 2–3%
//   • SWIFT differential: Altery €10 + 0.25% vs banks €30–60 per tx
//
// To stay credible we use conservative coefficients (0.6%–1.2% of
// total monthly volume) and present a range. This matches what
// most digital businesses actually save once they move from a
// high-street bank to a fintech rail; we'd rather under-promise
// and let the user verify than splash a flashy number that doesn't
// hold up. Returns null below the band where savings aren't
// meaningful enough to claim.
function ecEstimateSavings(monthlyVolume) {
  if (!monthlyVolume || monthlyVolume < 10000) return null;
  const roundTo100 = (n) => Math.round(n / 100) * 100;
  return {
    low:  roundTo100(monthlyVolume * 0.006),
    high: roundTo100(monthlyVolume * 0.012),
  };
}

// Generate a deterministic-looking proposal reference. Format
// "EL-{YYYY}-{4 alphanum}". Mostly cosmetic — gives the document
// a tracking-number feel that legit business proposals have.
function ecGenProposalRef() {
  const year = new Date().getFullYear();
  const tail = Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  return `EL-${year}-${tail.padEnd(4, "0")}`;
}

Object.assign(window, {
  ecCurrencyFlag, ecCurrencyName, ecRecommend,
  ecEstimateTxCount, ecComputeCostBreakdown, ecOutcomesForSavings,
  ecVolumeHintKey, ecFormatVolume, ecEstimateSavings, ecGenProposalRef,
});
