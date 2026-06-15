// End-to-end test for the onboarding handoff. The internal /setup flow +
// Stripe were removed; every "Start setup" CTA (web, PDF, email) now goes to
// the external corporate-registration app, carrying plan/entity/currency/
// volume context + first-touch UTMs. ecBuildHandoffURL is the single
// chokepoint feeding all three surfaces, so testing it covers the lot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

test("handoff URL targets the external registration app with the full non-PII profile", () => {
  const w = loadSandbox();
  const rec = {
    entity: { id: "uk" }, plan: { id: "pro" }, monthlyVolume: 750000,
    country: { code: "GB" }, ind: { value: "saas" },
    services: ["mass_payouts", "card_issuing"],
    corridorsIn: ["eea", "uk"], corridorsOut: ["apac"],
    cryptoServed: false,
  };
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
  assert.equal(u.searchParams.get("country"), "GB");
  assert.equal(u.searchParams.get("industry"), "saas");
  assert.equal(u.searchParams.get("services"), "mass_payouts,card_issuing");
  assert.equal(u.searchParams.get("corridors_in"), "eea,uk");
  assert.equal(u.searchParams.get("corridors_out"), "apac");
  assert.equal(u.searchParams.get("crypto"), null, "crypto flag absent when not served");

  // INVARIANT: with no `opts` (the anonymous web "Start setup" CTA), NO PII
  // appears in the URL. PII only rides the URL when a call-site explicitly
  // opts in — see the opts test below.
  for (const pii of ["email", "phone", "firstname", "lastname", "company", "name"]) {
    assert.equal(u.searchParams.get(pii), null, `${pii} must not appear in the no-opts handoff URL`);
  }
});

test("handoff URL sets crypto=1 only when crypto is actually served", () => {
  const w = loadSandbox();
  const rec = { entity: { id: "eu" }, plan: { id: "pro" }, monthlyVolume: 50000, cryptoServed: true };
  const u = new URL(w.ecBuildHandoffURL(rec, rec.plan));
  assert.equal(u.searchParams.get("crypto"), "1");
});

test("handoff URL forwards contact PII only when a call-site passes it in opts", () => {
  const w = loadSandbox();
  const rec = { entity: { id: "uk" }, plan: { id: "pro" }, monthlyVolume: 750000 };

  // Sales-callback flow → full contact set rides the URL (founder decision).
  const u = new URL(w.ecBuildHandoffURL(rec, rec.plan, null, {
    firstname: "Ada", lastname: "Lovelace", company: "Analytical Engines Ltd",
    phone: "+44 7700 900000", email: "ada@example.com",
  }));
  assert.equal(u.searchParams.get("firstname"), "Ada");
  assert.equal(u.searchParams.get("lastname"), "Lovelace");
  assert.equal(u.searchParams.get("company"), "Analytical Engines Ltd");
  assert.equal(u.searchParams.get("phone"), "+44 7700 900000");
  assert.equal(u.searchParams.get("email"), "ada@example.com");

  // PDF/email flow → email only; name/phone stay absent.
  const e = new URL(w.ecBuildHandoffURL(rec, rec.plan, null, { email: "self@example.com" }));
  assert.equal(e.searchParams.get("email"), "self@example.com");
  assert.equal(e.searchParams.get("firstname"), null);
  assert.equal(e.searchParams.get("phone"), null);

  // Malformed email (no @) is dropped, never echoed verbatim into the URL.
  const bad = new URL(w.ecBuildHandoffURL(rec, rec.plan, null, { email: "not-an-email" }));
  assert.equal(bad.searchParams.get("email"), null);
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
