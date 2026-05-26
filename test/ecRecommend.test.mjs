// Tests for ecRecommend — the central routing + plan-tier function.
// Covers: entity routing per country, soft-decline paths (country and
// industry), plan-tier signals (volume / corridors-breadth / services),
// crypto re-route, and the rec shape returned to downstream consumers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

const w = loadSandbox();

// Convenience — minimum-shape rec input. Per-test overrides keyed args.
function input(overrides = {}) {
  return {
    countryCode:   "GB",
    industry:      "saas",
    businessType:  "ltd",
    monthlyVolume: 750000,
    monthlyTx:     200,
    corridorsIn:   [],
    corridorsOut:  [],
    services:      [],
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────
// Approved-path routing
// ────────────────────────────────────────────────────────────────
test("UK-incorporated SaaS routes to Altery UK entity", () => {
  const rec = w.ecRecommend(input({ countryCode: "GB" }));
  assert.equal(rec.kind, "approved");
  assert.equal(rec.entity.id, "uk");
});

test("EU-incorporated business routes to Altery EU entity", () => {
  for (const code of ["DE", "FR", "NL", "ES"]) {
    const rec = w.ecRecommend(input({ countryCode: code }));
    assert.equal(rec.kind, "approved", `${code} should be approved`);
    assert.equal(rec.entity.id, "eu", `${code} should route to EU`);
  }
});

test("UAE-incorporated business routes to MENA entity", () => {
  const rec = w.ecRecommend(input({ countryCode: "AE" }));
  assert.equal(rec.entity.id, "mena");
});

test("ROW-incorporated business routes to UK (passport fallback)", () => {
  const rec = w.ecRecommend(input({ countryCode: "BR" }));
  assert.equal(rec.entity.id, "uk");
});

// ────────────────────────────────────────────────────────────────
// Soft-decline: sanctioned country of incorporation
// ────────────────────────────────────────────────────────────────
test("Sanctioned country of incorporation triggers blocked", () => {
  const sanctioned = ["RU", "BY", "IR", "KP", "SY", "CU", "MM", "AF", "SD"];
  for (const code of sanctioned) {
    const rec = w.ecRecommend(input({ countryCode: code }));
    assert.equal(rec.kind, "blocked", `${code} should block`);
    assert.equal(rec.reason, "country", `${code} reason should be country`);
    assert.equal(rec.country.code, code, `${code} country object should be attached`);
  }
});

test("Country sanctions check runs BEFORE industry sanctions check", () => {
  // Russia + gambling — both blocked. Country comes first in the chain.
  const rec = w.ecRecommend(input({ countryCode: "RU", industry: "gambling" }));
  assert.equal(rec.reason, "country");
});

// ────────────────────────────────────────────────────────────────
// Soft-decline: blocked industry
// ────────────────────────────────────────────────────────────────
test("Blocked industries trigger blocked path", () => {
  for (const ind of ["gambling", "adult", "weapons", "lending"]) {
    const rec = w.ecRecommend(input({ industry: ind }));
    assert.equal(rec.kind, "blocked", `${ind} should block`);
    assert.equal(rec.reason, "industry", `${ind} reason should be industry`);
  }
});

// ────────────────────────────────────────────────────────────────
// Plan-tier selection
// ────────────────────────────────────────────────────────────────
test("Low volume + no advanced services → Starter", () => {
  const rec = w.ecRecommend(input({ monthlyVolume: 50000 }));
  assert.equal(rec.plan.id, "starter");
});

test("Volume ≥ 100k OR servicesPro → Pro", () => {
  const recHighVol = w.ecRecommend(input({ monthlyVolume: 200000 }));
  assert.equal(recHighVol.plan.id, "pro");
  const recCards = w.ecRecommend(input({ services: ["cards"], monthlyVolume: 50000 }));
  assert.equal(recCards.plan.id, "pro");
  const recMass = w.ecRecommend(input({ services: ["mass"], monthlyVolume: 50000 }));
  assert.equal(recMass.plan.id, "pro");
});

test("Volume ≥ 1M → Ultra", () => {
  const rec = w.ecRecommend(input({ monthlyVolume: 2000000 }));
  assert.equal(rec.plan.id, "ultra");
});

test("tierSignals expose which signals fired", () => {
  const rec = w.ecRecommend(input({
    monthlyVolume: 1500000,
    monthlyTx:     400,        // ≥ 300 → txHigh
    corridorsIn:   ["US", "DE", "JP", "BR", "IN"],
    corridorsOut:  [],
    services:      ["mass", "cards"],
    industry:      "saas",
  }));
  assert.equal(rec.tierSignals.volumePro, true);
  assert.equal(rec.tierSignals.volumeUltra, true);
  assert.equal(rec.tierSignals.corridorsBreadth, true, "≥5 corridors should trip breadth");
  assert.equal(rec.tierSignals.txHigh, true);
  assert.equal(rec.tierSignals.servicesPro, true);
  assert.equal(rec.plan.id, "ultra");
});

// ────────────────────────────────────────────────────────────────
// Crypto re-route: EU + crypto → UK entity
// ────────────────────────────────────────────────────────────────
test("EU country + crypto industry re-routes to UK (Cyprus EMI doesn't cover crypto)", () => {
  // After the category→subindustry rebuild, "crypto" is no longer a
  // top-level industry — `blockchain-dev` is the crypto-native leaf
  // (with crypto: true). Same routing logic applies.
  const rec = w.ecRecommend(input({ countryCode: "DE", industry: "blockchain-dev" }));
  assert.equal(rec.entity.id, "uk", "EU crypto should land on UK FCA");
  assert.equal(rec.cryptoReroute, true);
  assert.equal(rec.cryptoActive, true);
});

test("EU country + crypto SERVICE (not industry) also triggers re-route", () => {
  const rec = w.ecRecommend(input({ countryCode: "FR", services: ["crypto"] }));
  assert.equal(rec.entity.id, "uk");
  assert.equal(rec.cryptoReroute, true);
});

test("UK + crypto: no re-route flag (already on UK)", () => {
  const rec = w.ecRecommend(input({ countryCode: "GB", industry: "blockchain-dev" }));
  assert.equal(rec.entity.id, "uk");
  assert.equal(rec.cryptoReroute, false);
  assert.equal(rec.cryptoActive, true);
});

// ────────────────────────────────────────────────────────────────
// Corridors union → rec.corridors
// ────────────────────────────────────────────────────────────────
test("rec.corridors is the union of corridorsIn and corridorsOut", () => {
  const rec = w.ecRecommend(input({
    corridorsIn:  ["US", "GB"],
    corridorsOut: ["GB", "DE"],
  }));
  assert.deepEqual([...rec.corridors].sort(), ["DE", "GB", "US"]);
  assert.deepEqual(rec.corridorsIn,  ["US", "GB"]);
  assert.deepEqual(rec.corridorsOut, ["GB", "DE"]);
});

// ────────────────────────────────────────────────────────────────
// Recommendation shape
// ────────────────────────────────────────────────────────────────
test("Approved rec carries the expected fields for downstream consumers", () => {
  const rec = w.ecRecommend(input());
  assert.equal(rec.kind, "approved");
  assert.ok(rec.entity);
  assert.ok(rec.plan);
  assert.ok(rec.country);
  assert.ok(rec.ind);
  assert.equal(typeof rec.monthlyVolume, "number");
  assert.ok(Array.isArray(rec.caveats));
  assert.ok(Array.isArray(rec.corridors));
  assert.ok(Array.isArray(rec.reasoning));
  assert.ok(rec.tierSignals);
});

test("Reasoning bullets are sorted by priority and capped at 3", () => {
  const rec = w.ecRecommend(input({
    monthlyVolume: 1500000,
    services:      ["mass", "cards"],
    corridorsIn:   ["US", "DE", "JP", "BR"],
    corridorsOut:  ["IN", "SG"],
  }));
  assert.ok(rec.reasoning.length <= 3, "max 3 reasoning bullets");
  for (let i = 1; i < rec.reasoning.length; i++) {
    assert.ok(
      rec.reasoning[i - 1].priority >= rec.reasoning[i].priority,
      "reasoning should be priority-desc",
    );
  }
});
