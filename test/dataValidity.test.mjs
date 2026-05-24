// Layer-3 tests — data-structure invariants. These guard against the
// shape of EC_COUNTRIES / EC_PLANS / EC_COMPARATORS / EC_DISPLAY_REGIONS
// silently breaking the rest of the app via a bad copy-paste.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

const w = loadSandbox();

// ────────────────────────────────────────────────────────────────
// EC_COUNTRIES — full ISO 3166-1 set, no dupes, every code has a
// valid `region` and a matching displayRegion in the picker map.
// ────────────────────────────────────────────────────────────────
test("EC_COUNTRIES has 249 entries (full ISO 3166-1 alpha-2)", () => {
  assert.equal(w.EC_COUNTRIES.length, 249);
});

test("No duplicate country codes", () => {
  const codes = w.EC_COUNTRIES.map((c) => c.code);
  const set = new Set(codes);
  assert.equal(set.size, codes.length, "all codes must be unique");
});

test("Every country has code, name, and a valid region", () => {
  const validRegions = new Set(["uk", "eu", "mena", "row"]);
  for (const c of w.EC_COUNTRIES) {
    assert.ok(c.code, `country missing code: ${JSON.stringify(c)}`);
    assert.equal(typeof c.name, "string", `${c.code} missing name`);
    assert.ok(c.name.length > 0, `${c.code} has empty name`);
    assert.ok(validRegions.has(c.region), `${c.code} has invalid region: ${c.region}`);
  }
});

test("Country codes are ISO-shaped (2 uppercase letters)", () => {
  for (const c of w.EC_COUNTRIES) {
    assert.match(c.code, /^[A-Z]{2}$/, `${c.code} not ISO-shaped`);
  }
});

test("Every sanctioned country has both region:'row' and risk:'blocked'", () => {
  // Sanctioned set is the only place risk:'blocked' should appear.
  // (None of UK/EU/MENA-routed countries are sanctioned currently.)
  const sanctioned = w.EC_COUNTRIES.filter((c) => c.risk === "blocked");
  assert.ok(sanctioned.length >= 7, "at least 7 sanctioned countries expected");
  for (const c of sanctioned) {
    assert.equal(c.region, "row", `${c.code} sanctioned but not region:row`);
  }
});

test("Every country is in exactly one EC_DISPLAY_REGIONS bucket", () => {
  const seen = new Set();
  for (const [region, codes] of Object.entries(w.EC_DISPLAY_REGIONS)) {
    for (const code of codes) {
      assert.ok(!seen.has(code), `${code} in multiple display regions`);
      seen.add(code);
    }
  }
  const all = w.EC_COUNTRIES.map((c) => c.code);
  for (const code of all) {
    assert.ok(seen.has(code), `${code} missing from EC_DISPLAY_REGIONS`);
  }
  assert.equal(seen.size, all.length, "no extra codes in display regions");
});

test("EC_REGION_ORDER lists exactly the 4 region keys", () => {
  assert.equal(w.EC_REGION_ORDER.length, 4);
  for (const r of w.EC_REGION_ORDER) {
    assert.ok(w.EC_DISPLAY_REGIONS[r], `EC_REGION_ORDER mentions unknown region ${r}`);
  }
});

// ────────────────────────────────────────────────────────────────
// EC_PLANS — three tiers with consistent shape
// ────────────────────────────────────────────────────────────────
test("EC_PLANS has exactly starter / pro / ultra", () => {
  const ids = Object.keys(w.EC_PLANS).sort();
  assert.equal(JSON.stringify(ids), JSON.stringify(["pro", "starter", "ultra"]));
});

test("Every plan has price + fees with the expected fee fields", () => {
  for (const id of Object.keys(w.EC_PLANS)) {
    const p = w.EC_PLANS[id];
    assert.equal(p.id, id);
    assert.equal(typeof p.price, "string", `${id} price should be a string`);
    assert.ok(p.fees, `${id} missing fees`);
    for (const k of ["fasterPay", "sepa", "swift", "fxMarkup"]) {
      assert.ok(p.fees[k], `${id} plan missing fees.${k}`);
    }
  }
});

test("Plan prices are GBP-denominated (start with £)", () => {
  for (const id of Object.keys(w.EC_PLANS)) {
    const price = w.EC_PLANS[id].price;
    if (price === "£0") continue; // Starter "free" tier OK
    assert.match(price, /^£\d+/, `${id} price ${price} should start with £`);
  }
});

// ────────────────────────────────────────────────────────────────
// EC_COMPARATORS — all 3 traditional baselines have numeric fees,
// asof dates are ISO-shaped, neobank entries have qualitative-only.
// ────────────────────────────────────────────────────────────────
test("EC_COMPARATORS contains expected traditional + neobank ids", () => {
  const ids = Object.keys(w.EC_COMPARATORS);
  for (const expected of ["uk_traditional", "eu_traditional", "mena_traditional",
                          "wise", "revolut", "mercury", "three_s_money", "payset",
                          "altery"]) {
    assert.ok(ids.includes(expected), `missing comparator: ${expected}`);
  }
});

test("Traditional baselines have a numeric fees block in GBP", () => {
  for (const id of ["uk_traditional", "eu_traditional", "mena_traditional"]) {
    const c = w.EC_COMPARATORS[id];
    assert.ok(c.fees, `${id} missing fees`);
    for (const field of ["subscriptionGbp", "sepaOutGbp", "swiftOutGbp", "fxMarkupBps"]) {
      assert.equal(typeof c.fees[field], "number",
                   `${id} fees.${field} should be a number`);
    }
    assert.match(c.asof, /^\d{4}-\d{2}-\d{2}$/, `${id} asof should be YYYY-MM-DD`);
    assert.ok(Array.isArray(c.sources) && c.sources.length > 0,
              `${id} should have at least one source URL`);
  }
});

test("forEntities mapping covers every entity id", () => {
  const allEntities = new Set();
  for (const id of Object.keys(w.EC_COMPARATORS)) {
    const c = w.EC_COMPARATORS[id];
    if (Array.isArray(c.forEntities)) {
      for (const e of c.forEntities) allEntities.add(e);
    }
  }
  for (const expected of ["uk", "eu", "mena", "row"]) {
    assert.ok(allEntities.has(expected),
              `no traditional baseline maps to entity '${expected}'`);
  }
});

// ────────────────────────────────────────────────────────────────
// EC_INDUSTRIES — risk states valid
// ────────────────────────────────────────────────────────────────
test("Every industry has value, labelKey, and a valid risk", () => {
  const validRisks = new Set(["ok", "specialist", "blocked"]);
  for (const i of w.EC_INDUSTRIES) {
    assert.equal(typeof i.value, "string", `industry missing value`);
    assert.ok(i.labelKey, `${i.value} missing labelKey`);
    assert.ok(validRisks.has(i.risk), `${i.value} has invalid risk ${i.risk}`);
  }
});

test("Exactly 4 blocked industries (gambling/adult/weapons/lending)", () => {
  // VM-context arrays have a different Array prototype than the test
  // runner's, so deepStrictEqual on the raw array fails on identity. Use
  // JSON round-trip to compare structurally.
  const blocked = w.EC_INDUSTRIES.filter((i) => i.risk === "blocked").map((i) => i.value).sort();
  assert.equal(JSON.stringify(blocked), JSON.stringify(["adult", "gambling", "lending", "weapons"]));
});

// ────────────────────────────────────────────────────────────────
// EC_VOLUME_BANDS / EC_TX_BANDS — monotonic
// ────────────────────────────────────────────────────────────────
test("EC_VOLUME_BANDS values are strictly increasing", () => {
  for (let i = 1; i < w.EC_VOLUME_BANDS.length; i++) {
    assert.ok(w.EC_VOLUME_BANDS[i].value > w.EC_VOLUME_BANDS[i - 1].value,
              `band ${i} value not greater than band ${i - 1}`);
  }
});

test("EC_TX_BANDS values are strictly increasing", () => {
  for (let i = 1; i < w.EC_TX_BANDS.length; i++) {
    assert.ok(w.EC_TX_BANDS[i].value > w.EC_TX_BANDS[i - 1].value,
              `band ${i} value not greater than band ${i - 1}`);
  }
});
