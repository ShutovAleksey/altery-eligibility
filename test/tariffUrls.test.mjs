// Tariff-source URL hygiene — deterministic, no-network checks that
// run in `npm test`. Catches the cheap class of regressions: typo in
// the URL, dropped https, wrong bank's domain, stale `asof` date that
// nobody re-validated. The real liveness check (HTTP 200, with 403/429
// treated as bot-blocked-but-alive) lives in scripts/verify-baselines.mjs
// and is invoked via `npm run verify:baselines` — run that manually or
// wire it to a weekly GitHub Action.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./load.mjs";

const w = loadSandbox();

// Only traditional-bank panel members carry full source-URL citations.
// Neobank comparators (wise, revolut, etc.) cite their general policy
// page and aren't part of the synthetic baseline → not enforced here.
const TRADITIONAL = Object.values(w.EC_COMPARATORS || {}).filter(
  (c) => c.type === "traditional"
);

// Per-panel-bank hint: a substring the URL hostname MUST contain so
// the link can't drift onto an unrelated bank's domain. Updating
// the hint forces a deliberate review when a bank rebrands the
// domain (SG: societegenerale.fr → sg.fr was caught this way).
const DOMAIN_HINTS = {
  uk_traditional:   "barclays",
  uk_hsbc:          "hsbc",
  uk_lloyds:        "lloyds",
  uk_natwest:       "natwest",
  eu_traditional:   "bnpparibas",
  eu_socgen:        "sg.fr",
  eu_creditag:      "credit-agricole",
  eu_deutsche:      "deutsche-bank",
  mena_traditional: "mashreq",
  mena_enbd:        "emiratesnbd",
  mena_fab:         "bankfab",
};

test("Each traditional-bank comparator has a non-empty sources array", () => {
  for (const b of TRADITIONAL) {
    assert.ok(Array.isArray(b.sources) && b.sources.length > 0,
      `${b.id} missing sources[]`);
  }
});

test("Each source URL is https:// and contains the bank's domain hint", () => {
  for (const b of TRADITIONAL) {
    const hint = DOMAIN_HINTS[b.id];
    assert.ok(hint, `No DOMAIN_HINTS entry for ${b.id} — add one when introducing a new panel bank`);
    for (const url of b.sources) {
      assert.match(url, /^https:\/\//,
        `${b.id}: URL must be https:// — got "${url}"`);
      assert.ok(url.toLowerCase().includes(hint),
        `${b.id}: URL "${url}" doesn't contain expected domain hint "${hint}" — check for typo or domain rebrand`);
    }
  }
});

// Known legacy-path patterns that historically indicated a stale URL
// (caught in the May 2026 audit). New URLs shouldn't contain these.
const STALE_PATH_PATTERNS = [
  /\/v1\//,                       // legacy versioned API/site path (FAB)
  /\/library\/business-uk\//,     // old HSBC media path
  /-business\/accounts\/pricing\b/, // old Barclays /pricing/ canonical
  /\/pk\/.*konditionen/,          // Deutsche retail (Privatkunden) page
  /mashreqbank\.com/,             // old Mashreq domain
  /societegenerale\.fr\/tarifs/,  // old SG pre-rebrand path
  /\/business-banking-charges\.html/, // old Lloyds path (1007-error)
];

test("No source URL uses a known-stale path pattern", () => {
  for (const b of TRADITIONAL) {
    for (const url of b.sources) {
      for (const pat of STALE_PATH_PATTERNS) {
        assert.ok(!pat.test(url),
          `${b.id}: URL "${url}" matches known-stale pattern ${pat}. Re-validate against the bank's current pricing page.`);
      }
    }
  }
});

test("Each panel member's `asof` is YYYY-MM-DD and parseable", () => {
  for (const b of TRADITIONAL) {
    assert.match(b.asof || "", /^\d{4}-\d{2}-\d{2}$/,
      `${b.id}: asof must be YYYY-MM-DD, got "${b.asof}"`);
    assert.ok(!Number.isNaN(Date.parse(b.asof)),
      `${b.id}: asof "${b.asof}" is not a valid date`);
  }
});

// Freshness nudge — fails when `asof` is older than 180 days. Forces
// a quarterly-ish re-validation cycle. Tighten via the env var if
// you want a stricter cadence. Loose enough that one missed quarter
// doesn't break CI, strict enough that "fees verified <date>" on
// the result page stays defensible.
const FRESHNESS_MAX_DAYS = parseInt(process.env.TARIFF_MAX_AGE_DAYS || "180", 10);
const DAY_MS = 24 * 3600 * 1000;

test(`Each panel member's \`asof\` is within ${FRESHNESS_MAX_DAYS} days (re-validation nudge)`, () => {
  const now = Date.now();
  const stale = [];
  for (const b of TRADITIONAL) {
    const age = Math.floor((now - Date.parse(b.asof)) / DAY_MS);
    if (age > FRESHNESS_MAX_DAYS) {
      stale.push(`${b.id} (${b.asof}, ${age} days old)`);
    }
  }
  assert.equal(stale.length, 0,
    `${stale.length} panel member(s) need a tariff re-check: ${stale.join(", ")}. ` +
    `Re-run \`npm run verify:baselines\`, update each bank's \`asof\` in checker-data.js after re-validating the pricing page.`);
});
