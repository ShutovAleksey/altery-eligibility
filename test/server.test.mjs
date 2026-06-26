// Smoke test for server.js (the container entry-point). Boots the server on an
// ephemeral port and checks: health endpoint, static serving with correct MIME
// (esp. .jsx → application/javascript), SPA fallback vs real 404, and that
// /api/* reaches the handler (not 404). It does NOT assert handler business
// logic — no env vars here, so the handler may 4xx/5xx; we only verify routing
// + the req/res adapter work end to end.
import { test } from "node:test";
import assert from "node:assert/strict";
import { server } from "../server.js";

const base = await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
});
test.after(() => new Promise((r) => server.close(r)));

test("GET /healthz → 200 {ok:true}", async () => {
  const r = await fetch(base + "/healthz");
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test("GET / serves index.html as text/html", async () => {
  const r = await fetch(base + "/");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") || "", /text\/html/);
  assert.ok((await r.text()).length > 500, "index.html should have real content");
});

test(".jsx is served as application/javascript (Babel needs it)", async () => {
  const r = await fetch(base + "/checker-screens.jsx");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") || "", /application\/javascript/);
});

test(".css served as text/css", async () => {
  const r = await fetch(base + "/checker.css");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") || "", /text\/css/);
});

test("missing asset (has extension) → 404, not SPA fallback", async () => {
  const r = await fetch(base + "/does-not-exist.js");
  assert.equal(r.status, 404);
});

test("extension-less route → SPA index.html", async () => {
  const r = await fetch(base + "/app/route");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") || "", /text\/html/);
});

test("backend source is NOT served as static (api/lib/server.js/package.json → 404)", async () => {
  for (const p of ["/server.js", "/package.json", "/api/send-analysis.js", "/lib/email.js", "/lib/rate-limit.js"]) {
    const r = await fetch(base + p);
    assert.equal(r.status, 404, `${p} must not be served as static (got ${r.status})`);
  }
});

test("/api/* reaches the handler (routed, JSON response, not 404)", async () => {
  const r = await fetch(base + "/api/hubspot-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://altery.com" },
    body: JSON.stringify({ properties: { email: "x@example.com" } }),
  });
  assert.notEqual(r.status, 404, "route must reach the handler");
  assert.match(r.headers.get("content-type") || "", /application\/json/);
});

test("GET on a POST-only /api route is handled (405), not 404", async () => {
  const r = await fetch(base + "/api/send-analysis", { method: "GET" });
  assert.notEqual(r.status, 404);
});
