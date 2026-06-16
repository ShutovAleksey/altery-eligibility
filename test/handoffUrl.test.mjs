// End-to-end test for the onboarding handoff. The internal /setup flow +
// Stripe were removed; every "Start setup" CTA (web, PDF, email, Sales
// callback) now goes to the external corporate-registration app. The handoff
// translates the checker's taxonomy into the registration's catalog CODES
// (industry → numeric code, services → businessNeeds slugs, volume/tx → per-
// direction band codes) and carries first-touch UTMs. ecBuildHandoffURL is
// the single chokepoint feeding every surface, so testing it covers the lot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

test("ecRecommend → handoff URL: checker taxonomy is translated to registration catalog codes", () => {
  const w = loadSandbox();
  const rec = w.ecRecommend({
    countryCode: "FR", industry: "saas",
    monthlyVolume: 250000, monthlyTx: 200,
    corridorsIn: ["uk-eea"], corridorsOut: ["uk-eea"],
    services: ["local", "cards"],
    volumeInIdx: 1, volumeOutIdx: 1, txInIdx: 1, txOutIdx: 1,
  });
  const url = w.ecBuildHandoffURL(rec, rec.plan);
  assert.ok(
    url.startsWith("https://app.altery.com/n/registration-corporate"),
    "must point at the external app, got: " + url,
  );
  assert.ok(!url.includes("/setup"), "must not reference the removed internal /setup");
  const u = new URL(url);
  assert.equal(u.searchParams.get("country"), "FR");          // ISO 3166-1 alpha-2, unchanged
  assert.equal(u.searchParams.get("industry"), "1115");        // saas → catalog code, not "saas"
  assert.equal(u.searchParams.get("services"), "local-payments,cards"); // businessNeeds slugs
  assert.equal(u.searchParams.get("volume_in"), "211");        // band idx 1 → incoming code
  assert.equal(u.searchParams.get("volume_out"), "5");         // band idx 1 → outgoing code (different set!)
  assert.equal(u.searchParams.get("tx_in"), "2");
  assert.equal(u.searchParams.get("tx_out"), "2");

  // entity + currency are deliberately NOT sent (registration derives them).
  assert.equal(u.searchParams.get("entity"), null);
  assert.equal(u.searchParams.get("currency"), null);
  // single summed `volume` param is gone — replaced by volume_in/volume_out.
  assert.equal(u.searchParams.get("volume"), null);
});

test("handoff URL: param shape + PII absent without opts", () => {
  const w = loadSandbox();
  const rec = {
    plan: { id: "pro" }, country: { code: "FR" }, ind: { value: "ecom" },
    services: ["crossBorder", "mass", "api"],   // api has no registration slug → dropped
    volumeInIdx: 0, volumeOutIdx: 5, txInIdx: 4, txOutIdx: 0,
    corridorsIn: ["uk-eea", "BR"], corridorsOut: ["apac"],
    cryptoServed: false,
  };
  const u = new URL(w.ecBuildHandoffURL(rec, rec.plan));
  assert.equal(u.searchParams.get("plan"), "pro");
  assert.equal(u.searchParams.get("industry"), "1402");                   // ecom
  assert.equal(u.searchParams.get("services"), "cross-border-payments,mass-payments"); // api dropped
  assert.equal(u.searchParams.get("volume_in"), "11");                    // idx 0
  assert.equal(u.searchParams.get("volume_out"), "12");                   // idx 5
  assert.equal(u.searchParams.get("tx_in"), "4");                         // idx 4
  assert.equal(u.searchParams.get("tx_out"), "1");                        // idx 0
  // Corridors travel as context only (regions + any named countries); NO KYB
  // country-field pre-fill (founder UX call) — so no paymentSenders/Receivers.
  assert.equal(u.searchParams.get("corridors_in"), "uk-eea,BR");
  assert.equal(u.searchParams.get("corridors_out"), "apac");
  assert.equal(u.searchParams.get("paymentSendersCountries"), null);
  assert.equal(u.searchParams.get("paymentReceiversCountries"), null);
  assert.equal(u.searchParams.get("crypto"), null, "crypto flag absent when not served");

  // INVARIANT: with no `opts` (the anonymous web "Start setup" CTA), NO PII
  // appears in the URL. PII only rides the URL when a call-site opts in.
  for (const pii of ["email", "phone", "firstname", "lastname", "company", "name"]) {
    assert.equal(u.searchParams.get(pii), null, `${pii} must not appear in the no-opts handoff URL`);
  }
});

test("handoff URL sets crypto=1 only when crypto is actually served", () => {
  const w = loadSandbox();
  const rec = { plan: { id: "pro" }, country: { code: "DE" }, cryptoServed: true };
  const u = new URL(w.ecBuildHandoffURL(rec, rec.plan));
  assert.equal(u.searchParams.get("crypto"), "1");
});

test("handoff URL forwards contact PII only when a call-site passes it in opts", () => {
  const w = loadSandbox();
  const rec = { plan: { id: "pro" }, country: { code: "GB" } };

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

test("handoff URL carries first-touch UTMs", () => {
  const w = loadSandbox();
  w.sessionStorage.setItem(
    "altery:utm:v1",
    JSON.stringify({ utm_source: "google", utm_medium: "cpc", utm_campaign: "spring" }),
  );
  const rec = { plan: { id: "ultra" }, country: { code: "DE" } };
  const u = new URL(w.ecBuildHandoffURL(rec, rec.plan));
  assert.equal(u.searchParams.get("utm_source"), "google");
  assert.equal(u.searchParams.get("utm_medium"), "cpc");
  assert.equal(u.searchParams.get("utm_campaign"), "spring");
  assert.equal(u.searchParams.get("plan"), "ultra");
});
