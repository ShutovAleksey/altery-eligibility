// Sandbox loader for the browser-script source files.
//
// The eligibility-checker JS lives in classic <script> files that
// assign to `window.X` instead of using ESM exports. To run them
// under Node's test harness we evaluate the source in a vm context
// with a stub `window` object, then re-export everything Node-side.
//
// Stubs supplied:
//   window         — the eventual export bag
//   window.__I18N  — minimal i18n shim that returns the key (or the
//                    interpolated key with {var} placeholders preserved)
//   window.location / window.sessionStorage — for URL/UTM helpers
//
// Anything missing is added on demand by tests via the returned proxy.

import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function makeStubI18N() {
  return {
    getLang: () => "en",
    setLang: () => {},
    onChange: () => () => {},
    LANGS: [{ code: "en", flag: "gb", nativeName: "English" }],
    DICT: { en: {} },
    t: (key, vars) => {
      // Return-the-key shim. If interpolation requested, sub {var} → value.
      if (!vars) return key;
      let s = String(key);
      for (const k of Object.keys(vars)) {
        s = s.replace(new RegExp("\\{" + k + "\\}", "g"), String(vars[k]));
      }
      return s;
    },
  };
}

function makeStubStorage() {
  const m = new Map();
  return {
    getItem:    (k)    => (m.has(k) ? m.get(k) : null),
    setItem:    (k, v) => { m.set(k, String(v)); },
    removeItem: (k)    => { m.delete(k); },
    clear:      ()     => { m.clear(); },
  };
}

/**
 * Load checker-data.js + checker-helpers.js into a fresh sandbox.
 * Returns a bag of every name assigned to `window.X` plus the
 * `window` object itself for direct inspection.
 */
export function loadSandbox(opts = {}) {
  const win = {
    __I18N: opts.i18n || makeStubI18N(),
    sessionStorage: makeStubStorage(),
    location: { origin: "https://example.test", search: opts.search || "" },
  };

  const ctx = vm.createContext({
    window: win,
    // Browser globals accessed without the `window.` prefix in production
    // code — `sessionStorage.setItem(…)` etc. Mirror the references onto
    // the sandbox top level so helpers run unchanged.
    sessionStorage: win.sessionStorage,
    location:       win.location,
    console,
    Object, Array, Math, JSON, Date, RegExp, Error, Map, Set,
    parseFloat, parseInt, isNaN, isFinite,
    Intl, URL, URLSearchParams,
    Promise,
    Buffer,
    encodeURIComponent, decodeURIComponent,
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
  });

  for (const file of ["checker-data.js", "checker-helpers.js"]) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(code, ctx, { filename: file });
  }

  return win;
}
