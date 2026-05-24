// Tests for the first-touch UTM capture flow:
//   ecCaptureUtmsFromURL — parses utm_* params off a URL
//   ecStoreUtmsFirstTouch — writes them to sessionStorage exactly once
//   ecGetStoredUtms — reads them back
//   ecAppendUtmsToURL — threads them onto an outbound URL
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

test("ecCaptureUtmsFromURL extracts utm_* params off the live location", () => {
  const w = loadSandbox({
    search: "?utm_source=linkedin&utm_medium=cpc&utm_campaign=q3-uk&utm_content=hero&utm_term=fintech",
  });
  const utms = w.ecCaptureUtmsFromURL();
  // The helper also threads in metadata (landedAt, referrer) — check the
  // five utm_* fields specifically rather than asserting deep-equality.
  assert.equal(utms.utm_source,   "linkedin");
  assert.equal(utms.utm_medium,   "cpc");
  assert.equal(utms.utm_campaign, "q3-uk");
  assert.equal(utms.utm_content,  "hero");
  assert.equal(utms.utm_term,     "fintech");
});

test("ecCaptureUtmsFromURL returns null when no utm_* params present", () => {
  const w = loadSandbox({ search: "?ref=google" });
  assert.equal(w.ecCaptureUtmsFromURL(), null);
});

test("ecStoreUtmsFirstTouch + ecGetStoredUtms round-trip via sessionStorage", () => {
  const w = loadSandbox({});
  const utms = { utm_source: "twitter", utm_medium: "social" };
  const stored = w.ecStoreUtmsFirstTouch(utms);
  // helper returns the stored record (which may include metadata).
  assert.equal(stored.utm_source, "twitter");
  assert.equal(stored.utm_medium, "social");
  const got = w.ecGetStoredUtms();
  assert.equal(got.utm_source, "twitter");
  assert.equal(got.utm_medium, "social");
});

test("ecStoreUtmsFirstTouch refuses to overwrite once written (first-touch semantic)", () => {
  const w = loadSandbox({});
  w.ecStoreUtmsFirstTouch({ utm_source: "first" });
  const result = w.ecStoreUtmsFirstTouch({ utm_source: "second" });
  // Helper returns whatever's currently stored (the original)
  assert.equal(result.utm_source, "first");
  assert.equal(w.ecGetStoredUtms().utm_source, "first");
});

test("ecAppendUtmsToURL threads UTMs onto a clean URL", () => {
  const w = loadSandbox({});
  const out = w.ecAppendUtmsToURL("https://app.altery.com/onboarding", {
    utm_source: "linkedin",
    utm_medium: "cpc",
  });
  const parsed = new URL(out);
  assert.equal(parsed.searchParams.get("utm_source"), "linkedin");
  assert.equal(parsed.searchParams.get("utm_medium"), "cpc");
});

test("ecAppendUtmsToURL preserves pre-existing query params", () => {
  const w = loadSandbox({});
  const out = w.ecAppendUtmsToURL("https://app.altery.com/?token=abc", { utm_source: "x" });
  const parsed = new URL(out);
  assert.equal(parsed.searchParams.get("token"), "abc");
  assert.equal(parsed.searchParams.get("utm_source"), "x");
});
