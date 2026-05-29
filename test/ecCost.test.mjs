// Tests for ecComputeCostBreakdown, ecBaselineFor, ecParseFee.
// The cost projection is the single highest-stakes calculation in the
// experience — these tests pin down the math so the savings number
// can't silently drift on future refactors.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

const w = loadSandbox();

function rec(overrides = {}) {
  return w.ecRecommend({
    countryCode:   "GB",
    industry:      "saas",
    businessType:  "ltd",
    monthlyVolume: 750000,
    monthlyTx:     200,
    corridorsIn:   [],
    corridorsOut:  [],
    services:      [],
    ...overrides,
  });
}

// ────────────────────────────────────────────────────────────────
// ecBaselineFor — entity → synthetic baseline composed from the
// region's bank PANEL (median of fees, all source URLs combined).
// `id` preserves the legacy lead-bank id for back-compat; `name`
// is the generic "Typical X business bank" label; `panelMembers`
// enumerates the banks that fed the median.
// ────────────────────────────────────────────────────────────────
test("UK entity → UK panel baseline (Barclays among panel members)", () => {
  const b = w.ecBaselineFor("uk");
  assert.equal(b.id, "uk_traditional");
  assert.match(b.name, /typical uk business bank/i);
  assert.ok(b.panelMembers.includes("Barclays Business"));
  assert.ok(b.panelMembers.length >= 3, "UK panel should be at least 3 banks");
});
test("EU entity → EU panel baseline (BNP among panel members)", () => {
  const b = w.ecBaselineFor("eu");
  assert.equal(b.id, "eu_traditional");
  assert.match(b.name, /typical eu business bank/i);
  assert.ok(b.panelMembers.includes("BNP Paribas Business"));
  assert.ok(b.panelMembers.length >= 3, "EU panel should be at least 3 banks");
});
test("MENA entity → MENA panel baseline (Mashreq among panel members)", () => {
  const b = w.ecBaselineFor("mena");
  assert.equal(b.id, "mena_traditional");
  assert.ok(b.panelMembers.includes("Mashreq Business"));
});
test("ROW entity → UK panel fallback", () => {
  const b = w.ecBaselineFor("row");
  assert.equal(b.id, "uk_traditional");
  assert.match(b.name, /typical uk business bank/i);
});
test("Unknown entity id → safe UK panel fallback", () => {
  const b = w.ecBaselineFor("does-not-exist");
  assert.equal(b.id, "uk_traditional");
});

test("Baseline fees are the MEDIAN of the panel's per-bank fees", () => {
  const b = w.ecBaselineFor("uk");
  const cmp = w.EC_COMPARATORS;
  const panel = Object.values(cmp).filter((c) => c.type === "traditional" && c.panel === "uk");
  // subscription median check
  const subs = panel.map((m) => m.fees.subscriptionGbp).sort((a, x) => a - x);
  const mid = Math.floor(subs.length / 2);
  const expected = subs.length % 2 ? subs[mid] : (subs[mid - 1] + subs[mid]) / 2;
  assert.equal(b.fees.subscriptionGbp, expected);
});

test("Baseline sources is the union of every panel member's URLs", () => {
  const b = w.ecBaselineFor("uk");
  const cmp = w.EC_COMPARATORS;
  const panel = Object.values(cmp).filter((c) => c.type === "traditional" && c.panel === "uk");
  const totalSourceCount = panel.reduce((n, m) => n + (m.sources?.length || 0), 0);
  assert.equal(b.sources.length, totalSourceCount);
});

// ────────────────────────────────────────────────────────────────
// ecParseFee — string → { flat, pct }
// ────────────────────────────────────────────────────────────────
// Reaches the parser via the active plan's fees, since it's not on window.
// Verified indirectly through ecComputeCostBreakdown shape below.

// ────────────────────────────────────────────────────────────────
// ecComputeCostBreakdown — line items + savings + methodology
// ────────────────────────────────────────────────────────────────
test("Below 1k volume returns null (not enough to project)", () => {
  const r = rec({ monthlyVolume: 500 });
  assert.equal(w.ecComputeCostBreakdown(r), null);
});

test("Cost breakdown has both altery and bank line totals", () => {
  const c = w.ecComputeCostBreakdown(rec());
  assert.ok(c.altery);
  assert.ok(c.bank);
  assert.equal(typeof c.altery.subscription, "number");
  assert.equal(typeof c.altery.fx, "number");
  assert.equal(typeof c.altery.swift, "number");
  assert.equal(typeof c.altery.local, "number");
  assert.equal(typeof c.altery.total, "number");
  // bank now exposes subscription too (was absent in v1)
  assert.equal(typeof c.bank.subscription, "number");
  assert.equal(typeof c.bank.total, "number");
});

test("Altery total is the sum of its parts", () => {
  const c = w.ecComputeCostBreakdown(rec());
  const expected = c.altery.subscription + c.altery.fx + c.altery.swift + c.altery.local;
  assert.equal(c.altery.total, expected);
});

test("Bank total is the sum of its parts", () => {
  const c = w.ecComputeCostBreakdown(rec());
  const expected = c.bank.subscription + c.bank.fx + c.bank.swift + c.bank.local;
  assert.equal(c.bank.total, expected);
});

test("Savings is bank.total - altery.total, rounded to nearest £100", () => {
  const c = w.ecComputeCostBreakdown(rec());
  const expected = Math.max(c.bank.total - c.altery.total, 0);
  const rounded  = Math.round(expected / 100) * 100;
  assert.equal(c.savings.monthly, rounded);
  assert.equal(c.savings.annual, rounded * 12);
});

test("Savings range respects adaptive confidence band", () => {
  // All three drivers present (industry, corridors, volume) → high conf → ±10%.
  const c = w.ecComputeCostBreakdown(rec({
    corridorsIn: ["uk-eea"], corridorsOut: ["uk-eea"],
  }));
  assert.equal(c.savings.confidence, "high");
  assert.equal(c.savings.confidenceBand, 0.10);
  const lo = 1 - c.savings.confidenceBand;
  const hi = 1 + c.savings.confidenceBand;
  assert.equal(c.savings.monthlyLow,  Math.round(c.savings.monthly * lo / 100) * 100);
  assert.equal(c.savings.monthlyHigh, Math.round(c.savings.monthly * hi / 100) * 100);
  assert.equal(c.savings.annualLow,   Math.round(c.savings.annual  * lo / 100) * 100);
  assert.equal(c.savings.annualHigh,  Math.round(c.savings.annual  * hi / 100) * 100);
});

test("Confidence drops to medium when corridors are empty", () => {
  const c = w.ecComputeCostBreakdown(rec({ corridorsIn: [], corridorsOut: [] }));
  assert.equal(c.savings.confidence, "medium");
  assert.equal(c.savings.confidenceBand, 0.20);
  assert.ok(c.savings.confidenceMissing.includes("corridors"));
});

test("Capability matrix returns three sections with bank name in bankWins header", () => {
  const r = w.ecRecommend({
    countryCode: "GB", industry: "saas", monthlyVolume: 500000,
    corridorsIn: ["uk-eea"], corridorsOut: ["uk-eea"], services: [],
  });
  const cap = w.ecCapabilityMatrix(r);
  assert.match(cap.bankName, /typical uk business bank/i);
  assert.ok(cap.alteryWins.length >= 4, "wins ≥ 4 rows");
  assert.ok(cap.comparable.length >= 2, "comparable ≥ 2 rows");
  assert.ok(cap.bankWins.length   >= 3, "bankWins ≥ 3 rows — concession block");
});

test("Capability matrix: crypto row hidden for non-crypto biz", () => {
  const r = w.ecRecommend({
    countryCode: "GB", industry: "saas", monthlyVolume: 500000,
    corridorsIn: [], corridorsOut: [], services: [],
  });
  const cap = w.ecCapabilityMatrix(r);
  const hasCryptoRow = cap.alteryWins.some((x) => x.titleKey === "ec.cap.win.crypto");
  assert.equal(hasCryptoRow, false);
});

test("Capability matrix: crypto row visible for crypto biz", () => {
  const r = w.ecRecommend({
    countryCode: "GB", industry: "crypto", monthlyVolume: 500000,
    corridorsIn: [], corridorsOut: [], services: [],
  });
  const cap = w.ecCapabilityMatrix(r);
  const hasCryptoRow = cap.alteryWins.some((x) => x.titleKey === "ec.cap.win.crypto");
  assert.equal(hasCryptoRow, true);
});

// ────────────────────────────────────────────────────────────────
// Realistic-track savings — bank-side hidden costs (wholesale FX
// spread + correspondent SWIFT) layered on top of published rates.
// ────────────────────────────────────────────────────────────────
test("Realistic savings ≥ conservative when hidden costs > 0", () => {
  const c = w.ecComputeCostBreakdown(rec({
    monthlyVolume: 1000000,
    corridorsIn:  ["uk-eea", "north-america"],
    corridorsOut: ["uk-eea", "north-america"],
  }));
  assert.ok(c.savings.hiddenTotal > 0, "hiddenTotal should be positive for cross-border flow");
  assert.ok(c.savings.monthlyRealistic >= c.savings.monthly,
           "realistic monthly should be ≥ headline monthly (hidden costs added to bank)");
});

test("Realistic range respects same confidence band as headline", () => {
  const c = w.ecComputeCostBreakdown(rec({
    corridorsIn: ["uk-eea"], corridorsOut: ["uk-eea"],
  }));
  const band = c.savings.confidenceBand;
  const lo = 1 - band, hi = 1 + band;
  assert.equal(c.savings.monthlyRealisticLow,
               Math.round(c.savings.monthlyRealistic * lo / 100) * 100);
  assert.equal(c.savings.monthlyRealisticHigh,
               Math.round(c.savings.monthlyRealistic * hi / 100) * 100);
});

test("Hidden cost components break down into FX + SWIFT", () => {
  const c = w.ecComputeCostBreakdown(rec({
    monthlyVolume: 1000000,
    corridorsIn:  ["uk-eea", "apac"],
    corridorsOut: ["uk-eea", "apac"],
  }));
  assert.equal(c.savings.hiddenTotal, c.savings.hiddenFx + c.savings.hiddenSwift);
  assert.ok(c.bank.totalRealistic > c.bank.total, "bank realistic > bank conservative");
  assert.equal(c.bank.totalRealistic, c.bank.total + c.bank.hiddenFx + c.bank.hiddenSwift);
});

test("Methodology assumptions are the FX-margin headline comparison", () => {
  // Previously documented hidden FX/SWIFT calibration inline; that's
  // now disclosed in the savings-card footnote, so the methodology
  // modal only lists the actual Altery-vs-bank rate comparison —
  // the one number that explains the delta. Hidden-cost math still
  // applies inside bank.totalRealistic / savings.hiddenTotal.
  const c = w.ecComputeCostBreakdown(rec());
  const keys = c.methodology.assumptions.map((a) => a.key);
  assert.ok(keys.includes("ec.r.method.alteryFx"));
  assert.ok(keys.includes("ec.r.method.bankFx"));
});

test("Apples-to-apples: bank subscription scales with Altery plan tier", () => {
  // Same volume, different plans → different bank subscription line.
  const proRec = rec({ monthlyVolume: 200000 });          // → Pro
  const ultraRec = rec({ monthlyVolume: 2000000 });       // → Ultra
  const proCost   = w.ecComputeCostBreakdown(proRec);
  const ultraCost = w.ecComputeCostBreakdown(ultraRec);
  assert.ok(ultraCost.bank.subscription > proCost.bank.subscription * 2,
           "Ultra-tier bank subscription should be materially higher than Pro-tier");
});

test("Methodology block exposes baseline + sources + asof + panel", () => {
  const c = w.ecComputeCostBreakdown(rec({ countryCode: "GB" }));
  assert.match(c.methodology.baseline, /typical uk business bank/i);
  assert.ok(Array.isArray(c.methodology.baselineSources));
  assert.ok(c.methodology.baselineSources.length > 1, "panel = multi-bank sources");
  assert.ok(Array.isArray(c.methodology.baselinePanel));
  assert.ok(c.methodology.baselinePanel.length >= 3, "UK panel ≥ 3 banks");
  assert.match(c.methodology.asof, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(c.methodology.assumptions));
  assert.ok(c.methodology.assumptions.length >= 2);
});

test("EU-incorporated business compared against EU panel (BNP among members)", () => {
  const c = w.ecComputeCostBreakdown(rec({ countryCode: "DE" }));
  assert.match(c.methodology.baseline, /typical eu business bank/i);
  assert.ok(c.methodology.baselinePanel.includes("BNP Paribas Business"));
  assert.equal(c.meta.baseline, "eu_traditional");
});

test("MENA-incorporated business compared against MENA panel (Mashreq among members)", () => {
  const c = w.ecComputeCostBreakdown(rec({ countryCode: "AE" }));
  assert.ok(c.methodology.baselinePanel.includes("Mashreq Business"));
  assert.equal(c.meta.baseline, "mena_traditional");
});

test("Altery FX cost ≪ baseline FX cost (the marketing claim is mathematically true)", () => {
  // Use any non-trivial volume; relationship holds across all bands.
  const c = w.ecComputeCostBreakdown(rec({ monthlyVolume: 1000000 }));
  assert.ok(c.altery.fx < c.bank.fx, "altery FX should be cheaper than baseline FX");
  // And savings should be positive (i.e. we're not understating savings).
  assert.ok(c.savings.monthly > 0);
});

test("Plan tier swap (Pro → Ultra) changes Altery subscription", () => {
  const baseRec = rec({ monthlyVolume: 1500000 });
  // baseRec is Ultra. Synthesise a virtual Pro variant.
  const proPlan = w.EC_PLANS.pro;
  const virtual = { ...baseRec, plan: proPlan };
  const ultra = w.ecComputeCostBreakdown(baseRec);
  const pro   = w.ecComputeCostBreakdown(virtual);
  assert.ok(ultra.altery.subscription !== pro.altery.subscription,
            "different plans should produce different subscription costs");
});

// ────────────────────────────────────────────────────────────────
// Per-rail conversion sanity — Altery rail tariffs in EUR are
// converted to GBP at calc time. Test that SEPA/SWIFT line items
// reflect that (non-zero for non-zero tx counts).
// ────────────────────────────────────────────────────────────────
test("Altery SWIFT and local line items are GBP-denominated positive numbers", () => {
  const c = w.ecComputeCostBreakdown(rec({ monthlyVolume: 1000000 }));
  assert.ok(c.altery.swift > 0, "swift cost should be positive");
  assert.ok(c.altery.local > 0, "local cost should be positive");
  assert.ok(c.altery.fx    > 0, "fx cost should be positive");
});

// ────────────────────────────────────────────────────────────────
// Calibration helpers (B, C, D) — FX% from corridors, avg-tx from
// industry, local/SWIFT split from home-region overlap.
// ────────────────────────────────────────────────────────────────
test("(B) Home-only corridors → low FX share (≤10%)", () => {
  // UK entity + corridors only "uk-eea" (the home region) → ~5%
  const c = w.ecComputeCostBreakdown(rec({
    countryCode: "GB",
    monthlyVolume: 750000,
    corridorsIn:  ["uk-eea"],
    corridorsOut: ["uk-eea"],
  }));
  assert.ok(c.meta.fxVolumePct <= 10, `home-only should be ≤10%, got ${c.meta.fxVolumePct}`);
});
test("(B) Multi-region corridors → high FX share (≥50%)", () => {
  const c = w.ecComputeCostBreakdown(rec({
    countryCode: "GB",
    monthlyVolume: 750000,
    corridorsIn:  ["uk-eea", "north-america", "apac"],
    corridorsOut: ["uk-eea", "north-america", "apac"],
  }));
  assert.ok(c.meta.fxVolumePct >= 50, `multi-region should be ≥50%, got ${c.meta.fxVolumePct}`);
});

test("(C) tx count is driven by industry avg-tx-size", () => {
  // SaaS = small tx (£500 avg). Marketplace = larger (£5000 avg). For
  // the same monthly volume, SaaS produces ~10× the tx count of
  // marketplace → much higher SWIFT cost on the bank baseline.
  const saas = w.ecComputeCostBreakdown(rec({ industry: "saas",        monthlyVolume: 500000 }));
  const mkt  = w.ecComputeCostBreakdown(rec({ industry: "marketplace", monthlyVolume: 500000 }));
  assert.ok(saas.meta.txCount > mkt.meta.txCount * 3,
           `SaaS tx count (${saas.meta.txCount}) should be >>3× marketplace (${mkt.meta.txCount})`);
});

test("(D) UK entity + UK corridors → mostly local payments (≥80%)", () => {
  const c = w.ecComputeCostBreakdown(rec({
    countryCode: "GB",
    corridorsIn:  ["uk-eea"],
    corridorsOut: ["uk-eea"],
  }));
  assert.ok(c.meta.localPct >= 80, `UK→UK should be ≥80% local, got ${c.meta.localPct}`);
});
test("(D) Cross-region heavy → mostly SWIFT (≥40%)", () => {
  const c = w.ecComputeCostBreakdown(rec({
    countryCode: "GB",
    corridorsIn:  ["north-america", "apac", "latin-america"],
    corridorsOut: ["north-america", "apac", "latin-america"],
  }));
  assert.ok(c.meta.swiftPct >= 40, `cross-region should be ≥40% SWIFT, got ${c.meta.swiftPct}`);
});

test("Calibration drives MORE savings for global vs home-only at same volume", () => {
  const home = w.ecComputeCostBreakdown(rec({
    countryCode: "GB", monthlyVolume: 1000000,
    corridorsIn: ["uk-eea"], corridorsOut: ["uk-eea"],
  }));
  const global = w.ecComputeCostBreakdown(rec({
    countryCode: "GB", monthlyVolume: 1000000,
    corridorsIn:  ["uk-eea", "north-america", "apac", "latin-america"],
    corridorsOut: ["uk-eea", "north-america", "apac", "latin-america"],
  }));
  assert.ok(global.savings.monthly > home.savings.monthly,
           `global FX exposure should produce more savings than home-only`);
});
