// Tests for the activation-fee pricing resolver (lib/payment-pricing.js).
// The key invariant: an unknown planId is REJECTED, never silently charged
// at a default tier (the previous `table[planId] || table.pro` mischarged).
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveActivationAmount, PLAN_ANNUAL_MAJOR } from "../lib/payment-pricing.js";

test("known plan + currency resolves to the smallest-unit amount", () => {
  assert.deepEqual(resolveActivationAmount("gbp", "pro"), { amount: 100000, annualMajor: 1000 });
  assert.deepEqual(resolveActivationAmount("eur", "ultra"), { amount: 360000, annualMajor: 3600 });
  assert.deepEqual(resolveActivationAmount("GBP", "starter"), { amount: 50000, annualMajor: 500 }); // case-insensitive
});

test("unknown plan is rejected, NOT defaulted to pro", () => {
  for (const bad of ["nonexistent", "", undefined, null, "__proto__", "toString", "hasOwnProperty"]) {
    assert.deepEqual(resolveActivationAmount("gbp", bad), { error: "unknown_plan" }, `planId=${String(bad)}`);
  }
});

test("unsupported currency is rejected", () => {
  assert.deepEqual(resolveActivationAmount("usd", "pro"), { error: "unsupported_currency" });
  assert.deepEqual(resolveActivationAmount("", "pro"), { error: "unsupported_currency" });
  assert.deepEqual(resolveActivationAmount(undefined, "pro"), { error: "unsupported_currency" });
});

test("every plan in the whitelist resolves to a positive amount", () => {
  for (const cur of Object.keys(PLAN_ANNUAL_MAJOR)) {
    for (const plan of Object.keys(PLAN_ANNUAL_MAJOR[cur])) {
      const r = resolveActivationAmount(cur, plan);
      assert.ok(r.amount > 0, `${cur}/${plan} should be positive`);
      assert.equal(r.amount, PLAN_ANNUAL_MAJOR[cur][plan] * 100);
    }
  }
});
