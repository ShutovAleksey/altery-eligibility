// Pure building blocks of the account opening fee: constants (and their client
// mirror), validators, the Stripe form encoder / client, and the signed token
// that registration accepts as proof of payment (plus the verification snippet
// docs/OPENING-FEE.md hands to registration). The HTTP handler is covered
// separately in openingFeeApi.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { loadSandbox } from "./load.mjs";
import {
  OPENING_FEE, OPENING_FEE_KIND, isOpeningFeeConfigured, openingFeeConfigProblem,
  MIN_TOKEN_SECRET_LENGTH, isValidPaymentIntentId, normalizeEmail, validateCreatePayload,
  buildPaymentIntentParams, classifyPaymentIntent,
} from "../lib/opening-fee.js";
import { signOpeningToken, verifyOpeningToken } from "../lib/opening-fee-token.js";
import { encodeStripeForm, stripeRequest, STRIPE_API_VERSION } from "../lib/stripe.js";

const SECRET = "test-opening-secret-0123456789abcdef";

test("fee constants are the founder-approved values", () => {
  assert.deepEqual({ ...OPENING_FEE }, {
    amount: 10000, currency: "gbp", display: "£100", termsVersion: "2026-09-23",
  });
  assert.ok(Object.isFrozen(OPENING_FEE), "server constants must not be mutable at runtime");
});

test("client mirror EC_OPENING_FEE (checker-data.js) matches the server constants", () => {
  // The server is authoritative for what is charged; the client only displays
  // it. A drift would show one price and charge another.
  const w = loadSandbox();
  assert.ok(w.EC_OPENING_FEE, "checker-data.js must export EC_OPENING_FEE on window");
  for (const k of ["amount", "currency", "display", "termsVersion"]) {
    assert.equal(w.EC_OPENING_FEE[k], OPENING_FEE[k], `EC_OPENING_FEE.${k} drifted from lib/opening-fee.js`);
  }
});

test("isOpeningFeeConfigured: all three secrets required, publishable key must be pk_", () => {
  const full = { STRIPE_SECRET_KEY: "sk_test_1", STRIPE_PUBLISHABLE_KEY: "pk_test_1", OPENING_FEE_TOKEN_SECRET: "s".repeat(32) };
  assert.equal(isOpeningFeeConfigured(full), true);
  assert.equal(openingFeeConfigProblem(full), null);
  for (const k of Object.keys(full)) {
    assert.equal(isOpeningFeeConfigured({ ...full, [k]: undefined }), false, `${k} missing`);
    assert.equal(isOpeningFeeConfigured({ ...full, [k]: "   " }), false, `${k} whitespace-only`);
    assert.match(openingFeeConfigProblem({ ...full, [k]: undefined }), new RegExp(k), `${k}: the log names the variable`);
  }
  // A secret key pasted into the publishable slot would be served to browsers.
  assert.equal(isOpeningFeeConfigured({ ...full, STRIPE_PUBLISHABLE_KEY: "sk_live_oops" }), false);
  assert.equal(isOpeningFeeConfigured({}), false);
});

test("isOpeningFeeConfigured: a token secret shorter than 32 characters keeps the fee off", () => {
  // Registration trusts the HMAC alone; a short secret can be brute-forced
  // from one genuine token. The reason is logged without the value.
  assert.equal(MIN_TOKEN_SECRET_LENGTH, 32);
  const base = { STRIPE_SECRET_KEY: "sk_test_1", STRIPE_PUBLISHABLE_KEY: "pk_test_1" };
  for (const weak of ["x", "changeme", "altery2026", "s".repeat(31), "  " + "s".repeat(31) + "\n"]) {
    const env = { ...base, OPENING_FEE_TOKEN_SECRET: weak };
    assert.equal(isOpeningFeeConfigured(env), false, JSON.stringify(weak));
    const why = openingFeeConfigProblem(env);
    assert.match(why, /shorter than 32/);
    assert.ok(!why.includes(weak.trim()), "the problem text never echoes the secret");
  }
  assert.equal(isOpeningFeeConfigured({ ...base, OPENING_FEE_TOKEN_SECRET: "a".repeat(64) }), true);
});

test("isValidPaymentIntentId boundaries", () => {
  assert.equal(isValidPaymentIntentId("pi_3PabcdEFGH123456"), true);
  assert.equal(isValidPaymentIntentId("pi_short"), false);
  assert.equal(isValidPaymentIntentId("ch_3PabcdEFGH123456"), false);
  assert.equal(isValidPaymentIntentId("pi_3Pabcd/../x"), false);
  assert.equal(isValidPaymentIntentId(undefined), false);
});

test("validateCreatePayload normalizes a valid payload (email only, no company)", () => {
  const r = validateCreatePayload({
    attemptId: "att_12345678", country: " gb ", email: " Jane@Northwind.CO.UK ",
    plan: "pro", entity: "uk", acceptedTerms: true, lang: "DE",
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, {
    attemptId: "att_12345678", country: "GB",
    email: "jane@northwind.co.uk", plan: "pro", entity: "uk", lang: "de",
  });
  const odd = validateCreatePayload({
    attemptId: "att_12345678", country: "FR", email: "a@b.co",
    plan: "starter", entity: "eu", acceptedTerms: true, lang: "<x>",
  });
  assert.equal(odd.value.lang, "en", "a malformed lang falls back instead of failing a payment");
});

test("validateCreatePayload ignores company fields from an old cached client", () => {
  // Before the founder dropped them, the paywall sent companyName and
  // companyNumber. A tab or cache still running that client must be able to
  // pay, and whatever it sends (even values the old rules refused) goes
  // nowhere: not into the validated value, so never into Stripe.
  const base = {
    attemptId: "att_12345678", country: "CY", email: "a@b.co",
    plan: "pro", entity: "eu", acceptedTerms: true, lang: "en",
  };
  for (const legacy of [
    { companyName: "Kypros Ltd", companyNumber: "ΗΕ 123456" },
    { companyName: "A", companyNumber: "1" },                       // too short under the old rules
    { companyName: "Evil\u0000Co\r\nX", companyNumber: "12$4" },   // control chars / bad charset
    { companyName: 42, companyNumber: null },
  ]) {
    const r = validateCreatePayload({ ...base, ...legacy });
    assert.equal(r.ok, true, JSON.stringify(legacy));
    assert.deepEqual(Object.keys(r.value).sort(), ["attemptId", "country", "email", "entity", "lang", "plan"]);
  }
});

test("validateCreatePayload: field order and error shape", () => {
  const good = {
    attemptId: "att_12345678", country: "GB", email: "a@b.co",
    plan: "pro", entity: "uk", acceptedTerms: true,
  };
  // One field per answer, checked in a fixed order: attemptId, country, email,
  // plan, entity, then the terms checkbox.
  assert.deepEqual(validateCreatePayload({}), { ok: false, error: "invalid_field", field: "attemptId" });
  assert.deepEqual(validateCreatePayload(null), { ok: false, error: "invalid_field", field: "attemptId" });
  assert.deepEqual(validateCreatePayload({ ...good, country: "GBR", email: "x" }),
    { ok: false, error: "invalid_field", field: "country" });
  assert.deepEqual(validateCreatePayload({ ...good, email: "x", plan: "gold" }),
    { ok: false, error: "invalid_field", field: "email" });
  assert.deepEqual(validateCreatePayload({ ...good, plan: "gold", entity: "us" }),
    { ok: false, error: "invalid_field", field: "plan" });
  assert.deepEqual(validateCreatePayload({ ...good, entity: "us" }),
    { ok: false, error: "invalid_field", field: "entity" });
  // A bad field wins over the missing checkbox, so the client can point at it.
  assert.deepEqual(validateCreatePayload({ ...good, email: "x", acceptedTerms: false }),
    { ok: false, error: "invalid_field", field: "email" });
  assert.deepEqual(validateCreatePayload({ ...good, acceptedTerms: "true" }),
    { ok: false, error: "terms_not_accepted" });
});

test("buildPaymentIntentParams: fixed amount, card type, automatic capture, email-only metadata", () => {
  const v = validateCreatePayload({
    attemptId: "att_12345678", companyName: "Acme Ltd", companyNumber: "12-34",
    country: "GB", email: "a@acme.com", plan: "ultra", entity: "mena", acceptedTerms: true, lang: "en",
  }).value;
  const p = buildPaymentIntentParams(v, new Date("2026-09-23T10:00:00Z"));
  assert.equal(p.amount, 10000);
  assert.equal(p.currency, "gbp");
  // Apple Pay and Google Pay are card wallets: they need no method type of
  // their own, and the list stays pinned so nothing else can join the charge.
  assert.deepEqual(p.payment_method_types, ["card"]);
  assert.equal(p.capture_method, "automatic");
  assert.equal(p.description, "Altery account opening fee");
  assert.equal(p.receipt_email, "a@acme.com");
  // Exactly these keys: no company name/number (registration binds the company).
  assert.deepEqual(p.metadata, {
    kind: OPENING_FEE_KIND, source: "altery-eligibility-checker",
    email: "a@acme.com", company_country: "GB", plan: "ultra", entity: "mena", lang: "en",
    terms_version: "2026-09-23", terms_accepted_at: "2026-09-23T10:00:00.000Z",
  });
});

test("normalizeEmail: one spelling per address (trimmed, lowercased), junk → null", () => {
  assert.equal(normalizeEmail(" Jane@Northwind.CO.UK "), "jane@northwind.co.uk");
  for (const bad of ["no-at", "a@b", "a b@c.com", "a@b..com", "x".repeat(250) + "@a.com", "", null, undefined, 42]) {
    assert.equal(normalizeEmail(bad), null, JSON.stringify(bad));
  }
});

test("buildPaymentIntentParams with a partial-discount code: discounted amount + promo metadata", () => {
  const v = validateCreatePayload({
    attemptId: "att_12345678", country: "GB", email: "a@acme.com", plan: "pro", entity: "uk", acceptedTerms: true, lang: "en",
  }).value;
  const p = buildPaymentIntentParams(v, new Date("2026-09-23T10:00:00Z"), { code: "HALF", promoId: "promo_HALF0000001", amount: 5000 });
  assert.equal(p.amount, 5000, "the PI is created for what is actually charged");
  assert.equal(p.currency, "gbp");
  assert.deepEqual(p.payment_method_types, ["card"]);
  assert.equal(p.metadata.promo_code, "HALF");
  assert.equal(p.metadata.promo_id, "promo_HALF0000001");
  assert.equal(p.metadata.original_amount, 10000);
  assert.equal(p.metadata.discount_amount, 5000);
  assert.equal(p.metadata.kind, OPENING_FEE_KIND, "still our kind: confirm keys on it");
  // Without a code the params are exactly what they were.
  const plain = buildPaymentIntentParams(v, new Date("2026-09-23T10:00:00Z"));
  assert.equal(plain.amount, 10000);
  assert.deepEqual(Object.keys(plain.metadata).sort(), ["company_country", "email", "entity", "kind", "lang", "plan", "source", "terms_accepted_at", "terms_version"]);
  assert.deepEqual(buildPaymentIntentParams(v, new Date("2026-09-23T10:00:00Z"), null), plain);
});

test("classifyPaymentIntent: a discounted PI is ours only when its metadata accounts for the whole difference", () => {
  const md = { kind: OPENING_FEE_KIND, promo_code: "HALF", original_amount: "10000", discount_amount: "5000" };
  const ok = { status: "succeeded", amount: 5000, currency: "gbp", metadata: md };
  assert.deepEqual(classifyPaymentIntent(ok), { ok: true });
  // Numbers instead of strings (a test stub, or a future API version) work too.
  assert.deepEqual(classifyPaymentIntent({ ...ok, metadata: { ...md, original_amount: 10000, discount_amount: 5000 } }), { ok: true });
  const cases = {
    "amount not equal to original - discount": { ...ok, amount: 4000 },
    "original is not the fee": { ...ok, metadata: { ...md, original_amount: "9000" }, amount: 4000 },
    "discount missing": { ...ok, metadata: { kind: OPENING_FEE_KIND, promo_code: "HALF", original_amount: "10000" } },
    "original missing": { ...ok, metadata: { kind: OPENING_FEE_KIND, promo_code: "HALF", discount_amount: "5000" } },
    "discount not an integer": { ...ok, metadata: { ...md, discount_amount: "50.5" }, amount: 9949.5 },
    "discount swallows the whole fee": { ...ok, metadata: { ...md, discount_amount: "10000" }, amount: 0 },
    "negative discount inflates the charge": { ...ok, metadata: { ...md, discount_amount: "-5000" }, amount: 15000 },
    "discount typed on a full-price PI": { ...ok, metadata: { ...md, discount_amount: "0" }, amount: 5000 },
    "another kind": { ...ok, metadata: { ...md, kind: "subscription" } },
    "another currency": { ...ok, currency: "eur" },
  };
  for (const [what, pi] of Object.entries(cases)) {
    assert.equal(classifyPaymentIntent(pi).status, 404, what);
  }
  // A promo_code with a zero discount is a full-price fee and passes as one.
  assert.deepEqual(classifyPaymentIntent({ ...ok, amount: 10000, metadata: { ...md, discount_amount: "0" } }), { ok: true });
  // Without promo_code the discount fields mean nothing: the amount must be the fee.
  assert.equal(classifyPaymentIntent({ ...ok, metadata: { kind: OPENING_FEE_KIND, original_amount: "10000", discount_amount: "5000" } }).status, 404);
  const unpaid = classifyPaymentIntent({ ...ok, status: "requires_payment_method" });
  assert.equal(unpaid.status, 402);
});

test("classifyPaymentIntent: foreign / mismatched PIs are not_found, unpaid is 402", () => {
  const ok = { status: "succeeded", amount: 10000, currency: "gbp", metadata: { kind: OPENING_FEE_KIND } };
  assert.deepEqual(classifyPaymentIntent(ok), { ok: true });
  assert.equal(classifyPaymentIntent({ ...ok, amount: 100 }).status, 404);
  assert.equal(classifyPaymentIntent({ ...ok, currency: "eur" }).status, 404);
  assert.equal(classifyPaymentIntent({ ...ok, metadata: { kind: "other" } }).status, 404);
  assert.equal(classifyPaymentIntent({ ...ok, metadata: undefined }).status, 404);
  assert.equal(classifyPaymentIntent(null).status, 404);
  const unpaid = classifyPaymentIntent({ ...ok, status: "processing" });
  assert.equal(unpaid.status, 402);
  assert.equal(unpaid.piStatus, "processing");
});

test("encodeStripeForm: bracketed nesting Stripe expects", () => {
  const qs = new URLSearchParams(encodeStripeForm({
    amount: 10000,
    payment_method_types: ["card"],
    metadata: { kind: "account_opening_fee", email: "a+b&c@x.co" },
    items: [{ price: "p1" }],
    flag: true,
    skipped: undefined,
    nulled: null,
  }));
  assert.equal(qs.get("amount"), "10000");
  assert.deepEqual(qs.getAll("payment_method_types[]"), ["card"]);
  assert.equal(qs.get("metadata[kind]"), "account_opening_fee");
  assert.equal(qs.get("metadata[email]"), "a+b&c@x.co", "values survive URL encoding");
  assert.equal(qs.get("items[0][price]"), "p1");
  assert.equal(qs.get("flag"), "true");
  assert.equal(qs.has("skipped"), false);
  assert.equal(qs.has("nulled"), false);
});

test("stripeRequest: auth + version + idempotency headers, form body, never throws", async (t) => {
  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });

  let seen;
  globalThis.fetch = async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify({ id: "pi_x" }), { status: 200 });
  };
  const r = await stripeRequest("POST", "/v1/payment_intents", {
    secretKey: "sk_test_abc", params: { amount: 1 }, idempotencyKey: "att_12345678",
  });
  assert.deepEqual(r, { ok: true, status: 200, json: { id: "pi_x" } });
  assert.equal(seen.url, "https://api.stripe.com/v1/payment_intents");
  assert.equal(seen.init.headers.Authorization, "Bearer sk_test_abc");
  assert.equal(seen.init.headers["Stripe-Version"], STRIPE_API_VERSION);
  assert.equal(seen.init.headers["Idempotency-Key"], "att_12345678");
  assert.equal(seen.init.headers["Content-Type"], "application/x-www-form-urlencoded");
  assert.equal(seen.init.body, "amount=1");

  globalThis.fetch = async () => { throw new Error("ECONNRESET"); };
  assert.deepEqual(await stripeRequest("GET", "/v1/payment_intents/pi_x", { secretKey: "sk" }),
    { ok: false, status: 0, json: null });

  // Timeout: a hung upstream is aborted and reported like a network failure.
  globalThis.fetch = (url, init) => new Promise((_, reject) => {
    init.signal.addEventListener("abort", () => reject(new Error("aborted")));
  });
  assert.deepEqual(await stripeRequest("GET", "/v1/payment_intents/pi_x", { secretKey: "sk", timeoutMs: 20 }),
    { ok: false, status: 0, json: null });
});

const PAYLOAD = { pi: "pi_3PabcdEFGH123456", cc: "GB", iat: 1790000000, lm: true };

test("opening token: a Stripe test-mode payment never verifies as a live one", () => {
  // Test cards are free: a staging/preview deploy holding the production
  // secret must not be able to mint tokens production registration accepts.
  const testTok = signOpeningToken({ ...PAYLOAD, lm: false }, SECRET);
  assert.equal(verifyOpeningToken(testTok, SECRET), null, "rejected by default");
  assert.deepEqual(verifyOpeningToken(testTok, SECRET, { allowTestMode: true }), { ...PAYLOAD, lm: false });
  // The mode is signed: relabelling a test token as live breaks the signature.
  const [v, body, sig] = testTok.split(".");
  const flipped = Buffer.from(JSON.stringify({ ...PAYLOAD, lm: true })).toString("base64url");
  assert.notEqual(flipped, body);
  assert.equal(verifyOpeningToken(`${v}.${flipped}.${sig}`, SECRET, { allowTestMode: true }), null);
  // A live token passes either way.
  const liveTok = signOpeningToken(PAYLOAD, SECRET);
  assert.deepEqual(verifyOpeningToken(liveTok, SECRET, { allowTestMode: true }), PAYLOAD);
});

test("opening token: v1.<payload>.<sig>, payload is exactly {pi, cc, iat, lm}, round-trips, deterministic", () => {
  const tok = signOpeningToken(PAYLOAD, SECRET);
  const parts = tok.split(".");
  assert.equal(parts.length, 3);
  assert.equal(parts[0], "v1");
  const decoded = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  assert.deepEqual(decoded, PAYLOAD);
  assert.deepEqual(Object.keys(decoded), ["pi", "cc", "iat", "lm"], "fixed key order, no company number");
  assert.deepEqual(verifyOpeningToken(tok, SECRET), PAYLOAD);
  assert.equal(signOpeningToken({ ...PAYLOAD }, SECRET), tok, "same PI must always yield the same token");
  // A stray field from a caller (an old `cn`, anything) is never signed.
  assert.equal(signOpeningToken({ ...PAYLOAD, cn: "SC123456", extra: 1 }, SECRET), tok);
});

test("opening token: tampering, wrong secret and garbage all verify to null", () => {
  const tok = signOpeningToken(PAYLOAD, SECRET);
  const [v, body, sig] = tok.split(".");

  for (const [what, forged] of [
    ["swapped payment", { ...PAYLOAD, pi: "pi_3PotherPAYMENT999" }],
    ["swapped country", { ...PAYLOAD, cc: "CY" }],
    ["re-added company", { ...PAYLOAD, cn: "SC123456" }],
  ]) {
    const forgedBody = Buffer.from(JSON.stringify(forged)).toString("base64url");
    assert.equal(verifyOpeningToken(`${v}.${forgedBody}.${sig}`, SECRET), null, what);
  }
  const flipped = sig.slice(0, -2) + (sig.at(-2) === "A" ? "B" : "A") + sig.at(-1);
  assert.equal(verifyOpeningToken(`${v}.${body}.${flipped}`, SECRET), null, "altered signature");
  assert.equal(verifyOpeningToken(`v2.${body}.${sig}`, SECRET), null, "unknown version");
  assert.equal(verifyOpeningToken(tok, "another-secret"), null, "wrong secret");
  assert.equal(verifyOpeningToken(tok, ""), null, "no secret");
  for (const junk of [null, undefined, 42, "", "v1", "v1..", "a.b.c", `${tok}.x`, "v1." + "A".repeat(2000) + ".x"]) {
    assert.equal(verifyOpeningToken(junk, SECRET), null, `junk ${String(junk).slice(0, 20)}`);
  }
  // Authentic signature over a payload that is not a valid shape → still null.
  const badShape = Buffer.from(JSON.stringify({ pi: "nope" })).toString("base64url");
  const badSig = crypto.createHmac("sha256", SECRET).update("v1." + badShape).digest("base64url");
  assert.equal(verifyOpeningToken(`v1.${badShape}.${badSig}`, SECRET), null);
});

test("signOpeningToken refuses a missing secret or malformed payload", () => {
  assert.throws(() => signOpeningToken(PAYLOAD, ""));
  assert.throws(() => signOpeningToken({ ...PAYLOAD, cc: "gbr" }, SECRET));
  assert.throws(() => signOpeningToken({ ...PAYLOAD, cc: undefined }, SECRET), "the country is mandatory");
  assert.throws(() => signOpeningToken({ ...PAYLOAD, iat: NaN }, SECRET));
  assert.throws(() => signOpeningToken({ ...PAYLOAD, pi: "ch_123456789" }, SECRET));
  assert.throws(() => signOpeningToken({ ...PAYLOAD, lm: undefined }, SECRET), "the mode is mandatory");
  assert.throws(() => signOpeningToken({ ...PAYLOAD, lm: "true" }, SECRET));
  assert.throws(() => signOpeningToken({ ...PAYLOAD, promo: "free 100" }, SECRET), "a code outside the alphabet");
  assert.throws(() => signOpeningToken({ ...PAYLOAD, promo: 100 }, SECRET), "a code must be a string");
});

// Promo codes (2026-09-23): a free redemption has no PaymentIntent, so its
// Stripe Customer id stands in for `pi`; any token minted with a code carries
// it as `promo`. Tokens without a code keep the exact four-field payload.
const FREE_PAYLOAD = { pi: "cus_FreeRedeem00001", cc: "GB", iat: 1790001000, lm: true, promo: "FREE100" };

test("opening token: `promo` rides in the payload only when a code was used; a cus_ id is accepted as pi", () => {
  const free = signOpeningToken(FREE_PAYLOAD, SECRET);
  const decoded = JSON.parse(Buffer.from(free.split(".")[1], "base64url").toString("utf8"));
  assert.deepEqual(decoded, FREE_PAYLOAD);
  assert.deepEqual(Object.keys(decoded), ["pi", "cc", "iat", "lm", "promo"], "fixed key order, promo last");
  assert.deepEqual(verifyOpeningToken(free, SECRET), FREE_PAYLOAD);
  assert.equal(signOpeningToken({ ...FREE_PAYLOAD }, SECRET), free, "deterministic per redemption");

  // A discounted payment: pi_ plus the code.
  const half = signOpeningToken({ ...PAYLOAD, promo: "HALF" }, SECRET);
  assert.deepEqual(verifyOpeningToken(half, SECRET), { ...PAYLOAD, promo: "HALF" });
  assert.notEqual(half, signOpeningToken(PAYLOAD, SECRET), "the code is signed");

  // No code: byte-identical to before promo codes existed, and the verified
  // payload has no promo key at all (not even undefined).
  const plain = signOpeningToken({ ...PAYLOAD, promo: null }, SECRET);
  assert.equal(plain, signOpeningToken(PAYLOAD, SECRET));
  assert.equal(signOpeningToken({ ...PAYLOAD, promo: "" }, SECRET), plain);
  assert.deepEqual(Object.keys(verifyOpeningToken(plain, SECRET)), ["pi", "cc", "iat", "lm"]);

  // A cus_ id is only valid in the same shape as a pi_ id.
  assert.throws(() => signOpeningToken({ ...FREE_PAYLOAD, pi: "cus_short" }, SECRET));
  assert.throws(() => signOpeningToken({ ...FREE_PAYLOAD, pi: "promo_1FREE100xyz" }, SECRET), "a promotion code id is never a payment");
  // Test-mode rule is unchanged for free redemptions.
  const testFree = signOpeningToken({ ...FREE_PAYLOAD, lm: false }, SECRET);
  assert.equal(verifyOpeningToken(testFree, SECRET), null);
  assert.deepEqual(verifyOpeningToken(testFree, SECRET, { allowTestMode: true }), { ...FREE_PAYLOAD, lm: false });
  // Authentic signature over a malformed promo → null.
  const badPromo = Buffer.from(JSON.stringify({ ...PAYLOAD, promo: "free 100" })).toString("base64url");
  const badSig = crypto.createHmac("sha256", SECRET).update("v1." + badPromo).digest("base64url");
  assert.equal(verifyOpeningToken(`v1.${badPromo}.${badSig}`, SECRET), null);
  const nullPromo = Buffer.from(JSON.stringify({ ...PAYLOAD, promo: null })).toString("base64url");
  const nullSig = crypto.createHmac("sha256", SECRET).update("v1." + nullPromo).digest("base64url");
  assert.equal(verifyOpeningToken(`v1.${nullPromo}.${nullSig}`, SECRET), null, "promo must be absent or a string");
});

// docs/OPENING-FEE.md gives registration a self-contained Node verifier to
// copy. Run that exact block against tokens from lib/opening-fee-token.js, so
// the snippet can't drift from what we issue. The block is the first ```js
// fence after the marker comment in the doc.
async function loadDocVerifier() {
  const md = fs.readFileSync(new URL("../docs/OPENING-FEE.md", import.meta.url), "utf8");
  const marker = md.indexOf("<!-- verify-snippet:");
  assert.ok(marker >= 0, "docs/OPENING-FEE.md must keep the verify-snippet marker");
  const m = /```js\n([\s\S]*?)```/.exec(md.slice(marker));
  assert.ok(m, "a ```js block follows the marker");
  return import("data:text/javascript;base64," + Buffer.from(m[1], "utf8").toString("base64"));
}

test("docs snippet for registration verifies real tokens exactly like lib/opening-fee-token.js", async () => {
  const doc = await loadDocVerifier();
  assert.equal(typeof doc.verifyOpeningToken, "function", "the snippet exports verifyOpeningToken");

  const live = signOpeningToken(PAYLOAD, SECRET);
  const testMode = signOpeningToken({ ...PAYLOAD, lm: false }, SECRET);
  assert.deepEqual(doc.verifyOpeningToken(live, SECRET), PAYLOAD);
  assert.equal(doc.verifyOpeningToken(testMode, SECRET), null, "production refuses a test-mode payment");
  assert.deepEqual(doc.verifyOpeningToken(testMode, SECRET, { allowTestMode: true }), { ...PAYLOAD, lm: false });

  const [v, body, sig] = live.split(".");
  const forged = Buffer.from(JSON.stringify({ ...PAYLOAD, pi: "pi_3PotherPAYMENT999" })).toString("base64url");
  const badShape = Buffer.from(JSON.stringify({ pi: "nope", cc: "GB", iat: 1, lm: true })).toString("base64url");
  const badShapeSig = crypto.createHmac("sha256", SECRET).update("v1." + badShape).digest("base64url");
  // Promo-code tokens: free (cus_ + promo), discounted (pi_ + promo), and
  // authentic signatures over a bad promo shape.
  const free = signOpeningToken(FREE_PAYLOAD, SECRET);
  const half = signOpeningToken({ ...PAYLOAD, promo: "HALF" }, SECRET);
  const badPromo = Buffer.from(JSON.stringify({ ...PAYLOAD, promo: "free 100" })).toString("base64url");
  const badPromoSig = crypto.createHmac("sha256", SECRET).update("v1." + badPromo).digest("base64url");
  const nullPromo = Buffer.from(JSON.stringify({ ...PAYLOAD, promo: null })).toString("base64url");
  const nullPromoSig = crypto.createHmac("sha256", SECRET).update("v1." + nullPromo).digest("base64url");
  const cases = [
    live, testMode, `${v}.${forged}.${sig}`, `v2.${body}.${sig}`, `${v}.${body}.${sig}x`,
    `v1.${badShape}.${badShapeSig}`, "", "v1..", "a.b.c", `${live}.x`, null, undefined, 42,
    "v1." + "A".repeat(2000) + ".x",
    free, half, signOpeningToken({ ...FREE_PAYLOAD, lm: false }, SECRET),
    `v1.${badPromo}.${badPromoSig}`, `v1.${nullPromo}.${nullPromoSig}`,
  ];
  assert.deepEqual(doc.verifyOpeningToken(free, SECRET), FREE_PAYLOAD, "the snippet returns promo and accepts cus_");
  assert.deepEqual(Object.keys(doc.verifyOpeningToken(live, SECRET)), ["pi", "cc", "iat", "lm"], "no promo key without a code");
  for (const tok of cases) {
    for (const opts of [undefined, { allowTestMode: true }]) {
      assert.deepEqual(doc.verifyOpeningToken(tok, SECRET, opts), verifyOpeningToken(tok, SECRET, opts),
        `doc and lib disagree on ${String(tok).slice(0, 24)} ${JSON.stringify(opts)}`);
    }
  }
  assert.equal(doc.verifyOpeningToken(live, "another-secret"), null, "wrong secret");
});
