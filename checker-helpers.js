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
function ecRecommend({ countryCode, industry, businessType, monthlyVolume, corridorsIn, corridorsOut, monthlyTx, services }) {
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
  if (country && country.risk === "blocked") {
    return { kind: "blocked", reason: "country", country };
  }
  // Corridor sanctions: any transactional country with risk:"blocked"
  // (RU, BY, IR, KP, SY, CU, MM, AF, SD) blocks. Closes the "Cyprus-LLC
  // transacts with Russia" gap at eligibility stage rather than KYB.
  const blockedCorridorCode = corridors.find((code) => {
    const c = EC_COUNTRIES.find((x) => x.code === code);
    return c && c.risk === "blocked";
  });
  if (blockedCorridorCode) {
    const corridorCountry = EC_COUNTRIES.find((c) => c.code === blockedCorridorCode);
    return { kind: "blocked", reason: "corridor", country: corridorCountry };
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

function ecComputeCostBreakdown(rec) {
  const vol = rec?.monthlyVolume || 0;
  if (vol < 1000) return null;  // not enough to project credibly

  // 60% of monthly volume assumed to be FX-touching (cross-border
  // or non-base-currency). Conservative — many digital businesses
  // run higher. Subscription-revenue SaaS in EUR may run lower
  // (~20-40%), high-growth marketplaces often run >80%.
  const fxVolume = vol * 0.60;

  // Altery rails — read the active plan's published fees so the
  // projection moves with plan tier. Each plan exposes a fees object:
  //   { sepa: "€1", swift: "€10 + 0.25%", fxMarkup: "up to 0.7%" }
  // We parse the strings once here and use them as multipliers below.
  // Falls back to the historical Pro-tier defaults if a field is
  // missing — this keeps the helper resilient if a plan is added
  // without all fee fields populated.
  const planFees = rec.plan?.fees || {};
  const fxFee    = ecParseFee(planFees.fxMarkup);
  const swiftFee = ecParseFee(planFees.swift);
  const sepaFee  = ecParseFee(planFees.sepa);
  const ALTERY_FX_MARKUP  = fxFee.pct    || 0.0065;
  const ALTERY_SWIFT_FLAT = swiftFee.flat || 10;
  const ALTERY_SWIFT_PCT  = swiftFee.pct  || 0.0025;
  const ALTERY_LOCAL      = sepaFee.flat  || 1;

  // Industry-average traditional business bank (HSBC/Barclays/
  // Deutsche/Santander SMB tier — public retail business pricing,
  // averaged). Plan-independent — the comparison side is always the
  // same legacy bank baseline.
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
    industry:     rec?.ind?.value || null,
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
  ecVolumeHintKey, ecFormatVolume, ecEstimateSavings, ecGenProposalRef,
  ecBuildHandoffPayload, ecEncodeHandoffP, ecBuildHandoffURL,
  ecCaptureUtmsFromURL, ecGetStoredUtms, ecStoreUtmsFirstTouch,
  ecCaptureAndStoreUtms, ecAppendUtmsToURL,
});
