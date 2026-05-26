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
function ecRecommend({ countryCode, industry, monthlyVolume, corridorsIn, corridorsOut, monthlyTx, services }) {
  // Union of regions hit on either direction = the actual corridor
  // breadth of the business. Keep both directions on rec for the PDF
  // and downstream consumers; expose the merged set as `corridors`.
  const cIn  = Array.isArray(corridorsIn)  ? corridorsIn  : [];
  const cOut = Array.isArray(corridorsOut) ? corridorsOut : [];
  const corridors = Array.from(new Set([...cIn, ...cOut]));
  const country = EC_COUNTRIES.find((c) => c.code === countryCode);
  const ind = EC_INDUSTRIES.find((i) => i.value === industry);

  // Country sanctions check runs before the industry check: a sanctioned
  // jurisdiction blocks regardless of what the business does. The
  // `reason` discriminator lets EcResultBlocked switch its copy
  // (country-specific lead vs industry-specific lead).
  //
  // Note: transactional-corridor sanctions (e.g. Cyprus-LLC trading with
  // Russia) are NOT caught here. The Q5 picker filters those codes out
  // entirely — showing them was a trap UX. Real exposure surfaces at
  // KYB UBO screening and ongoing transaction monitoring.
  if (country && country.risk === "blocked") {
    return { kind: "blocked", reason: "country", country };
  }
  if (ind && ind.risk === "blocked") {
    return { kind: "blocked", reason: "industry", reasonKey: ind.labelKey };
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
    // Now country-level (was region-level). ≥5 distinct countries
    // across in+out reads as a multi-corridor business that benefits
    // from Pro-tier rails — same intent as the prior 3-of-4-regions
    // threshold, calibrated for the country granularity.
    corridorsBreadth: corridors.length >= 5,
    // ≥300 monthly transactions = "high" — matches the prior "high" band
    // (101–500) lower-edge intent, expressed against the new in+out total.
    txHigh:           monthlyTx >= 300,
    // Pro-tier services: mass payouts and cards have always pushed
    // to Pro; multiEntity is new — managing 2+ legal entities is
    // operational complexity Starter isn't designed for.
    servicesPro:      svcSet.has("mass") || svcSet.has("cards"),
    // servicesUltra was driven by the now-removed "api" service. Ultra
    // tier is now decided purely by volume (volumeUltra ≥ €1M/mo).
    servicesUltra:    false,
    // Affiliate and creator platforms historically need Pro tier — mass
    // payouts, multi-currency settlements, sub-account reconciliation.
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
  // Performance-marketing caveat — affiliate networks and creator
  // platforms need a structured-review explanation. Copy from the
  // Tone of Voice doc: "Performance marketing businesses need clearer
  // traffic and payout evidence" — confident, specific, not gatekeeping.
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
  // Ultra pricing is firm now (£300/mo with a full fee schedule in
  // EC_PLANS.ultra). The previous "Ultra prices set after a call"
  // caveat contradicted the public price so it's been removed. If
  // Ultra ever moves back to bespoke pricing, drop the price field
  // from EC_PLANS.ultra and restore the caveat together.

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
  // Closers
  if (plan.id === "starter") {
    reasoning.push({ key: "ec.reasoning.upgrade.path", priority: 3 });
  }
  // Sort by priority and take top 3
  const reasoningTop = reasoning
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  return { kind: "approved", entity, plan, caveats, country, ind, monthlyVolume, corridors, corridorsIn: cIn, corridorsOut: cOut, cryptoReroute, cryptoActive, services: svcs, tierSignals, reasoning: reasoningTop };
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
// Parse a fee string like "€10 + 0.25%" or "€15 + 0.5%" into a flat+pct
// pair the cost math can work with. Pct strings like "up to 0.8%" parse
// to 0.008; bare numbers parse to flat only. Anything unparseable falls
// back to {flat: 0, pct: 0} so a missing field can never throw.
function ecParseFee(raw) {
  if (!raw || typeof raw !== "string") return { flat: 0, pct: 0 };
  // Match an optional currency-symbol + number for flat, and an optional
  // "+ X%" or "X%" for the percentage part.
  const flatMatch = raw.match(/[€£$]\s*([\d.]+)/);
  const pctMatch  = raw.match(/([\d.]+)\s*%/);
  return {
    flat: flatMatch ? parseFloat(flatMatch[1]) : 0,
    pct:  pctMatch  ? parseFloat(pctMatch[1])  / 100 : 0,
  };
}

// Compose a baseline object from the regional bank PANEL — median of
// every fee field across all peer banks. More defensible than a single
// cherry-picked bank: each cell is the median of N citation-backed
// values, every panel member's source URL listed in `sources`. The
// resulting `name` reads as a generic "Typical UK business bank" so
// ad copy / methodology stays accurate regardless of which exact bank
// the prospect happens to use.
//
// Entity → panel map: uk + row → uk panel; eu → eu panel; mena → mena.
// Returns a synthetic object that quacks like the old single-bank
// shape (same `fees` keys, same `qualitative`, `id` preserved for
// downstream consumers that depended on it).
function ecBaselineFor(entityId) {
  const cmp = window.EC_COMPARATORS || {};
  const panel = (entityId === "eu") ? "eu"
              : (entityId === "mena") ? "mena"
              : "uk";  // uk + row + unknown → UK panel
  const members = Object.values(cmp).filter(
    (c) => c.type === "traditional" && c.panel === panel
  );
  if (members.length === 0) return cmp.uk_traditional;
  if (members.length === 1) return members[0];

  // Median across each fee field. Lead member's qualitative carries
  // over since panel members share the same qualitative shape (slow
  // onboarding, no crypto, etc.) — see EC_COMPARATORS.
  const lead = members.find((m) => Array.isArray(m.forEntities)) || members[0];
  const feeKeys = Object.keys(lead.fees || {});
  const median = (xs) => {
    const sorted = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const mediaFees = {};
  for (const key of feeKeys) {
    const vals = members.map((m) => m.fees?.[key]).filter((v) => typeof v === "number");
    if (vals.length > 0) mediaFees[key] = median(vals);
  }

  return {
    id:           lead.id,
    name:         { uk: "Typical UK business bank",
                    eu: "Typical EU business bank",
                    mena: "Typical MENA business bank" }[panel],
    type:         "traditional",
    panel,
    panelMembers: members.map((m) => m.name),
    asof:         lead.asof,
    sources:      members.flatMap((m) => m.sources || []),
    fees:         mediaFees,
    qualitative:  lead.qualitative,
  };
}

// FX rate constant for converting EUR-denominated Altery rail tariffs
// (SEPA / SWIFT) to GBP at math time. Conservative round-number rate
// (1 EUR ≈ £0.85). Tariff DISPLAY strings remain rail-native ("€0.5
// SEPA, £0.5 FP") — only the cost-projection summing converts.
const EUR_TO_GBP = 0.85;

// GBP → issued-account currency for the result page's savings hero.
// All cost math runs in GBP (page anchor currency, EUR_TO_GBP above);
// these rates flip the figure back into whatever currency the user's
// recommended account actually issues in, so a USD AE-IBAN user sees
// savings in $, an AED IBAN user in AED, etc. Conservative round
// numbers — refresh when material drift makes them misleading. The
// AED rate is the USD peg (3.6725) × GBP→USD ≈ 4.66.
const EC_FX_FROM_GBP = {
  GBP: 1,
  EUR: 1.18,
  USD: 1.27,
  AED: 4.66,
};
const EC_CURRENCY_SYMBOL = { GBP: "£", EUR: "€", USD: "$", AED: "AED " };

// Convert a GBP amount to `currency` and format it with that currency's
// symbol. NBSP thousands-separator matches the European typography used
// elsewhere on the result page (see fmtNarrow). Unknown currency falls
// back to £ so we never render a bare number with no symbol.
function ecFmtFromGbp(gbpValue, currency) {
  const rate = EC_FX_FROM_GBP[currency];
  const symbol = EC_CURRENCY_SYMBOL[currency];
  if (rate == null || symbol == null) return ecFmtFromGbp(gbpValue, "GBP");
  const converted = Math.round((gbpValue || 0) * rate);
  const NBSP = " ";
  return symbol + converted.toLocaleString("en-US").replace(/,/g, NBSP);
}

// Pick the display currency for a recommendation — the primary
// (first non-SWIFT-only) account on the entity, falling back to GBP.
// "Primary" = first account in EC_ENTITIES[entity].accounts that has
// a real local/IBAN type. UK → GBP, EU → EUR, MENA → USD.
function ecDisplayCurrencyFor(rec) {
  const accounts = rec?.entity?.accounts || [];
  const primary = accounts.find((a) => a.type !== "swift-only") || accounts[0];
  return primary?.currency || "GBP";
}

// ── Calibration helpers ────────────────────────────────────────────
// The cost projection used to lean on three constants (60% FX share,
// 60/40 local-SWIFT split, generic tx-count band). The user's Q2 and
// Q5 answers carry enough signal to replace those constants with
// derived values — same math, less hand-wave.

// Home region per entity, used by the corridor-overlap math. Matches
// EC_CHIP_REGION_ORDER ids from checker-data.js.
const EC_HOME_REGION_OF = { uk: "uk-eea", eu: "uk-eea", mena: "middle-east" };

// (B) FX share of monthly volume — driven by corridor breadth. A UK
// business operating only in UK+EEA touches FX rarely (~5%); a global
// business spans 4+ regions and routinely converts (~80%). Old code
// used a flat 0.60 — accurate for the global case, badly overstated
// for home-only businesses.
function ecFxVolumeRatio(rec) {
  const corridors = new Set([
    ...(Array.isArray(rec?.corridorsIn) ? rec.corridorsIn : []),
    ...(Array.isArray(rec?.corridorsOut) ? rec.corridorsOut : []),
  ]);
  const home = EC_HOME_REGION_OF[rec?.entity?.id] || "uk-eea";
  // Anything that isn't the home region counts as foreign. ISO-code
  // outliers (Set entries that don't match a region id) also count as
  // foreign — each is one extra corridor of FX exposure.
  let foreign = 0;
  for (const code of corridors) if (code && code !== home) foreign += 1;
  if (foreign === 0) return 0.05;
  if (foreign === 1) return 0.30;
  if (foreign === 2) return 0.50;
  if (foreign === 3) return 0.65;
  return 0.80;
}

// (C) Industry-derived average transaction size — converts monthly
// volume into a realistic tx count. SaaS does many small recurring
// charges; manufacturing does few large invoices. The same £750k/mo
// volume produces 5× different SWIFT cost depending on which industry.
// Values picked from typical archetype patterns; defaults at the
// middle when the user hasn't picked an industry yet.
const EC_INDUSTRY_AVG_TX_GBP = {
  saas:        500,
  apps:        1000,
  games:       2000,
  edtech:      3000,
  marketplace: 5000,
  ecom:        2500,
  marketing:   8000,
  freelance:   1200,
  prof:        15000,
  creator:     800,
  affiliate:   1500,
  vpn:         200,
  crypto:      25000,
  other:       2000,
};
function ecAvgTxGbp(rec) {
  const ind = rec?.ind?.value;
  return EC_INDUSTRY_AVG_TX_GBP[ind] || 2000;
}
function ecEstimateTxCountCalibrated(rec) {
  const vol = rec?.monthlyVolume || 0;
  const avg = ecAvgTxGbp(rec);
  return Math.max(1, Math.round(vol / avg));
}

// Confidence in the savings projection — function of how many of the
// three quality-driving inputs (industry, corridors, volume) the user
// actually provided. High confidence = tight ±10% band; low confidence
// widens to ±35% so the displayed range stays honest. Each downstream
// surface (result page, methodology, PDF) reads `savings.confidence`
// and `savings.confidenceBand` to label the projection accordingly.
function ecConfidenceLevel(rec) {
  const corridorsSize = (rec?.corridorsIn?.size ?? rec?.corridorsIn?.length ?? 0)
                      + (rec?.corridorsOut?.size ?? rec?.corridorsOut?.length ?? 0);
  const have = {
    industry:  !!rec?.ind?.value,
    corridors: corridorsSize > 0,
    volume:    (rec?.monthlyVolume || 0) >= 1000,
  };
  const filled = Object.values(have).filter(Boolean).length;
  const missing = Object.keys(have).filter((k) => !have[k]);
  if (filled === 3) return { level: "high",   band: 0.10, missing };
  if (filled === 2) return { level: "medium", band: 0.20, missing };
  return                  { level: "low",    band: 0.35, missing };
}

// (D) Local vs SWIFT split — home region dominates transaction VOLUME,
// not just region COUNT. A UK SaaS that lists "UK+EEA" and "North
// America" doesn't do half its transactions on SWIFT — it does most
// in its home rails (subscriptions, payouts to home creators, etc.)
// with NA as a smaller cross-border slice. Weight: home = ~95% at 0
// foreign; each foreign region peels off ~20% (capped at 30% local).
function ecLocalSwiftSplit(rec) {
  const corridors = new Set([
    ...(Array.isArray(rec?.corridorsIn) ? rec.corridorsIn : []),
    ...(Array.isArray(rec?.corridorsOut) ? rec.corridorsOut : []),
  ]);
  if (corridors.size === 0) return { local: 0.90, swift: 0.10 };
  const home = EC_HOME_REGION_OF[rec?.entity?.id] || "uk-eea";
  const hasHome = corridors.has(home);
  const foreignCount = [...corridors].filter((c) => c && c !== home).length;
  if (!hasHome) {
    // Cross-region-only flow — almost everything is SWIFT.
    return { local: 0.10, swift: 0.90 };
  }
  // Home present + N foreign regions:
  //   0 → 95/5, 1 → 75/25, 2 → 55/45, 3 → 35/65, 4+ → 30/70
  const localPct = Math.max(0.30, 0.95 - 0.20 * foreignCount);
  return { local: localPct, swift: 1 - localPct };
}

function ecComputeCostBreakdown(rec) {
  const vol = rec?.monthlyVolume || 0;
  if (vol < 1000) return null;  // not enough to project credibly

  // FX share now derived from Q5 corridor breadth (was flat 0.60).
  // Volume itself is GBP throughout this calc — band midpoints in
  // EC_VOLUME_BANDS are the user's declared monthly throughput (£).
  const fxRatio = ecFxVolumeRatio(rec);
  const fxVolume = vol * fxRatio;

  // Altery rails — read the active plan's published fees so the
  // projection moves with plan tier. Each plan exposes a fees object:
  //   { sepa: "€0.5", swift: "€10 + 0.15%", fxMarkup: "up to 0.5%" }
  // SEPA and SWIFT are EUR-denominated rails so the flat fees need
  // conversion to GBP before they enter the GBP-summed line items.
  // FX markup is a percentage so currency-neutral.
  const planFees = rec.plan?.fees || {};
  const fxFee    = ecParseFee(planFees.fxMarkup);
  const swiftFee = ecParseFee(planFees.swift);
  const sepaFee  = ecParseFee(planFees.sepa);
  const ALTERY_FX_MARKUP  = fxFee.pct    || 0.0065;
  const ALTERY_SWIFT_FLAT = (swiftFee.flat || 10) * EUR_TO_GBP;   // €10 → £8.50
  const ALTERY_SWIFT_PCT  = swiftFee.pct  || 0.0025;
  const ALTERY_LOCAL      = (sepaFee.flat || 1)  * EUR_TO_GBP;   // €0.5 → £0.43

  // Baseline bank — picked by entity (uk → Barclays, eu → BNP, mena →
  // Mashreq). Fee fields are already GBP-equivalent in EC_COMPARATORS
  // (native for Barclays, converted for BNP and Mashreq).
  const baseline = ecBaselineFor(rec?.entity?.id || "uk");
  const BANK_FEES = baseline.fees;

  // tx count is now derived from industry avg tx size (was a generic
  // volume-band lookup that ignored Q2). avg tx size kept on the return
  // so downstream (PDF assumptions, methodology block) shows it.
  const txCount  = ecEstimateTxCountCalibrated(rec);
  const avgTxVal = vol / Math.max(txCount, 1);

  // Local / SWIFT split derived from corridor overlap with the home
  // region (was a flat 60/40). UK-only business → 95/5; cross-region
  // heavy → inverted. Matches actual flow shape rather than averaging
  // across all users.
  const split = ecLocalSwiftSplit(rec);
  const localTxCount = Math.round(txCount * split.local);
  const swiftTxCount = txCount - localTxCount;

  // Plan subscription — taken straight from rec.plan.price.
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

  // Apples-to-apples plan matching: pick the bank tier whose feature
  // set is closest to the Altery plan we'd open for this user. Without
  // this, the projection always compared Altery's mid/top plans
  // (£100/£300) against the bank's CHEAPEST account (£8.50 base) —
  // unfair, and bait for "you're comparing apples to oranges" pushback.
  // Each panel bank now stores three tier prices; we pick the
  // matching one. Falls back to base if a panel member is missing the
  // new fields (defensive — keeps shape on incomplete data).
  const planId = rec.plan?.id || "starter";
  const bankSubscription =
      (planId === "ultra" && BANK_FEES.subscriptionUltraGbp != null) ? BANK_FEES.subscriptionUltraGbp
    : (planId === "pro"   && BANK_FEES.subscriptionProGbp   != null) ? BANK_FEES.subscriptionProGbp
    : BANK_FEES.subscriptionGbp;

  // Baseline bank cost — same operational profile, GBP-denominated
  // median tariffs from EC_COMPARATORS panel.
  const bank = {
    subscription: bankSubscription,
    fx:           Math.round(fxVolume * (BANK_FEES.fxMarkupBps / 10000)),
    swift:        Math.round(swiftTxCount * BANK_FEES.swiftOutGbp),
    local:        Math.round(localTxCount * BANK_FEES.localOutGbp),
  };
  bank.total = bank.subscription + bank.fx + bank.swift + bank.local;

  // Round savings to the nearest £100 for clean presentation.
  const rawMonthly = Math.max(bank.total - altery.total, 0);
  const monthly    = Math.round(rawMonthly / 100) * 100;
  const annual     = monthly * 12;

  // Adaptive confidence band — tighter when the user supplied a full
  // set of inputs (industry + corridors + volume), wider when one or
  // more are missing. Replaces the previous flat ±15% which lied in
  // both directions: too narrow for low-input cases (false precision)
  // and unnecessarily wide for high-input cases (sandbags the number).
  const conf = ecConfidenceLevel(rec);
  const lo = 1 - conf.band, hi = 1 + conf.band;
  const savings = {
    monthly,
    annual,
    monthlyLow:  Math.round(monthly * lo / 100) * 100,
    monthlyHigh: Math.round(monthly * hi / 100) * 100,
    annualLow:   Math.round(annual  * lo / 100) * 100,
    annualHigh:  Math.round(annual  * hi / 100) * 100,
    confidence:        conf.level,
    confidenceBand:    conf.band,
    confidenceMissing: conf.missing,
  };

  // Methodology — exposed via the result-page <details> block so a
  // skeptical CFO can audit assumptions and check the bank's tariff
  // page directly. asof = data-validity stamp. All percentages reflect
  // the user's actual answers now (Q2 industry → avgTx, Q5 corridors
  // → fxRatio and local/SWIFT split) instead of hand-wave constants.
  const methodology = {
    baseline:        baseline.name,
    baselineSources: baseline.sources,
    baselinePanel:   baseline.panelMembers || [baseline.name],
    asof:            baseline.asof,
    assumptions: [
      { key: "ec.r.method.fxRatio",   vars: { pct: Math.round(fxRatio * 100) } },
      { key: "ec.r.method.txMix",     vars: { localPct: Math.round(split.local * 100),
                                               swiftPct: Math.round(split.swift * 100) } },
      { key: "ec.r.method.txCount",   vars: { n: txCount, swift: swiftTxCount, local: localTxCount,
                                               avg: Math.round(avgTxVal) } },
      { key: "ec.r.method.alteryFx",  vars: { pct: (ALTERY_FX_MARKUP * 100).toFixed(2) } },
      { key: "ec.r.method.bankFx",    vars: { pct: (BANK_FEES.fxMarkupBps / 100).toFixed(2), bank: baseline.name } },
    ],
  };

  return {
    altery, bank,
    savings,
    meta: {
      txCount, fxVolume: Math.round(fxVolume),
      fxVolumePct: Math.round(fxRatio * 100),
      localPct: Math.round(split.local * 100),
      swiftPct: Math.round(split.swift * 100),
      avgTxGbp: Math.round(avgTxVal),
      baseline: baseline.id,
      baselinePanel: baseline.panelMembers || [baseline.name],
    },
    methodology,
  };
}

// Build the three-section "where Altery wins / equal / bank wins"
// capability matrix for the result page. Reads the static structure
// from EC_CAPABILITY_MATRIX (data layer) and filters conditional rows
// (e.g. crypto-rails only when rec.cryptoActive). Returns the synthetic
// baseline.name so the bankWins-section header can read "Where Typical
// UK business bank may still win" instead of a generic label.
function ecCapabilityMatrix(rec) {
  const m = window.EC_CAPABILITY_MATRIX || {};
  const baseline = ecBaselineFor(rec?.entity?.id || "uk");
  const filter = (rows) =>
    (rows || []).filter((r) => !r.showIf || !!rec?.[r.showIf]);
  return {
    bankName:   baseline.name,
    alteryWins: filter(m.alteryWins),
    comparable: filter(m.comparable),
    bankWins:   filter(m.bankWins),
  };
}

// Build the qualitative comparison matrix for the result page.
// Returns 1 row per attribute, with one cell per comparator. Comparator
// list is region-aware: traditional bank matches the user's entity,
// plus the 2-3 most-relevant neobanks.
function ecQualitativeMatrix(rec) {
  const cmp = window.EC_COMPARATORS || {};
  const baseline = ecBaselineFor(rec?.entity?.id || "uk");
  // Pick neobank lineup. Wise + Revolut for all; add 3S Money for
  // anyone (direct competitor), Mercury for US-bound profiles, Payset
  // for EU/UK cross-border.
  const isUS = rec?.country?.code === "US";
  const comparators = [
    cmp.altery,
    baseline,
    cmp.wise,
    cmp.revolut,
    cmp.three_s_money,
    isUS ? cmp.mercury : cmp.payset,
  ].filter(Boolean);

  // Attribute rows — each row maps to a labelKey, and each cell is
  // either a value-string or a boolean/state token rendered as icon.
  // Altery row is dynamic for fxMarkup/swiftOut (plan-dependent).
  const planFees = rec?.plan?.fees || {};
  const rows = [
    { key: "onboarding",   labelKey: "ec.cmp.row.onboarding"   },
    { key: "digitalNative",labelKey: "ec.cmp.row.digitalNative"},
    { key: "affiliate",    labelKey: "ec.cmp.row.affiliate"    },
    { key: "cryptoNative", labelKey: "ec.cmp.row.crypto"       },
    { key: "multiEntity",  labelKey: "ec.cmp.row.multiEntity"  },
    { key: "fxMarkup",     labelKey: "ec.cmp.row.fxMarkup"     },
    { key: "swiftOut",     labelKey: "ec.cmp.row.swiftOut"     },
    { key: "docFriction",  labelKey: "ec.cmp.row.docFriction"  },
  ];

  const cellFor = (cmpObj, rowKey) => {
    const q = cmpObj.qualitative || {};
    if (rowKey === "onboarding") return { kind: "i18n", value: q.onboardingKey };
    if (rowKey === "fxMarkup") {
      if (cmpObj.id === "altery") return { kind: "text", value: planFees.fxMarkup || "0.65%" };
      if (cmpObj.fees) return { kind: "text", value: `${(cmpObj.fees.fxMarkupBps / 100).toFixed(2)}%` };
      return { kind: "text", value: q.fxMarkup || "—" };
    }
    if (rowKey === "swiftOut") {
      if (cmpObj.id === "altery") return { kind: "text", value: planFees.swift || "€10 + 0.25%" };
      if (cmpObj.fees) return { kind: "text", value: `€${cmpObj.fees.swiftOutEur}` };
      return { kind: "text", value: q.swiftOut || "—" };
    }
    if (rowKey === "docFriction") {
      return { kind: "state", value: q.docFriction || "high" }; // low / medium / high
    }
    // Booleans and tri-state strings (true / false / "caseByCase" / "no" / "partial" / "restricted")
    const v = q[rowKey];
    if (v === true)       return { kind: "yes" };
    if (v === false)      return { kind: "no" };
    if (typeof v === "string") return { kind: "state", value: v };
    return { kind: "text", value: "—" };
  };

  return {
    comparators,
    rows: rows.map((r) => ({
      ...r,
      cells: comparators.map((c) => cellFor(c, r.key)),
    })),
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

// ── Handoff payload ─────────────────────────────────────────────
// One base64url-encoded JSON blob in the URL carries every checker
// answer to the onboarding flow. Self-contained → works across device
// switches, email forwards, and "I'll come back later" without any
// backend state. No HMAC or expiry — the data is not security-sensitive
// (the user can still lie during KYB, so signing the URL adds zero
// defence and lots of friction).
//
// Shape (v=1):
//   { v, ref, plan, entity, currency, volume, industry,
//     services[], corridors[], cryptoActive, ts }
//
// Onboarding's URL parser reads ?p=<base64url>, decodes, and pre-fills
// formState. If parsing fails the parser silently falls back to the
// legacy individual params (token/plan/entity/...) — old emails and
// bookmarks keep working.
function ecBuildHandoffPayload(rec, plan, opts) {
  // `plan` lets the caller pin the link to a specific tier (e.g. when
  // the user switched plans via the comparison modal). Defaults to the
  // algorithm's recommendation.
  // `opts.email` lets the caller embed the recipient email — used by
  // the email-this-proposal flow so the onboarding welcome screen can
  // prefill the same address the PDF was sent to. Not included on the
  // result-page CTA path (we don't have an email yet) — that's fine,
  // the field is optional in the decoder.
  //
  // UTMs are read from sessionStorage (first-touch captured on landing)
  // and embedded so the entire handoff — checker→/setup, PDF/email
  // magic link, forwarded copies — carries original marketing
  // attribution all the way to onboarding's meta.utm and onward to
  // HubSpot leads.
  const active = plan || rec?.plan || {};
  const utm    = (typeof ecGetStoredUtms === "function") ? ecGetStoredUtms() : null;
  return {
    v:            1,
    ref:          ecGenProposalRef(),
    plan:         active.id || "pro",
    entity:       rec?.entity?.id || "uk",
    // ISO-3166 alpha-2 country code (e.g. "DE", "GB", "FR"). The
    // onboarding country screen uses the same vocabulary, so this
    // pre-fills the selection with no mapping needed. Falls back to
    // null when the checker didn't capture one (older clients).
    country:      rec?.country?.code || null,
    currency:     rec?.entity?.id === "uk" ? "GBP" : "EUR",
    volume:       rec?.monthlyVolume || null,
    // `industry` is the customer-facing ICP-aligned label the user
    // picked. `cra` is the back-office Compliance/Risk Assessment
    // category (i18n key, e.g. "ec.cra.it-dev") — onboarding/back-
    // office uses this to route the KYB queue. Mapping lives on the
    // industry definition in checker-data.js.
    industry:     rec?.ind?.value || null,
    cra:          rec?.ind?.craKey || null,
    services:     Array.isArray(rec?.services) ? rec.services : [],
    corridors:    Array.isArray(rec?.corridors) ? rec.corridors : [],
    cryptoActive: !!rec?.cryptoActive,
    email:        (opts && typeof opts.email === "string" && opts.email.includes("@")) ? opts.email : null,
    utm,          // null when no UTMs captured; object {utm_source, ...} otherwise
    ts:           Date.now(),
  };
}

function ecEncodeHandoffP(payload) {
  // JSON → UTF-8 → base64 → base64url. The unescape(encodeURIComponent)
  // dance preserves Unicode (Cyrillic industry labels, etc.) which raw
  // btoa() would corrupt. Strip trailing "=" padding because URLs are
  // happier without it and atob accepts unpadded input fine.
  const json = JSON.stringify(payload || {});
  const b64  = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Convenience — full URL string used by goToOnboarding AND by the
// PDF/email CTA. One call site, one shape, impossible to forget a field.
// `opts` forwards into the payload builder so callers can embed extras
// like the recipient email without touching the payload schema directly.
function ecBuildHandoffURL(rec, plan, origin, opts) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "https://altery.com");
  const p    = ecEncodeHandoffP(ecBuildHandoffPayload(rec, plan, opts));
  return `${base}/setup?p=${p}`;
}

// ── UTM attribution (first-touch, session-scoped) ──────────────────
// Marketing attribution flow:
//   1. Visitor lands on / or /setup with ?utm_source=...&utm_medium=...
//   2. ecCaptureAndStoreUtms() runs on app mount, persists to sessionStorage
//      under "altery:utm:v1" with FIRST-TOUCH semantics — once a non-empty
//      payload is stored, subsequent captures inside the same tab can't
//      overwrite it. Tab close clears the storage.
//   3. ecBuildHandoffPayload embeds the stored UTMs in ?p=, so the
//      checker→onboarding handoff (and any forwarded email link) carries
//      original attribution.
//   4. Onboarding hydrateFormState reads utms from the payload, parks them
//      in formState.meta.utm — available for HubSpot lead-attribution
//      properties and any future analytics fire-and-forget.
//
// Why first-touch (not last-touch): we want to remember the campaign that
// initially captured the lead, not whatever URL they last clicked from.
// Last-touch would overwrite "google ads" with "direct" the next time
// they paste the link from a Slack message — losing the real source.
const UTM_FIELDS   = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const UTM_STORAGE  = "altery:utm:v1";

function ecCaptureUtmsFromURL() {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  const out = {};
  let any = false;
  for (const k of UTM_FIELDS) {
    const v = sp.get(k);
    if (v) { out[k] = v.slice(0, 200); any = true; }
  }
  if (!any) return null;
  out.referrer = (typeof document !== "undefined" && document.referrer) ? document.referrer.slice(0, 500) : null;
  out.landedAt = new Date().toISOString();
  return out;
}

function ecGetStoredUtms() {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Treat the record as present only if it has at least one utm_*; old
    // "all-null" stubs from a previous version should not block a real
    // first-touch capture later in the session.
    if (parsed && UTM_FIELDS.some((f) => parsed[f])) return parsed;
    return null;
  } catch (e) { return null; }
}

function ecStoreUtmsFirstTouch(utms) {
  if (!utms || typeof window === "undefined" || !window.sessionStorage) return null;
  const existing = ecGetStoredUtms();
  if (existing) return existing;  // first-touch wins, no overwrite
  try { sessionStorage.setItem(UTM_STORAGE, JSON.stringify(utms)); } catch (e) { /* quota / private mode */ }
  return utms;
}

// Top-level orchestrator — call once on app mount on each entry point
// (checker EcApp + onboarding App). Reads the current URL, decides
// whether to commit a first-touch record, returns the effective set
// the caller can stash in component state.
function ecCaptureAndStoreUtms() {
  const fromUrl  = ecCaptureUtmsFromURL();
  const existing = ecGetStoredUtms();
  if (existing) return existing;                  // sessionStorage wins
  if (fromUrl)  return ecStoreUtmsFirstTouch(fromUrl);
  return null;
}

// Helper for any external redirect we ever wire (e.g. app.altery.com/...) —
// appends every utm_* the current session knows about to the URL's query
// string without trampling existing params already on the URL.
function ecAppendUtmsToURL(url, utms) {
  const u = utms || ecGetStoredUtms();
  if (!u || !url) return url;
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://altery.com");
    for (const k of UTM_FIELDS) {
      if (u[k] && !parsed.searchParams.has(k)) parsed.searchParams.set(k, u[k]);
    }
    return parsed.toString();
  } catch (e) { return url; }
}

Object.assign(window, {
  ecCurrencyFlag, ecCurrencyName, ecRecommend,
  ecEstimateTxCount, ecComputeCostBreakdown, ecOutcomesForSavings,
  ecBaselineFor, ecQualitativeMatrix, ecCapabilityMatrix,
  ecConfidenceLevel, ecFxVolumeRatio, ecLocalSwiftSplit, ecAvgTxGbp,
  ecVolumeHintKey, ecFormatVolume, ecEstimateSavings, ecGenProposalRef,
  ecBuildHandoffPayload, ecEncodeHandoffP, ecBuildHandoffURL,
  ecCaptureUtmsFromURL, ecGetStoredUtms, ecStoreUtmsFirstTouch,
  ecCaptureAndStoreUtms, ecAppendUtmsToURL,
  ecFmtFromGbp, ecDisplayCurrencyFor, EC_FX_FROM_GBP, EC_CURRENCY_SYMBOL,
});
