#!/usr/bin/env node
// scripts/verify-baselines.mjs
// Runs every traditional-bank panel member through two checks:
//   (1) Are the cited source URLs still live? (HTTP 200, follow redirects)
//   (2) Is the asof timestamp within a freshness window (≤120 days)?
//
// Exit code:
//   0 — everything healthy
//   1 — one or more sources broken OR one or more banks stale
//
// Usage:
//   npm run verify:baselines     (via package.json)
//   node scripts/verify-baselines.mjs --max-age-days=60
//
// Output is a structured human-readable report. Designed to be wired
// into a weekly GitHub Action that opens an issue / sends a Slack
// ping when something drifts.

import { loadSandbox } from "../test/load.mjs";

// ── CLI args ──────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);
const MAX_AGE_DAYS  = parseInt(args["max-age-days"] || "120", 10);
const TIMEOUT_MS    = parseInt(args["timeout-ms"]   || "8000", 10);
const FETCH_METHOD  = args["method"] || "HEAD";

// ── Load EC_COMPARATORS in a sandbox ──────────────────────────────
const w = loadSandbox();
const cmp = w.EC_COMPARATORS || {};
const banks = Object.values(cmp).filter((c) => c.type === "traditional");

console.log(`\nverify-baselines: checking ${banks.length} traditional-bank panel members`);
console.log(`  freshness window: ${MAX_AGE_DAYS} days, fetch method: ${FETCH_METHOD}\n`);

// ── Freshness check ───────────────────────────────────────────────
const now = Date.now();
const stale = [];
for (const bank of banks) {
  const asof = new Date(bank.asof);
  const days = Math.floor((now - asof.getTime()) / (1000 * 60 * 60 * 24));
  if (days > MAX_AGE_DAYS) {
    stale.push({ id: bank.id, name: bank.name, days, asof: bank.asof });
  }
}

// ── URL liveness check ────────────────────────────────────────────
// Statuses we treat as truly broken (page gone, server error,
// network failure). 403 / 401 / 429 typically mean bot-protection
// (Cloudflare / Akamai / Imperva blocking server-side HEAD/GET) —
// we report them as "unverifiable" but don't fail the exit code,
// since they probably resolve fine in a real browser.
const BROKEN_STATUSES = new Set([404, 410, 500, 502, 503, 504]);
const BLOCKED_STATUSES = new Set([401, 403, 405, 418, 429]);
const broken     = [];
const unverified = [];
const urlOK      = [];

async function fetchWithTimeout(url, method, timeoutMs) {
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), timeoutMs);
  try {
    // User-Agent helps with some bot-detection systems but never bypasses
    // strict ones. Keep it browser-shaped.
    const res = await fetch(url, {
      method, redirect: "follow", signal: ac.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; AlteryBaselineCheck/1.0)" },
    });
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  } finally {
    clearTimeout(tid);
  }
}

for (const bank of banks) {
  for (const url of (bank.sources || [])) {
    let out = await fetchWithTimeout(url, FETCH_METHOD, TIMEOUT_MS);
    // Some sites block HEAD; try GET as a single retry.
    if (!out.ok && (out.status === 405 || out.error || out.status === 403)) {
      out = await fetchWithTimeout(url, "GET", TIMEOUT_MS);
    }
    if (out.ok) {
      urlOK.push({ id: bank.id, url });
    } else if (BROKEN_STATUSES.has(out.status) || out.error) {
      broken.push({ id: bank.id, name: bank.name, url, status: out.status, error: out.error });
    } else if (BLOCKED_STATUSES.has(out.status)) {
      unverified.push({ id: bank.id, name: bank.name, url, status: out.status });
    } else {
      // Unknown status — bucket conservatively as unverified.
      unverified.push({ id: bank.id, name: bank.name, url, status: out.status });
    }
  }
}

// ── Report ────────────────────────────────────────────────────────
console.log(`Stale entries (>${MAX_AGE_DAYS} days): ${stale.length}`);
for (const s of stale) {
  console.log(`  ✗ ${s.id.padEnd(20)} ${s.days} days old (asof ${s.asof}) — ${s.name}`);
}
console.log(`\nURLs checked: ${urlOK.length + broken.length + unverified.length}`
  + `  ·  OK: ${urlOK.length}`
  + `  ·  broken: ${broken.length}`
  + `  ·  unverifiable (bot-blocked): ${unverified.length}`);
for (const b of broken) {
  console.log(`  ✗ ${b.id.padEnd(20)} ${b.status || "ERR"} — ${b.url}${b.error ? ` (${b.error})` : ""}`);
}
for (const u of unverified) {
  console.log(`  ⚠ ${u.id.padEnd(20)} ${u.status} (bot-blocked) — ${u.url}`);
}

// Exit only fails on genuinely broken (404/5xx/network) + stale.
// Bot-blocked are flagged but don't fail since they likely work in
// a real browser. CI can still surface the warnings.
const ok = stale.length === 0 && broken.length === 0;
console.log(`\n${ok ? "✓ baselines healthy"
  : "✗ baselines need attention"}${unverified.length && ok ? " (some URLs unverifiable — manual check recommended)" : ""}\n`);
process.exit(ok ? 0 : 1);
