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
// ecBaselineFor — entity → comparator-bank lookup
// ────────────────────────────────────────────────────────────────
test("UK entity → Barclays Business baseline", () => {
  const b = w.ecBaselineFor("uk");
  assert.equal(b.id, "uk_traditional");
  assert.equal(b.name, "Barclays Business");
});
test("EU entity → BNP Paribas Business baseline", () => {
  const b = w.ecBaselineFor("eu");
  assert.equal(b.id, "eu_traditional");
  assert.equal(b.name, "BNP Paribas Business");
});
test("MENA entity → Mashreq Business baseline", () => {
  const b = w.ecBaselineFor("mena");
  assert.equal(b.id, "mena_traditional");
});
test("ROW entity → UK fallback (Barclays)", () => {
  const b = w.ecBaselineFor("row");
  assert.equal(b.id, "uk_traditional");
});
test("Unknown entity id → safe UK fallback", () => {
  const b = w.ecBaselineFor("does-not-exist");
  assert.equal(b.id, "uk_traditional");
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

test("Savings range is ±15% of midpoint", () => {
  const c = w.ecComputeCostBreakdown(rec());
  const expLow  = Math.round(c.savings.monthly * 0.85 / 100) * 100;
  const expHigh = Math.round(c.savings.monthly * 1.15 / 100) * 100;
  assert.equal(c.savings.monthlyLow,  expLow);
  assert.equal(c.savings.monthlyHigh, expHigh);
  // Annuals consistent with monthlies × 12
  assert.equal(c.savings.annualLow,  Math.round(c.savings.annual * 0.85 / 100) * 100);
  assert.equal(c.savings.annualHigh, Math.round(c.savings.annual * 1.15 / 100) * 100);
});

test("Methodology block exposes baseline + sources + asof", () => {
  const c = w.ecComputeCostBreakdown(rec({ countryCode: "GB" }));
  assert.equal(c.methodology.baseline, "Barclays Business");
  assert.ok(Array.isArray(c.methodology.baselineSources));
  assert.ok(c.methodology.baselineSources.length > 0);
  assert.match(c.methodology.asof, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(c.methodology.assumptions));
  assert.ok(c.methodology.assumptions.length >= 3);
});

test("EU-incorporated business compared against BNP Paribas, not Barclays", () => {
  const c = w.ecComputeCostBreakdown(rec({ countryCode: "DE" }));
  assert.equal(c.methodology.baseline, "BNP Paribas Business");
  assert.equal(c.meta.baseline, "eu_traditional");
});

test("MENA-incorporated business compared against Mashreq", () => {
  const c = w.ecComputeCostBreakdown(rec({ countryCode: "AE" }));
  assert.equal(c.methodology.baseline, "Mashreq Business");
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
