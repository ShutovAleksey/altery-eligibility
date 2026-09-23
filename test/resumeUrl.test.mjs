// Resume deep link (ecBuildResumeURL / ecParseResumeParam in
// checker-helpers.js). PDF + email "Start setup" CTAs and the Stripe 3-D
// Secure return_url all point back at the checker with the visitor's
// answers packed into ?resume=, so registration is only ever reached through
// the result page and its opening-fee paywall. The parse side is a trust
// boundary: anyone can hand-craft the link, so it must drop anything that
// isn't a real answer and must never throw.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

// Encode an arbitrary payload the way the helper does, to hand-craft links.
const b64url = (obj) => Buffer.from(JSON.stringify(obj), "utf8").toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const search = (obj) => "?resume=" + b64url(obj);

// Q4/Q5 are one combined answer each (volume band, tx band, corridor list),
// exactly what EcApp holds in state and hands to ecRecommend.
function sampleRec(w) {
  return w.ecRecommend({
    countryCode: "FR", industry: "saas",
    monthlyVolume: w.EC_VOLUME_BANDS[2].value, monthlyTx: w.EC_TX_BANDS[4].value,
    corridors: ["uk-eea", "US", "apac"],
    services: ["local", "cards"],
    volumeIdx: 2, txIdx: 4,
  });
}

test("resume URL round-trips every answer, the plan override and the email", () => {
  const w = loadSandbox();
  const rec = sampleRec(w);
  const url = w.ecBuildResumeURL(rec, w.EC_PLANS.ultra, null, { email: "  founder@northwind.example " });
  assert.ok(url.startsWith("https://example.test/?resume="), "defaults to location.origin, got " + url);

  const r = w.ecParseResumeParam(new URL(url).search);
  assert.equal(r.countryCode, "FR");
  assert.equal(r.industry, "saas");
  assert.deepEqual([...r.services], ["local", "cards"]);
  assert.equal(r.volumeIdx, 2);
  assert.equal(r.txIdx, 4);
  assert.deepEqual([...r.corridors], ["uk-eea", "US", "apac"]);
  assert.equal(r.planId, "ultra", "the plan the visitor switched to, not rec.plan");
  assert.equal(r.email, "founder@northwind.example", "trimmed");
  // The parse result carries no per-direction leftovers for EcApp to trip on.
  for (const gone of ["volumeInIdx", "volumeOutIdx", "txInIdx", "txOutIdx", "corridorsIn", "corridorsOut"]) {
    assert.equal(gone in r, false, `${gone} must not be in the parsed resume`);
  }
});

test("resume payload uses the compact m / n / r keys (v stays the version)", () => {
  const w = loadSandbox();
  const raw = new URL(w.ecBuildResumeURL(sampleRec(w))).searchParams.get("resume");
  const payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  assert.equal(payload.v, 1);
  assert.equal(payload.m, 2, "volume band index");
  assert.equal(payload.n, 4, "tx band index");
  assert.deepEqual(payload.r, ["uk-eea", "US", "apac"]);
  for (const gone of ["vi", "vo", "ti", "to", "ci", "co"]) assert.equal(gone in payload, false, `${gone} is gone`);
});

test("resume answers rebuild the same recommendation", () => {
  const w = loadSandbox();
  const rec = sampleRec(w);
  const r = w.ecParseResumeParam(new URL(w.ecBuildResumeURL(rec)).search);
  // Same reconstruction EcApp does from a parsed resume.
  const again = w.ecRecommend({
    countryCode: r.countryCode, industry: r.industry,
    monthlyVolume: w.EC_VOLUME_BANDS[r.volumeIdx].value,
    monthlyTx: w.EC_TX_BANDS[r.txIdx].value,
    corridors: r.corridors, services: r.services,
    volumeIdx: r.volumeIdx, txIdx: r.txIdx,
  });
  assert.equal(again.kind, "approved");
  assert.equal(again.entity.id, rec.entity.id);
  assert.equal(again.plan.id, rec.plan.id);
  assert.deepEqual(again.corridors, rec.corridors);
  assert.equal(again.monthlyVolume, rec.monthlyVolume);
});

test("resume URL honours an explicit origin and carries no email unless passed", () => {
  const w = loadSandbox();
  const rec = sampleRec(w);
  const url = w.ecBuildResumeURL(rec, rec.plan, "https://altery-eligibility.vercel.app/");
  assert.ok(url.startsWith("https://altery-eligibility.vercel.app/?resume="), url);
  const r = w.ecParseResumeParam(new URL(url).search);
  assert.equal(r.email, "", "no opts → no email in the payload");
  assert.equal(r.planId, rec.plan.id, "plan falls back to the recommendation");
  // A malformed email is dropped at build time, never embedded.
  const bad = w.ecParseResumeParam(new URL(w.ecBuildResumeURL(rec, null, null, { email: "not-an-email" })).search);
  assert.equal(bad.email, "");
});

test("resume URL survives non-ASCII emails (UTF-8 safe base64url)", () => {
  const w = loadSandbox();
  const rec = sampleRec(w);
  const url = w.ecBuildResumeURL(rec, null, null, { email: "josé@exämple.com" });
  assert.match(new URL(url).searchParams.get("resume"), /^[A-Za-z0-9_-]+$/, "URL-safe alphabet only");
  assert.equal(w.ecParseResumeParam(new URL(url).search).email, "josé@exämple.com");
});

test("resume URL carries first-touch UTMs and still parses alongside them", () => {
  const w = loadSandbox();
  w.sessionStorage.setItem("altery:utm:v1", JSON.stringify({ utm_source: "google", utm_campaign: "autumn" }));
  const rec = sampleRec(w);
  const u = new URL(w.ecBuildResumeURL(rec, rec.plan));
  assert.equal(u.searchParams.get("utm_source"), "google");
  assert.equal(u.searchParams.get("utm_campaign"), "autumn");
  // Stripe return: our flag + Stripe's own params ride on the same link.
  const back = u.search + "&opening_return=1&payment_intent=pi_3Nabc123XYZ&redirect_status=succeeded";
  assert.equal(w.ecParseResumeParam(back).countryCode, "FR");
  // URLSearchParams input works too.
  assert.equal(w.ecParseResumeParam(new URLSearchParams(back)).industry, "saas");
});

test("garbage input returns null and never throws", () => {
  const w = loadSandbox();
  const inputs = [
    undefined, null, 42, {}, [], "", "?", "?resume=", "?foo=bar",
    "?resume=!!!notbase64!!!", "?resume=abc", "?resume=" + "A".repeat(5000),
    "?resume=" + Buffer.from("not json").toString("base64url"),
    search([1, 2, 3]),                       // not an object
    search("string"),
    search({ c: "FR" }),                     // no version
    search({ v: 2, c: "FR" }),               // future version
    search({ v: 1 }),                        // no country
    search({ v: 1, c: "XX" }),               // unknown country
    search({ v: 1, c: 123 }),
    search({ v: 1, c: { code: "FR" } }),
  ];
  for (const input of inputs) {
    let out;
    assert.doesNotThrow(() => { out = w.ecParseResumeParam(input); }, `threw on ${String(input).slice(0, 40)}`);
    assert.equal(out, null, `expected null for ${String(input).slice(0, 60)}`);
  }
});

test("out-of-range indices and unknown values are dropped, valid ones kept", () => {
  const w = loadSandbox();
  const r = w.ecParseResumeParam(search({
    v: 1, c: "DE",
    i: "definitely-not-an-industry",
    s: ["local", "local", "teleport", 7, "multiCompany", "mass"],  // dupes, unknown, non-string, hidden
    m: 99, n: 1.5,
    r: ["uk-eea", "atlantis", "US", "AF", "KP", "", null, "US"],  // AF/KP: blocked, never offered as outliers
    p: "platinum",
    e: "x".repeat(250) + "@example.com",                          // over 254 chars
  }));
  assert.equal(r.countryCode, "DE");
  assert.equal(r.industry, "", "unknown industry dropped");
  assert.deepEqual([...r.services], ["local", "mass"], "deduped; unknown, non-string and hidden services dropped");
  assert.equal(r.volumeIdx, undefined, "99 is past EC_VOLUME_BANDS");
  assert.equal(r.txIdx, undefined, "non-integer dropped");
  assert.deepEqual([...r.corridors], ["uk-eea", "US"], "unknown, blocked, empty, non-string and duplicate corridors dropped");
  assert.equal(r.planId, null);
  assert.equal(r.email, "");

  // Each rejected band shape on its own, so a regression in one check
  // cannot hide behind another.
  assert.equal(w.ecParseResumeParam(search({ v: 1, c: "DE", m: -1 })).volumeIdx, undefined, "negative index dropped");
  assert.equal(w.ecParseResumeParam(search({ v: 1, c: "DE", n: "2" })).txIdx, undefined, "numeric string is not an index");
  assert.deepEqual([...w.ecParseResumeParam(search({ v: 1, c: "DE", r: "uk-eea" })).corridors], [], "corridors must be an array");
});

test("edge-of-range indices are accepted", () => {
  const w = loadSandbox();
  const lo = w.ecParseResumeParam(search({ v: 1, c: "GB", m: 0, n: 0 }));
  assert.equal(lo.volumeIdx, 0);
  assert.equal(lo.txIdx, 0);
  const hi = w.ecParseResumeParam(search({
    v: 1, c: "GB", m: w.EC_VOLUME_BANDS.length - 1, n: w.EC_TX_BANDS.length - 1,
  }));
  assert.equal(hi.volumeIdx, w.EC_VOLUME_BANDS.length - 1);
  assert.equal(hi.txIdx, w.EC_TX_BANDS.length - 1);
  assert.deepEqual([...hi.services], []);
  assert.deepEqual([...hi.corridors], []);
});
