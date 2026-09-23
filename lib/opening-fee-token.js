// Signed proof that one account opening fee was paid. Issued by
// api/opening-fee.js (`confirm`) and carried to the external registration app
// as the `opening` URL param; registration verifies it with the same shared
// secret (docs/OPENING-FEE.md has the snippet for their side).
//
// Format: "v1.<payloadB64url>.<sigB64url>"
//   payload = JSON {"pi": PaymentIntent id (or Customer id, see below),
//                   "cc": company country ISO2,
//                   "iat": PI created, unix s,
//                   "lm": PI livemode (false = Stripe test mode),
//                   "promo": promo code, only when one was used}
//   sig     = HMAC-SHA256(OPENING_FEE_TOKEN_SECRET, "v1." + payloadB64url)
//
// No company in the payload: the paywall no longer asks for one. The token
// proves a payment, and registration binds it to a company at first use:
// the first application carrying it claims `pi` (unique there), a second
// one is refused. `cc` is the country of incorporation the checker was
// given, so registration can flag an application from another country.
//
// Promo codes (2026-09-23): a code that brings the fee to zero creates no
// PaymentIntent. Its redemption record is a Stripe Customer
// (lib/opening-fee-promo.js), and that Customer's id ("cus_…") takes the
// place of `pi`: registration treats it exactly like a paid one (unique,
// claimed by the first application). `promo` carries the code so
// registration and ops can tell a free or discounted attempt from a paid
// one. Tokens without a code keep the exact four-field payload they had.
//
// Stateless on purpose: no database, the PaymentIntent in Stripe is the record.
// `iat` is the PI's creation time (not "now"), so re-confirming the same PI
// yields the byte-identical token; a page reload or Stripe redirect return can
// never mint a second, different proof for one payment.
//
// `lm` is inside the signature because test payments are free (card 4242…):
// a staging, preview or localhost deploy that was handed the production secret
// would otherwise mint tokens production registration accepts. Verification
// therefore refuses lm:false unless the caller opts in (staging registration).
import crypto from "node:crypto";

const VERSION = "v1";
const B64URL_RE = /^[A-Za-z0-9_-]+$/;
// pi_ for a paid fee, cus_ for a free promo redemption (its Customer record).
const PI_RE = /^(?:pi|cus)_[A-Za-z0-9]{8,}$/;
const CC_RE = /^[A-Z]{2}$/;
// Same shape lib/opening-fee-promo.js normalizes codes to.
const PROMO_RE = /^[A-Z0-9_-]{3,32}$/;

function hmac(secret, data) {
  return crypto.createHmac("sha256", secret).update(data).digest();
}

function isValidPayload(p) {
  return !!p && typeof p === "object"
    && typeof p.pi === "string" && PI_RE.test(p.pi)
    && typeof p.cc === "string" && CC_RE.test(p.cc)
    && Number.isInteger(p.iat) && p.iat > 0
    && typeof p.lm === "boolean"
    && (p.promo === undefined || (typeof p.promo === "string" && PROMO_RE.test(p.promo)));
}

// Throws on a missing secret or malformed payload: issuing an unverifiable or
// half-empty token would push the failure to registration, far from its cause.
export function signOpeningToken({ pi, cc, iat, lm, promo }, secret) {
  if (typeof secret !== "string" || !secret) throw new Error("opening token secret missing");
  // Fixed key order keeps the encoding (and so the token) deterministic, and
  // building the object here means no stray caller field is ever signed.
  // `promo` is appended only when a code was used, so every token issued
  // before promo codes existed still verifies and re-issues byte-identically.
  const payload = { pi, cc, iat, lm };
  if (promo != null && promo !== "") payload.promo = promo;
  if (!isValidPayload(payload)) throw new Error("invalid opening token payload");
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = hmac(secret, VERSION + "." + body).toString("base64url");
  return VERSION + "." + body + "." + sig;
}

// Returns the payload when the token is well-formed and authentic, else null.
// A test-mode token (lm:false) is null too unless `allowTestMode` is set,
// which only a non-production verifier should do.
// Never throws, so callers can treat any garbage input as "not paid".
export function verifyOpeningToken(token, secret, { allowTestMode = false } = {}) {
  try {
    if (typeof secret !== "string" || !secret) return null;
    if (typeof token !== "string" || token.length > 1024) return null;
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== VERSION) return null;
    const [, body, sigB64] = parts;
    if (!B64URL_RE.test(body) || !B64URL_RE.test(sigB64)) return null;
    const sig = Buffer.from(sigB64, "base64url");
    // Reject non-canonical encodings of the same bytes, so exactly one string
    // verifies per payment (registration keys on `pi`, but a raw-token key
    // stays just as unique).
    if (sig.toString("base64url") !== sigB64) return null;
    const expected = hmac(secret, VERSION + "." + body);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!isValidPayload(payload)) return null;
    if (payload.lm !== true && !allowTestMode) return null;
    const out = { pi: payload.pi, cc: payload.cc, iat: payload.iat, lm: payload.lm };
    if (payload.promo !== undefined) out.promo = payload.promo;
    return out;
  } catch {
    return null;
  }
}
