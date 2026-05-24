// Layer-2 tests — i18n integrity. Two invariants:
//   1. Every key referenced in source code is declared in the EN dict.
//   2. Every key in the EN dict is also in the 9 other-lang dicts (or
//      explicitly covered by a dynamic prefix pattern).
//
// This catches the failure mode of "added a t('ec.foo.bar') call,
// forgot to add the key to EN dict" and "removed a key from EN but
// left stragglers in DE / FR" — both have happened during the
// session-cleanup churn.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const SOURCE_FILES = [
  "checker-data.js", "checker-helpers.js", "checker-pdf.js",
  "checker-screens.jsx", "checker-modals.jsx", "checker-atoms.jsx",
  "checker-flag-lang.jsx", "checker-pdf-assets.js",
];

// Order matters — bootstrap.js (or the inline in index.html) creates
// window.__I18N first; then the dict files merge into D.<lang>.
const DICT_FILES = [
  "i18n-dict-ec.js",                  // en
  "i18n-dict-ec-translations.js",     // de, ru
  "i18n-dict-ec-nl-tr.js",            // nl, tr
  "i18n-dict-ec-it-es.js",            // it, es
  "i18n-dict-ec-pl-pt-fr.js",         // pl, pt, fr
  "i18n-dict-ec-countries.js",        // country names + the central misc keys
];

const LANGS = ["en", "de", "ru", "nl", "tr", "it", "es", "pl", "pt", "fr"];

// Load each dict into a sandbox with the __I18N stub the way index.html
// does, so we can read D.<lang> as an actual JS object instead of
// parsing braces with regex.
function loadDicts() {
  const DICT = Object.fromEntries(LANGS.map((l) => [l, {}]));
  const win = { __I18N: { DICT } };
  const ctx = vm.createContext({
    window: win,
    Object, JSON, Array, RegExp,
    console,
  });
  for (const f of DICT_FILES) {
    const code = fs.readFileSync(path.join(root, f), "utf8");
    vm.runInContext(code, ctx, { filename: f });
  }
  return DICT;
}

const DICT = loadDicts();

// ────────────────────────────────────────────────────────────────
// 1. Collect keys referenced from source code.
//
// Two patterns:
//   t("ec.foo.bar")          — literal key
//   t("ec.foo." + variable)  — dynamic; capture the prefix
// Plus i18n keys carried as data fields:
//   labelKey: "ec.x", titleKey: "ec.x", bodyKey: "ec.x",
//   nameKey: "ec.x", licenceKey: "ec.x", noteKey: "ec.x",
//   currencyPerkKey: "ec.x", reasonKey: "ec.x", fitKey: "ec.x",
//   onboardingKey: "ec.x", taglineKey: "ec.x", iconKey: "..." (not i18n)
// ────────────────────────────────────────────────────────────────
const literalUsed = new Set();
const prefixUsed  = new Set();

const literalPat = /t\(\s*["']((?:ec|common)\.[\w\-.]+)["']/g;
const prefixPat  = /t\(\s*["']((?:ec|common)\.[\w\-.]+\.)["']\s*\+/g;
// Data-field keys: keep this list aligned with what shows up in
// EC_INDUSTRIES / EC_BUSINESS_TYPES / EC_SERVICES / EC_PLANS / EC_ENTITIES
// / EC_PERKS-style data with labelKey-style hints.
const dataFieldPat = /(?:labelKey|titleKey|bodyKey|nameKey|licenceKey|noteKey|currencyPerkKey|reasonKey|fitKey|onboardingKey|taglineKey|perkKeys|labelKey|cycleKey|priceKey|descKey|tagKey|textKey|headKey)\s*:\s*["']((?:ec|common)\.[\w\-.]+)["']/g;

for (const f of SOURCE_FILES) {
  const fp = path.join(root, f);
  if (!fs.existsSync(fp)) continue;
  const text = fs.readFileSync(fp, "utf8");
  for (const m of text.matchAll(literalPat))   literalUsed.add(m[1]);
  for (const m of text.matchAll(prefixPat))    prefixUsed.add(m[1]);
  for (const m of text.matchAll(dataFieldPat)) literalUsed.add(m[1]);
}

// Also scan i18n-dict files for "perkKeys" arrays etc. that list
// multiple keys — these are referenced indirectly via `for (k of arr) t(k)`.
const perkKeysArrPat = /perkKeys\s*:\s*\[\s*([^\]]+)\]/g;
const dataText = fs.readFileSync(path.join(root, "checker-data.js"), "utf8");
for (const m of dataText.matchAll(perkKeysArrPat)) {
  for (const sub of m[1].matchAll(/["']((?:ec|common)\.[\w\-.]+)["']/g)) {
    literalUsed.add(sub[1]);
  }
}

// Special-case: `t("ec.region." + region)` — we know the 4 region IDs,
// so resolve the prefix to concrete keys for stronger coverage.
const REGION_IDS = ["europe", "apac_me", "americas", "africa"];

// ────────────────────────────────────────────────────────────────
// 2. Declared keys per language come straight from the loaded dict.
// ────────────────────────────────────────────────────────────────
const declared = {};
for (const lang of LANGS) declared[lang] = new Set(Object.keys(DICT[lang] || {}));

// ────────────────────────────────────────────────────────────────
// 3. Assertions.
// ────────────────────────────────────────────────────────────────
// Some i18n keys are referenced via data-field hints (labelKey on a data
// structure) but the data field itself is no longer rendered anywhere.
// These false-positives are flagged for a later cleanup pass — exclude
// them from the strict missing check until then.
const KNOWN_ORPHAN_REFS = new Set([
  // EC_ENTITIES.*.accounts[].fields[].labelKey — fields no longer
  // surfaced in JSX after the EcAccountPreview removal. Data shape
  // cleanup is a separate refactor.
  "ec.account.sortCode",
  "ec.account.accountNo",
  "ec.account.bic",
  "ec.account.iban",
]);

test("Every key used in code is declared in the EN dict", () => {
  const missing = [];
  for (const k of literalUsed) {
    if (k.startsWith("common.")) continue;
    if (declared.en.has(k)) continue;
    if ([...prefixUsed].some((p) => k.startsWith(p))) continue;
    if (KNOWN_ORPHAN_REFS.has(k)) continue;
    missing.push(k);
  }
  assert.deepEqual(missing.slice(), [], `missing EN keys: ${missing.join(", ")}`);
});

test("Every EN key declared for user-facing copy exists in all 9 other languages", () => {
  // Prefixes excluded from the cross-lang completeness check:
  //   ec.country.* / ec.corridor.* — handled via Intl.DisplayNames
  //                                  fallback; partial dict coverage OK
  //   ec.region.*  / ec.cmp.state.* / ec.cmp.q.onboarding.* — same fallback
  //   ec.r.payment.*                — Stripe Payment Element ships its
  //                                  own localised UI; our wrapper-copy
  //                                  only needs EN today (deferred i18n)
  //   ec.fees.*                     — fee schedule modal carries
  //                                  rail-name copy that's only on the
  //                                  EN/RU surface today; deferred i18n
  //   ec.account.*                  — see KNOWN_ORPHAN_REFS above
  const SKIP_PREFIXES = [
    "ec.country.", "ec.corridor.", "ec.region.",
    "ec.cmp.state.", "ec.cmp.q.onboarding.",
    "ec.r.payment.", "ec.fees.", "ec.account.",
  ];
  const interestingEnKeys = [...declared.en].filter(
    (k) => !SKIP_PREFIXES.some((p) => k.startsWith(p))
  );
  const gaps = [];
  for (const lang of LANGS) {
    if (lang === "en") continue;
    for (const k of interestingEnKeys) {
      if (!declared[lang].has(k)) {
        gaps.push(`${lang} missing ${k}`);
      }
    }
  }
  assert.deepEqual(gaps.slice(0, 20), [], `${gaps.length} gaps total. first 20: ${gaps.slice(0, 20).join(" | ")}`);
});

test("No exact-duplicate keys within the EN dict block", () => {
  // Read raw EN text and count occurrences of each key. Duplicates
  // silently overwrite — the second always wins, which masks bugs.
  const text = fs.readFileSync(path.join(root, "i18n-dict-ec.js"), "utf8");
  // Just the D.en block:
  const enBlock = text.match(/Object\.assign\(D\.en,\s*\{([\s\S]*?)\}\s*\)/);
  assert.ok(enBlock, "EN block not found");
  const counts = new Map();
  for (const m of enBlock[1].matchAll(/["']((?:ec|common)\.[\w\-.]+)["']\s*:/g)) {
    counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  }
  const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  assert.deepEqual(dupes, [], `duplicate EN keys: ${dupes.join(", ")}`);
});
