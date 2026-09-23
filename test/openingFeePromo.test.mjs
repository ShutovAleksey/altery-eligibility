// lib/opening-fee-promo.js: promo codes on the opening fee. The pure pieces
// (code shape, classification of Stripe's promotion_code object, discount
// maths, GBP display) and the Stripe calls with global fetch stubbed, checking
// the exact requests: the redemption ledger is Stripe Customer objects, so the
// request shapes ARE the data model. The handler that puts them together is
// covered in openingFeeApi.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROMO_CODE_RE, PROMO_LEDGER_KIND, PROMO_LEDGER_DESCRIPTION, STRIPE_MIN_GBP,
  normalizeCode, classifyPromotionCode, lookupPromotion, applyDiscount, formatGbp,
  isRedemptionOf, findRedemption, buildRedemptionParams, recordRedemption,
  freeRedemptionIdempotencyKey, ledgerIdempotencyKey, bumpPromoCounter,
} from "../lib/opening-fee-promo.js";
import { OPENING_FEE } from "../lib/opening-fee.js";

const SK = "sk_test_promo_secret";
const NOW = Date.parse("2026-09-23T12:00:00Z");

function promotionCode(over = {}) {
  return {
    id: "promo_1FREE100xyz", object: "promotion_code", active: true, code: "FREE100", livemode: true,
    created: 1790000000, expires_at: null, max_redemptions: null, times_redeemed: 0, metadata: {},
    coupon: { id: "free100", object: "coupon", percent_off: 100, amount_off: null, currency: null, valid: true, duration: "once" },
    ...over,
  };
}

// Stub Stripe for one test; returns the recorded calls.
function withStripe(t, handler) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const r = await handler(String(url), init);
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
  };
  t.after(() => { globalThis.fetch = real; });
  return calls;
}

// --- pure ----------------------------------------------------------------------

test("normalizeCode: trimmed + uppercased, alphabet [A-Z0-9_-]{3,32}, else null", () => {
  assert.equal(normalizeCode(" free100 "), "FREE100");
  assert.equal(normalizeCode("welcome_2026-b"), "WELCOME_2026-B");
  assert.equal(normalizeCode("ab"), null, "too short");
  assert.equal(normalizeCode("x".repeat(33)), null, "too long");
  assert.equal(normalizeCode("x".repeat(32)), "X".repeat(32));
  assert.equal(normalizeCode("FR EE"), null, "space");
  assert.equal(normalizeCode("promo!"), null, "punctuation");
  assert.equal(normalizeCode("FREE100\n"), "FREE100", "trailing newline is trimmed");
  for (const junk of [42, null, undefined, {}, ["FREE100"], ""]) assert.equal(normalizeCode(junk), null, String(junk));
  assert.ok(PROMO_CODE_RE.test("FREE100") && !PROMO_CODE_RE.test("free100"), "the regex itself is uppercase-only");
});

test("classifyPromotionCode: none / inactive / other code / no coupon / no discount → invalid", () => {
  assert.deepEqual(classifyPromotionCode(undefined, "FREE100", NOW), { status: "invalid" });
  assert.deepEqual(classifyPromotionCode(null, "FREE100", NOW), { status: "invalid" });
  assert.deepEqual(classifyPromotionCode(promotionCode({ active: false }), "FREE100", NOW), { status: "invalid" });
  assert.deepEqual(classifyPromotionCode(promotionCode({ code: "OTHER" }), "FREE100", NOW), { status: "invalid" });
  assert.deepEqual(classifyPromotionCode(promotionCode({ coupon: null }), "FREE100", NOW), { status: "invalid" });
  const noDiscount = promotionCode({ coupon: { id: "c", percent_off: null, amount_off: null, currency: null, valid: true } });
  assert.deepEqual(classifyPromotionCode(noDiscount, "FREE100", NOW), { status: "invalid" });
});

test("classifyPromotionCode: expires_at in the past or coupon.valid false → expired; future expiry is fine", () => {
  const nowS = Math.floor(NOW / 1000);
  assert.deepEqual(classifyPromotionCode(promotionCode({ expires_at: nowS - 1 }), "FREE100", NOW), { status: "expired" });
  assert.deepEqual(classifyPromotionCode(promotionCode({ expires_at: nowS }), "FREE100", NOW), { status: "expired" }, "expiring this very second counts as expired");
  assert.equal(classifyPromotionCode(promotionCode({ expires_at: nowS + 3600 }), "FREE100", NOW).status, "ok");
  const spent = promotionCode({ coupon: { ...promotionCode().coupon, valid: false } });
  assert.deepEqual(classifyPromotionCode(spent, "FREE100", NOW), { status: "expired" });
});

test("classifyPromotionCode: ok → canonical code, ids, discount fields and our redemptions counter", () => {
  const r = classifyPromotionCode(promotionCode({ code: "free100", metadata: { redemptions: "4" } }), "FREE100", NOW);
  assert.deepEqual(r, {
    status: "ok", promoId: "promo_1FREE100xyz", code: "FREE100", couponId: "free100",
    percentOff: 100, amountOff: null, currency: null, redemptions: 4,
  });
  const amt = classifyPromotionCode(promotionCode({
    coupon: { id: "off20", percent_off: null, amount_off: 2000, currency: "GBP", valid: true },
  }), "FREE100", NOW);
  assert.equal(amt.percentOff, null);
  assert.equal(amt.amountOff, 2000);
  assert.equal(amt.currency, "gbp", "currency lowercased");
  // Counter: junk or missing reads as 0.
  assert.equal(classifyPromotionCode(promotionCode({ metadata: { redemptions: "x" } }), "FREE100", NOW).redemptions, 0);
  assert.equal(classifyPromotionCode(promotionCode({ metadata: { redemptions: "-3" } }), "FREE100", NOW).redemptions, 0);
  assert.equal(classifyPromotionCode(promotionCode({ metadata: undefined }), "FREE100", NOW).redemptions, 0);
});

test("applyDiscount: percent and amount_off in GBP, rounding, Stripe's 30p floor → free", () => {
  const fee = OPENING_FEE.amount;
  assert.equal(STRIPE_MIN_GBP, 30);
  assert.deepEqual(applyDiscount(fee, { percentOff: 100 }), { amount: 0, free: true, discount: 10000 });
  assert.deepEqual(applyDiscount(fee, { percentOff: 50 }), { amount: 5000, free: false, discount: 5000 });
  assert.deepEqual(applyDiscount(fee, { percentOff: 12.5 }), { amount: 8750, free: false, discount: 1250 });
  assert.equal(applyDiscount(fee, { percentOff: 33.33 }).amount, 6667, "rounded to whole pence");
  assert.deepEqual(applyDiscount(fee, { amountOff: 2000, currency: "gbp" }), { amount: 8000, free: false, discount: 2000 });
  // Below Stripe's minimum nothing can be charged: reported as free, amount 0.
  assert.deepEqual(applyDiscount(fee, { percentOff: 99.9 }), { amount: 0, free: true, discount: 10000 });
  assert.deepEqual(applyDiscount(fee, { amountOff: 9980, currency: "gbp" }), { amount: 0, free: true, discount: 10000 });
  assert.deepEqual(applyDiscount(fee, { amountOff: 9970, currency: "gbp" }), { amount: 30, free: false, discount: 9970 }, "exactly 30p is chargeable");
  assert.deepEqual(applyDiscount(fee, { amountOff: 20000, currency: "gbp" }), { amount: 0, free: true, discount: 10000 }, "never negative");
  // Coupons that cannot price a GBP fee.
  assert.equal(applyDiscount(fee, { amountOff: 2000, currency: "eur" }), null, "foreign currency");
  assert.equal(applyDiscount(fee, { amountOff: 2000, currency: null }), null, "amount_off without a currency");
  assert.equal(applyDiscount(fee, { percentOff: 150 }), null);
  assert.equal(applyDiscount(fee, { percentOff: -5 }), null);
  assert.equal(applyDiscount(fee, { amountOff: -1, currency: "gbp" }), null);
  assert.equal(applyDiscount(fee, { percentOff: null, amountOff: null }), null);
  assert.equal(applyDiscount(fee, null), null);
  assert.equal(applyDiscount(100.5, { percentOff: 50 }), null, "amount must be integer pence");
  // percent wins when both are present (Stripe never sets both).
  assert.equal(applyDiscount(fee, { percentOff: 50, amountOff: 100, currency: "gbp" }).amount, 5000);
});

test("formatGbp: £0, £50, £12.50 (same shape as OPENING_FEE.display)", () => {
  assert.equal(formatGbp(0), "£0");
  assert.equal(formatGbp(5000), "£50");
  assert.equal(formatGbp(1250), "£12.50");
  assert.equal(formatGbp(10000), OPENING_FEE.display);
  assert.equal(formatGbp(5), "£0.05");
  assert.equal(formatGbp(-100), "£0", "never negative");
  assert.equal(formatGbp("abc"), "£0");
  assert.equal(formatGbp(1250.4), "£12.50");
});

test("isRedemptionOf: kind + promo_code on a Customer's metadata", () => {
  const cust = { id: "cus_1", metadata: { kind: PROMO_LEDGER_KIND, promo_code: "FREE100" } };
  assert.equal(isRedemptionOf(cust, "FREE100"), true);
  assert.equal(isRedemptionOf(cust, "HALF"), false);
  assert.equal(isRedemptionOf({ id: "cus_2", metadata: { kind: "other", promo_code: "FREE100" } }, "FREE100"), false);
  assert.equal(isRedemptionOf({ id: "cus_3" }, "FREE100"), false);
  assert.equal(isRedemptionOf(null, "FREE100"), false);
});

test("buildRedemptionParams: email + description + the whole record in metadata; payment_intent only when given", () => {
  const v = { email: "jane@northwind.co.uk", code: "FREE100", promoId: "promo_1FREE100xyz", country: "GB", plan: "pro", entity: "uk", lang: "de" };
  const p = buildRedemptionParams(v, new Date("2026-09-23T10:00:00Z"));
  assert.deepEqual(p, {
    email: "jane@northwind.co.uk",
    description: PROMO_LEDGER_DESCRIPTION,
    metadata: {
      kind: "opening_fee_promo", source: "altery-eligibility-checker",
      promo_code: "FREE100", promo_id: "promo_1FREE100xyz", promo_redeemed_at: "2026-09-23T10:00:00.000Z",
      company_country: "GB", plan: "pro", entity: "uk", lang: "de",
    },
  });
  assert.equal(PROMO_LEDGER_DESCRIPTION, "Account opening fee promo redemption");
  const paid = buildRedemptionParams({ ...v, paymentIntentId: "pi_3PdiscountHALF001" });
  assert.equal(paid.metadata.payment_intent, "pi_3PdiscountHALF001");
});

test("idempotency keys: deterministic per (email, code) / per PaymentIntent, and carry no address", () => {
  const a = freeRedemptionIdempotencyKey("jane@northwind.co.uk", "FREE100");
  assert.equal(a, freeRedemptionIdempotencyKey("jane@northwind.co.uk", "FREE100"));
  assert.notEqual(a, freeRedemptionIdempotencyKey("john@northwind.co.uk", "FREE100"));
  assert.notEqual(a, freeRedemptionIdempotencyKey("jane@northwind.co.uk", "HALF"));
  assert.match(a, /^opening-fee-promo-free:[0-9a-f]{64}$/);
  assert.ok(!a.includes("jane") && !a.includes("northwind"), "the key is a hash, never the address");
  assert.equal(ledgerIdempotencyKey("pi_3PdiscountHALF001"), "opening-fee-promo-ledger:pi_3PdiscountHALF001");
});

// --- Stripe calls ----------------------------------------------------------------

test("lookupPromotion: GET /v1/promotion_codes?code=…&active=true&limit=1, classified; outage → error, not invalid", async (t) => {
  let body = { object: "list", data: [promotionCode()] };
  let status = 200;
  let fail = null;
  const calls = withStripe(t, async () => (fail ? fail : { status, body }));

  const ok = await lookupPromotion(SK, "FREE100", NOW);
  assert.equal(ok.status, "ok");
  assert.equal(ok.promoId, "promo_1FREE100xyz");
  assert.equal(calls.length, 1);
  const u = new URL(calls[0].url);
  assert.equal(u.origin + u.pathname, "https://api.stripe.com/v1/promotion_codes");
  assert.equal(u.searchParams.get("code"), "FREE100");
  assert.equal(u.searchParams.get("active"), "true");
  assert.equal(u.searchParams.get("limit"), "1");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.headers.Authorization, "Bearer " + SK);
  assert.equal(calls[0].init.body, undefined);

  body = { object: "list", data: [] };
  assert.deepEqual(await lookupPromotion(SK, "NOPE123", NOW), { status: "invalid" });

  status = 500; body = { error: { message: "boom sk_live_LEAK" } };
  const down = await lookupPromotion(SK, "FREE100", NOW);
  assert.equal(down.status, "error");
  assert.equal(down.response.status, 500, "the raw response is handed back for logging");

  status = 200; body = { object: "list" };
  assert.equal((await lookupPromotion(SK, "FREE100", NOW)).status, "error", "a list without data is an upstream fault");

  fail = new Error("ECONNRESET");
  assert.equal((await lookupPromotion(SK, "FREE100", NOW)).status, "error");
});

test("findRedemption: GET /v1/customers?email=<normalized>&limit=100, first matching record; outage → ok:false", async (t) => {
  const other = { id: "cus_other", metadata: { kind: "opening_fee_promo", promo_code: "HALF" } };
  const hit = { id: "cus_hit", metadata: { kind: "opening_fee_promo", promo_code: "FREE100" } };
  let body = { object: "list", data: [{ id: "cus_plain", metadata: {} }, other, hit] };
  let status = 200;
  const calls = withStripe(t, async () => ({ status, body }));

  const r = await findRedemption(SK, "jane@northwind.co.uk", "FREE100");
  assert.deepEqual(r, { ok: true, redemption: hit });
  const u = new URL(calls[0].url);
  assert.equal(u.pathname, "/v1/customers");
  assert.equal(u.searchParams.get("email"), "jane@northwind.co.uk");
  assert.equal(u.searchParams.get("limit"), "100");
  assert.equal(calls[0].init.method, "GET");

  assert.deepEqual(await findRedemption(SK, "jane@northwind.co.uk", "OTHER"), { ok: true, redemption: null });
  body = { object: "list", data: [] };
  assert.deepEqual(await findRedemption(SK, "jane@northwind.co.uk", "FREE100"), { ok: true, redemption: null });

  status = 503; body = { error: { message: "down" } };
  const down = await findRedemption(SK, "jane@northwind.co.uk", "FREE100");
  assert.equal(down.ok, false);
  assert.equal(down.response.status, 503);
});

test("recordRedemption: POST /v1/customers with the record as a form body and the Idempotency-Key", async (t) => {
  let status = 200;
  let body = { id: "cus_FreeRedeem00001", object: "customer", created: 1790001000, livemode: true };
  const calls = withStripe(t, async () => ({ status, body }));
  const v = { email: "jane@northwind.co.uk", code: "FREE100", promoId: "promo_1FREE100xyz", country: "GB", plan: "pro", entity: "uk", lang: "en" };

  const r = await recordRedemption(SK, v, { idempotencyKey: "opening-fee-promo-free:abc", now: new Date("2026-09-23T10:00:00Z") });
  assert.equal(r.ok, true);
  assert.equal(r.customer.id, "cus_FreeRedeem00001");
  assert.equal(calls[0].url, "https://api.stripe.com/v1/customers");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["Idempotency-Key"], "opening-fee-promo-free:abc");
  assert.equal(calls[0].init.headers["Content-Type"], "application/x-www-form-urlencoded");
  const p = new URLSearchParams(calls[0].init.body);
  assert.equal(p.get("email"), "jane@northwind.co.uk");
  assert.equal(p.get("description"), "Account opening fee promo redemption");
  assert.equal(p.get("metadata[kind]"), "opening_fee_promo");
  assert.equal(p.get("metadata[source]"), "altery-eligibility-checker");
  assert.equal(p.get("metadata[promo_code]"), "FREE100");
  assert.equal(p.get("metadata[promo_id]"), "promo_1FREE100xyz");
  assert.equal(p.get("metadata[promo_redeemed_at]"), "2026-09-23T10:00:00.000Z");
  assert.equal(p.get("metadata[company_country]"), "GB");
  assert.equal(p.get("metadata[plan]"), "pro");
  assert.equal(p.get("metadata[entity]"), "uk");
  assert.equal(p.get("metadata[lang]"), "en");
  assert.equal(p.has("metadata[payment_intent]"), false, "a free redemption has no payment");
  const mdKeys = [...p.keys()].filter((k) => k.startsWith("metadata[")).map((k) => k.slice(9, -1)).sort();
  assert.deepEqual(mdKeys, ["company_country", "entity", "kind", "lang", "plan", "promo_code", "promo_id", "promo_redeemed_at", "source"]);

  await recordRedemption(SK, { ...v, paymentIntentId: "pi_3PdiscountHALF001" }, { idempotencyKey: "k2" });
  assert.equal(new URLSearchParams(calls[1].init.body).get("metadata[payment_intent]"), "pi_3PdiscountHALF001");

  status = 400; body = { error: { type: "idempotency_error" } };
  const dup = await recordRedemption(SK, v, { idempotencyKey: "k3" });
  assert.equal(dup.ok, false);
  assert.equal(dup.response.status, 400);
  status = 200; body = { object: "customer" };
  assert.equal((await recordRedemption(SK, v, {})).ok, false, "200 without an id is not a record");
});

test("bumpPromoCounter: POST metadata[redemptions]=previous+1; fetches the current value when not given; best-effort", async (t) => {
  let posts = 0;
  const calls = withStripe(t, async (url, init) => {
    if (init.method === "POST") { posts += 1; return { status: 200, body: { id: "promo_1FREE100xyz", metadata: { redemptions: "5" } } }; }
    return { status: 200, body: promotionCode({ metadata: { redemptions: "7" } }) };
  });
  assert.equal(await bumpPromoCounter(SK, "promo_1FREE100xyz", 4), true);
  assert.equal(calls.length, 1, "with the previous value known there is no read");
  assert.equal(calls[0].url, "https://api.stripe.com/v1/promotion_codes/promo_1FREE100xyz");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(new URLSearchParams(calls[0].init.body).get("metadata[redemptions]"), "5");

  assert.equal(await bumpPromoCounter(SK, "promo_1FREE100xyz"), true);
  assert.equal(calls.length, 3, "unknown previous value: read, then write");
  assert.equal(calls[1].init.method, "GET");
  assert.equal(calls[1].url, "https://api.stripe.com/v1/promotion_codes/promo_1FREE100xyz");
  assert.equal(new URLSearchParams(calls[2].init.body).get("metadata[redemptions]"), "8");
  assert.equal(posts, 2);

  assert.equal(await bumpPromoCounter(SK, "cus_notapromo", 1), false, "only a promo_ id is ever written to");
  assert.equal(await bumpPromoCounter(SK, "promo_x/../y", 1), false);
  assert.equal(calls.length, 3, "refused ids make no call");
});

test("bumpPromoCounter: a failed write reports false and never throws", async (t) => {
  withStripe(t, async () => new Error("ECONNRESET"));
  assert.equal(await bumpPromoCounter(SK, "promo_1FREE100xyz", 4), false);
  assert.equal(await bumpPromoCounter(SK, "promo_1FREE100xyz"), false);
});
