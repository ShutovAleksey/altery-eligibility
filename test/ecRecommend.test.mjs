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
  // Canada: serviceable (corporate Operational) but outside UK/EU/MENA,
  // so it falls back to the UK entity. (Brazil used to sit here, but the
  // compliance-register alignment now blocks it — see EC_SERVICEABLE_CC.)
  const rec = w.ecRecommend(input({ countryCode: "CA" }));
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

test("Pro driven by volume > £250k or mass/api capability gates", () => {
  // Combined throughput above the Starter ceiling → Pro
  assert.equal(w.ecRecommend(input({ monthlyVolume: 375000 })).plan.id, "pro");
  // Mass payouts need Pro-only bulk/batch transfers → Pro regardless of volume
  assert.equal(w.ecRecommend(input({ services: ["mass"], monthlyVolume: 50000 })).plan.id, "pro");
  // API access is Pro-only (sandbox + live keys, webhooks) → Pro regardless of volume
  assert.equal(w.ecRecommend(input({ services: ["api"], monthlyVolume: 50000 })).plan.id, "pro");
  // Cards alone no longer forces Pro — a small business stays on Starter
  assert.equal(w.ecRecommend(input({ services: ["cards"], monthlyVolume: 50000 })).plan.id, "starter");
  // The default combined throughput (£250k) sits in Starter, not Pro
  assert.equal(w.ecRecommend(input({ monthlyVolume: 250000 })).plan.id, "starter");
});

test("Volume ≥ 1M → Ultra", () => {
  const rec = w.ecRecommend(input({ monthlyVolume: 2000000 }));
  assert.equal(rec.plan.id, "ultra");
});

test("Pro driven by multi-company management capability gate", () => {
  // Multi-Company Management (one login across multiple legal entities,
  // separate balances/IBANs/cards per company) is technically available
  // on every plan per the canonical pricing schedule, but the surrounding
  // tooling sits in Pro+. Picking it forces Pro at small volume; Ultra
  // is reached only when raw volume crosses £1M.
  const rec = w.ecRecommend(input({ services: ["multiCompany"], monthlyVolume: 50000 }));
  assert.equal(rec.plan.id, "pro");
  assert.equal(rec.tierSignals.servicesPro, true);
  assert.equal(rec.tierSignals.servicesUltra, false);
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
// Crypto eligibility by jurisdiction (NO entity re-route).
// Not offered to UK/US/JP/NL; served quietly in the EEA (served but
// not advertised → cryptoOpen false); offered openly across MENA + the
// rest of RoW. The old EU→UK "Cyprus EMI doesn't cover crypto" reroute
// was removed — it was backwards (UK is exactly where crypto isn't
// offered). See the crypto-jurisdictions note.
// ────────────────────────────────────────────────────────────────
test("EU (DE) + crypto industry: served on the EU entity, quietly (no reroute)", () => {
  const rec = w.ecRecommend(input({ countryCode: "DE", industry: "crypto" }));
  assert.equal(rec.entity.id, "eu", "EEA crypto stays on the EU entity");
  assert.equal(rec.cryptoActive, true);
  assert.equal(rec.cryptoServed, true);
  assert.equal(rec.cryptoOpen, false, "EEA crypto is served but not advertised");
  assert.equal(rec.cryptoBlocked, false);
});

test("EU (FR) + crypto SERVICE (not industry): same quiet EEA handling", () => {
  const rec = w.ecRecommend(input({ countryCode: "FR", services: ["crypto"] }));
  assert.equal(rec.entity.id, "eu");
  assert.equal(rec.cryptoServed, true);
  assert.equal(rec.cryptoOpen, false);
});

test("UK + crypto: not offered (blocked), no reroute, stays on UK entity", () => {
  const rec = w.ecRecommend(input({ countryCode: "GB", industry: "crypto" }));
  assert.equal(rec.entity.id, "uk");
  assert.equal(rec.cryptoActive, true);
  assert.equal(rec.cryptoBlocked, true, "UK is a no-crypto jurisdiction");
  assert.equal(rec.cryptoServed, false);
  assert.equal(rec.cryptoOpen, false);
});

test("NL + crypto: EEA member but a no-crypto jurisdiction (blocked)", () => {
  const rec = w.ecRecommend(input({ countryCode: "NL", industry: "crypto" }));
  assert.equal(rec.cryptoBlocked, true);
  assert.equal(rec.cryptoServed, false);
});

test("MENA (AE) + crypto: served and advertised openly", () => {
  const rec = w.ecRecommend(input({ countryCode: "AE", industry: "crypto" }));
  assert.equal(rec.entity.id, "mena");
  assert.equal(rec.cryptoServed, true);
  assert.equal(rec.cryptoOpen, true, "MENA crypto is offered openly");
  assert.equal(rec.cryptoBlocked, false);
});

test("RoW Seychelles + crypto is open; US/JP are no-crypto jurisdictions", () => {
  const sc = w.ecRecommend(input({ countryCode: "SC", industry: "crypto" }));
  assert.equal(sc.cryptoOpen, true, "Seychelles (RoW) crypto is open");
  const us = w.ecRecommend(input({ countryCode: "US", industry: "crypto" }));
  assert.equal(us.cryptoBlocked, true, "US is a no-crypto jurisdiction");
  assert.equal(us.cryptoOpen, false);
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
