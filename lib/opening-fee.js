// Account opening fee: the constants, validators and normalizers behind
// api/opening-fee.js. Pure and dependency-free so the whole boundary can be
// unit-tested without Stripe (see test/openingFee*.test.mjs).
//
// Product policy (founder decision, 2026-09-23): after the checker says
// "eligible", the visitor pays a one-time £100 opening fee before the external
// registration. It is charged PER APPLICATION ATTEMPT, captured immediately and
// NON-REFUNDABLE in every case (KYB rejection included). It never expires: a
// paid attempt keeps the path to registration open.
//
// The paywall asks for the work email only (revised the same day: no company
// name or registration number). The company is bound to the payment at FIRST
// USE instead: the first registration application that arrives with the
// signed token (lib/opening-fee-token.js) claims that PaymentIntent, and
// registration refuses a second application carrying the same one. Stripe
// metadata keeps what the checker already knows (email, country of
// incorporation, plan, entity), so ops can still find the payment.
//
// This file is the AUTHORITATIVE amount. The client mirror EC_OPENING_FEE in
// checker-data.js is display-only (the server never trusts a client amount);
// test/openingFee.test.mjs fails if the two drift apart.

export const OPENING_FEE = Object.freeze({
  amount: 10000,              // minor units (pence)
  currency: "gbp",            // GBP for every entity/region, by decision
  display: "£100",
  termsVersion: "2026-09-23", // bump whenever the fee terms copy changes
});

// Stamped on every PaymentIntent we create. `confirm` refuses any PI without
// this kind, so a PI from another Altery integration on the same Stripe account
// can never be turned into an opening token.
export const OPENING_FEE_KIND = "account_opening_fee";
export const OPENING_FEE_SOURCE = "altery-eligibility-checker";
export const OPENING_FEE_DESCRIPTION = "Altery account opening fee";

export const PLAN_IDS = Object.freeze(["starter", "pro", "ultra"]);
export const ENTITY_IDS = Object.freeze(["uk", "eu", "mena"]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ATTEMPT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const PAYMENT_INTENT_ID_RE = /^pi_[A-Za-z0-9]{8,}$/;

// Registration trusts the token signature alone, so this secret is all that
// stands between a visitor and the fee. Anyone can obtain one genuine token
// (by paying once) and brute-force a short or human-chosen secret offline;
// `openssl rand -hex 32` gives 64 characters, 32 is the floor we accept.
export const MIN_TOKEN_SECRET_LENGTH = 32;

// Why the fee is switched off, or null when it is on. Enabled only when all
// three secrets are present. Publishable key must also LOOK publishable: GET
// /api/opening-fee hands it to every browser, so a secret key pasted into the
// wrong variable would otherwise be published. The reason names variables
// only, never values, so it is safe to log.
export function openingFeeConfigProblem(env = process.env) {
  const sk = typeof env.STRIPE_SECRET_KEY === "string" ? env.STRIPE_SECRET_KEY.trim() : "";
  const pk = typeof env.STRIPE_PUBLISHABLE_KEY === "string" ? env.STRIPE_PUBLISHABLE_KEY.trim() : "";
  const ts = typeof env.OPENING_FEE_TOKEN_SECRET === "string" ? env.OPENING_FEE_TOKEN_SECRET.trim() : "";
  if (!sk) return "STRIPE_SECRET_KEY is not set";
  if (!pk) return "STRIPE_PUBLISHABLE_KEY is not set";
  if (!ts) return "OPENING_FEE_TOKEN_SECRET is not set";
  if (!pk.startsWith("pk_")) return "STRIPE_PUBLISHABLE_KEY is not a pk_ key";
  if (ts.length < MIN_TOKEN_SECRET_LENGTH) {
    return `OPENING_FEE_TOKEN_SECRET is shorter than ${MIN_TOKEN_SECRET_LENGTH} characters`;
  }
  return null;
}

export function isOpeningFeeConfigured(env = process.env) {
  return openingFeeConfigProblem(env) === null;
}

export function isValidPaymentIntentId(id) {
  return typeof id === "string" && id.length <= 255 && PAYMENT_INTENT_ID_RE.test(id);
}

// Trimmed and lowercased, or null when it is not an address we accept. The
// per-email rate-limit bucket, the Stripe metadata and the promo redemption
// ledger (lib/opening-fee-promo.js) all key on this one spelling. ".." passes
// the pattern but Stripe refuses it as receipt_email; catching it here gives
// the paywall an inline field error instead of a generic 502.
export function normalizeEmail(raw) {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email) || email.includes("..")) return null;
  return email;
}

// Validates the `create` payload. Returns { ok: true, value } with trimmed,
// normalized fields, or { ok: false, error, field? } in the API's error shape.
// Field checks run before the terms check so the client learns about a bad
// field even if it also forgot the checkbox. Only the fields named here are
// read: anything else (companyName / companyNumber from a client cached
// before the company fields were dropped, a stray amount) is ignored, never
// an error and never forwarded to Stripe.
export function validateCreatePayload(body) {
  const b = body && typeof body === "object" ? body : {};
  const bad = (field) => ({ ok: false, error: "invalid_field", field });

  if (typeof b.attemptId !== "string" || !ATTEMPT_ID_RE.test(b.attemptId)) return bad("attemptId");

  // Country of incorporation from the checker's first question. It is all we
  // know about the company at payment time; registration may flag an
  // application whose country differs from the one in the token.
  const country = typeof b.country === "string" ? b.country.trim().toUpperCase() : "";
  if (!COUNTRY_RE.test(country)) return bad("country");

  const email = normalizeEmail(b.email);
  if (!email) return bad("email");

  if (!PLAN_IDS.includes(b.plan)) return bad("plan");
  if (!ENTITY_IDS.includes(b.entity)) return bad("entity");

  if (b.acceptedTerms !== true) return { ok: false, error: "terms_not_accepted" };

  // Language only localizes our records; an odd value falls back rather than
  // failing a paying customer.
  const lang = typeof b.lang === "string" && /^[a-z]{2,5}$/i.test(b.lang.trim())
    ? b.lang.trim().toLowerCase() : "en";

  return {
    ok: true,
    value: {
      attemptId: b.attemptId,
      country,
      email,
      plan: b.plan,
      entity: b.entity,
      lang,
    },
  };
}

// Stripe params for POST /v1/payment_intents. Amount and currency come only
// from OPENING_FEE. Automatic capture because the fee is charged, not held.
// payment_method_types stays ["card"] with Apple Pay and Google Pay on: both
// are card wallets, so the Payment Element offers them under "card" (only on
// a domain registered with Stripe, see docs/OPENING-FEE.md). Pinning the list
// keeps other methods the account may enable (bank debits, pay-later) off
// this charge; Link is switched off in the paywall UI (checker-paywall.jsx).
//
// Metadata is the whole payment record (we keep no database). No company
// name or number: the company is only known once registration binds it.
//
// `promo` ({ code, promoId, amount }) is set only for a partial-discount
// code the server has looked up itself (lib/opening-fee-promo.js): the PI is
// then created for the discounted amount, and the metadata keeps the code
// and both figures so `confirm` can check that the discount accounts for
// the whole difference. A free code never reaches here (no PaymentIntent).
export function buildPaymentIntentParams(v, now = new Date(), promo = null) {
  const params = {
    amount: promo ? promo.amount : OPENING_FEE.amount,
    currency: OPENING_FEE.currency,
    payment_method_types: ["card"],
    capture_method: "automatic",
    description: OPENING_FEE_DESCRIPTION,
    receipt_email: v.email,
    metadata: {
      kind: OPENING_FEE_KIND,
      source: OPENING_FEE_SOURCE,
      email: v.email,
      company_country: v.country,
      plan: v.plan,
      entity: v.entity,
      lang: v.lang,
      terms_version: OPENING_FEE.termsVersion,
      terms_accepted_at: now.toISOString(),
    },
  };
  if (promo) {
    Object.assign(params.metadata, {
      promo_code: promo.code,
      promo_id: promo.promoId,
      original_amount: OPENING_FEE.amount,
      discount_amount: OPENING_FEE.amount - promo.amount,
    });
  }
  return params;
}

// The amount a fee PaymentIntent must carry. Without a code it is the fee.
// With a code, the PI's own metadata must account for the whole difference:
// original_amount is the fee and amount = original_amount - discount_amount
// (metadata values come back from Stripe as strings). Anything that does not
// add up (a discount typed into the Dashboard, a promo_code on a PI with an
// odd amount) is not our fee.
function hasFeeAmount(pi, md) {
  if (typeof md.promo_code !== "string" || !md.promo_code) return pi.amount === OPENING_FEE.amount;
  const original = Number(md.original_amount);
  const discount = Number(md.discount_amount);
  return original === OPENING_FEE.amount
    && Number.isInteger(discount) && discount >= 0 && discount < original
    && pi.amount === original - discount;
}

// Classifies a retrieved PaymentIntent for `confirm`. A PI that is not ours,
// or whose amount/currency differ from the fee, is reported as not_found so
// the endpoint never confirms (or even acknowledges) foreign payments.
export function classifyPaymentIntent(pi) {
  if (!pi || typeof pi !== "object") return { ok: false, status: 404, error: "not_found" };
  const md = pi.metadata && typeof pi.metadata === "object" ? pi.metadata : {};
  if (md.kind !== OPENING_FEE_KIND
      || pi.currency !== OPENING_FEE.currency
      || !hasFeeAmount(pi, md)) {
    return { ok: false, status: 404, error: "not_found" };
  }
  if (pi.status !== "succeeded") {
    return { ok: false, status: 402, error: "not_paid", piStatus: typeof pi.status === "string" ? pi.status : "unknown" };
  }
  return { ok: true };
}
