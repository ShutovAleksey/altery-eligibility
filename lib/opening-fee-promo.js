// Promo codes on the account opening fee (founder decision, 2026-09-23).
//
// Codes live in Stripe (Dashboard → Coupons → Promotion codes; today there is
// one, FREE100 = 100% off), so marketing can add one or switch it off without
// a deploy. Stripe cannot apply a promotion code to a PaymentIntent itself
// (that is a Checkout / Subscriptions feature), so this module looks the code
// up through the API, prices the fee, and keeps the one rule Stripe cannot
// keep for us: ONE REDEMPTION PER PERSON, a person being the work email typed
// on the paywall.
//
// The redemption ledger is Stripe Customer objects. The server has no
// database and Stripe is already the record of truth for the money, so each
// redemption is a Customer carrying metadata.kind = "opening_fee_promo" and
// the code, found again by email (GET /v1/customers?email=…). Ops see them in
// Dashboard → Customers. Stripe's own times_redeemed on the promotion code
// never moves (nothing is redeemed in Stripe's sense), so a best-effort
// counter lives in the promotion code's metadata.redemptions instead.
//
// Pure where possible; the Stripe calls go through lib/stripe.js so tests
// stub global fetch. Nothing here throws: an upstream failure comes back as
// { status: "error" } / { ok: false } and the handler maps it to 502, never
// to "invalid" (a Stripe outage must not tell a customer their code is wrong).
import crypto from "node:crypto";
import { stripeRequest } from "./stripe.js";
import { OPENING_FEE, OPENING_FEE_SOURCE } from "./opening-fee.js";

// Same alphabet the paywall accepts. Stripe matches codes case-insensitively,
// so everything is uppercased once, here, and compared uppercased.
export const PROMO_CODE_RE = /^[A-Z0-9_-]{3,32}$/;
const PROMO_ID_RE = /^promo_[A-Za-z0-9]+$/;

export const PROMO_LEDGER_KIND = "opening_fee_promo";
export const PROMO_LEDGER_DESCRIPTION = "Account opening fee promo redemption";

// Stripe refuses a GBP charge under 30p, so a discounted fee below that
// cannot be charged at all and is treated as free (FREE100 lands on exactly 0).
export const STRIPE_MIN_GBP = 30;

export function normalizeCode(raw) {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return PROMO_CODE_RE.test(code) ? code : null;
}

// Classifies one promotion_code object from Stripe (or none) for `code`.
// Exported for the unit tests; lookupPromotion is the network wrapper.
//   none / inactive / another code / coupon without a discount → "invalid"
//   expires_at passed, or coupon.valid false (redeem_by passed, coupon's
//   own redemption cap reached)                                 → "expired"
// A promotion code whose own max_redemptions is reached is deactivated by
// Stripe, so the active=true lookup drops it and it reads as "invalid".
export function classifyPromotionCode(pc, code, now = Date.now()) {
  if (!pc || typeof pc !== "object" || pc.active !== true) return { status: "invalid" };
  if (typeof pc.code !== "string" || pc.code.toUpperCase() !== code) return { status: "invalid" };
  const coupon = pc.coupon;
  if (!coupon || typeof coupon !== "object") return { status: "invalid" };
  if (Number.isFinite(pc.expires_at) && pc.expires_at * 1000 <= now) return { status: "expired" };
  if (coupon.valid === false) return { status: "expired" };
  const percentOff = typeof coupon.percent_off === "number" && Number.isFinite(coupon.percent_off) ? coupon.percent_off : null;
  const amountOff = Number.isInteger(coupon.amount_off) ? coupon.amount_off : null;
  if (percentOff === null && amountOff === null) return { status: "invalid" };
  const counted = Number(pc.metadata && pc.metadata.redemptions);
  return {
    status: "ok",
    promoId: pc.id,
    code: pc.code.toUpperCase(),
    couponId: coupon.id,
    percentOff,
    amountOff,
    currency: typeof coupon.currency === "string" ? coupon.currency.toLowerCase() : null,
    // Our counter (see bumpPromoCounter); 0 when never bumped or edited to junk.
    redemptions: Number.isInteger(counted) && counted >= 0 ? counted : 0,
  };
}

// GET /v1/promotion_codes?code=<code>&active=true&limit=1. Stripe's `code`
// filter is exact and case-insensitive, so at most one row comes back.
export async function lookupPromotion(secretKey, code, now = Date.now()) {
  const r = await stripeRequest("GET", "/v1/promotion_codes", {
    secretKey,
    params: { code, active: true, limit: 1 },
  });
  if (!r.ok || !r.json || !Array.isArray(r.json.data)) return { status: "error", response: r };
  return classifyPromotionCode(r.json.data[0], code, now);
}

// The discounted fee in pence, or null when the coupon cannot price a GBP fee
// (an amount_off in another currency, a nonsensical percentage). Percentages
// round to whole pence. `free` means "nothing can be charged": the result is
// under Stripe's minimum, so the amount is reported as 0 and no PaymentIntent
// is created for it.
export function applyDiscount(baseAmount, promo) {
  if (!Number.isInteger(baseAmount) || baseAmount < 0 || !promo || typeof promo !== "object") return null;
  let amount;
  if (typeof promo.percentOff === "number" && Number.isFinite(promo.percentOff)) {
    if (promo.percentOff < 0 || promo.percentOff > 100) return null;
    amount = Math.round(baseAmount * (100 - promo.percentOff) / 100);
  } else if (Number.isInteger(promo.amountOff)) {
    if (promo.amountOff < 0 || promo.currency !== OPENING_FEE.currency) return null;
    amount = Math.max(0, baseAmount - promo.amountOff);
  } else {
    return null;
  }
  const free = amount < STRIPE_MIN_GBP;
  if (free) amount = 0;
  return { amount, free, discount: baseAmount - amount };
}

// "£0", "£50", "£12.50": the same shape as OPENING_FEE.display, for the
// paywall's cost block and Pay button.
export function formatGbp(minor) {
  const n = Math.max(0, Math.round(Number(minor) || 0));
  const pounds = Math.floor(n / 100);
  const pence = n % 100;
  return "£" + pounds + (pence ? "." + String(pence).padStart(2, "0") : "");
}

// ── Ledger ──────────────────────────────────────────────────────────────

export function isRedemptionOf(customer, code) {
  const md = customer && typeof customer === "object" ? customer.metadata : null;
  return !!(md && typeof md === "object" && md.kind === PROMO_LEDGER_KIND && md.promo_code === code);
}

// GET /v1/customers?email=<email>&limit=100 → the first Customer that records
// a redemption of `code` for that address, or null. `email` must already be
// normalized (trimmed, lowercased: lib/opening-fee.js normalizeEmail), because
// Stripe's email filter is case-sensitive and that is the spelling we store.
// { ok: false } when Stripe did not answer: the caller must not read that as
// "never redeemed".
export async function findRedemption(secretKey, email, code) {
  const r = await stripeRequest("GET", "/v1/customers", {
    secretKey,
    params: { email, limit: 100 },
  });
  if (!r.ok || !r.json || !Array.isArray(r.json.data)) return { ok: false, response: r };
  return { ok: true, redemption: r.json.data.find((c) => isRedemptionOf(c, code)) || null };
}

// Params for POST /v1/customers. The metadata is the whole redemption record
// (no database): who (email), which code, when, and what the checker knew.
// `payment_intent` is set when the code was a partial discount paid through a
// PaymentIntent; a free redemption has none, and its Customer id stands in
// for the PaymentIntent id in the opening token.
export function buildRedemptionParams(v, now = new Date()) {
  const metadata = {
    kind: PROMO_LEDGER_KIND,
    source: OPENING_FEE_SOURCE,
    promo_code: v.code,
    promo_id: v.promoId,
    promo_redeemed_at: now.toISOString(),
    company_country: v.country,
    plan: v.plan,
    entity: v.entity,
    lang: v.lang,
  };
  if (v.paymentIntentId) metadata.payment_intent = v.paymentIntentId;
  return { email: v.email, description: PROMO_LEDGER_DESCRIPTION, metadata };
}

export async function recordRedemption(secretKey, v, { idempotencyKey, now } = {}) {
  const r = await stripeRequest("POST", "/v1/customers", {
    secretKey,
    params: buildRedemptionParams(v, now),
    idempotencyKey,
  });
  if (!r.ok || !r.json || typeof r.json.id !== "string") return { ok: false, response: r };
  return { ok: true, customer: r.json };
}

// Idempotency-Key for a FREE redemption's Customer: one per (email, code),
// not per click. Two tabs redeeming the same code for the same address at
// once then get one Customer (Stripe replays the first answer for 24 h), so
// one token, instead of two free applications from one person. A replay with
// different fields (the timestamp differs, so does any other click) is
// refused by Stripe and surfaces as 502; by then the ledger holds the first
// record and the next attempt reads "used". Hashed so no address sits in a
// header Stripe logs.
export function freeRedemptionIdempotencyKey(email, code) {
  return "opening-fee-promo-free:" + crypto.createHash("sha256").update(email + "\n" + code).digest("hex");
}

// Idempotency-Key for the ledger record written after a discounted PAYMENT
// confirms: one per PaymentIntent, so concurrent confirms of one payment
// (two tabs, a redirect return plus a poll) write one Customer.
export function ledgerIdempotencyKey(paymentIntentId) {
  return "opening-fee-promo-ledger:" + paymentIntentId;
}

// Best-effort counter on the promotion code (metadata.redemptions), read
// from the lookup when the caller has it, else fetched. Read-modify-write
// without a lock: two redemptions in the same second may count as one, which
// is acceptable for a marketing figure. The Customer records are the source
// of truth; failures here are ignored by design.
export async function bumpPromoCounter(secretKey, promoId, previous) {
  if (typeof promoId !== "string" || !PROMO_ID_RE.test(promoId)) return false;
  let current = previous;
  if (!Number.isInteger(current) || current < 0) {
    const r = await stripeRequest("GET", "/v1/promotion_codes/" + encodeURIComponent(promoId), { secretKey });
    const counted = Number(r.ok && r.json && r.json.metadata && r.json.metadata.redemptions);
    current = Number.isInteger(counted) && counted >= 0 ? counted : 0;
  }
  const r = await stripeRequest("POST", "/v1/promotion_codes/" + encodeURIComponent(promoId), {
    secretKey,
    params: { metadata: { redemptions: current + 1 } },
  });
  return !!r.ok;
}
