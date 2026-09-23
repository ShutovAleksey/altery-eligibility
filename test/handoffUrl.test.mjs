// End-to-end test for the onboarding handoff. The internal /setup flow was
// removed; every in-app route to registration (web CTA, Sales callback, the
// opening-fee paywall after payment, with the email + signed token) goes to
// the external corporate-registration app. The handoff translates the
// checker's taxonomy into the registration's catalog CODES (industry →
// numeric code, services → businessNeeds slugs) and carries first-touch
// UTMs. ecBuildHandoffURL is the single chokepoint feeding those
// surfaces, so testing it covers the lot. (PDF/email CTAs now link back to
// the checker instead; see resumeUrl.test.mjs.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

// Params the handoff used to carry while Q4 asked incoming and outgoing
// separately. Since 2026-09-23 the checker asks one combined figure, which
// registration's per-direction KYB fields cannot take, so KYB collects
// volumes itself and these must never reappear.
const DROPPED_VOLUME_PARAMS = ["volume_in", "volume_out", "tx_in", "tx_out", "volume", "tx"];

test("ecRecommend → handoff URL: checker taxonomy is translated to registration catalog codes", () => {
  const w = loadSandbox();
  const rec = w.ecRecommend({
    countryCode: "FR", industry: "saas",
    monthlyVolume: 250000, monthlyTx: 200,
    corridors: ["uk-eea"],
    services: ["local", "cards"],
    volumeIdx: 1, txIdx: 1,
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
  // The one corridor list goes out under both legacy param names.
  assert.equal(u.searchParams.get("corridors_in"), "uk-eea");
  assert.equal(u.searchParams.get("corridors_out"), "uk-eea");

  // entity + currency are deliberately NOT sent (registration derives them).
  assert.equal(u.searchParams.get("entity"), null);
  assert.equal(u.searchParams.get("currency"), null);
  // Volume / tx count: not sent in any form, even though the rec carries
  // band indices (see DROPPED_VOLUME_PARAMS).
  for (const p of DROPPED_VOLUME_PARAMS) {
    assert.equal(u.searchParams.get(p), null, `${p} must not be on the handoff URL`);
  }
});

test("handoff URL: param shape + PII absent without opts", () => {
  const w = loadSandbox();
  const rec = {
    plan: { id: "pro" }, country: { code: "FR" }, ind: { value: "ecom" },
    services: ["crossBorder", "mass", "api"],   // api has no registration slug → dropped
    volumeIdx: 0, txIdx: 4,
    corridors: ["uk-eea", "BR", "apac"],
    cryptoServed: false,
  };
  const u = new URL(w.ecBuildHandoffURL(rec, rec.plan));
  assert.equal(u.searchParams.get("plan"), "pro");
  assert.equal(u.searchParams.get("industry"), "1402");                   // ecom
  assert.equal(u.searchParams.get("services"), "cross-border-payments,mass-payments"); // api dropped
  for (const p of DROPPED_VOLUME_PARAMS) assert.equal(u.searchParams.get(p), null, `${p} dropped`);
  // Corridors travel as context only (regions + any named countries); NO KYB
  // country-field pre-fill (founder UX call) — so no paymentSenders/Receivers.
  // corridors_in and corridors_out are identical: exactly what the old Q5
  // produced with its in/out toggle off, so registration sees no new shape.
  assert.equal(u.searchParams.get("corridors_in"), "uk-eea,BR,apac");
  assert.equal(u.searchParams.get("corridors_out"), u.searchParams.get("corridors_in"));
  assert.equal(u.searchParams.get("paymentSendersCountries"), null);
  assert.equal(u.searchParams.get("paymentReceiversCountries"), null);
  assert.equal(u.searchParams.get("crypto"), null, "crypto flag absent when not served");

  // INVARIANT: with no `opts` (the anonymous web "Start setup" CTA), NO PII
  // appears in the URL. PII only rides the URL when a call-site opts in.
  for (const pii of ["email", "phone", "firstname", "lastname", "company", "name", "company_number", "opening"]) {
    assert.equal(u.searchParams.get(pii), null, `${pii} must not appear in the no-opts handoff URL`);
  }
});

test("handoff URL omits the corridor params when no corridor was picked", () => {
  const w = loadSandbox();
  const rec = { plan: { id: "starter" }, country: { code: "GB" }, corridors: [] };
  const u = new URL(w.ecBuildHandoffURL(rec, rec.plan));
  assert.equal(u.searchParams.get("corridors_in"), null);
  assert.equal(u.searchParams.get("corridors_out"), null);
  // A stale caller still passing the old per-direction fields gets nothing
  // forwarded from them: only rec.corridors feeds the URL now.
  const stale = { plan: { id: "starter" }, country: { code: "GB" }, corridorsIn: ["apac"], corridorsOut: ["apac"] };
  assert.equal(new URL(w.ecBuildHandoffURL(stale, stale.plan)).searchParams.get("corridors_in"), null);
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

test("handoff URL after the opening-fee paywall carries the email + token, no company", () => {
  const w = loadSandbox();
  const rec = { plan: { id: "pro" }, country: { code: "GB" } };
  const token = "v1.eyJwaSI6InBpXzEyMyJ9.c2lnbmF0dXJlX2hlcmU";
  // Exactly what EcPaywall passes once /api/opening-fee confirm succeeds
  // (founder decision 2026-09-23: the paywall asks for no company details;
  // registration binds the company at first use of the token).
  const u = new URL(w.ecBuildHandoffURL(rec, rec.plan, null, {
    email: "ops@northwind.example", openingToken: token,
  }));
  assert.equal(u.searchParams.get("opening"), token);
  assert.equal(u.searchParams.get("email"), "ops@northwind.example");
  assert.equal(u.searchParams.get("company"), null);
  assert.equal(u.searchParams.get("company_number"), null);
  // The paywall never collects name/phone, so none leak in from nowhere.
  assert.equal(u.searchParams.get("firstname"), null);
  assert.equal(u.searchParams.get("phone"), null);
  // Non-PII profile still rides alongside.
  assert.equal(u.searchParams.get("plan"), "pro");
  assert.equal(u.searchParams.get("country"), "GB");
});

test("handoff URL no longer forwards a company number, whoever passes one", () => {
  // The company_number param is gone with the paywall's company section: a
  // stale caller (or a cached old paywall) passing companyNumber must not
  // put it back on the registration URL.
  const w = loadSandbox();
  const rec = { plan: { id: "pro" }, country: { code: "GB" } };
  const u = new URL(w.ecBuildHandoffURL(rec, rec.plan, null, {
    email: "ops@northwind.example", companyNumber: "SC 123.456",
  }));
  assert.equal(u.searchParams.get("company_number"), null);
  assert.equal(u.searchParams.get("email"), "ops@northwind.example");
});

test("handoff URL drops a malformed opening token instead of forwarding it", () => {
  const w = loadSandbox();
  const rec = { plan: { id: "pro" }, country: { code: "GB" } };
  for (const bad of ["", "v2.abc.def", "v1.abc", "v1.a b.c", "v1.abc.def.ghi", "<script>", 42, null]) {
    const u = new URL(w.ecBuildHandoffURL(rec, rec.plan, null, { openingToken: bad }));
    assert.equal(u.searchParams.get("opening"), null, `token ${JSON.stringify(bad)} must be dropped`);
  }
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
