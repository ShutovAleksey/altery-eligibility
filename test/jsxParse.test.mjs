// Syntax gate for the browser JSX modules. They're compiled in-browser by
// Babel-standalone (no build step), so a syntax slip — e.g. a dead-code sweep
// that botches a brace — wouldn't surface in `node --test` (Node can't parse
// JSX) and would only break in the browser. esbuild parses each .jsx here so
// any such breakage fails CI instead of production.
//
// This is a SYNTAX check only: esbuild transforms JSX → JS without resolving
// the cross-script window globals (React, Button, …), which is exactly what we
// want — we validate the grammar, not the runtime wiring (jsxGlobals +
// noDanglingGlobals cover that).
//
// esbuild is a devDependency; if it isn't installed (e.g. a prod-only install),
// these cases SKIP rather than error — so `npm test` never hard-fails on a
// missing dev tool.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let transformSync = null;
try { ({ transformSync } = await import("esbuild")); } catch { /* esbuild not installed — cases below skip */ }

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const jsxFiles = fs.readdirSync(root).filter((f) => f.endsWith(".jsx")).sort();

test("found the browser JSX modules", () => {
  assert.ok(jsxFiles.length >= 4, `expected several .jsx files, got ${jsxFiles.length}: ${jsxFiles}`);
});

const skip = transformSync ? false : "esbuild devDependency not installed";
for (const f of jsxFiles) {
  test(`jsx parses: ${f}`, { skip }, () => {
    const code = fs.readFileSync(path.join(root, f), "utf8");
    assert.doesNotThrow(
      () => transformSync(code, { loader: "jsx" }),
      `${f} failed to parse as JSX — likely a syntax error from an edit`,
    );
  });
}
