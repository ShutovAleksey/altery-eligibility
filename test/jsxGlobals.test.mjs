// Layer-5 test — every name referenced via /* global … */ in a .jsx
// file must actually exist on `window` once checker-data.js and
// checker-helpers.js have evaluated.
//
// This catches the failure mode from commit 0081411: a dead-code sweep
// in checker-data.js accidentally removed two helpers (ecHeroIdentifier
// + maskTailDots) that JSX called at render time. None of the helper-
// unit tests touched JSX, so the regression sailed through CI. This
// test closes that loop — if a JSX file says `/* global ecFoo */` then
// ecFoo had better be on window after the data/helpers/modals files
// run.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Built-ins / React-API names — these come from React, ReactDOM and the
// browser/runtime, not from our own source files. We expect them on
// window in the actual browser context; sandbox just trusts them.
const RUNTIME_PROVIDED = new Set([
  "React", "ReactDOM",
  // DS atoms / icons that live in /components.jsx and /icons.jsx and
  // /checker-atoms.jsx and /checker-flag-lang.jsx — these are loaded as
  // separate script tags in index.html before checker-screens / modals.
  // Our sandbox only loads data + helpers, so these are stubs.
  "Button", "Tag", "Alert", "SelectableListItem", "Input", "Select", "Checkbox",
  "Icon", "Flag", "Title", "Field", "WhyWeAsk", "Card", "Spinner", "Modal",
  "useT",
  // Loaded later by other modal/screen files at runtime:
  "EcIco", "EcFeesModal", "EcPlanComparisonModal", "EcMethodologyModal",
  "EcHandoffModal", "EcCallbackForm",
  // Booking URL lives in /checker-pdf-assets.js (loaded as a separate
  // <script> classic, exported to window). Sandbox doesn't load it.
  "EC_BOOKING_URL",
]);

// Files we DO load into the sandbox — anything they export to window
// should resolve.
function loadSandbox() {
  const win = {
    __I18N: { DICT: {}, getLang: () => "en", t: (k) => k, onChange: () => () => {}, LANGS: [] },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
    location: { origin: "https://example.test", search: "" },
  };
  const ctx = vm.createContext({
    window: win,
    sessionStorage: win.sessionStorage,
    location: win.location,
    console,
    Object, Array, Math, JSON, Date, RegExp, Error, Map, Set,
    parseFloat, parseInt, isNaN, isFinite,
    Intl, URL, URLSearchParams,
    Buffer,
    encodeURIComponent, decodeURIComponent,
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
  });
  for (const f of ["checker-data.js", "checker-helpers.js", "checker-pdf.js", "checker-pdf-assets.js"]) {
    const fp = path.join(root, f);
    if (!fs.existsSync(fp)) continue;
    vm.runInContext(fs.readFileSync(fp, "utf8"), ctx, { filename: f });
  }
  return win;
}

const JSX_FILES = [
  "checker-screens.jsx", "checker-modals.jsx", "checker-atoms.jsx",
  "checker-flag-lang.jsx",
];

const win = loadSandbox();

// Parse /* global a, b, c, ... */ at the top of each .jsx file.
function parseGlobals(text) {
  const m = text.match(/\/\*\s*global\s+([^*]+?)\*\//);
  if (!m) return [];
  return m[1]
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

for (const f of JSX_FILES) {
  test(`JSX globals available on window: ${f}`, () => {
    const text = fs.readFileSync(path.join(root, f), "utf8");
    const declared = parseGlobals(text);
    const missing = declared.filter(
      (name) => !(name in win) && !RUNTIME_PROVIDED.has(name)
    );
    assert.deepEqual(
      missing.slice(),
      [],
      `${f} declares /* global ${missing.join(", ")} */ but those names are not set on window`,
    );
  });
}

// Cross-check: every name actually USED unqualified in JSX must be
// either RUNTIME_PROVIDED, on window, or declared with const/let/var/
// function in the same file. Catches the case where /* global */ is
// missing but the identifier is referenced (which is what bit us on
// ecHeroIdentifier the first time around).
//
// Approach: collect ALL ecFoo / EcFoo / EC_FOO identifiers used in the
// file, subtract the ones declared inside the file or in /* global */
// or in RUNTIME_PROVIDED, ensure the remainder all exist on window.
test("Every EC-prefixed identifier used in JSX is resolvable on window", () => {
  const issues = [];
  for (const f of JSX_FILES) {
    const text = fs.readFileSync(path.join(root, f), "utf8");
    // Collect identifiers matching our naming conventions:
    //   Ec<Pascal> (components), ec<MixedCase> (helpers — note that
    //   the char after `ec` can be either case, e.g. ecHeroIdentifier
    //   has uppercase H), EC_<UPPER> (data).
    const usedSet = new Set();
    for (const m of text.matchAll(/\b((?:Ec[A-Z]\w+)|(?:ec[A-Za-z]\w+)|(?:EC_[A-Z]\w+))\b/g)) {
      usedSet.add(m[1]);
    }
    // Strip declarations inside the same file (function Foo, const Foo, …)
    const localDecls = new Set();
    for (const m of text.matchAll(/(?:function|const|let|var)\s+([A-Za-z_]\w*)/g)) {
      localDecls.add(m[1]);
    }
    const declaredGlobals = new Set(parseGlobals(text));
    const missing = [];
    for (const name of usedSet) {
      if (localDecls.has(name)) continue;
      if (declaredGlobals.has(name)) continue;
      if (RUNTIME_PROVIDED.has(name)) continue;
      if (name in win) continue;
      missing.push(name);
    }
    if (missing.length) issues.push(`${f}: ${missing.join(", ")}`);
  }
  assert.deepEqual(issues, [], `unresolved JSX identifiers:\n${issues.join("\n")}`);
});
