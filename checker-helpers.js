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
function ecRecommend({ countryCode, industry, monthlyVolume, corridorsIn, corridorsOut, monthlyTx, services, volumeInIdx, volumeOutIdx, txInIdx, txOutIdx }) {
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

  // Defensive: RoW maps to the UK entity, and so does an unknown/missing
  // country (shouldn't happen via the UI, which only offers EC_COUNTRIES
  // codes) — never leave `entity` undefined, because downstream
  // EcResultApproved reads entity.nameKey unconditionally.
  let entity;
  if (country?.region === "uk") entity = EC_ENTITIES.uk;
  else if (country?.region === "eu") entity = EC_ENTITIES.eu;
  else if (country?.region === "mena") entity = EC_ENTITIES.mena;
  else entity = EC_ENTITIES.uk;

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
  // Crypto risk appetite is per-jurisdiction, not per-region: NOT offered to
  // UK/US/JP/NL (country.noCrypto); served in the EEA except NL but not
  // advertised; offered openly across MENA + the rest of RoW. So it can't key
  // off `region` alone — US/JP are "row" like crypto-OK Seychelles/Caribbean.
  // No entity reroute: EEA crypto stays on the EU entity (the previous EU→UK
  // reroute was backwards — UK is exactly where crypto isn't offered).
  const cryptoBlocked = cryptoActive && !!country?.noCrypto;            // UK/US/JP/NL — asked, not offered
  const cryptoServed  = cryptoActive && !country?.noCrypto;             // EEA-ex-NL + MENA + RoW(−US/JP)
  const cryptoOpen    = cryptoServed && country?.region !== "eu";       // openly advertised (EEA stays quiet)

  // We track WHICH signals fired in `tierSignals` so the reasoning
  // block can cite them by name ("Your €375k/mo volume crosses
  // Starter's ceiling" vs generic "Pro is recommended"). The signals
  // also feed result-page caveats and perks ordering. See the decision
  // rationale on the tierSignals object below.
  const svcSet = new Set(svcs);
  // Tier decision — VOLUME is the primary driver; only one capability
  // genuinely gates Starter. Earlier this fired Pro on five separate
  // signals (volume, breadth, tx count, mass/cards, industry) summed from
  // a two-slider in+out model, so almost every configuration landed on Pro
  // and Starter was effectively unreachable — even at minimum volume a
  // typical multi-market pick (3 regions in + 3 out) crossed the corridor
  // threshold. We now:
  //   • drive Pro by combined throughput > £250k (the default slider
  //     position is £250k, so a small business defaults to Starter);
  //   • keep mass payouts as the ONE non-volume Pro trigger — bulk/batch
  //     transfers are a Pro-only capability, so Starter literally can't
  //     serve a mass-payout business;
  //   • demote corridor breadth, tx count, cards and industry to
  //     reasoning-only signals (they colour the "why" bullets when the
  //     plan is already Pro, but no longer force the tier on their own).
  const tierSignals = {
    volumePro:        monthlyVolume > 250000,
    volumeUltra:      monthlyVolume >= 1000000,
    // Display-only signals (not part of needsPro) — surfaced in the
    // reasoning bullets as supporting context when the plan is Pro/Ultra.
    corridorsBreadth: corridors.length >= 5,
    txHigh:           monthlyTx >= 300,
    // Capability gate: bulk & batch transfers, programmatic access,
    // and multi-company management are Pro-only. Canonical pricing
    // says multi-company is technically available on all plans, but
    // the operational tooling (separate IBANs / cards / team scopes
    // per entity) sits in Pro+ — Starter is single-entity in practice.
    // Volume alone still escalates to Ultra (≥£1M).
    servicesPro:      svcSet.has("mass") || svcSet.has("api") || svcSet.has("multiCompany"),
    // No service forces Ultra anymore — only raw volume does. Kept
    // on the signals object for downstream callers that still read
    // the field; left false until volume crosses the £1M threshold.
    servicesUltra:    false,
    industryPro:      industry === "affiliate" || industry === "creator",
  };
  const needsPro = tierSignals.volumePro || tierSignals.servicesPro;
  const needsUltra = tierSignals.volumeUltra || tierSignals.servicesUltra;
  let plan = EC_PLANS.starter;
  if (needsPro)   plan = EC_PLANS.pro;
  if (needsUltra) plan = EC_PLANS.ultra;

  // Caveats array dropped 2026-05-29. We used to push three flavours
  // here (crypto-fluent, performance-marketing structured review,
  // Pro→Ultra upsell hint) and render them in a "Worth knowing before
  // you apply" section on the result page. The block added noise to
  // an otherwise focused recommendation, and the upsell hint in
  // particular muddled the recommendation itself. If a future surface
  // needs conditional flags, expose them on `tierSignals` instead.

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
  if (svcSet.has("api") && plan.id !== "starter") {
    reasoning.push({ key: "ec.reasoning.services.api", priority: 7 });
  }
  if (svcSet.has("multiCompany") && plan.id !== "starter") {
    reasoning.push({ key: "ec.reasoning.services.multiCompany", priority: 9 });
  }
  // Industry-driven
  if (tierSignals.industryPro && plan.id !== "starter") {
    reasoning.push({ key: "ec.reasoning.industry.payouts", priority: 6 });
  }
  // Complexity
  if (tierSignals.corridorsBreadth && plan.id !== "starter") {
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

  return { kind: "approved", entity, plan, country, ind, monthlyVolume, corridors, corridorsIn: cIn, corridorsOut: cOut, cryptoActive, cryptoServed, cryptoOpen, cryptoBlocked, services: svcs, tierSignals, reasoning: reasoningTop,
    // Raw per-direction band indices echoed through so the handoff URL can
    // translate them to registration band codes (the summed monthlyVolume/
    // monthlyTx can't be split back). Undefined when not supplied.
    volumeInIdx, volumeOutIdx, txInIdx, txOutIdx };
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

// Compact variant — used on the savings card where amounts can hit
// 7-figure ranges (high-volume customers see "£2 598 000–£4 850 400 a
// year" otherwise — overwhelming and hard to scan). Abbreviates with
// k/m suffixes above the relevant thresholds, while the full-precision
// `ecFmtFromGbp` stays in place for the methodology modal / PDF / email
// where a CFO actually wants exact numbers.
//
//   £0 .. £999       → "£123"  (plain integer, sub-1k stays full)
//   £1 000 .. £9 999 → "£3.5k" (one decimal at this scale is meaningful)
//   £10 000 .. £999 999 → "£75k" (round to nearest k)
//   £1 000 000+      → "£2.6m" (one decimal up to £10m, integer above)
function ecFmtFromGbpCompact(gbpValue, currency) {
  const rate = EC_FX_FROM_GBP[currency];
  const symbol = EC_CURRENCY_SYMBOL[currency];
  if (rate == null || symbol == null) return ecFmtFromGbpCompact(gbpValue, "GBP");
  const converted = (gbpValue || 0) * rate;
  if (converted >= 1_000_000) {
    const m = converted / 1_000_000;
    return symbol + (m >= 10 ? Math.round(m).toString() : m.toFixed(1).replace(/\.0$/, "")) + "m";
  }
  if (converted >= 10_000) {
    return symbol + Math.round(converted / 1000) + "k";
  }
  if (converted >= 1_000) {
    return symbol + (converted / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return symbol + Math.round(converted).toLocaleString("en-US").replace(/,/g, " ");
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

  // Hidden bank costs — items the bank doesn't publish but does
  // charge. Applied only to the "realistic" track; conservative
  // (headline) range above stays on published rates. See
  // EC_BANK_HIDDEN_COSTS for sourcing rationale.
  const hidden = window.EC_BANK_HIDDEN_COSTS || {};
  bank.hiddenFx    = Math.round(fxVolume * (hidden.fxAdditionalBps || 0) / 10000);
  bank.hiddenSwift = Math.round(swiftTxCount * (hidden.swiftCorrespondentGbp || 0));
  bank.totalRealistic = bank.total + bank.hiddenFx + bank.hiddenSwift;

  // Round savings to the nearest £100 for clean presentation. Two
  // tracks: conservative (published rates only) is the headline;
  // realistic (with bank-side hidden costs) is the trust-strip number
  // shown right below the range. Both use the same confidence band.
  const rawMonthly          = Math.max(bank.total - altery.total, 0);
  const rawRealisticMonthly = Math.max(bank.totalRealistic - altery.total, 0);
  const monthly             = Math.round(rawMonthly / 100) * 100;
  const realisticMonthly    = Math.round(rawRealisticMonthly / 100) * 100;
  const annual              = monthly * 12;
  const realisticAnnual     = realisticMonthly * 12;

  // Adaptive confidence band — tighter when the user supplied a full
  // set of inputs (industry + corridors + volume), wider when one or
  // more are missing. Replaces the previous flat ±15% which lied in
  // both directions: too narrow for low-input cases (false precision)
  // and unnecessarily wide for high-input cases (sandbags the number).
  const conf = ecConfidenceLevel(rec);
  const lo = 1 - conf.band, hi = 1 + conf.band;
  // Range fields for the consolidated single-track result-card view.
  // bank low end uses published-only fees; bank high end includes the
  // wholesale FX spread + correspondent SWIFT costs (so the range
  // brackets both "what the bank advertises" and "what you'd actually
  // pay"). altery range is just confidence-band variance — our fee
  // structure is published with no hidden additions.
  // Single-number `bank.total` / `altery.total` (above) stay unchanged
  // for the methodology details, PDF/email proposal, and tests.
  const r100 = (n) => Math.round(n / 100) * 100;
  bank.totalLow    = r100(bank.total * lo);
  bank.totalHigh   = r100(bank.totalRealistic * hi);
  altery.totalLow  = r100(altery.total * lo);
  altery.totalHigh = r100(altery.total * hi);
  const rangeMonthlyLow  = r100(Math.max(bank.totalLow  - altery.totalHigh, 0));
  const rangeMonthlyHigh = r100(Math.max(bank.totalHigh - altery.totalLow,  0));
  const savings = {
    monthly,
    annual,
    monthlyLow:  Math.round(monthly * lo / 100) * 100,
    monthlyHigh: Math.round(monthly * hi / 100) * 100,
    annualLow:   Math.round(annual  * lo / 100) * 100,
    annualHigh:  Math.round(annual  * hi / 100) * 100,
    // Realistic track — published rates + hidden bank costs (FX
    // wholesale-spread + correspondent SWIFT). Shown as a secondary
    // line under the headline range so users can compare what they'd
    // actually pay vs what the bank advertises.
    monthlyRealistic:     realisticMonthly,
    monthlyRealisticLow:  Math.round(realisticMonthly * lo / 100) * 100,
    monthlyRealisticHigh: Math.round(realisticMonthly * hi / 100) * 100,
    annualRealistic:      realisticAnnual,
    annualRealisticLow:   Math.round(realisticAnnual * lo / 100) * 100,
    annualRealisticHigh:  Math.round(realisticAnnual * hi / 100) * 100,
    hiddenFx:             bank.hiddenFx,
    hiddenSwift:          bank.hiddenSwift,
    hiddenTotal:          bank.hiddenFx + bank.hiddenSwift,
    // Single-track range fields — wider than monthlyLow/monthlyHigh
    // because they fold the hidden bank-side costs into the high end.
    // Used by the result-page savings card (which renders one savings
    // narrative instead of two competing tracks).
    rangeMonthlyLow:  rangeMonthlyLow,
    rangeMonthlyHigh: rangeMonthlyHigh,
    rangeAnnualLow:   rangeMonthlyLow  * 12,
    rangeAnnualHigh:  rangeMonthlyHigh * 12,
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
    // Headline FX-margin comparison only — keeps the methodology
    // modal focused on the one number that actually explains the
    // savings delta. Derivation bullets (corridor mix, tx count,
    // FX ratio) lived here historically; they duplicated info that
    // the cost table above already shows, and the hidden-cost
    // citations (wholesale FX spread, correspondent SWIFT fee)
    // are already disclosed in the savings-card inline footnote.
    // The underlying math still applies those — only the citation
    // bullets are gone.
    assumptions: [
      { key: "ec.r.method.alteryFx", vars: { pct: (ALTERY_FX_MARKUP * 100).toFixed(2) } },
      { key: "ec.r.method.bankFx",   vars: { pct: (BANK_FEES.fxMarkupBps / 100).toFixed(2), bank: baseline.name } },
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
      // Neobank comparators have no `fees` block — their tariff is a
      // qualitative band string ("£5-15"). Baseline (synthesised median
      // across the panel) has `fees.swiftOutGbp` only; the older code
      // tried to read `swiftOutEur` and rendered literal "€undefined".
      if (q.swiftOut) return { kind: "text", value: q.swiftOut };
      if (cmpObj.fees && typeof cmpObj.fees.swiftOutGbp === "number") {
        return { kind: "text", value: `£${cmpObj.fees.swiftOutGbp}` };
      }
      return { kind: "text", value: "—" };
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

// ─── Region-aware two-panel comparison (price + capability) ─────
//
// Strategy: split the single 6-column "all comparators" view into two
// focused tables that pick comparators where Altery wins each axis.
//
//   Price panel  — Altery + 3 traditional banks for the user's region.
//                  Altery is 4-7x cheaper on FX and SWIFT, opens
//                  accounts in days vs weeks, publishes every fee.
//   Capability panel — Altery + 2-3 neobanks. Altery has crypto rails,
//                  multi-company management, three regulated entities
//                  in one product, accepts affiliate/creator; the
//                  neobanks don't.
//
// Picking different comparators per axis avoids the "Wise is cheaper
// than Altery Pro on FX" honesty problem — Wise simply doesn't appear
// in the price table where its FX-floor wins. Instead it appears in
// the capability table where it loses (no crypto, no multi-entity).
//
// MENA users get only the price panel: no major neobank operates in
// MENA with a local regulated presence, so capability comparison is
// vs. nothing — we surface that uniqueness via a callout instead.

// Internal: pick comparators by region from EC_COMPARATORS.
function ecComparatorGroups(rec) {
  const cmp = window.EC_COMPARATORS || {};
  const entityId = (rec?.entity?.id || "uk").toLowerCase();
  const altery = cmp.altery;
  if (entityId === "eu") {
    return {
      price: [
        altery,
        cmp.eu_traditional, // BNP Paribas (lead)
        cmp.eu_sg,
        cmp.eu_deutsche,
      ].filter(Boolean),
      capability: [
        altery,
        cmp.wise,
        cmp.revolut,
        cmp.qonto,
      ].filter(Boolean),
    };
  }
  if (entityId === "mena") {
    return {
      price: [
        altery,
        cmp.mena_traditional, // Mashreq (lead)
        cmp.mena_enbd,
        cmp.mena_fab,
      ].filter(Boolean),
      // MENA capability set:
      //  - 3S Money — DFSA + UK + LU + HK, the direct multi-
      //    jurisdiction peer
      //  - Wio Bank — UAE digital SME bank, zero-balance, Web3-
      //    friendly; the sharper digital threat to Altery MENA
      //    than the traditional UAE incumbents in the price panel
      //  - Airwallex — global API/payments platform, 11+ licences,
      //    UAE announced (not live as of 2026-05-29). Included
      //    because MENA founders evaluating global SaaS payments
      //    will compare us to them.
      // Altery angle: 3S Money's regulatory breadth + Wio's
      // digital UX + Airwallex's API depth, at Starter £50/mo with
      // published tariff and accepted crypto.
      capability: [
        altery,
        cmp.three_s_money,
        cmp.wio_bank,
        cmp.airwallex,
      ].filter(Boolean),
    };
  }
  // UK + ROW default
  return {
    price: [
      altery,
      cmp.uk_traditional, // Barclays (lead)
      cmp.uk_hsbc,
      cmp.uk_lloyds,
    ].filter(Boolean),
    capability: [
      altery,
      cmp.wise,
      cmp.revolut,
      cmp.three_s_money,
    ].filter(Boolean),
  };
}

// Resolve a single cell — kind discriminates how the renderer
// (PDF / future on-screen / email) draws it.
function ecCellFor(cmpObj, rowKey, planFees) {
  const q = cmpObj.qualitative || {};
  const fees = cmpObj.fees || {};
  if (rowKey === "onboarding") {
    return { kind: "i18n", value: q.onboardingKey || "ec.cmp.q.onboarding.weeks" };
  }
  if (rowKey === "fxMarkup") {
    if (cmpObj.id === "altery") return { kind: "text", value: planFees.fxMarkup || "up to 0.7%" };
    if (q.fxMarkup) return { kind: "text", value: q.fxMarkup };
    if (typeof fees.fxMarkupBps === "number") {
      return { kind: "text", value: `${(fees.fxMarkupBps / 100).toFixed(2)}%` };
    }
    return { kind: "text", value: "—" };
  }
  if (rowKey === "swiftOut") {
    if (cmpObj.id === "altery") return { kind: "text", value: planFees.swift || "€10 + 0.25%" };
    if (q.swiftOut) return { kind: "text", value: q.swiftOut };
    if (typeof fees.swiftOutGbp === "number") {
      return { kind: "text", value: `£${fees.swiftOutGbp}` };
    }
    return { kind: "text", value: "—" };
  }
  if (rowKey === "accountOpening") {
    if (cmpObj.id === "altery") return { kind: "i18n", value: "ec.cmp.v.free" };
    if (typeof fees.accountOpeningGbp === "number" && fees.accountOpeningGbp > 0) {
      return { kind: "text", value: `£${fees.accountOpeningGbp}` };
    }
    // Most banks: "Free with conditions" (min balance / activity), most
    // neobanks free, traditional MENA banks usually ~AED 500-1000.
    return { kind: "i18n", value: cmpObj.type === "traditional" ? "ec.cmp.v.freeStar" : "ec.cmp.v.free" };
  }
  if (rowKey === "docFriction") {
    return { kind: "state", value: q.docFriction || "high" };
  }
  if (rowKey === "api") {
    if (cmpObj.id === "altery") return { kind: "yes" };
    // Wise has API on paid tier, Revolut limited (Sandbox + Live but
    // narrow scope), Qonto API on higher plans, 3S Money no, banks no
    // at SME tier (corporate desk only).
    if (cmpObj.id === "wise" || cmpObj.id === "revolut" || cmpObj.id === "qonto") {
      return { kind: "state", value: "limited" };
    }
    return { kind: "no" };
  }
  if (rowKey === "multiJurisdiction") {
    // Retained for back-compat; the active capability panel no
    // longer renders this row because 3S Money (DFSA + UK + LU + HK)
    // and Wise (Wise Nuqud CBUAE) also have local UAE presence.
    if (cmpObj.id === "altery") return { kind: "yes" };
    if (q.uaeLicence) return { kind: "yes" };
    return { kind: "no" };
  }
  if (rowKey === "tariffTransparency") {
    // Altery publishes plan-tiered FX % and SWIFT formulas (Starter
    // 0.8%, Pro 0.7%, Ultra 0.4% with explicit per-rail per-tier
    // tariffs). Most competitors are "partial" (allowance/quote-
    // dependent) or "quoted" (relationship pricing, in-app only).
    if (cmpObj.id === "altery") return { kind: "state", value: "published" };
    if (q.tariffTransparency) return { kind: "state", value: q.tariffTransparency };
    return { kind: "state", value: "partial" };
  }
  // Generic boolean / tri-state row (crypto, affiliate, multiEntity,
  // digitalNative). Falls through to qualitative[rowKey].
  const v = q[rowKey];
  if (v === true) return { kind: "yes" };
  if (v === false) return { kind: "no" };
  if (typeof v === "string") return { kind: "state", value: v };
  return { kind: "text", value: "—" };
}

// Build the price-focused comparison panel. Rows are picked to
// emphasise Altery's pricing wins against the traditional bank
// baseline for the user's region.
function ecPricePanel(rec) {
  const groups = ecComparatorGroups(rec);
  const comparators = groups.price;
  if (!comparators || comparators.length === 0) return null;
  const planFees = rec?.plan?.fees || {};
  const rows = [
    { key: "onboarding",     labelKey: "ec.cmp.row.onboarding" },
    { key: "fxMarkup",       labelKey: "ec.cmp.row.fxMarkup" },
    { key: "swiftOut",       labelKey: "ec.cmp.row.swiftOut" },
    { key: "accountOpening", labelKey: "ec.cmp.row.accountOpening" },
    { key: "docFriction",    labelKey: "ec.cmp.row.docFriction" },
  ];
  return {
    comparators,
    rows: rows.map((r) => ({
      ...r,
      cells: comparators.map((c) => ecCellFor(c, r.key, planFees)),
    })),
  };
}

// Build the capability-focused comparison panel. For MENA returns
// null — the PDF renderer surfaces a "unique in MENA" callout instead.
//
// History (2026-05-29 honesty pass):
//  - "multiEntity" row dropped: Wise/Revolut/Qonto all do linked
//    multi-company under one login. Altery does the same shape today.
//  - "multiJurisdiction" row dropped: 3S Money has DIFC/DFSA + UK +
//    Luxembourg + HK — genuinely matches Altery's UK+EU+UAE footprint.
//    A binary ✓/— vs 3S Money was overstating Altery's uniqueness.
//  - "tariffTransparency" row added: Altery publishes plan-tiered FX
//    and SWIFT % (£50/100/300 plans). Wise/Revolut/Qonto are partial
//    (live-quoted or plan-allowance complexity); 3S Money quotes per
//    relationship. This is a defensible Altery win.
function ecCapabilityPanel(rec) {
  const groups = ecComparatorGroups(rec);
  const comparators = groups.capability;
  if (!comparators || comparators.length === 0) return null;
  const planFees = rec?.plan?.fees || {};
  const rows = [
    { key: "cryptoNative",       labelKey: "ec.cmp.row.crypto" },
    { key: "affiliate",          labelKey: "ec.cmp.row.affiliate" },
    { key: "tariffTransparency", labelKey: "ec.cmp.row.tariffTransparency" },
    { key: "api",                labelKey: "ec.cmp.row.api" },
    { key: "onboarding",         labelKey: "ec.cmp.row.onboarding" },
  ];
  return {
    comparators,
    rows: rows.map((r) => ({
      ...r,
      cells: comparators.map((c) => ecCellFor(c, r.key, planFees)),
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

// Map a recommendation to the checker's HubSpot contact properties.
// Keys + values match the verified property schema exactly: checker_entity
// (enum UK/EU/MENA), checker_plan (enum Starter/Pro/Ultra),
// checker_monthly_volume_gbp (number), checker_est_annual_savings_gbp
// (number). Returns a flat string-valued object; callers shape it into a
// query string (booking URL) or a Forms-API fields array (lead submit).
function ecCheckerContext(rec) {
  const out = {};
  if (!rec) return out;
  const entityId = rec.entity && rec.entity.id;
  if (entityId) out.checker_entity = String(entityId).toUpperCase();
  const planId = rec.plan && rec.plan.id;
  if (planId) out.checker_plan = planId.charAt(0).toUpperCase() + planId.slice(1);
  if (rec.monthlyVolume) out.checker_monthly_volume_gbp = String(Math.round(rec.monthlyVolume));
  const cost = (typeof ecComputeCostBreakdown === "function") ? ecComputeCostBreakdown(rec) : null;
  const annual = cost && cost.savings && cost.savings.annual;
  if (annual) out.checker_est_annual_savings_gbp = String(annual);
  return out;
}

// Build the HubSpot Meetings URL for a given recommendation, prefilled
// with the visitor's email and tagged with the checker context. Used by
// the PDF/email "book a call" link and the soft-decline "talk to us"
// button. (The in-app result flow routes leads via ecSubmitHubspotLead
// instead.) `email` is optional.
function ecBookingUrl(rec, email) {
  const base = window.EC_BOOKING_URL || "";
  if (!rec) return base;
  const params = new URLSearchParams();
  if (email) params.set("email", String(email).trim());
  const ctx = ecCheckerContext(rec);
  Object.keys(ctx).forEach((k) => params.set(k, ctx[k]));
  const qs = params.toString();
  return qs ? base + "?" + qs : base;
}

// Deep-link for the PDF/email "request a callback" button. Points back to
// the checker with ?contact=1 plus the visitor's email and checker context
// carried as params. EcApp detects this on load and renders the standalone
// callback-request form (prefilled) — a confirmation step, so an email
// client prefetching the link can't create a lead on its own. The lead is
// only written when the user submits the form.
function ecContactRequestUrl(rec, email) {
  const origin = (typeof window !== "undefined" && window.location && window.location.origin)
    ? window.location.origin + "/"
    : "https://altery-eligibility.vercel.app/";
  const params = new URLSearchParams({ contact: "1" });
  if (email) params.set("email", String(email).trim());
  const ctx = ecCheckerContext(rec);
  if (ctx.checker_entity)                  params.set("entity",  ctx.checker_entity);
  if (ctx.checker_plan)                    params.set("plan",    ctx.checker_plan);
  if (ctx.checker_monthly_volume_gbp)      params.set("volume",  ctx.checker_monthly_volume_gbp);
  if (ctx.checker_est_annual_savings_gbp)  params.set("savings", ctx.checker_est_annual_savings_gbp);
  return origin + "?" + params.toString();
}

// HubSpot lead capture — POSTs email + checker context to our own
// /api/hubspot-lead serverless function, which upserts the contact via
// the CRM Contacts API using a server-held Service Key. Once
// checker_entity is set, HubSpot's owner-rotation workflow (enrollment
// trigger "checker_entity is known") routes the lead to the next
// available salesperson.
//
// We do NOT submit to the HubSpot Forms API: the legacy integration-submit
// endpoint silently drops custom-property values for new-builder forms
// (creates the contact + fires the workflow, but loses entity/plan/volume/
// savings). Routing through our backend keeps the token off the client and
// writes every property reliably.
async function ecSubmitHubspotLead({ email, firstname, lastname, company, phone, rec, context, antiSpam }) {
  if (!email) return { ok: false };
  // `context` lets callers pass the 4 checker values directly (e.g. the
  // PDF/email deep-link, which carries them in the URL and has no full
  // rec to rebuild); otherwise derive them from rec.
  const properties = Object.assign({ email: String(email).trim() }, context || ecCheckerContext(rec));
  if (firstname) properties.firstname = String(firstname).trim();
  if (lastname)  properties.lastname  = String(lastname).trim();
  if (company)   properties.company   = String(company).trim();
  if (phone)     properties.phone     = String(phone).trim();
  // Marketing attribution — forward the first-touch UTMs stashed in
  // sessionStorage to HubSpot so Sales can filter leads by campaign.
  // ecGetStoredUtms returns null when no utm_* hit the landing URL.
  // Each property is allowlisted server-side (api/hubspot-lead.js).
  const utm = ecGetStoredUtms();
  if (utm) {
    for (const k of UTM_FIELDS) {
      if (utm[k]) properties[k] = String(utm[k]).slice(0, 200);
    }
    // utm.referrer is captured (see ecCaptureUtmsFromURL) but NOT
    // forwarded — the HubSpot account does not yet have a custom
    // `utm_referrer` contact property and sending unknown property
    // names causes the entire batch/upsert to fail with HTTP 400.
    // Create that property in HubSpot and uncomment the line below
    // to start writing it.
    // if (utm.referrer) properties.utm_referrer = String(utm.referrer).slice(0, 500);
  }
  // antiSpam payload — honeypot field + form-load timestamp the
  // form component tracks. Server rejects if honeypot is non-empty
  // (bots fill every field) or if submit happened <3 s after mount.
  const payload = { properties };
  if (antiSpam) {
    if (typeof antiSpam.website === "string") payload.website = antiSpam.website;
    if (typeof antiSpam.formLoadedAt === "number") payload.formLoadedAt = antiSpam.formLoadedAt;
  }
  try {
    const res = await fetch("/api/hubspot-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[ecSubmitHubspotLead] HTTP", res.status, await res.text().catch(() => ""));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[ecSubmitHubspotLead] failed:", e);
    return { ok: false };
  }
}

// Generate a deterministic-looking proposal reference. Format
// "EL-{YYYY}-{4 alphanum}". Mostly cosmetic — gives the document
// a tracking-number feel that legit business proposals have.
function ecGenProposalRef() {
  const year = new Date().getFullYear();
  const tail = Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  return `EL-${year}-${tail.padEnd(4, "0")}`;
}

// External corporate-registration app. The checker no longer hosts an
// internal /setup onboarding — every "Start setup" CTA (web, PDF, email)
// redirects here.
const EC_REGISTRATION_URL = "https://app.altery.com/n/registration-corporate";

// ── Handoff value maps: checker taxonomy → external registration catalog ──
// The registration app keys these fields off its own catalog CODES, not our
// text slugs, so we translate at the boundary. Built against the registration
// team's catalog dump (2026-06-16).
//
// Industry → registration catalogType-2 code. The checker's industry list is
// deliberately coarser than registration's two-level catalog, so a few rows
// are a best-fit pending the team's sign-off (marked CONFIRM).
const EC_REG_INDUSTRY = {
  saas: 1115, apps: 1108, games: 2004, edtech: 1801,
  marketplace: 1403, ecom: 1402, marketing: 1001, freelance: 1201,
  prof: 600,             // "My category is not listed" — "Professional services" has no matching leaf (founder call 2026-06-16); dev to confirm 600 is accepted as an "other" value
  trade: 1405,           // CONFIRM — no import/export leaf; mapped to Wholesale
  wholesale: 1405, logistics: 1502, manufacturing: 1409,
  creator: 1702, affiliate: 1005, vpn: 1106,
  crypto: 2101,          // CONFIRM — generic crypto → "Digital assets trading"
  other: 600,            // "My category is not listed"
  // gambling/adult/weapons/lending are hard declines — they never reach a
  // handoff URL, so they need no mapping.
};

// Services → registration `businessNeeds` slug. api + multiCompany have no
// registration equivalent and are intentionally dropped.
const EC_REG_SERVICE = {
  local:       "local-payments",
  cards:       "cards",
  crypto:      "crypto-transfers",
  crossBorder: "cross-border-payments",
  mass:        "mass-payments",
};

// Volume bands: checker band index → registration band code. Incoming and
// outgoing use DIFFERENT code sets for the same EUR bands (registration
// catalogType 11 vs 14). The checker's 6 bands don't line up 1:1 with
// registration's 9, so each checker band maps to the registration band that
// contains its midpoint — a couple collapse onto one code (lossy, but it's a
// pre-fill the applicant adjusts).
//   checker idx: 0 <50k · 1 50–200k · 2 200–500k · 3 500k–1M · 4 1–5M · 5 5M+
const EC_REG_VOL_IN  = [11, 211, 212, 212, 213, 12];
const EC_REG_VOL_OUT = [11, 5,   6,   6,   7,   12];

// Tx-count bands: checker band index → registration activity code (1–4).
//   checker idx: 0 <20 · 1 20–100 · 2 101–300 · 3 301–1000 · 4 1000+
//   registration: 1 = 1–50 · 2 = 51–300 · 3 = 301–1000 · 4 = 1001+
const EC_REG_TX = [1, 2, 2, 3, 4];

// Full handoff URL used by goToOnboarding AND the PDF/email/callback CTAs.
// Carries the complete NON-PII profile (translated to the registration's
// catalog codes, so it can pre-fill) + first-touch UTMs, plus — per the
// call-site — the contact details collected so far.
//
// PII policy (founder decision, 2026-06-15): contact details (email / name /
// phone / company) ARE forwarded so registration can pre-fill, but ONLY when a
// call-site explicitly passes them in `opts`. The trade-off is accepted
// knowingly — GET params surface in server logs, browser history, and the
// Referer header — so the gating keeps each surface to the minimum it holds:
//   • web "Start setup" CTA — anonymous quiz, passes NO opts → zero PII.
//   • PDF + email links     — pass { email } only (the user gave it there).
//   • Sales-callback flow   — passes { firstname, lastname, phone, email, company }.
function ecBuildHandoffURL(rec, plan, origin, opts) {
  const url = new URL(EC_REGISTRATION_URL);
  const set = (k, v) => { if (v != null && v !== "") url.searchParams.set(k, String(v)); };
  const activePlan = plan || (rec && rec.plan);

  if (activePlan && activePlan.id) set("plan", activePlan.id);
  // entity + currency intentionally NOT sent: registration derives the legal
  // entity from the country of incorporation and the currency from that, and
  // the team confirmed both params are unused (founder call, 2026-06-16).
  if (rec) {
    set("country", rec.country && rec.country.code);   // ISO 3166-1 alpha-2, as registration expects
    if (rec.ind && EC_REG_INDUSTRY[rec.ind.value] != null) set("industry", EC_REG_INDUSTRY[rec.ind.value]);
    if (Array.isArray(rec.services)) {
      const mapped = rec.services.map((s) => EC_REG_SERVICE[s]).filter(Boolean);
      if (mapped.length) set("services", mapped.join(","));
    }
    // Volume + tx are two-directional in registration; the checker collects
    // both directions, so we send both with the right per-direction codes.
    if (rec.volumeInIdx  != null && EC_REG_VOL_IN[rec.volumeInIdx]   != null) set("volume_in",  EC_REG_VOL_IN[rec.volumeInIdx]);
    if (rec.volumeOutIdx != null && EC_REG_VOL_OUT[rec.volumeOutIdx] != null) set("volume_out", EC_REG_VOL_OUT[rec.volumeOutIdx]);
    if (rec.txInIdx  != null && EC_REG_TX[rec.txInIdx]  != null) set("tx_in",  EC_REG_TX[rec.txInIdx]);
    if (rec.txOutIdx != null && EC_REG_TX[rec.txOutIdx] != null) set("tx_out", EC_REG_TX[rec.txOutIdx]);
    // Corridors travel as CONTEXT ONLY — region slugs (uk-eea, apac, …) plus
    // any individual ISO countries the user named. We deliberately do NOT
    // pre-fill registration's KYB sender/receiver country selectors from this
    // (founder UX call, 2026-06-16): the checker only knows regions, so a
    // country-level pre-fill would be partial/inconsistent (e.g. a user picks
    // "Europe" but the field shows only the one outlier they typed), and KYB
    // country declaration should be a deliberate, attested step. Registration
    // treats these as a CRM / risk-routing hint, not form input.
    if (Array.isArray(rec.corridorsIn) && rec.corridorsIn.length) set("corridors_in", rec.corridorsIn.join(","));
    if (Array.isArray(rec.corridorsOut) && rec.corridorsOut.length) set("corridors_out", rec.corridorsOut.join(","));
    if (rec.cryptoServed) set("crypto", "1");   // crypto will actually be offered for this jurisdiction
  }
  // Contact details — present only when a call-site opted in via `opts`.
  if (opts) {
    if (typeof opts.email === "string" && opts.email.includes("@")) set("email", opts.email.trim());
    set("firstname", opts.firstname);
    set("lastname",  opts.lastname);
    set("phone",     opts.phone);
    set("company",   opts.company);
  }
  // ecAppendUtmsToURL appends first-touch UTMs without trampling the above.
  return ecAppendUtmsToURL(url.toString());
}

// ── UTM attribution (first-touch, session-scoped) ──────────────────
// Marketing attribution flow:
//   1. Visitor lands on / or /setup with ?utm_source=...&utm_medium=...
//   2. ecCaptureAndStoreUtms() runs on app mount, persists to sessionStorage
//      under "altery:utm:v1" with FIRST-TOUCH semantics — once a non-empty
//      payload is stored, subsequent captures inside the same tab can't
//      overwrite it. Tab close clears the storage.
//   3. ecAppendUtmsToURL appends the stored UTMs to the registration
//      handoff link (and any forwarded email link), so the
//      checker→registration handoff carries original attribution.
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
  ecComparatorGroups, ecPricePanel, ecCapabilityPanel,
  ecConfidenceLevel, ecFxVolumeRatio, ecLocalSwiftSplit, ecAvgTxGbp,
  ecVolumeHintKey, ecFormatVolume, ecEstimateSavings,
  ecCheckerContext, ecBookingUrl, ecContactRequestUrl, ecSubmitHubspotLead, ecGenProposalRef,
  ecBuildHandoffURL,
  ecCaptureUtmsFromURL, ecGetStoredUtms, ecStoreUtmsFirstTouch,
  ecCaptureAndStoreUtms, ecAppendUtmsToURL,
  ecFmtFromGbp, ecFmtFromGbpCompact, ecDisplayCurrencyFor, EC_FX_FROM_GBP, EC_CURRENCY_SYMBOL,
});
