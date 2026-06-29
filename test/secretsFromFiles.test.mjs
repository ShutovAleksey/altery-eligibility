// server.js hydrates process.env from Docker/Swarm secret FILES at startup
// (/run/secrets/<name> or <NAME>_FILE). We set a *_FILE pointer BEFORE importing
// server.js (hydration runs at module load) and assert the value lands in
// process.env, trimmed. Own file so the env/import order is clean (node:test
// runs each file in its own process).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "altery-sec-"));
const file = path.join(dir, "brevo_api_key");
fs.writeFileSync(file, "  file-secret-value\n"); // surrounding whitespace → must be trimmed

delete process.env.BREVO_API_KEY;          // ensure no explicit env shadows the file
process.env.BREVO_API_KEY_FILE = file;     // point the hydrator at our temp file

await import("../server.js");              // hydrateSecretsFromFiles() runs here

test.after(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} });

test("a *_FILE secret is read from disk into process.env, trimmed", () => {
  assert.equal(process.env.BREVO_API_KEY, "file-secret-value");
});

test("missing secret files don't crash startup (server still imported)", async () => {
  // HUBSPOT_TOKEN has no env, no _FILE, and /run/secrets/hubspot_token almost
  // certainly doesn't exist in CI — hydration must skip it silently, which it
  // did since the import above succeeded.
  const mod = await import("../server.js");
  assert.ok(mod.server, "server export is present");
  assert.equal(process.env.HUBSPOT_TOKEN, undefined);
});
