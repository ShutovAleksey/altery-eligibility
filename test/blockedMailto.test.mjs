// The decline screen's "Contact our team" button opens a mailto: with a
// pre-written subject and body (checker-screens.jsx EcResultBlocked via
// ecMailto). Two invariants guard it:
//   1. ecMailto encodes per RFC 6068 with CRLF line breaks, so Outlook and
//      Apple Mail keep the paragraphs.
//   2. An industry decline still carries the country, so the email can
//      state both answers (the country was collected on Q1 before Q2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

test("ecMailto builds an RFC 6068 link with encoded subject and CRLF body", () => {
  const w = loadSandbox();
  const href = w.ecMailto(" sales@altery.com ", "Check: Algeria & co", "Line one\nLine two\n\nEnd");
  assert.ok(href.startsWith("mailto:sales@altery.com?subject="), href);
  const u = new URL(href);
  assert.equal(u.searchParams.get("subject"), "Check: Algeria & co");
  assert.equal(u.searchParams.get("body"), "Line one\r\nLine two\r\n\r\nEnd");
  // Bare LF never reaches the URL; CRLF is what mail apps expect.
  assert.ok(href.includes("%0D%0A"));
  assert.ok(!/%0A(?!%)/.test(href.replace(/%0D%0A/g, "")), "no bare LF left");
});

test("ecMailto omits empty parts and never throws on missing input", () => {
  const w = loadSandbox();
  assert.equal(w.ecMailto("sales@altery.com"), "mailto:sales@altery.com");
  assert.equal(w.ecMailto("sales@altery.com", "Subj"), "mailto:sales@altery.com?subject=Subj");
  assert.equal(w.ecMailto(undefined, null, undefined), "mailto:");
});

test("an industry decline keeps the country so the email can name both", () => {
  const w = loadSandbox();
  const blockedIndustry = w.EC_INDUSTRIES.find((i) => i.risk === "blocked");
  assert.ok(blockedIndustry, "fixture needs a blocked industry");
  const rec = w.ecRecommend({
    countryCode: "DE", industry: blockedIndustry.value,
    monthlyVolume: 100000, monthlyTx: 100, corridors: [], services: [],
    volumeIdx: 1, txIdx: 1,
  });
  assert.equal(rec.kind, "blocked");
  assert.equal(rec.reason, "industry");
  assert.equal(rec.reasonKey, blockedIndustry.labelKey);
  assert.equal(rec.country && rec.country.code, "DE");
});
