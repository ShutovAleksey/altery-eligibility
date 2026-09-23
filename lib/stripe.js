// Minimal Stripe REST client over global fetch. We call exactly two endpoints
// (create + retrieve PaymentIntent), which does not justify the `stripe` npm
// SDK: the server has ZERO runtime dependencies (see Dockerfile / server.js).
//
// Stripe's API takes application/x-www-form-urlencoded bodies with bracketed
// keys for nesting: metadata[kind]=…, payment_method_types[]=card.
//
// Returns { ok, status, json } and never throws: a network failure or the
// timeout comes back as { ok: false, status: 0, json: null } so the handler
// maps every upstream failure to one 502 without try/catch at each call.

const STRIPE_API_BASE = "https://api.stripe.com";
// Pinned so Stripe's account-level default version upgrades can't change the
// PaymentIntent shape under us. Bump deliberately, after reading the changelog.
export const STRIPE_API_VERSION = "2025-03-31.basil";
const DEFAULT_TIMEOUT_MS = 10_000;

function flatten(value, key, out) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      // Scalars use Stripe's list syntax (key[]); objects need an index to keep
      // their fields grouped (key[0][field]).
      if (item !== null && typeof item === "object") flatten(item, `${key}[${i}]`, out);
      else flatten(item, `${key}[]`, out);
    });
    return;
  }
  if (typeof value === "object") {
    for (const k of Object.keys(value)) flatten(value[k], key ? `${key}[${k}]` : k, out);
    return;
  }
  out.push([key, String(value)]);
}

export function encodeStripeForm(params) {
  const pairs = [];
  flatten(params || {}, "", pairs);
  return new URLSearchParams(pairs).toString();
}

export async function stripeRequest(method, path, {
  secretKey, params, idempotencyKey, timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const verb = String(method || "GET").toUpperCase();
  const headers = {
    Authorization: "Bearer " + secretKey,
    "Stripe-Version": STRIPE_API_VERSION,
  };
  let url = STRIPE_API_BASE + path;
  let body;
  if (verb === "GET") {
    const qs = encodeStripeForm(params);
    if (qs) url += "?" + qs;
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = encodeStripeForm(params);
    // Stripe replays the first response for a repeated key (24 h), so a
    // retried create can never produce a second PaymentIntent.
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // Resolved at call time (not captured at import) so tests can stub fetch.
    const res = await globalThis.fetch(url, { method: verb, headers, body, signal: ctrl.signal });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: null };
  } finally {
    clearTimeout(timer);
  }
}
