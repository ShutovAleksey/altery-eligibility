// Layer-2 test — industry → persona-line mapping integrity.
//
// The result page, PDF and analysis email all show a per-industry "persona
// line" (e.g. games → "For studios with multi-platform revenue") derived from
// the selected industry via t("ec.r.persona." + rec.ind.value + ".line").
// Two ways this silently breaks:
//   1. An industry is listed in personaIndustries but has no ec.r.persona.<x>
//      .line key — t() then renders the raw key string in the user's PDF/email.
//   2. The personaIndustries array is duplicated in checker-pdf.js (once for
//      the PDF, once for the email payload); if one copy is edited and the
//      other isn't, the PDF and email show different personas for the same
//      industry.
// A founder hit case (1)/(2) confusion: picked "Games & game studios" and
// wasn't sure the right industry had propagated. It had — these tests keep it
// that way. Cross-language coverage of the persona keys is already enforced by
// i18nIntegrity (every EN key must exist in all 9 other dicts).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const pdfSrc = fs.readFileSync(path.join(root, "checker-pdf.js"), "utf8");
const enDict = fs.readFileSync(path.join(root, "i18n-dict-ec.js"), "utf8");

// Every `personaIndustries = [ ... ]` literal in checker-pdf.js.
function extractPersonaArrays(src) {
  const arrays = [];
  const re = /personaIndustries\s*=\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src))) {
    arrays.push(
      m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
    );
  }
  return arrays;
}

// Every ec.r.persona.<x>.line key declared in the EN dict.
function personaKeyIndustries(dict) {
  const set = new Set();
  const re = /"ec\.r\.persona\.([a-z]+)\.line"/g;
  let m;
  while ((m = re.exec(dict))) set.add(m[1]);
  return set;
}

const arrays = extractPersonaArrays(pdfSrc);
const keyInds = personaKeyIndustries(enDict);

test("checker-pdf.js defines at least one personaIndustries array", () => {
  assert.ok(arrays.length >= 1, "no personaIndustries array found in checker-pdf.js");
});

test("all personaIndustries arrays are identical (PDF and email must not drift)", () => {
  const norm = (a) => JSON.stringify([...a].sort());
  const first = norm(arrays[0]);
  for (let i = 1; i < arrays.length; i++) {
    assert.equal(
      norm(arrays[i]), first,
      `personaIndustries copy #${i + 1} differs from #1 — the PDF and email persona logic have drifted`
    );
  }
});

test("every persona industry has an ec.r.persona.<ind>.line key in the EN dict", () => {
  for (const ind of arrays[0]) {
    assert.ok(
      enDict.includes(`"ec.r.persona.${ind}.line"`),
      `industry "${ind}" is in personaIndustries but has no "ec.r.persona.${ind}.line" key — selecting it would print the raw key in the PDF/email`
    );
  }
});

test("every ec.r.persona.<x>.line key maps to a real personaIndustries entry (no orphans)", () => {
  const inds = new Set(arrays[0]);
  assert.ok(keyInds.size > 0, "no ec.r.persona.*.line keys found in EN dict");
  for (const k of keyInds) {
    assert.ok(
      inds.has(k),
      `"ec.r.persona.${k}.line" exists but "${k}" is not in personaIndustries — it can never render`
    );
  }
});
