// The ALLOWED_ORIGINS env var lets ops admit a new production origin (e.g. a
// post-migration subdomain like check.altery.com) WITHOUT a code release.
// anti-spam.js reads the var once at module load, so we set it before importing
// (dynamic import after assignment guarantees a clean read regardless of how
// the runner isolates files). Separate file keeps the env scoped to this load.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.ALLOWED_ORIGINS = "https://check.altery.com, https://eligibility.altery.com/";
const { checkAntiSpam } = await import("../lib/anti-spam.js");

const req = (origin) => ({ body: {}, headers: { origin } });

test("ALLOWED_ORIGINS env admits the configured subdomains (trailing slash tolerated)", () => {
  assert.equal(checkAntiSpam(req("https://check.altery.com")).ok, true);
  assert.equal(checkAntiSpam(req("https://eligibility.altery.com")).ok, true); // env value had a trailing slash → stripped
});

test("env additions are additive, not a bypass — baseline kept, unknown origin still 403", () => {
  assert.equal(checkAntiSpam(req("https://altery.com")).ok, true); // hardcoded baseline still works
  const bad = checkAntiSpam(req("https://evil.com"));
  assert.equal(bad.ok, false);
  assert.equal(bad.code, "bad_origin");
  assert.equal(bad.status, 403);
});
