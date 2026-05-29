// Tests for ecQualitativeMatrix — the comparator matrix shape consumed
// by the proposal PDF. Pins down: comparator selection rules, row set,
// cell-kind shape, and that the Altery row reflects the active plan's
// rail-fees.
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

test("Matrix returns { comparators, rows } shape", () => {
  const m = w.ecQualitativeMatrix(rec());
  assert.ok(Array.isArray(m.comparators));
  assert.ok(Array.isArray(m.rows));
});

test("Matrix always includes Altery as the first column", () => {
  const m = w.ecQualitativeMatrix(rec());
  assert.equal(m.comparators[0].id, "altery");
});

test("UK profile picks Barclays as the traditional-bank comparator", () => {
  const m = w.ecQualitativeMatrix(rec({ countryCode: "GB" }));
  const ids = m.comparators.map((c) => c.id);
  assert.ok(ids.includes("uk_traditional"), "uk_traditional should be in comparators");
});

test("EU profile picks BNP as the traditional-bank comparator", () => {
  const m = w.ecQualitativeMatrix(rec({ countryCode: "DE" }));
  const ids = m.comparators.map((c) => c.id);
  assert.ok(ids.includes("eu_traditional"));
});

test("US-incorporated profile includes Mercury, EU profile includes Payset", () => {
  const usMatrix = w.ecQualitativeMatrix(rec({ countryCode: "US" }));
  assert.ok(usMatrix.comparators.map((c) => c.id).includes("mercury"));

  const euMatrix = w.ecQualitativeMatrix(rec({ countryCode: "DE" }));
  assert.ok(euMatrix.comparators.map((c) => c.id).includes("payset"));
});

test("Matrix always includes Wise + Revolut + 3S Money as neobank comparators", () => {
  const m = w.ecQualitativeMatrix(rec());
  const ids = m.comparators.map((c) => c.id);
  for (const expected of ["wise", "revolut", "three_s_money"]) {
    assert.ok(ids.includes(expected), `${expected} should be in comparators`);
  }
});

test("Each row has labelKey + cells parallel to comparators", () => {
  const m = w.ecQualitativeMatrix(rec());
  for (const row of m.rows) {
    assert.equal(typeof row.labelKey, "string");
    assert.equal(row.cells.length, m.comparators.length,
                `row ${row.key} should have one cell per comparator`);
  }
});

test("Expected row keys present", () => {
  const m = w.ecQualitativeMatrix(rec());
  const keys = m.rows.map((r) => r.key);
  for (const expected of ["onboarding", "digitalNative", "affiliate", "cryptoNative",
                          "multiEntity", "fxMarkup", "swiftOut", "docFriction"]) {
    assert.ok(keys.includes(expected), `row ${expected} should exist`);
  }
});

test("Cells follow the documented kind enum", () => {
  const m = w.ecQualitativeMatrix(rec());
  const validKinds = new Set(["yes", "no", "state", "text", "i18n"]);
  for (const row of m.rows) {
    for (const cell of row.cells) {
      assert.ok(validKinds.has(cell.kind), `unknown cell kind ${cell.kind}`);
    }
  }
});

test("Altery row cells reflect the active plan's rail tariffs", () => {
  const proRec = rec({ monthlyVolume: 200000 }); // → Pro
  const m = w.ecQualitativeMatrix(proRec);
  const fxRow    = m.rows.find((r) => r.key === "fxMarkup");
  const swiftRow = m.rows.find((r) => r.key === "swiftOut");
  // Altery cell is at index 0.
  const fxCell    = fxRow.cells[0];
  const swiftCell = swiftRow.cells[0];
  assert.equal(fxCell.kind, "text");
  assert.equal(swiftCell.kind, "text");
  assert.match(fxCell.value, /%/, "fx cell should mention %");
  // Pro's swift fee in plan tariff is "€10 + 0.15%" — confirm it's surfaced.
  assert.match(swiftCell.value, /€/, "swift cell should surface plan-tariff (rail-native EUR)");
});

test("Altery is yes on the digital-native + crypto + affiliate rows", () => {
  const m = w.ecQualitativeMatrix(rec());
  const find = (k) => m.rows.find((r) => r.key === k).cells[0];
  assert.equal(find("digitalNative").kind, "yes");
  assert.equal(find("cryptoNative").kind, "yes");
  assert.equal(find("affiliate").kind,    "yes");
  // multiEntity on Altery is "linkedOnly" today — same shape as
  // Wise/Revolut/Qonto (multiple businesses under one login, no
  // consolidated group dashboard). Honesty update 2026-05-29.
  assert.equal(find("multiEntity").kind, "state");
  assert.equal(find("multiEntity").value, "linkedOnly");
});

test("Wise / Revolut are 'no' on crypto; 3S Money is case-by-case", () => {
  const m = w.ecQualitativeMatrix(rec());
  const cryptoRow = m.rows.find((r) => r.key === "cryptoNative");
  const idx = (id) => m.comparators.findIndex((c) => c.id === id);
  for (const id of ["wise", "revolut"]) {
    const i = idx(id);
    assert.notEqual(i, -1);
    assert.equal(cryptoRow.cells[i].kind, "no", `${id} crypto cell should be 'no'`);
  }
  // 3S Money has no blanket crypto ban in their public AUP — they
  // run an RM-led risk review. Treat as case-by-case ("state"
  // cell), not "no". Verified via 3s.money/help-centre and
  // independent reviews 2026-05-29.
  const tsi = idx("three_s_money");
  assert.notEqual(tsi, -1);
  assert.equal(cryptoRow.cells[tsi].kind, "state");
});
