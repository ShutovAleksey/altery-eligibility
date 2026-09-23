// Account opening fee (the paywall between an "eligible" result and the
// external registration app). One route, four calls:
//
//   GET                       → public config for the paywall (never a secret)
//   POST {action:"promo"}     → is this promo code valid for this email, and
//                               what does the fee come to with it
//   POST {action:"create"}    → PaymentIntent for the fee (work email + country
//                               of incorporation; no company details), or,
//                               with a code that makes the fee free, the
//                               signed token straight away (no PaymentIntent)
//   POST {action:"confirm"}   → server-side check that the PI really succeeded,
//                               then a signed token for the registration handoff
//
// The company is not named here at all: registration binds the payment to
// the first application that arrives with its token (unique `pi` there) and
// refuses a second one. See docs/OPENING-FEE.md.
//
// Why the server re-reads the PaymentIntent on confirm instead of trusting the
// browser's "succeeded": the token is what registration accepts as proof of
// payment, so it may only be minted from Stripe's own record. Amount, currency
// and the card method type (Apple Pay / Google Pay ride on it) are fixed here
// too; the client never sends an amount. Promo codes follow the same rule:
// the client sends the code, the server looks it up in Stripe and prices the
// fee itself, on `promo` and again on `create` (lib/opening-fee-promo.js).
//
// Fee policy, token format and what registration does with the params:
// docs/OPENING-FEE.md. Constants + validators: lib/opening-fee.js.
//
// Setup required: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY and
// OPENING_FEE_TOKEN_SECRET, at least 32 characters (env or Docker secret
// files, see server.js). With any of them missing the endpoint reports
// enabled:false / 503 and the checker keeps today's direct-to-registration
// CTA, so deploying without keys is safe.

import { rateLimitAll, clientIp, send429 } from "../lib/rate-limit.js";
import { checkAntiSpam, sendAntiSpamReject } from "../lib/anti-spam.js";
import { stripeRequest } from "../lib/stripe.js";
import { signOpeningToken } from "../lib/opening-fee-token.js";
import {
  OPENING_FEE, isOpeningFeeConfigured, openingFeeConfigProblem,
  isValidPaymentIntentId, normalizeEmail, validateCreatePayload, buildPaymentIntentParams,
  classifyPaymentIntent,
} from "../lib/opening-fee.js";
import {
  normalizeCode, lookupPromotion, applyDiscount, formatGbp,
  findRedemption, recordRedemption, bumpPromoCounter,
  freeRedemptionIdempotencyKey, ledgerIdempotencyKey,
} from "../lib/opening-fee-promo.js";

// Stripe's error type/code are upstream-controlled but can echo request data;
// keep only identifier characters so a log line can't be forged or split.
function logSafe(v) {
  return String(v == null ? "" : v).replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 60) || "-";
}

function logStripeFailure(where, r) {
  const err = (r.json && r.json.error) || {};
  console.error(`[opening-fee] ${where} failed: status=${r.status} type=${logSafe(err.type)} code=${logSafe(err.code)}`);
}

// 503 with the reason in the log (variable names only, never values), so ops
// can tell a missing secret from one that is too short.
function sendNotConfigured(res) {
  console.error(`[opening-fee] not configured: ${openingFeeConfigProblem(process.env)}`);
  return res.status(503).json({ error: "not_configured" });
}

function sendConfig(res) {
  const enabled = isOpeningFeeConfigured(process.env);
  return res.status(200).json({
    enabled,
    publishableKey: enabled ? process.env.STRIPE_PUBLISHABLE_KEY.trim() : null,
    amount: OPENING_FEE.amount,
    currency: OPENING_FEE.currency,
    display: OPENING_FEE.display,
    termsVersion: OPENING_FEE.termsVersion,
  });
}

// Looks a code up in Stripe and prices the fee with it, refusing a code this
// email has already redeemed. Shared by `promo` (the client's live check, where
// the email is optional) and `create` (where it is the address being charged).
// Returns { ok: true, promo, discount } or { ok: false, reason } with reason
// "invalid" | "expired" | "used", or { ok: false, error: r } when Stripe did
// not answer (the caller maps that to 502, never to "invalid").
async function priceWithCode(secretKey, code, email) {
  const promo = await lookupPromotion(secretKey, code);
  if (promo.status === "error") return { ok: false, error: promo.response };
  if (promo.status !== "ok") return { ok: false, reason: promo.status };
  const discount = applyDiscount(OPENING_FEE.amount, promo);
  if (!discount) return { ok: false, reason: "invalid" };
  if (email) {
    const ledger = await findRedemption(secretKey, email, promo.code);
    if (!ledger.ok) return { ok: false, error: ledger.response };
    if (ledger.redemption) return { ok: false, reason: "used" };
  }
  return { ok: true, promo, discount };
}

async function handlePromo(req, res) {
  // Origin check only, like confirm: the check runs on a button click, but
  // often seconds after the page loaded, so the form-age gate would refuse
  // real visitors who paste a code first.
  const originCheck = checkAntiSpam({ headers: req.headers, body: {} });
  if (!originCheck.ok) return sendAntiSpamReject(res, originCheck);

  // Tighter than create: each check is a free Stripe read, and the answer
  // says whether a guessed code exists, so codes must not be enumerable.
  const ip = clientIp(req);
  const rl = await rateLimitAll([
    { key: `opening-fee:promo:ip:${ip}:m`, limit: 10, windowMs: 60_000   },  // 10/min per IP
    { key: `opening-fee:promo:ip:${ip}:h`, limit: 30, windowMs: 3600_000 },  // 30/hour per IP
  ]);
  if (!rl.allowed) return send429(res, rl.retryAfter);

  if (!isOpeningFeeConfigured(process.env)) return sendNotConfigured(res);

  const code = normalizeCode(req.body?.code);
  // A malformed code is just a code that does not exist, said the same way,
  // so the alphabet rule leaks nothing about real codes.
  if (!code) return res.status(200).json({ valid: false, reason: "invalid" });
  // Optional: with it, "used" is caught before the visitor fills the card
  // form. A malformed address is ignored here (create validates it for real).
  const email = normalizeEmail(req.body?.email);

  const priced = await priceWithCode(process.env.STRIPE_SECRET_KEY.trim(), code, email);
  if (!priced.ok) {
    if (priced.error) {
      logStripeFailure("promo", priced.error);
      return res.status(502).json({ error: "stripe_error" });
    }
    return res.status(200).json({ valid: false, reason: priced.reason });
  }
  return res.status(200).json({
    valid: true,
    code: priced.promo.code,
    percentOff: priced.promo.percentOff,
    amountOff: priced.promo.amountOff,
    amount: priced.discount.amount,
    display: formatGbp(priced.discount.amount),
    free: priced.discount.free,
  });
}

async function handleCreate(req, res) {
  // Anti-spam first (honeypot + Origin + form-age), same as the other public
  // forms: cheap, and it keeps bots off the Stripe API entirely.
  const spamCheck = checkAntiSpam(req);
  if (!spamCheck.ok) return sendAntiSpamReject(res, spamCheck);

  // Each create is a real Stripe object, so cap per IP first.
  const ip = clientIp(req);
  const rl = await rateLimitAll([
    { key: `opening-fee:create:ip:${ip}:m`, limit: 5,  windowMs: 60_000   },  // 5/min per IP
    { key: `opening-fee:create:ip:${ip}:h`, limit: 20, windowMs: 3600_000 },  // 20/hour per IP
  ]);
  if (!rl.allowed) return send429(res, rl.retryAfter);

  if (!isOpeningFeeConfigured(process.env)) return sendNotConfigured(res);

  const v = validateCreatePayload(req.body);
  if (!v.ok) {
    return res.status(400).json(v.field ? { error: v.error, field: v.field } : { error: v.error });
  }

  // Optional promo code. Only its shape is checked here; the lookup comes
  // after the per-email limit, because it is a Stripe call.
  const rawCode = req.body?.promoCode;
  const hasCode = rawCode != null && rawCode !== "";
  const code = hasCode ? normalizeCode(rawCode) : null;
  if (hasCode && !code) return res.status(400).json({ error: "promo_invalid" });

  // Per email as well (the one thing the visitor types, normalized by the
  // validator: trimmed, lowercased): stops one address from being hammered
  // from many IPs, since card testing tends to reuse one form fill. Counted
  // only for requests that are about to reach Stripe. A prospect's work
  // address is easy to know or guess, so counting junk or unconfigured
  // requests would let anyone lock a real customer out of paying for an
  // hour at no cost.
  const el = await rateLimitAll([
    { key: `opening-fee:create:email:${v.value.email}`, limit: 5, windowMs: 3600_000 }, // 5/hour per email
  ]);
  if (!el.allowed) return send429(res, el.retryAfter);

  const secretKey = process.env.STRIPE_SECRET_KEY.trim();

  // The code is looked up again here, never trusted from the `promo` answer
  // the client saw: the client's amount is not sent and would not be read.
  let priced = null;
  if (code) {
    priced = await priceWithCode(secretKey, code, v.value.email);
    if (!priced.ok) {
      if (priced.error) {
        logStripeFailure("create-promo", priced.error);
        return res.status(502).json({ error: "stripe_error" });
      }
      return res.status(400).json({ error: priced.reason === "used" ? "promo_used" : "promo_invalid" });
    }
  }

  // Free path: nothing to charge, so no PaymentIntent. The redemption record
  // (a Stripe Customer) is the payment's stand-in, and its id rides in the
  // token as `pi`, so registration binds it to one application exactly like
  // a paid fee. Idempotent per (email, code), see freeRedemptionIdempotencyKey.
  if (priced && priced.discount.free) {
    const promo = priced.promo;
    const rec = await recordRedemption(secretKey, {
      email: v.value.email, code: promo.code, promoId: promo.promoId,
      country: v.value.country, plan: v.value.plan, entity: v.value.entity, lang: v.value.lang,
    }, { idempotencyKey: freeRedemptionIdempotencyKey(v.value.email, promo.code) });
    if (!rec.ok) {
      logStripeFailure("create-free", rec.response);
      return res.status(502).json({ error: "stripe_error" });
    }
    const customer = rec.customer;
    let token;
    try {
      token = signOpeningToken({
        pi: customer.id,
        cc: v.value.country,
        iat: Number(customer.created),
        lm: customer.livemode === true,
        promo: promo.code,
      }, process.env.OPENING_FEE_TOKEN_SECRET.trim());
    } catch (e) {
      console.error(`[opening-fee] cannot sign token for cus=${logSafe(customer.id)}: ${logSafe(e && e.message)}`);
      return res.status(502).json({ error: "stripe_error" });
    }
    // Counter first, then answer: on a serverless host nothing runs after
    // the response is sent. Failures are ignored (best-effort by design).
    await bumpPromoCounter(secretKey, promo.promoId, promo.redemptions);
    return res.status(200).json({
      free: true,
      token,
      email: v.value.email,
      country: v.value.country,
      plan: v.value.plan,
      entity: v.value.entity,
      promo: promo.code,
    });
  }

  // Idempotency-Key = the client's per-click attemptId: a duplicated request
  // returns the same PI instead of a second one. A replay with DIFFERENT fields
  // (the terms_accepted_at stamp differs on every call) is refused by Stripe
  // and surfaces as 502; the client mints a fresh attemptId per click.
  const discounted = priced
    ? { code: priced.promo.code, promoId: priced.promo.promoId, amount: priced.discount.amount }
    : null;
  const r = await stripeRequest("POST", "/v1/payment_intents", {
    secretKey,
    params: buildPaymentIntentParams(v.value, new Date(), discounted),
    idempotencyKey: v.value.attemptId,
  });
  if (!r.ok || !r.json || typeof r.json.client_secret !== "string" || typeof r.json.id !== "string") {
    logStripeFailure("create", r);
    // Stripe's message never reaches the client: it can name our account
    // settings or echo keys, and the paywall has its own localized copy.
    return res.status(502).json({ error: "stripe_error" });
  }
  const out = { clientSecret: r.json.client_secret, paymentIntentId: r.json.id };
  // With a code the paywall must know the amount the Payment Element has to
  // be updated to before confirm (Stripe refuses a mismatch); without one the
  // answer keeps its original shape.
  if (discounted) {
    out.amount = discounted.amount;
    out.display = formatGbp(discounted.amount);
  }
  return res.status(200).json(out);
}

// After a discounted payment confirms, make sure the ledger holds its
// redemption (once: the Customer POST is idempotent per PaymentIntent, and a
// record already present is left alone). Best-effort: the token is issued
// either way, because the customer has paid; a failed write is retried by
// the next confirm of the same PI, which re-issues the same token.
async function ensureLedgerForPayment(secretKey, pi, md) {
  const email = normalizeEmail(md.email);
  if (!email) {
    console.error(`[opening-fee] promo ledger skipped for pi=${logSafe(pi.id)}: no usable email in metadata`);
    return;
  }
  const ledger = await findRedemption(secretKey, email, md.promo_code);
  if (!ledger.ok) { logStripeFailure("confirm-ledger-read", ledger.response); return; }
  if (ledger.redemption) return;
  const rec = await recordRedemption(secretKey, {
    email, code: md.promo_code, promoId: md.promo_id,
    country: md.company_country, plan: md.plan, entity: md.entity, lang: md.lang,
    paymentIntentId: pi.id,
  }, { idempotencyKey: ledgerIdempotencyKey(pi.id) });
  if (!rec.ok) { logStripeFailure("confirm-ledger-write", rec.response); return; }
  await bumpPromoCounter(secretKey, md.promo_id);
}

async function handleConfirm(req, res) {
  // Origin check only. The honeypot/form-age gates guard human-typed forms;
  // confirm fires automatically (also straight after a Stripe redirect return),
  // so a form-age check could reject a genuine paid customer.
  const originCheck = checkAntiSpam({ headers: req.headers, body: {} });
  if (!originCheck.ok) return sendAntiSpamReject(res, originCheck);

  const ip = clientIp(req);
  const rl = await rateLimitAll([
    { key: `opening-fee:confirm:ip:${ip}:m`, limit: 20,  windowMs: 60_000   },  // 20/min per IP
    { key: `opening-fee:confirm:ip:${ip}:h`, limit: 120, windowMs: 3600_000 },  // 120/hour per IP
  ]);
  if (!rl.allowed) return send429(res, rl.retryAfter);

  if (!isOpeningFeeConfigured(process.env)) return sendNotConfigured(res);

  const id = req.body?.paymentIntentId;
  if (!isValidPaymentIntentId(id)) {
    return res.status(400).json({ error: "invalid_field", field: "paymentIntentId" });
  }

  const r = await stripeRequest("GET", "/v1/payment_intents/" + encodeURIComponent(id), {
    secretKey: process.env.STRIPE_SECRET_KEY.trim(),
  });
  if (r.status === 404) return res.status(404).json({ error: "not_found" });
  if (!r.ok || !r.json) {
    logStripeFailure("confirm", r);
    return res.status(502).json({ error: "stripe_error" });
  }

  const pi = r.json;
  const verdict = classifyPaymentIntent(pi);
  if (!verdict.ok) {
    return res.status(verdict.status).json(
      verdict.status === 402 ? { error: verdict.error, status: verdict.piStatus } : { error: verdict.error },
    );
  }

  const md = pi.metadata;
  const promoCode = typeof md.promo_code === "string" && md.promo_code ? md.promo_code : null;
  let token;
  try {
    token = signOpeningToken({
      pi: pi.id,
      cc: md.company_country,
      iat: Number(pi.created),
      // Signed, so registration can refuse a test-mode payment (card 4242…)
      // even if a staging or preview deploy was given the production secret.
      lm: pi.livemode === true,
      promo: promoCode,
    }, process.env.OPENING_FEE_TOKEN_SECRET.trim());
  } catch (e) {
    // Only reachable if a PI of our kind carries malformed metadata (edited by
    // hand in the Dashboard). The payment stands; the client shows the
    // "paid, contact us" message instead of asking to pay again.
    console.error(`[opening-fee] cannot sign token for pi=${logSafe(pi.id)}: ${logSafe(e && e.message)}`);
    return res.status(502).json({ error: "stripe_error" });
  }

  // A discounted payment counts as this email's one redemption of the code.
  // Awaited before the answer goes out (serverless hosts stop the function
  // right after), but never allowed to fail the confirm.
  if (promoCode) await ensureLedgerForPayment(process.env.STRIPE_SECRET_KEY.trim(), pi, md);

  // What the paywall needs for the handoff URL. `country` is the one the fee
  // was created with (and that the token carries as `cc`), not whatever the
  // checker tab holds now. `promo` only when the payment carried a code, so
  // a full-price answer keeps its exact shape.
  const out = {
    ok: true,
    token,
    email: md.email || "",
    country: md.company_country || "",
    plan: md.plan || "",
    entity: md.entity || "",
  };
  if (promoCode) out.promo = promoCode;
  return res.status(200).json(out);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // Responses carry a client_secret or a payment token; no cache (browser,
  // Cloudflare or Nginx) may keep them.
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return sendConfig(res);
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const action = req.body && req.body.action;
  if (action === "promo") return handlePromo(req, res);
  if (action === "create") return handleCreate(req, res);
  if (action === "confirm") return handleConfirm(req, res);
  return res.status(400).json({ error: "invalid_action" });
}
