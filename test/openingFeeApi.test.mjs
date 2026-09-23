// api/opening-fee.js end to end at the handler level, with global fetch stubbed
// as "Stripe". Covers the public config, create (validation, anti-spam, the
// per-IP and per-email rate limits, the exact params sent to Stripe, company
// fields from an old client ignored, error mapping without leaks) and confirm
// (only a genuinely succeeded fee PI mints a token, deterministically, and the
// response carries no company: registration binds it at first use).
import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import handler from "../api/opening-fee.js";
import { verifyOpeningToken } from "../lib/opening-fee-token.js";

const SK = "sk_test_SECRETKEY_should_never_leak";
const PK = "pk_test_publishable_123";
const TOKEN_SECRET = "tok-secret-9f8e7d6c5b4a39281706-a1b2c3d4"; // ≥ 32 chars, like openssl rand -hex 32

// Upstash env would make the rate limiter call fetch too; keep it in memory.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

function enable() {
  process.env.STRIPE_SECRET_KEY = SK;
  process.env.STRIPE_PUBLISHABLE_KEY = PK;
  process.env.OPENING_FEE_TOKEN_SECRET = TOKEN_SECRET;
}
function disable() {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PUBLISHABLE_KEY;
  delete process.env.OPENING_FEE_TOKEN_SECRET;
}

// --- Stripe stub -------------------------------------------------------------
const realFetch = globalThis.fetch;
let calls = [];
let reply = () => ({ status: 500, body: {} });
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  const r = await reply(String(url), init);
  if (r instanceof Error) throw r;
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
};
after(() => { globalThis.fetch = realFetch; disable(); });

beforeEach(() => { calls = []; enable(); reply = () => ({ status: 500, body: {} }); });

// Every request gets its own IP (and email) unless a test is about rate
// limits, so the in-memory buckets never couple unrelated tests.
let seq = 0;
const nextIp = () => `10.0.${Math.floor(++seq / 250)}.${seq % 250}`;
const nextEmail = () => `buyer${++seq}@northwind.co.uk`;

function mockRes() {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.body = o; return res; };
  res.end = () => res;
  return res;
}

async function call({ method = "POST", body, ip = nextIp(), origin = "https://altery.com" } = {}) {
  const headers = { "x-forwarded-for": ip };
  if (origin) headers.origin = origin;
  const req = { method, headers, body: body || {} };
  const res = mockRes();
  res.req = req;
  await handler(req, res);
  return res;
}

function createBody(over = {}) {
  return {
    action: "create",
    attemptId: "att_" + Math.random().toString(36).slice(2, 12),
    country: "GB",
    email: nextEmail(),
    plan: "pro",
    entity: "uk",
    acceptedTerms: true,
    lang: "en",
    website: "",
    formLoadedAt: Date.now() - 60_000,
    ...over,
  };
}

const PI_ID = "pi_3PopeningFEE0001";
function paidPI(over = {}) {
  return {
    id: PI_ID, object: "payment_intent", status: "succeeded", livemode: true,
    amount: 10000, currency: "gbp", created: 1790000000,
    metadata: {
      kind: "account_opening_fee", source: "altery-eligibility-checker",
      email: "jane@northwind.co.uk", company_country: "GB",
      plan: "pro", entity: "uk", lang: "en",
      terms_version: "2026-09-23", terms_accepted_at: "2026-09-23T10:00:00.000Z",
    },
    ...over,
  };
}

// --- GET config --------------------------------------------------------------

test("GET: disabled without keys, publishableKey null, fee constants present", async () => {
  disable();
  const r = await call({ method: "GET" });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body, {
    enabled: false, publishableKey: null,
    amount: 10000, currency: "gbp", display: "£100", termsVersion: "2026-09-23",
  });
  assert.equal(r.headers["cache-control"], "no-store");
});

test("GET: enabled with all three secrets, exposes only the publishable key", async () => {
  const r = await call({ method: "GET" });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.enabled, true);
  assert.equal(r.body.publishableKey, PK);
  const raw = JSON.stringify(r.body);
  assert.ok(!raw.includes(SK) && !raw.includes(TOKEN_SECRET), "no secret in the public config");
  assert.equal(calls.length, 0, "config never calls Stripe");
});

test("GET: a secret key misplaced in STRIPE_PUBLISHABLE_KEY is never served", async () => {
  process.env.STRIPE_PUBLISHABLE_KEY = "sk_live_misplaced";
  const r = await call({ method: "GET" });
  assert.equal(r.body.enabled, false);
  assert.equal(r.body.publishableKey, null);
});

test("GET: only one secret missing still means disabled", async () => {
  delete process.env.OPENING_FEE_TOKEN_SECRET;
  const r = await call({ method: "GET" });
  assert.equal(r.body.enabled, false);
  assert.equal(r.body.publishableKey, null);
});

test("a token secret under 32 characters disables the fee (GET off, create/confirm 503)", async () => {
  process.env.OPENING_FEE_TOKEN_SECRET = "changeme";
  assert.equal((await call({ method: "GET" })).body.enabled, false);
  const c = await call({ body: createBody() });
  assert.equal(c.statusCode, 503);
  assert.deepEqual(c.body, { error: "not_configured" });
  const f = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  assert.equal(f.statusCode, 503);
  assert.equal(calls.length, 0, "Stripe untouched");
});

test("OPTIONS 204, unsupported method 405, unknown action 400", async () => {
  assert.equal((await call({ method: "OPTIONS" })).statusCode, 204);
  assert.equal((await call({ method: "PUT" })).statusCode, 405);
  const r = await call({ body: { action: "refund" } });
  assert.equal(r.statusCode, 400);
  assert.deepEqual(r.body, { error: "invalid_action" });
});

// --- create ------------------------------------------------------------------

test("create: 503 not_configured when a secret is missing, Stripe untouched", async () => {
  disable();
  const r = await call({ body: createBody() });
  assert.equal(r.statusCode, 503);
  assert.deepEqual(r.body, { error: "not_configured" });
  assert.equal(calls.length, 0);
});

test("create: every field is validated (400 invalid_field + field name)", async () => {
  const cases = {
    attemptId: ["short", "has space 123", "x".repeat(65), 12345678, undefined],
    country: ["GBR", "g", "12", "", undefined],
    email: ["no-at", "a@b", "a b@c.com", "a@b..com", "x".repeat(250) + "@a.com", undefined],
    plan: ["gold", "PRO", undefined],
    entity: ["us", "UK", undefined],
  };
  for (const [field, values] of Object.entries(cases)) {
    for (const value of values) {
      const r = await call({ body: createBody({ [field]: value }) });
      assert.equal(r.statusCode, 400, `${field}=${JSON.stringify(value)} should be rejected`);
      assert.deepEqual(r.body, { error: "invalid_field", field }, `${field}=${JSON.stringify(value)}`);
    }
  }
  assert.equal(calls.length, 0, "invalid input never reaches Stripe");
});

test("create: terms must be exactly true", async () => {
  for (const v of [false, "true", 1, undefined]) {
    const r = await call({ body: createBody({ acceptedTerms: v }) });
    assert.equal(r.statusCode, 400);
    assert.deepEqual(r.body, { error: "terms_not_accepted" });
  }
  assert.equal(calls.length, 0);
});

test("create: anti-spam (honeypot, foreign origin, too-fast form) rejects before Stripe", async () => {
  const honey = await call({ body: createBody({ website: "https://spam.example" }) });
  assert.equal(honey.statusCode, 400);
  assert.equal(honey.body.code, "spam_check_failed");
  const foreign = await call({ body: createBody(), origin: "https://evil.example" });
  assert.equal(foreign.statusCode, 403);
  const fast = await call({ body: createBody({ formLoadedAt: Date.now() - 500 }) });
  assert.equal(fast.statusCode, 400);
  assert.equal(calls.length, 0);
});

test("create: sends the exact PaymentIntent params, headers and idempotency key", async () => {
  reply = () => ({ status: 200, body: { id: "pi_3PnewINTENT00001", client_secret: "pi_3PnewINTENT00001_secret_abc" } });
  const body = createBody({ email: " Jane@Northwind.CO.UK ", country: "gb", lang: "de" });
  const before = Date.now();
  const r = await call({ body });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body, { clientSecret: "pi_3PnewINTENT00001_secret_abc", paymentIntentId: "pi_3PnewINTENT00001" });

  assert.equal(calls.length, 1);
  const { url, init } = calls[0];
  assert.equal(url, "https://api.stripe.com/v1/payment_intents");
  assert.equal(init.method, "POST");
  assert.equal(init.headers.Authorization, "Bearer " + SK);
  assert.equal(init.headers["Idempotency-Key"], body.attemptId);
  assert.equal(init.headers["Content-Type"], "application/x-www-form-urlencoded");
  assert.match(init.headers["Stripe-Version"], /^\d{4}-\d{2}-\d{2}/);

  const p = new URLSearchParams(init.body);
  assert.equal(p.get("amount"), "10000");
  assert.equal(p.get("currency"), "gbp");
  assert.deepEqual(p.getAll("payment_method_types[]"), ["card"], "card type only (Apple Pay / Google Pay ride on it)");
  assert.equal(p.get("capture_method"), "automatic");
  assert.equal(p.get("description"), "Altery account opening fee");
  assert.equal(p.get("receipt_email"), "jane@northwind.co.uk");
  assert.equal(p.get("metadata[kind]"), "account_opening_fee");
  assert.equal(p.get("metadata[source]"), "altery-eligibility-checker");
  assert.equal(p.get("metadata[company_country]"), "GB");
  assert.equal(p.get("metadata[email]"), "jane@northwind.co.uk");
  assert.equal(p.get("metadata[plan]"), "pro");
  assert.equal(p.get("metadata[entity]"), "uk");
  assert.equal(p.get("metadata[lang]"), "de");
  assert.equal(p.get("metadata[terms_version]"), "2026-09-23");
  const acceptedAt = Date.parse(p.get("metadata[terms_accepted_at]"));
  assert.ok(acceptedAt >= before - 1000 && acceptedAt <= Date.now() + 1000, "terms_accepted_at is now, ISO");
  // The metadata is exactly this record: email + country, no company.
  const mdKeys = [...p.keys()].filter((k) => k.startsWith("metadata[")).map((k) => k.slice(9, -1)).sort();
  assert.deepEqual(mdKeys, ["company_country", "email", "entity", "kind", "lang", "plan", "source",
    "terms_accepted_at", "terms_version"]);
  // Client-controlled fields that must NOT reach Stripe.
  for (const k of ["amount_override", "website", "formLoadedAt", "attemptId", "acceptedTerms"]) {
    assert.equal(p.has(k), false, `${k} must not be forwarded`);
  }
});

test("create: company fields from an old cached client are ignored, never forwarded", async () => {
  // The paywall used to send companyName/companyNumber. A tab still running
  // that client can pay (even with values the old rules refused), and none
  // of it reaches Stripe.
  let n = 0;
  reply = () => ({ status: 200, body: { id: `pi_3PlegacyCLIENT${String(++n).padStart(3, "0")}`, client_secret: "cs" } });
  for (const legacy of [
    { companyName: "Zebulon Quux Holdings", companyNumber: "ZQ 998877" },
    { companyName: "A", companyNumber: "1" },
    { companyName: "Evil\u0000Co\r\nX", companyNumber: "12$4" },
    { companyName: 42, companyNumber: null },
  ]) {
    calls = [];
    const r = await call({ body: createBody(legacy) });
    assert.equal(r.statusCode, 200, JSON.stringify(legacy));
    const sent = new URLSearchParams(calls[0].init.body);
    for (const k of sent.keys()) {
      assert.ok(!/company_(name|number)|companyName|companyNumber/.test(k), `${k} must not reach Stripe`);
    }
    const values = [...sent.values()].join("\n");
    assert.ok(!values.includes("Zebulon") && !values.includes("ZQ 998877"), "no company value either");
  }
});

test("create: a client-supplied amount/currency is ignored", async () => {
  reply = () => ({ status: 200, body: { id: "pi_3PnewINTENT00002", client_secret: "cs_2" } });
  const r = await call({ body: createBody({ amount: 1, currency: "usd" }) });
  assert.equal(r.statusCode, 200);
  const p = new URLSearchParams(calls[0].init.body);
  assert.equal(p.get("amount"), "10000");
  assert.equal(p.get("currency"), "gbp");
});

test("create: Stripe errors map to 502 stripe_error without leaking Stripe's message", async () => {
  reply = () => ({ status: 400, body: { error: { type: "invalid_request_error", code: "parameter_invalid", message: "Invalid API Key provided: sk_live_LEAKED***\r\nforged" } } });
  const r = await call({ body: createBody() });
  assert.equal(r.statusCode, 502);
  assert.deepEqual(r.body, { error: "stripe_error" });
  assert.ok(!JSON.stringify(r.body).includes("LEAKED"));

  reply = () => new Error("ECONNRESET");
  const net = await call({ body: createBody() });
  assert.equal(net.statusCode, 502);
  assert.deepEqual(net.body, { error: "stripe_error" });

  // 200 without a client_secret is still a failure, not a half-success.
  reply = () => ({ status: 200, body: { id: "pi_3Pweird000000001" } });
  const odd = await call({ body: createBody() });
  assert.equal(odd.statusCode, 502);
});

test("create: rate-limited per IP (5/min) with 429 + Retry-After", async () => {
  reply = () => ({ status: 200, body: { id: "pi_3PrateLIMIT00001", client_secret: "cs" } });
  const ip = nextIp();
  for (let i = 0; i < 5; i++) {
    assert.equal((await call({ ip, body: createBody() })).statusCode, 200, `request ${i + 1}`);
  }
  const r = await call({ ip, body: createBody() });
  assert.equal(r.statusCode, 429);
  assert.equal(r.body.code, "rate_limited");
  assert.ok(Number(r.headers["retry-after"]) >= 1);
});

test("create: rate-limited per email across IPs (5/hour), trimmed and lowercased", async () => {
  // One address hammered from many IPs looks like card testing that reuses a
  // form fill. Every request below comes from a fresh IP.
  reply = () => ({ status: 200, body: { id: "pi_3PrateLIMIT00002", client_secret: "cs" } });
  const spellings = ["Buyer@Acme-Ltd.com", " buyer@acme-ltd.com ", "BUYER@ACME-LTD.COM", "buyer@ACME-ltd.com", "\tbuyer@acme-ltd.com\n"];
  for (const email of spellings) {
    assert.equal((await call({ body: createBody({ email }) })).statusCode, 200, JSON.stringify(email));
  }
  const r = await call({ body: createBody({ email: "buyer@acme-ltd.com" }) });
  assert.equal(r.statusCode, 429, "6th attempt for the same address within the hour is blocked");
  assert.equal(r.body.code, "rate_limited");
  assert.ok(Number(r.headers["retry-after"]) >= 1);
  assert.equal(calls.length, 5, "the blocked attempt never reached Stripe");
  // Another address is unaffected.
  assert.equal((await call({ body: createBody({ email: "someone-else@acme-ltd.com" }) })).statusCode, 200);
});

test("create: junk or unconfigured requests can't lock an address out of paying", async () => {
  // A prospect's work address is easy to know. Only requests that pass the
  // config check and validation count against the per-email bucket, so an
  // attacker can't burn it for free.
  const victim = nextEmail();
  const junk = [
    { plan: "gold" },                           // invalid field
    { entity: "us" },
    { country: "GBR" },
    { attemptId: "short" },
    { acceptedTerms: false },                   // terms not accepted
    { website: "https://spam.example" },        // honeypot
  ];
  for (const over of junk) {
    const r = await call({ body: createBody({ ...over, email: victim }) });
    assert.equal(r.statusCode, 400, JSON.stringify(over));
  }
  disable();
  for (let i = 0; i < 6; i++) {
    assert.equal((await call({ body: createBody({ email: victim }) })).statusCode, 503);
  }
  enable();
  assert.equal(calls.length, 0, "none of that reached Stripe");
  reply = () => ({ status: 200, body: { id: "pi_3PvictimOK000001", client_secret: "cs" } });
  for (let i = 0; i < 5; i++) {
    const ok = await call({ body: createBody({ email: victim }) });
    assert.equal(ok.statusCode, 200, `the real customer can still pay (attempt ${i + 1})`);
  }
});

// --- confirm -----------------------------------------------------------------

test("confirm: succeeded fee PI → {ok, token, email, country, plan, entity}, token verifies", async () => {
  reply = (url, init) => {
    assert.equal(url, "https://api.stripe.com/v1/payment_intents/" + PI_ID);
    assert.equal(init.method, "GET");
    assert.equal(init.body, undefined);
    return { status: 200, body: paidPI() };
  };
  const r = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  assert.equal(r.statusCode, 200);
  assert.equal(typeof r.body.token, "string");
  // Exactly this shape: no `company` object any more.
  assert.deepEqual(r.body, {
    ok: true, token: r.body.token,
    email: "jane@northwind.co.uk", country: "GB", plan: "pro", entity: "uk",
  });
  assert.deepEqual(verifyOpeningToken(r.body.token, TOKEN_SECRET),
    { pi: PI_ID, cc: "GB", iat: 1790000000, lm: true });
  assert.equal(calls[0].init.headers.Authorization, "Bearer " + SK);
});

test("confirm: a PI created with the old company metadata confirms with the new shape", async () => {
  // PaymentIntents made before the company fields were dropped (test mode,
  // pre-release) still carry company_name/number. They confirm as usual, and
  // neither the response nor the token repeats the company.
  const md = paidPI().metadata;
  reply = () => ({ status: 200, body: paidPI({ metadata: {
    ...md, company_name: "Northwind Trading Ltd", company_number: "sc 123.456", company_number_norm: "SC123456",
  } }) });
  const r = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(Object.keys(r.body).sort(), ["country", "email", "entity", "ok", "plan", "token"]);
  assert.ok(!JSON.stringify(r.body).includes("Northwind Trading"), "no company in the response");
  const payload = JSON.parse(Buffer.from(r.body.token.split(".")[1], "base64url").toString("utf8"));
  assert.deepEqual(payload, { pi: PI_ID, cc: "GB", iat: 1790000000, lm: true });
});

test("confirm: a fee PI with missing or malformed country metadata → 502, never a token", async () => {
  // Only reachable if someone edits the metadata by hand in the Dashboard.
  for (const company_country of [undefined, "", "gbr", "G1"]) {
    reply = () => ({ status: 200, body: paidPI({ metadata: { ...paidPI().metadata, company_country } }) });
    const r = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
    assert.equal(r.statusCode, 502, JSON.stringify(company_country));
    assert.deepEqual(r.body, { error: "stripe_error" });
  }
});

test("confirm: a test-mode PI yields a token marked lm:false that live verification refuses", async () => {
  reply = () => ({ status: 200, body: paidPI({ livemode: false }) });
  const r = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  assert.equal(r.statusCode, 200, "staging and preview keep working end to end");
  assert.equal(verifyOpeningToken(r.body.token, TOKEN_SECRET), null, "production registration rejects it");
  assert.equal(verifyOpeningToken(r.body.token, TOKEN_SECRET, { allowTestMode: true }).lm, false);
  // A PI without livemode (malformed upstream) is treated as test mode, never live.
  const { livemode, ...noMode } = paidPI();
  reply = () => ({ status: 200, body: noMode });
  const odd = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  assert.equal(verifyOpeningToken(odd.body.token, TOKEN_SECRET), null);
});

test("confirm: re-confirming the same PI yields the identical token", async () => {
  reply = () => ({ status: 200, body: paidPI() });
  const a = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  const b = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  assert.equal(a.body.token, b.body.token);
});

test("confirm: a tampered token no longer verifies", async () => {
  reply = () => ({ status: 200, body: paidPI() });
  const { body } = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  const [v, payload, sig] = body.token.split(".");
  for (const forgedPayload of [
    { pi: "pi_3PsomeoneELSE0001", cc: "GB", iat: 1790000000, lm: true },   // another payment
    { pi: PI_ID, cc: "CY", iat: 1790000000, lm: true },                    // another country
  ]) {
    const forged = Buffer.from(JSON.stringify(forgedPayload)).toString("base64url");
    assert.equal(verifyOpeningToken(`${v}.${forged}.${sig}`, TOKEN_SECRET), null);
  }
  assert.equal(verifyOpeningToken(`${v}.${payload}.${sig}`, "wrong-secret"), null);
});

test("confirm: wrong amount, currency or kind → 404 not_found (never a token)", async () => {
  const variants = [
    paidPI({ amount: 100 }),
    paidPI({ currency: "eur" }),
    paidPI({ metadata: { ...paidPI().metadata, kind: "subscription" } }),
    paidPI({ metadata: {} }),
  ];
  for (const pi of variants) {
    reply = () => ({ status: 200, body: pi });
    const r = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
    assert.equal(r.statusCode, 404);
    assert.deepEqual(r.body, { error: "not_found" });
  }
});

test("confirm: not yet succeeded → 402 not_paid with the PI status", async () => {
  for (const status of ["processing", "requires_payment_method", "requires_action", "canceled"]) {
    reply = () => ({ status: 200, body: paidPI({ status }) });
    const r = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
    assert.equal(r.statusCode, 402);
    assert.deepEqual(r.body, { error: "not_paid", status });
  }
});

test("confirm: unknown PI → 404; Stripe outage → 502 without detail", async () => {
  reply = () => ({ status: 404, body: { error: { type: "invalid_request_error", code: "resource_missing", message: "No such payment_intent" } } });
  const missing = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.body, { error: "not_found" });

  reply = () => ({ status: 500, body: { error: { message: "internal sk_live_LEAK" } } });
  const down = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  assert.equal(down.statusCode, 502);
  assert.deepEqual(down.body, { error: "stripe_error" });

  reply = () => new Error("timeout");
  assert.equal((await call({ body: { action: "confirm", paymentIntentId: PI_ID } })).statusCode, 502);
});

test("confirm: malformed id → 400 before any Stripe call", async () => {
  for (const id of ["pi_short", "ch_3PabcdEFGH12345", "pi_3Pabcd/../../v1/charges", "", 42, undefined]) {
    const r = await call({ body: { action: "confirm", paymentIntentId: id } });
    assert.equal(r.statusCode, 400, `id ${JSON.stringify(id)}`);
    assert.deepEqual(r.body, { error: "invalid_field", field: "paymentIntentId" });
  }
  assert.equal(calls.length, 0);
});

test("confirm: 503 when not configured, 403 from a foreign origin", async () => {
  disable();
  const off = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  assert.equal(off.statusCode, 503);
  assert.deepEqual(off.body, { error: "not_configured" });
  enable();
  const foreign = await call({ body: { action: "confirm", paymentIntentId: PI_ID }, origin: "https://evil.example" });
  assert.equal(foreign.statusCode, 403);
  assert.equal(calls.length, 0);
});

test("confirm: form-age gate does not apply (redirect returns confirm instantly)", async () => {
  reply = () => ({ status: 200, body: paidPI() });
  const r = await call({ body: { action: "confirm", paymentIntentId: PI_ID, formLoadedAt: Date.now() } });
  assert.equal(r.statusCode, 200);
});

test("confirm: rate-limited per IP (20/min)", async () => {
  reply = () => ({ status: 200, body: paidPI() });
  const ip = nextIp();
  for (let i = 0; i < 20; i++) {
    assert.equal((await call({ ip, body: { action: "confirm", paymentIntentId: PI_ID } })).statusCode, 200);
  }
  assert.equal((await call({ ip, body: { action: "confirm", paymentIntentId: PI_ID } })).statusCode, 429);
});

// --- promo codes -------------------------------------------------------------
// The paywall's promo field (founder decision, 2026-09-23). Codes are Stripe
// promotion codes; the server looks them up, prices the fee, and keeps one
// redemption per work email as Stripe Customer objects (the ledger). Free
// codes mint the token at create (no PaymentIntent, the Customer id is `pi`);
// partial discounts run through a discounted PaymentIntent that confirm
// accepts only when its metadata accounts for the difference.

// Routes the Stripe stub by "METHOD /path", so one test can describe the
// promo lookup, the ledger read and write, the counter and the PI at once.
function stripeRoutes(routes) {
  reply = (url, init) => {
    const u = new URL(url);
    const key = `${(init.method || "GET").toUpperCase()} ${u.pathname}`;
    const h = routes[key];
    if (!h) return { status: 500, body: { error: { type: "test", code: "unexpected_route", message: key } } };
    return h(u, init);
  };
}
const routeCalls = (key) => calls.filter((c) => `${(c.init.method || "GET").toUpperCase()} ${new URL(c.url).pathname}` === key);
const form = (c) => new URLSearchParams(c.init.body);

const PROMO_FREE = {
  id: "promo_1FREE100xyz", object: "promotion_code", active: true, code: "FREE100", livemode: true,
  expires_at: null, max_redemptions: null, times_redeemed: 0, metadata: { redemptions: "4" },
  coupon: { id: "free100", object: "coupon", percent_off: 100, amount_off: null, currency: null, valid: true, duration: "once" },
};
const PROMO_HALF = {
  ...PROMO_FREE, id: "promo_HALF0000001", code: "HALF", metadata: {},
  coupon: { id: "half", object: "coupon", percent_off: 50, amount_off: null, currency: null, valid: true, duration: "once" },
};
// The promo lookup answers with the code whose `code` matches the query.
const promoLookup = (...codes) => (u) => ({
  status: 200,
  body: { object: "list", data: codes.filter((pc) => pc.code === u.searchParams.get("code")) },
});
const CUS_ID = "cus_FreeRedeem00001";
function customer(over = {}) {
  return {
    id: CUS_ID, object: "customer", created: 1790001000, livemode: true, email: "jane@northwind.co.uk",
    description: "Account opening fee promo redemption",
    metadata: { kind: "opening_fee_promo", source: "altery-eligibility-checker", promo_code: "FREE100", promo_id: PROMO_FREE.id,
      promo_redeemed_at: "2026-09-23T10:00:00.000Z", company_country: "GB", plan: "pro", entity: "uk", lang: "en" },
    ...over,
  };
}
const ledger = (...customers) => () => ({ status: 200, body: { object: "list", data: customers } });
const HALF_PI_ID = "pi_3PdiscountHALF001";
function discountedPI(over = {}) {
  const base = paidPI();
  return {
    ...base, id: HALF_PI_ID, amount: 5000,
    metadata: { ...base.metadata, promo_code: "HALF", promo_id: PROMO_HALF.id, original_amount: "10000", discount_amount: "5000" },
    ...over,
  };
}
const promoBody = (over = {}) => ({ action: "promo", code: "FREE100", ...over });

test("promo: a valid 100% code → {valid, code, percentOff, amountOff, amount 0, display £0, free}; exact lookup query", async () => {
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_FREE) });
  const r = await call({ body: promoBody({ code: " free100 " }) });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body, { valid: true, code: "FREE100", percentOff: 100, amountOff: null, amount: 0, display: "£0", free: true });
  assert.equal(calls.length, 1, "no email given: the ledger is not read");
  const u = new URL(calls[0].url);
  assert.equal(u.pathname, "/v1/promotion_codes");
  assert.equal(u.searchParams.get("code"), "FREE100", "normalized before the lookup");
  assert.equal(u.searchParams.get("active"), "true");
  assert.equal(u.searchParams.get("limit"), "1");
  assert.equal(calls[0].init.headers.Authorization, "Bearer " + SK);
  assert.equal(r.headers["cache-control"], "no-store");
});

test("promo: a partial code prices the fee (50% → 5000 / £50, not free)", async () => {
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_HALF) });
  const r = await call({ body: promoBody({ code: "half" }) });
  assert.deepEqual(r.body, { valid: true, code: "HALF", percentOff: 50, amountOff: null, amount: 5000, display: "£50", free: false });
  const off = { ...PROMO_HALF, code: "OFF20", coupon: { id: "off20", percent_off: null, amount_off: 2000, currency: "gbp", valid: true } };
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(off) });
  const r2 = await call({ body: promoBody({ code: "OFF20" }) });
  assert.deepEqual(r2.body, { valid: true, code: "OFF20", percentOff: null, amountOff: 2000, amount: 8000, display: "£80", free: false });
  // An amount_off in another currency cannot price a GBP fee.
  const eur = { ...off, code: "EUR20", coupon: { ...off.coupon, currency: "eur" } };
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(eur) });
  assert.deepEqual((await call({ body: promoBody({ code: "EUR20" }) })).body, { valid: false, reason: "invalid" });
});

test("promo: with an email the ledger is read (GET /v1/customers?email=<normalized>) and a prior redemption → used", async () => {
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_FREE), "GET /v1/customers": ledger(customer()) });
  const used = await call({ body: promoBody({ email: " Jane@Northwind.CO.UK " }) });
  assert.equal(used.statusCode, 200);
  assert.deepEqual(used.body, { valid: false, reason: "used" });
  const reads = routeCalls("GET /v1/customers");
  assert.equal(reads.length, 1);
  const u = new URL(reads[0].url);
  assert.equal(u.searchParams.get("email"), "jane@northwind.co.uk", "trimmed + lowercased, the spelling the ledger stores");
  assert.equal(u.searchParams.get("limit"), "100");

  // Same email, another code → not used for that one.
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_FREE, PROMO_HALF), "GET /v1/customers": ledger(customer()) });
  const other = await call({ body: promoBody({ code: "HALF", email: "jane@northwind.co.uk" }) });
  assert.equal(other.body.valid, true);
  // No record → valid. A Customer that is not a redemption (plain metadata) does not count.
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_FREE), "GET /v1/customers": ledger({ id: "cus_plain", metadata: {} }) });
  assert.equal((await call({ body: promoBody({ email: "jane@northwind.co.uk" }) })).body.valid, true);
  // A malformed email is ignored (create validates it for real), not an error.
  calls = [];
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_FREE) });
  assert.equal((await call({ body: promoBody({ email: "not-an-email" }) })).body.valid, true);
  assert.equal(routeCalls("GET /v1/customers").length, 0);
});

test("promo: unknown / inactive / malformed → invalid; past expires_at or coupon.valid false → expired", async () => {
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_FREE) });
  assert.deepEqual((await call({ body: promoBody({ code: "NOPE2026" }) })).body, { valid: false, reason: "invalid" });
  for (const bad of ["ab", "free 100", "x".repeat(33), "", 42, undefined, null, "FREE100!"]) {
    calls = [];
    const r = await call({ body: promoBody({ code: bad }) });
    assert.equal(r.statusCode, 200, JSON.stringify(bad));
    assert.deepEqual(r.body, { valid: false, reason: "invalid" }, JSON.stringify(bad));
    assert.equal(calls.length, 0, `malformed ${JSON.stringify(bad)} never reaches Stripe`);
  }
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup({ ...PROMO_FREE, active: false }) });
  assert.deepEqual((await call({ body: promoBody() })).body, { valid: false, reason: "invalid" });
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup({ ...PROMO_FREE, expires_at: Math.floor(Date.now() / 1000) - 60 }) });
  assert.deepEqual((await call({ body: promoBody() })).body, { valid: false, reason: "expired" });
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup({ ...PROMO_FREE, coupon: { ...PROMO_FREE.coupon, valid: false } }) });
  assert.deepEqual((await call({ body: promoBody() })).body, { valid: false, reason: "expired" });
});

test("promo: Stripe outage → 502 stripe_error (never 'invalid'), 503 without keys, 403 foreign origin, no Stripe leak", async () => {
  reply = () => ({ status: 500, body: { error: { type: "api_error", message: "internal sk_live_LEAKED" } } });
  const down = await call({ body: promoBody() });
  assert.equal(down.statusCode, 502);
  assert.deepEqual(down.body, { error: "stripe_error" });
  reply = () => new Error("ECONNRESET");
  assert.equal((await call({ body: promoBody() })).statusCode, 502);
  // Ledger read failing is an outage too: "never redeemed" must not be guessed.
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_FREE), "GET /v1/customers": () => ({ status: 503, body: {} }) });
  assert.equal((await call({ body: promoBody({ email: "jane@northwind.co.uk" }) })).statusCode, 502);

  disable();
  const off = await call({ body: promoBody() });
  assert.equal(off.statusCode, 503);
  assert.deepEqual(off.body, { error: "not_configured" });
  enable();
  calls = [];
  const foreign = await call({ body: promoBody(), origin: "https://evil.example" });
  assert.equal(foreign.statusCode, 403);
  assert.equal(calls.length, 0);
  // Form-age gate does not apply (a pasted code is checked within seconds).
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_FREE) });
  assert.equal((await call({ body: promoBody({ formLoadedAt: Date.now() }) })).body.valid, true);
});

test("promo: rate-limited per IP (10/min) so codes can't be enumerated; 429 + Retry-After", async () => {
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_FREE) });
  const ip = nextIp();
  for (let i = 0; i < 10; i++) {
    assert.equal((await call({ ip, body: promoBody({ code: `GUESS${i}` }) })).statusCode, 200, `request ${i + 1}`);
  }
  const r = await call({ ip, body: promoBody() });
  assert.equal(r.statusCode, 429);
  assert.equal(r.body.code, "rate_limited");
  assert.ok(Number(r.headers["retry-after"]) >= 1);
});

test("create + free code: no PaymentIntent; a Customer records the redemption; token has cus_ pi + promo", async () => {
  stripeRoutes({
    "GET /v1/promotion_codes": promoLookup(PROMO_FREE),
    "GET /v1/customers": ledger(),
    "POST /v1/customers": () => ({ status: 200, body: customer() }),
    "POST /v1/promotion_codes/promo_1FREE100xyz": () => ({ status: 200, body: { ...PROMO_FREE, metadata: { redemptions: "5" } } }),
  });
  const body = createBody({ email: " Jane@Northwind.CO.UK ", country: "gb", lang: "de", promoCode: " free100 " });
  const r = await call({ body });
  assert.equal(r.statusCode, 200);
  assert.equal(typeof r.body.token, "string");
  assert.deepEqual(r.body, {
    free: true, token: r.body.token,
    email: "jane@northwind.co.uk", country: "GB", plan: "pro", entity: "uk", promo: "FREE100",
  });
  assert.deepEqual(verifyOpeningToken(r.body.token, TOKEN_SECRET),
    { pi: CUS_ID, cc: "GB", iat: 1790001000, lm: true, promo: "FREE100" });
  assert.equal(routeCalls("POST /v1/payment_intents").length, 0, "nothing to charge, so no PaymentIntent");

  const writes = routeCalls("POST /v1/customers");
  assert.equal(writes.length, 1);
  const p = form(writes[0]);
  assert.equal(p.get("email"), "jane@northwind.co.uk");
  assert.equal(p.get("description"), "Account opening fee promo redemption");
  assert.equal(p.get("metadata[kind]"), "opening_fee_promo");
  assert.equal(p.get("metadata[source]"), "altery-eligibility-checker");
  assert.equal(p.get("metadata[promo_code]"), "FREE100");
  assert.equal(p.get("metadata[promo_id]"), "promo_1FREE100xyz");
  assert.equal(p.get("metadata[company_country]"), "GB");
  assert.equal(p.get("metadata[plan]"), "pro");
  assert.equal(p.get("metadata[entity]"), "uk");
  assert.equal(p.get("metadata[lang]"), "de");
  assert.ok(Date.parse(p.get("metadata[promo_redeemed_at]")) > Date.now() - 5000, "redeemed_at is now, ISO");
  assert.equal(p.has("metadata[payment_intent]"), false);
  // One Customer per (email, code), not per click: the key is a hash of both.
  assert.match(writes[0].init.headers["Idempotency-Key"], /^opening-fee-promo-free:[0-9a-f]{64}$/);
  assert.notEqual(writes[0].init.headers["Idempotency-Key"], body.attemptId);

  const bumps = routeCalls("POST /v1/promotion_codes/promo_1FREE100xyz");
  assert.equal(bumps.length, 1, "our counter on the promotion code");
  assert.equal(form(bumps[0]).get("metadata[redemptions]"), "5", "previous value from the lookup + 1");
  // The ledger was read for this email before writing.
  assert.equal(new URL(routeCalls("GET /v1/customers")[0].url).searchParams.get("email"), "jane@northwind.co.uk");
});

test("create + free code: the same (email, code) twice → the ledger says used, nothing is written", async () => {
  stripeRoutes({
    "GET /v1/promotion_codes": promoLookup(PROMO_FREE),
    "GET /v1/customers": ledger(customer()),
    "POST /v1/customers": () => { throw new Error("must not write"); },
  });
  const r = await call({ body: createBody({ email: "jane@northwind.co.uk", promoCode: "FREE100" }) });
  assert.equal(r.statusCode, 400);
  assert.deepEqual(r.body, { error: "promo_used" });
  assert.equal(routeCalls("POST /v1/customers").length, 0);
  assert.equal(routeCalls("POST /v1/payment_intents").length, 0);
});

test("create + free code: a failed Customer write is 502 and mints no token; the counter failing is ignored", async () => {
  stripeRoutes({
    "GET /v1/promotion_codes": promoLookup(PROMO_FREE),
    "GET /v1/customers": ledger(),
    "POST /v1/customers": () => ({ status: 400, body: { error: { type: "idempotency_error", message: "Keys for idempotent requests..." } } }),
  });
  const r = await call({ body: createBody({ promoCode: "FREE100" }) });
  assert.equal(r.statusCode, 502);
  assert.deepEqual(r.body, { error: "stripe_error" });

  stripeRoutes({
    "GET /v1/promotion_codes": promoLookup(PROMO_FREE),
    "GET /v1/customers": ledger(),
    "POST /v1/customers": () => ({ status: 200, body: customer() }),
    "POST /v1/promotion_codes/promo_1FREE100xyz": () => ({ status: 500, body: {} }),
  });
  const ok = await call({ body: createBody({ promoCode: "FREE100" }) });
  assert.equal(ok.statusCode, 200, "the counter is best-effort");
  assert.equal(ok.body.free, true);
});

test("create: promo_invalid for unknown / expired / malformed codes, before any PaymentIntent; lookup outage → 502", async () => {
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup(PROMO_FREE), "GET /v1/customers": ledger() });
  for (const code of ["NOPE2026", "ab", "free 100"]) {
    calls = [];
    const r = await call({ body: createBody({ promoCode: code }) });
    assert.equal(r.statusCode, 400, code);
    assert.deepEqual(r.body, { error: "promo_invalid" }, code);
    assert.equal(routeCalls("POST /v1/payment_intents").length, 0);
  }
  stripeRoutes({ "GET /v1/promotion_codes": promoLookup({ ...PROMO_FREE, expires_at: 1 }) });
  assert.deepEqual((await call({ body: createBody({ promoCode: "FREE100" }) })).body, { error: "promo_invalid" }, "expired reads as invalid on create");
  stripeRoutes({ "GET /v1/promotion_codes": () => ({ status: 500, body: {} }) });
  const down = await call({ body: createBody({ promoCode: "FREE100" }) });
  assert.equal(down.statusCode, 502);
  assert.deepEqual(down.body, { error: "stripe_error" });
  // An empty/absent promoCode is "no code": the plain flow, unchanged.
  stripeRoutes({ "POST /v1/payment_intents": () => ({ status: 200, body: { id: "pi_3PplainNOCODE001", client_secret: "cs_plain" } }) });
  for (const none of [undefined, "", null]) {
    calls = [];
    const r = await call({ body: createBody({ promoCode: none }) });
    assert.equal(r.statusCode, 200, JSON.stringify(none));
    assert.deepEqual(r.body, { clientSecret: "cs_plain", paymentIntentId: "pi_3PplainNOCODE001" });
    assert.equal(routeCalls("GET /v1/promotion_codes").length, 0, "no lookup without a code");
  }
});

test("create + partial code: PaymentIntent for the discounted amount with promo metadata; answer carries amount + display", async () => {
  stripeRoutes({
    "GET /v1/promotion_codes": promoLookup(PROMO_HALF),
    "GET /v1/customers": ledger(),
    "POST /v1/payment_intents": () => ({ status: 200, body: { id: HALF_PI_ID, client_secret: HALF_PI_ID + "_secret_x" } }),
  });
  const body = createBody({ promoCode: "half" });
  const r = await call({ body });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body, { clientSecret: HALF_PI_ID + "_secret_x", paymentIntentId: HALF_PI_ID, amount: 5000, display: "£50" });
  const pis = routeCalls("POST /v1/payment_intents");
  assert.equal(pis.length, 1);
  assert.equal(pis[0].init.headers["Idempotency-Key"], body.attemptId, "per-click idempotency as today");
  const p = form(pis[0]);
  assert.equal(p.get("amount"), "5000");
  assert.equal(p.get("currency"), "gbp");
  assert.deepEqual(p.getAll("payment_method_types[]"), ["card"]);
  assert.equal(p.get("metadata[kind]"), "account_opening_fee");
  assert.equal(p.get("metadata[promo_code]"), "HALF");
  assert.equal(p.get("metadata[promo_id]"), "promo_HALF0000001");
  assert.equal(p.get("metadata[original_amount]"), "10000");
  assert.equal(p.get("metadata[discount_amount]"), "5000");
  assert.equal(routeCalls("POST /v1/customers").length, 0, "the ledger is written when the payment confirms, not before");
  // A client-supplied amount is still ignored with a code.
  calls = [];
  await call({ body: createBody({ promoCode: "HALF", amount: 1 }) });
  assert.equal(form(routeCalls("POST /v1/payment_intents")[0]).get("amount"), "5000");
});

test("create + partial code already redeemed by this email → promo_used, no PaymentIntent", async () => {
  stripeRoutes({
    "GET /v1/promotion_codes": promoLookup(PROMO_HALF),
    "GET /v1/customers": ledger(customer({ id: "cus_halfBefore0001", metadata: { ...customer().metadata, promo_code: "HALF", payment_intent: "pi_3PoldHALF0000001" } })),
  });
  const r = await call({ body: createBody({ email: "jane@northwind.co.uk", promoCode: "HALF" }) });
  assert.equal(r.statusCode, 400);
  assert.deepEqual(r.body, { error: "promo_used" });
  assert.equal(routeCalls("POST /v1/payment_intents").length, 0);
});

test("confirm: a discounted PI is accepted; token carries promo; the redemption is recorded once with payment_intent", async () => {
  let ledgerRows = [];
  stripeRoutes({
    ["GET /v1/payment_intents/" + HALF_PI_ID]: () => ({ status: 200, body: discountedPI() }),
    "GET /v1/customers": () => ({ status: 200, body: { object: "list", data: ledgerRows } }),
    "POST /v1/customers": (u, init) => {
      const p = new URLSearchParams(init.body);
      const row = customer({ id: "cus_halfLedger00001", metadata: Object.fromEntries([...p.entries()].filter(([k]) => k.startsWith("metadata[")).map(([k, v]) => [k.slice(9, -1), v])) });
      ledgerRows = [row];
      return { status: 200, body: row };
    },
    "GET /v1/promotion_codes/promo_HALF0000001": () => ({ status: 200, body: { ...PROMO_HALF, metadata: { redemptions: "2" } } }),
    "POST /v1/promotion_codes/promo_HALF0000001": () => ({ status: 200, body: PROMO_HALF }),
  });
  const r = await call({ body: { action: "confirm", paymentIntentId: HALF_PI_ID } });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body, {
    ok: true, token: r.body.token,
    email: "jane@northwind.co.uk", country: "GB", plan: "pro", entity: "uk", promo: "HALF",
  });
  assert.deepEqual(verifyOpeningToken(r.body.token, TOKEN_SECRET), { pi: HALF_PI_ID, cc: "GB", iat: 1790000000, lm: true, promo: "HALF" });

  const writes = routeCalls("POST /v1/customers");
  assert.equal(writes.length, 1);
  const p = form(writes[0]);
  assert.equal(p.get("email"), "jane@northwind.co.uk");
  assert.equal(p.get("metadata[kind]"), "opening_fee_promo");
  assert.equal(p.get("metadata[promo_code]"), "HALF");
  assert.equal(p.get("metadata[promo_id]"), "promo_HALF0000001");
  assert.equal(p.get("metadata[payment_intent]"), HALF_PI_ID);
  assert.equal(p.get("metadata[company_country]"), "GB");
  assert.equal(writes[0].init.headers["Idempotency-Key"], "opening-fee-promo-ledger:" + HALF_PI_ID);
  assert.equal(form(routeCalls("POST /v1/promotion_codes/promo_HALF0000001")[0]).get("metadata[redemptions]"), "3", "counter read then bumped");

  // Re-confirm (reload, redirect return, poll): same token, the record is
  // already there, so nothing is written again.
  calls = [];
  const again = await call({ body: { action: "confirm", paymentIntentId: HALF_PI_ID } });
  assert.equal(again.body.token, r.body.token);
  assert.equal(routeCalls("GET /v1/customers").length, 1, "the ledger is read");
  assert.equal(routeCalls("POST /v1/customers").length, 0, "and not written twice");
  assert.equal(routeCalls("POST /v1/promotion_codes/promo_HALF0000001").length, 0);
});

test("confirm: a ledger failure never blocks a paid customer's token", async () => {
  stripeRoutes({
    ["GET /v1/payment_intents/" + HALF_PI_ID]: () => ({ status: 200, body: discountedPI() }),
    "GET /v1/customers": () => ({ status: 500, body: {} }),
  });
  const r = await call({ body: { action: "confirm", paymentIntentId: HALF_PI_ID } });
  assert.equal(r.statusCode, 200, "read failed: token still issued, the next confirm retries the ledger");
  assert.equal(r.body.promo, "HALF");
  stripeRoutes({
    ["GET /v1/payment_intents/" + HALF_PI_ID]: () => ({ status: 200, body: discountedPI() }),
    "GET /v1/customers": ledger(),
    "POST /v1/customers": () => ({ status: 400, body: { error: { type: "idempotency_error" } } }),
  });
  assert.equal((await call({ body: { action: "confirm", paymentIntentId: HALF_PI_ID } })).statusCode, 200, "write failed: same");
});

test("confirm: a discounted PI whose metadata does not add up → 404 not_found, never a token", async () => {
  const variants = {
    "amount below original - discount": discountedPI({ amount: 4000 }),
    "amount above original - discount": discountedPI({ amount: 6000 }),
    "original_amount is not the fee": discountedPI({ amount: 4500, metadata: { ...discountedPI().metadata, original_amount: "9500" } }),
    "discount fields missing": discountedPI({ metadata: { ...paidPI().metadata, promo_code: "HALF" } }),
    "discount_amount inflated": discountedPI({ amount: 15000, metadata: { ...discountedPI().metadata, discount_amount: "-5000" } }),
    "full discount on a PI": discountedPI({ amount: 0, metadata: { ...discountedPI().metadata, discount_amount: "10000" } }),
  };
  for (const [what, pi] of Object.entries(variants)) {
    stripeRoutes({
      ["GET /v1/payment_intents/" + HALF_PI_ID]: () => ({ status: 200, body: pi }),
      "GET /v1/customers": () => { throw new Error("no ledger read for a refused PI"); },
    });
    const r = await call({ body: { action: "confirm", paymentIntentId: HALF_PI_ID } });
    assert.equal(r.statusCode, 404, what);
    assert.deepEqual(r.body, { error: "not_found" }, what);
  }
  // Unpaid discounted PI: 402 as for any fee PI.
  stripeRoutes({ ["GET /v1/payment_intents/" + HALF_PI_ID]: () => ({ status: 200, body: discountedPI({ status: "processing" }) }) });
  const unpaid = await call({ body: { action: "confirm", paymentIntentId: HALF_PI_ID } });
  assert.equal(unpaid.statusCode, 402);
  assert.equal(routeCalls("GET /v1/customers").length, 0, "no ledger write for an unpaid PI");
});

test("confirm: a full-price PI (no code) answers exactly as before, no ledger calls, no promo in the token", async () => {
  stripeRoutes({ ["GET /v1/payment_intents/" + PI_ID]: () => ({ status: 200, body: paidPI() }) });
  const r = await call({ body: { action: "confirm", paymentIntentId: PI_ID } });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(Object.keys(r.body).sort(), ["country", "email", "entity", "ok", "plan", "token"]);
  assert.deepEqual(Object.keys(verifyOpeningToken(r.body.token, TOKEN_SECRET)), ["pi", "cc", "iat", "lm"]);
  assert.equal(calls.length, 1, "one Stripe read, nothing else");
});
