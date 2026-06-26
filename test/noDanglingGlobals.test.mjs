// Safety net for dead-code removal: every name a browser script declares it
// USES via an ESLint `/* global ... */` block must actually be PROVIDED — i.e.
// assigned to `window` by one of our source files, or be a runtime/React
// built-in. If a cleanup sweep deletes a component/helper that some .jsx still
// references, the global stays declared but the provider vanishes, and this
// test fails — instead of the app throwing "X is not defined" in production.
//
// Complements jsxGlobals.test.mjs (which vm-loads data+helpers but only TRUSTS
// the DS components via an allow-list). This check is static, so it also covers
// components.jsx / icons.jsx / atoms exports that the vm sandbox can't evaluate.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

// Source files that EXPORT window globals (loaded as <script> in index.html).
const PROVIDERS = [
  "components.jsx", "icons.jsx", "checker-atoms.jsx", "checker-flag-lang.jsx",
  "checker-screens.jsx", "checker-modals.jsx",
  "checker-data.js", "checker-helpers.js", "checker-pdf.js", "checker-pdf-assets.js",
  "inline-flags.js", "cookie-consent.js",
];
// Browser scripts that CONSUME globals via /* global ... */.
const CONSUMERS = [
  "components.jsx", "icons.jsx", "checker-atoms.jsx", "checker-flag-lang.jsx",
  "checker-screens.jsx", "checker-modals.jsx",
];
// React / browser / lexically-scoped runtime names — provided by the runtime
// (or the single React-hook destructure in checker-flag-lang.jsx), not via window.
const BUILTINS = new Set([
  "React", "ReactDOM", "useT",
  "useState", "useEffect", "useRef", "useMemo", "useCallback",
  "useLayoutEffect", "useSyncExternalStore", "useContext", "useReducer",
  "window", "document", "location", "sessionStorage", "localStorage",
  "navigator", "fetch", "console", "URL", "URLSearchParams", "Intl",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame",
  "html2canvas", "jspdf", "jsPDF", "Stripe", "clarity",
]);

// Names assigned to window across the provider files.
const provided = new Set();
for (const f of PROVIDERS) {
  let src;
  try { src = read(f); } catch { continue; }
  for (const m of src.matchAll(/Object\.assign\(\s*window\s*,\s*\{([\s\S]*?)\}\s*\)/g)) {
    for (const tok of m[1].split(/[,\n]/)) {
      const name = tok.split(":")[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) provided.add(name);
    }
  }
  for (const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) provided.add(m[1]);
}

// Names declared as used via /* global ... */ in the consumer files.
const consumed = new Map(); // name -> first file that declares it
for (const f of CONSUMERS) {
  let src;
  try { src = read(f); } catch { continue; }
  for (const m of src.matchAll(/\/\*\s*global\s+([\s\S]*?)\*\//g)) {
    for (const tok of m[1].split(/[\s,]+/)) {
      const name = tok.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name) && !consumed.has(name)) consumed.set(name, f);
    }
  }
}

test("noDanglingGlobals: every /* global */ name is provided or a runtime built-in", () => {
  assert.ok(consumed.size > 20, `sanity: expected to find many /* global */ names, got ${consumed.size}`);
  const missing = [];
  for (const [name, file] of consumed) {
    if (BUILTINS.has(name)) continue;
    if (!provided.has(name)) missing.push(`${name}  (declared in ${file})`);
  }
  assert.deepEqual(
    missing, [],
    "These globals are DECLARED as used but NOT provided by any source file — a dead-code sweep likely removed a symbol that is still referenced:\n  " +
      missing.join("\n  "),
  );
});
