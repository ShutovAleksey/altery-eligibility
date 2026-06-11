// Defensive edge-case tests for ecRecommend — the central routing function.
// The UI only ever passes valid EC_COUNTRIES codes, but ecRecommend is a
// public pure helper; it must never return an `approved` rec with an
// undefined entity (downstream EcResultApproved reads entity.nameKey
// unconditionally) and must not throw on degenerate input.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

const w = loadSandbox();

function input(o = {}) {
  return {
    countryCode: "GB", industry: "saas", businessType: "ltd",
    monthlyVolume: 750000, monthlyTx: 200,
    corridorsIn: [], corridorsOut: [], services: [],
    ...o,
  };
}

test("approved rec always carries a usable entity + plan, even for unknown country", () => {
  for (const code of ["GB", "ZZ", "xx", "", null, undefined]) {
    const rec = w.ecRecommend(input({ countryCode: code }));
    assert.ok(rec, `rec returned for countryCode=${String(code)}`);
    assert.ok(rec.kind === "approved" || rec.kind === "blocked",
      `kind must be approved|blocked for countryCode=${String(code)} (got ${rec.kind})`);
    if (rec.kind === "approved") {
      assert.ok(rec.entity, `approved rec must have an entity (countryCode=${String(code)})`);
      assert.ok(rec.entity.nameKey, "entity must expose nameKey");
      assert.ok(rec.plan, "approved rec must have a plan");
    }
  }
});

test("ecRecommend does not throw on missing / degenerate inputs", () => {
  assert.doesNotThrow(() => w.ecRecommend(input({ services: null, corridorsIn: null, corridorsOut: null })));
  assert.doesNotThrow(() => w.ecRecommend(input({ monthlyVolume: 0 })));
  assert.doesNotThrow(() => w.ecRecommend(input({ industry: null })));
  assert.doesNotThrow(() => w.ecRecommend({}));
});
