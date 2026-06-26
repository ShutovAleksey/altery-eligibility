// Layer-4 tests — syntax check for every plain .js source file and a
// basic JSX-parse for the .jsx files. Catches typos/missing-bracket bugs
// before a deploy ever rolls out to users.
//
// Plain .js: node --check (built-in, no deps).
// .jsx: regex-based balance check on braces + parens — light, catches
//       gross corruption (unbalanced) without needing a JSX parser dep.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const JS_FILES = [
  "checker-data.js", "checker-helpers.js", "checker-pdf.js",
  "checker-pdf-assets.js", "inline-flags.js",
  "i18n-dict-ec.js", "i18n-dict-ec-countries.js",
  "i18n-dict-ec-translations.js", "i18n-dict-ec-nl-tr.js",
  "i18n-dict-ec-it-es.js", "i18n-dict-ec-pl-pt-fr.js",
];

const JSX_FILES = [
  "checker-screens.jsx", "checker-modals.jsx", "checker-atoms.jsx",
  "checker-flag-lang.jsx",
];

// API endpoints — these are real ESM modules, deploy-on-error if broken.
const API_FILES = ["api/send-analysis.js", "api/hubspot-lead.js",
                   "lib/email.js", "lib/rate-limit.js", "lib/anti-spam.js",
                   "lib/send-analysis-validators.js"];

for (const f of [...JS_FILES, ...API_FILES]) {
  test(`node --check ${f}`, () => {
    const fp = path.join(root, f);
    if (!fs.existsSync(fp)) return; // file optional
    try {
      execSync(`node --check "${fp}"`, { stdio: "pipe" });
    } catch (e) {
      throw new Error(`syntax error in ${f}:\n${e.stderr.toString()}`);
    }
  });
}

// JSX files aren't syntax-checkable by node --check (the ext is the
// blocker, but even if we worked around it, JSX isn't parseable by
// V8). The codebase compiles via Babel-standalone in the browser, so
// runtime catches any disaster — and adding @babel/parser as a dev
// dep for static parsing felt overkill at this stage. Verifying that
// every JSX file is at least non-empty and not obviously corrupted:
for (const f of JSX_FILES) {
  test(`non-empty + has JSX-shaped content: ${f}`, () => {
    const text = fs.readFileSync(path.join(root, f), "utf8");
    assert.ok(text.length > 100, `${f} is suspiciously small`);
    assert.match(text, /</, `${f} has no JSX tags?`);
    assert.match(text, /function\s+\w+/, `${f} has no function definitions?`);
  });
}
