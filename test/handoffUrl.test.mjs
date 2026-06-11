// End-to-end test for the onboarding handoff. The internal /setup flow +
// Stripe were removed; every "Start setup" CTA (web, PDF, email) now goes to
// the external corporate-registration app, carrying plan/entity/currency/
// volume context + first-touch UTMs. ecBuildHandoffURL is the single
// chokepoint feeding all three surfaces, so testing it covers the lot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

test("handoff URL targets the external registration app with plan/entity context", () => {
  const w = loadSandbox();
  const rec = { entity: { id: "uk" }, plan: { id: "pro" }, monthlyVolume: 750000 };
  const url = w.ecBuildHandoffURL(rec, rec.plan);
  assert.ok(
    url.startsWith("https://app.altery.com/n/registration-corporate"),
    "must point at the external app, got: " + url,
  );
  assert.ok(!url.includes("/setup"), "must not reference the removed internal /setup");
  const u = new URL(url);
  assert.equal(u.searchParams.get("plan"), "pro");
  assert.equal(u.searchParams.get("entity"), "uk");
  assert.equal(u.searchParams.get("currency"), "GBP");
  assert.equal(u.searchParams.get("volume"), "750000");
});

test("handoff URL carries first-touch UTMs and EU → EUR", () => {
  const w = loadSandbox();
  w.sessionStorage.setItem(
    "altery:utm:v1",
    JSON.stringify({ utm_source: "google", utm_medium: "cpc", utm_campaign: "spring" }),
  );
  const rec = { entity: { id: "eu" }, plan: { id: "ultra" }, monthlyVolume: 100000 };
  const u = new URL(w.ecBuildHandoffURL(rec, rec.plan));
  assert.equal(u.searchParams.get("utm_source"), "google");
  assert.equal(u.searchParams.get("utm_medium"), "cpc");
  assert.equal(u.searchParams.get("utm_campaign"), "spring");
  assert.equal(u.searchParams.get("entity"), "eu");
  assert.equal(u.searchParams.get("currency"), "EUR");
});
