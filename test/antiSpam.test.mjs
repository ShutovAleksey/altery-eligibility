// Tests for the anti-spam checks (lib/anti-spam.js) on the public APIs.
// checkAntiSpam(req) is pure given a synthetic request, so we exercise all
// three gates (honeypot, origin allow-list, time-gate) directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAntiSpam, HONEYPOT_FIELD } from "../lib/anti-spam.js";

function req({ body = {}, origin } = {}) {
  return { body, headers: origin === undefined ? {} : { origin } };
}

test("clean human submission passes", () => {
  assert.equal(checkAntiSpam(req({ origin: "https://altery.com" })).ok, true);
});

test("honeypot: filled rejects (400), empty/whitespace passes", () => {
  const r = checkAntiSpam(req({ body: { [HONEYPOT_FIELD]: "bot" }, origin: "https://altery.com" }));
  assert.equal(r.ok, false);
  assert.equal(r.code, "honeypot");
  assert.equal(r.status, 400);
  assert.equal(checkAntiSpam(req({ body: { [HONEYPOT_FIELD]: "" }, origin: "https://altery.com" })).ok, true);
  assert.equal(checkAntiSpam(req({ body: { [HONEYPOT_FIELD]: "   " }, origin: "https://altery.com" })).ok, true);
});

test("origin: allow-list passes; missing passes; mismatch rejects (403)", () => {
  assert.equal(checkAntiSpam(req({ origin: "https://altery.com" })).ok, true);
  assert.equal(checkAntiSpam(req({ origin: "https://www.altery.com" })).ok, true);
  assert.equal(checkAntiSpam(req({ origin: "https://altery-eligibility.vercel.app" })).ok, true);
  assert.equal(checkAntiSpam(req({ origin: undefined })).ok, true); // server-to-server
  const bad = checkAntiSpam(req({ origin: "https://evil.com" }));
  assert.equal(bad.ok, false);
  assert.equal(bad.code, "bad_origin");
  assert.equal(bad.status, 403);
  assert.equal(checkAntiSpam(req({ origin: "https://evil.vercel.app" })).ok, false);
});

test("origin: a Vercel preview passes only as the deployment's own host, not by name pattern", () => {
  // Anyone can register altery-pay.vercel.app; "contains altery" was no check.
  const keys = ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"];
  const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) delete process.env[k];
    assert.equal(checkAntiSpam(req({ origin: "https://altery-pr-9.vercel.app" })).ok, false);
    assert.equal(checkAntiSpam(req({ origin: "https://altery-pay.vercel.app" })).ok, false);

    process.env.VERCEL_URL = "altery-eligibility-abc123-altery.vercel.app";
    process.env.VERCEL_BRANCH_URL = "altery-eligibility-git-paywall-altery.vercel.app";
    assert.equal(checkAntiSpam(req({ origin: "https://altery-eligibility-abc123-altery.vercel.app" })).ok, true);
    assert.equal(checkAntiSpam(req({ origin: "https://altery-eligibility-git-paywall-altery.vercel.app" })).ok, true);
    assert.equal(checkAntiSpam(req({ origin: "http://altery-eligibility-abc123-altery.vercel.app" })).ok, false, "https only");
    assert.equal(checkAntiSpam(req({ origin: "https://altery-pay.vercel.app" })).ok, false, "other projects still rejected");
  } finally {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
});

test("time-gate: too-fast and stale reject; normal/missing/zero pass", () => {
  const now = Date.now();
  const fast = checkAntiSpam(req({ body: { formLoadedAt: now - 1000 }, origin: "https://altery.com" }));
  assert.equal(fast.ok, false);
  assert.equal(fast.code, "too_fast");

  assert.equal(checkAntiSpam(req({ body: { formLoadedAt: now - 10_000 }, origin: "https://altery.com" })).ok, true);
  assert.equal(checkAntiSpam(req({ body: {}, origin: "https://altery.com" })).ok, true); // missing → pass

  const stale = checkAntiSpam(req({ body: { formLoadedAt: now - 25 * 3600_000 }, origin: "https://altery.com" }));
  assert.equal(stale.ok, false);
  assert.equal(stale.code, "stale");

  assert.equal(checkAntiSpam(req({ body: { formLoadedAt: 0 }, origin: "https://altery.com" })).ok, true); // not finite>0 → ignored
});
