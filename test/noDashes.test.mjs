// Regression guard for the em-dash / en-dash purge. Em-dashes read as
// AI-generated copy; the founder asked for none in user-facing strings.
// This scans every i18n dict (checker + onboarding) for U+2014 (—) and
// U+2013 (–) inside string VALUES, ignoring comment lines (decorative
// separators and prose comments legitimately use them). A failure prints
// the exact file:line so a future stray dash is easy to find.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const DICTS = [
  "i18n-dict-ec.js",
  "i18n-dict-ec-translations.js",
  "i18n-dict-ec-nl-tr.js",
  "i18n-dict-ec-it-es.js",
  "i18n-dict-ec-pl-pt-fr.js",
  "i18n-dict-ec-countries.js",
  "setup/i18n-dict-ob.js",
  "setup/i18n-dict-ob-de-ru.js",
  "setup/i18n-dict-ob-nl-tr-it.js",
  "setup/i18n-dict-ob-es-pl-pt-fr.js",
];

const DASH = /[—–]/;

function isCommentLine(trimmed) {
  return trimmed.startsWith("//") || trimmed.startsWith("/*") ||
         trimmed.startsWith("*") || trimmed.startsWith("*/");
}

test("no em-dash / en-dash in any user-facing i18n string value", () => {
  const violations = [];
  for (const rel of DICTS) {
    const lines = fs.readFileSync(path.join(root, rel), "utf8").split("\n");
    lines.forEach((line, i) => {
      if (isCommentLine(line.trim())) return;
      if (DASH.test(line)) violations.push(`${rel}:${i + 1}  ${line.trim().slice(0, 90)}`);
    });
  }
  assert.deepEqual(violations, [], "em/en-dash found in string values:\n" + violations.join("\n"));
});
