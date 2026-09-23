# Security & abuse-prevention overview

How the Altery eligibility checker defends its public surface, and how it's
tested. The checker is a **pre-onboarding marketing tool**: its serverless API
endpoints (`api/*`) are intentionally **unauthenticated** (no login before a
prospect has even chosen to apply), so the defences below are layered to make
automated abuse expensive without a login wall on a top-of-funnel tool.

> **Scope note (2026-06-11):** the internal onboarding flow (`/setup`) and the
> Stripe activation payment were **removed**. Every "Start setup" CTA — on the
> result page, in the PDF, and in the email — now redirects to the external
> corporate-registration app `https://app.altery.com/n/registration-corporate`,
> carrying the full non-PII profile (plan/entity/currency/volume/country/
> industry/services/corridors/crypto) + first-touch UTMs
> (`ecBuildHandoffURL` in `checker-helpers.js`). No payment or KYB data is
> collected or stored by this app anymore. See §8 for the contact-detail (PII)
> handoff policy.
>
> **Scope note (2026-09-23):** Stripe is back for exactly one charge: the
> one-time **£100 account opening fee** (paywall between an eligible result and
> registration; `api/opening-fee.js`). Card data never touches our servers: it
> is entered in Stripe's Payment Element iframe (card, Apple Pay, Google Pay).
> We store nothing ourselves; the PaymentIntent in Stripe is the record (work
> email, country of incorporation, plan, entity, terms version + acceptance time
> in its metadata). The paywall asks for the work email only, no company name or
> number: registration binds the payment to a company at first use (§6b).
> Payment is handed to registration as a signed token (§6b). KYB is still
> external. See `docs/OPENING-FEE.md` for the policy and the registration contract.

---

## Defence layers

### 1. Transport & security headers (`vercel.json`)
Set on every response:
- **Content-Security-Policy** — restricts script/style/connect/frame origins. Stripe is admitted only where the Payment Element needs it: `js.stripe.com` + `*.js.stripe.com` (script + frame), `hooks.stripe.com` (3-D Secure frame), `api.stripe.com` (connect), plus `fonts.googleapis.com` (connect) for the card form's Inter stylesheet, which Stripe.js fetches from our page. `frame-src` allows nothing else. The same policy must be set at Nginx off Vercel (`docs/DEPLOY.md` §6).
- **Strict-Transport-Security** — `max-age=31536000; includeSubDomains`.
- **X-Content-Type-Options: nosniff**, **X-Frame-Options: SAMEORIGIN**, **Referrer-Policy: strict-origin-when-cross-origin**, **Permissions-Policy** (camera/mic/geolocation/FLoC off).

### 2. Rate limiting (`lib/rate-limit.js`)
Sliding-window limiter, two backends: **Upstash Redis** (preferred, consistent across instances) and an **in-memory Map** fallback. Layered per-IP **and** per-recipient/token buckets; first to trip short-circuits with **`429 + Retry-After`**:

| Endpoint | Limits |
|----------|--------|
| `send-analysis` | 10/min + 50/hr per IP; 5/hr per recipient email |
| `send-verify-code` | 3/min + 10/hr per IP; 5/hr per email |
| `verify-code` | 30/10 min per IP; **5/10 min per token** (the brute-force lock) |
| `hubspot-lead` | per-IP caps |
| `opening-fee` create | 5/min + 20/hr per IP; **5/hr per email** (trimmed + lowercased; card testing reuses one form fill across IPs), counted only for requests that pass validation on a configured server, so junk requests quoting someone's work address can't lock them out of paying |
| `opening-fee` confirm | 20/min + 120/hr per IP |
| `opening-fee` promo | **10/min + 30/hr per IP** (each check says whether a code exists, so codes must not be enumerable; a malformed code answers the same `invalid` without a Stripe call) |

> **Operational:** set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in Vercel prod, else the limiter degrades to per-instance memory (a distributed attacker can partially bypass; single-source spam is still cut).
>
> **Client IP.** `clientIp` takes the left-most `X-Forwarded-For` entry (capped at 64 chars), which is the client only when the proxy overwrites that header. Vercel does. Off Vercel, Nginx must set `X-Forwarded-For $remote_addr` after `real_ip_header CF-Connecting-IP` from Cloudflare's ranges (`docs/DEPLOY.md` §6); appending with `$proxy_add_x_forwarded_for` lets a client choose its own first entry and walk around every per-IP limit.

### 3. Anti-spam (`lib/anti-spam.js`) — on `send-analysis`, `hubspot-lead`, `opening-fee` create (all three gates), `opening-fee` confirm (origin only: it fires automatically after a Stripe redirect, so a form-age gate would reject a paid customer) and `opening-fee` promo (origin only: a pasted code is checked within seconds of the page loading)
Three cheap server-side gates: **honeypot** (hidden `website` field), **origin allow-list** (reject mismatched cross-origin POST; allow missing Origin; a Vercel preview passes only as the deployment's own host from `VERCEL_URL` / `VERCEL_BRANCH_URL` / `VERCEL_PROJECT_PRODUCTION_URL`, never by a `*.vercel.app` name pattern, which anyone can register), **time-gate** (reject submits under 3 s or over 24 h; the paywall re-stamps a stamp older than 23 h on the visitor's next interaction). Generic rejection message; logged `x-forwarded-for` is CR/LF-stripped + capped. The email CTA allow-list (`safeSessionLink`) uses the same hosts.

### 4. Input validation at the boundary (`api/*`)
Email regex-validated/trimmed/lowercased; PDF capped at 2.5 MB; filenames `^[A-Za-z0-9_\-.]+\.pdf$`; language code `^[a-z]{2,5}$`. Server-side, never trusting the client.
Opening fee (`lib/opening-fee.js`): country `^[A-Z]{2}$`; email ≤254, no `..`, trimmed + lowercased; plan/entity whitelists; `acceptedTerms === true`; attemptId `^[A-Za-z0-9_-]{8,64}$`; PaymentIntent id `^pi_[A-Za-z0-9]{8,}$` (so a crafted id can't walk the Stripe URL path); promo code trimmed + uppercased to `^[A-Z0-9_-]{3,32}$` (`lib/opening-fee-promo.js`; anything else is `invalid` / `400 promo_invalid` before any Stripe call, and the promotion-code id written to is checked against `^promo_[A-Za-z0-9]+$`). Only these fields are read: anything else (e.g. `companyName` / `companyNumber` from a client cached before those fields were dropped) is ignored, never an error and never forwarded to Stripe.

### 5. Output encoding / XSS (`lib/send-analysis-validators.js`)
The outbound analysis email is HTML built from client-supplied localized copy. All of it is sanitised:
- **`escapeHtml`** + **`sanitizeEmailStrings`** — every client string (plan/entity/persona/forwarder + the whole `emailStrings` copy bundle) is HTML-escaped + length-capped.
- **`safeSubject`** — subject is CR/LF-stripped + capped (mail-header injection).
- **URL allow-lists** — `safeSessionLink` (the "Start setup" CTA → only altery.com / `app.altery.com` / our vercel host) and `isAllowedBookingURL` (Google Calendar only). Any non-allowed URL collapses to a safe default, so a client can't repoint the email's links at a phishing page.

### 6. Email verification (`api/send-verify-code.js` + `api/verify-code.js`)
**Stateless HMAC**, no database: issuer signs `HMAC(email:code:exp, VERIFY_SECRET)` and returns an opaque token (the code is never in the token; the secret never on the wire). Verifier recomputes + compares with **`timingSafeEqual`** (constant-time) after validating token shape, 6-digit format, and 10-min expiry. **Brute-force lock:** 5 attempts per token / 10 min.

### 6a. Payments (`api/opening-fee.js`, `lib/stripe.js`)
- **Server-authoritative amount.** Amount (10000), currency (`gbp`), the method type (`payment_method_types: ["card"]`) and automatic capture come from `lib/opening-fee.js`; a client-sent amount is ignored. Apple Pay and Google Pay are card wallets on that same type; Stripe shows them only on a domain registered with it, over HTTPS. Link is switched off in the UI. The client mirror `EC_OPENING_FEE` is display-only and a test fails if it drifts.
- **Confirm never trusts the browser.** The token is minted only after the server re-reads the PaymentIntent from Stripe and sees `status=succeeded`, `amount=10000`, `currency=gbp`, `metadata.kind=account_opening_fee`. Any other PI (another integration on the account, wrong amount) answers `404 not_found`.
- **Idempotency.** `Idempotency-Key` = the client's per-click attemptId, so a duplicated create can't open a second PaymentIntent.
- **No leakage.** Stripe errors map to `502 {"error":"stripe_error"}`; Stripe's message never reaches the client. Logs carry only status + Stripe error type/code, stripped to identifier characters (no log injection, no key echo). Responses are `Cache-Control: no-store` (they carry a client_secret or token).
- **Publishable-key guard.** `GET /api/opening-fee` serves the publishable key only if it starts with `pk_`; a secret key pasted into that variable disables the paywall instead of being published.
- **Safe off switch.** Without all three secrets (or with a token secret under 32 characters) the endpoint reports `enabled:false` / `503 not_configured`, logs which variable is at fault (names only, never values), and the checker keeps the direct registration CTA.
- **No double charge on a lost answer.** The paywall records each PaymentIntent in the tab before `confirmPayment`. A Stripe error without a PaymentIntent (lost connection, API error) is never read as a decline: the server re-reads the PI, and the next click settles that PI before any new one is created. "You haven't been charged" appears only when Stripe (card/validation error, redirect_status=failed) or the server said so; "your payment went through" only when Stripe said succeeded.
- **Promo codes are priced server-side** (`lib/opening-fee-promo.js`, 2026-09-23). Codes are Stripe promotion codes; the client sends only the code, the server looks it up (`GET /v1/promotion_codes?code=…&active=true`) and computes the discounted amount itself, on `promo` (the live check) and again on `create` (never trusting the earlier answer). A discounted PaymentIntent carries `promo_code`, `promo_id`, `original_amount`, `discount_amount` in its metadata, and `confirm` accepts it only when `original_amount` is the fee and `amount = original_amount − discount_amount`; any PI with a `promo_code` whose figures don't add up is `404 not_found`. A Stripe outage during a lookup is `502`, never "invalid".
- **One redemption per work email, kept by us.** Stripe cannot redeem a promotion code against a PaymentIntent, so the ledger is Stripe Customer objects (`metadata.kind = opening_fee_promo`, `promo_code`, email; found by `GET /v1/customers?email=`). `create` refuses a code this normalized email already redeemed (`400 promo_used`). A **free** code (fee under Stripe's 30p minimum, e.g. FREE100) creates no PaymentIntent: the Customer is written with an Idempotency-Key derived from `sha256(email, code)` (two tabs redeeming at once get one record, one token) and its id stands in for `pi` in the token. A discounted payment's redemption is written after `confirm`, idempotent per PaymentIntent, and never blocks a paid customer's token. Stripe's own `times_redeemed` / `max_redemptions` do not apply; our best-effort counter lives in the promotion code's `metadata.redemptions`.

### 6b. Opening token (`lib/opening-fee-token.js`)
Stateless HMAC like §6: `v1.<payload>.<sig>`, `sig = HMAC-SHA256(OPENING_FEE_TOKEN_SECRET, "v1." + payload)`, payload `{pi, cc, iat, lm}` plus `promo` (the code, `^[A-Z0-9_-]{3,32}$`) only when a promo code was used; `pi` is a PaymentIntent id (`pi_…`) or, for a free redemption, the ledger Customer's id (`cus_…`), which registration stores under the same UNIQUE constraint. Verified with **`timingSafeEqual`**, non-canonical base64url rejected, shape-checked; any garbage verifies to `null`, never throws. Deterministic per payment (`iat` = PI creation time), so reloads and redirect returns re-issue the same token. **No company in the token:** registration binds the payment at first use. The first application that arrives with the token claims it (`pi` stored under a UNIQUE constraint, so two tabs submitting at once can't both win), a second application with the same `pi` is refused with a message that routes to support, and an application whose country of incorporation differs from `cc` may be flagged. The Node verifier `docs/OPENING-FEE.md` hands to registration is executed by `test/openingFee.test.mjs` against real tokens. **No expiry by policy** (a paid attempt stays valid). The secret is shared with the registration app, at least 32 characters (registration trusts the signature alone, so a short secret could be brute-forced from any one genuine token); rotating it invalidates tokens not yet used. **`lm` = Stripe livemode, inside the signature:** test payments are free, so production verification refuses `lm:false` (`verifyOpeningToken(…, { allowTestMode })` is for staging only). That backs up the primary rule: each environment has its own secret, and the production one never sits on a staging/preview/local deploy.

### 7. Secrets
All in env vars (or Docker secret files hydrated by `server.js`), never in the repo/client: `BREVO_API_KEY`, `VERIFY_SECRET`, `UPSTASH_REDIS_REST_URL/TOKEN`, `FROM_EMAIL`, `STRIPE_SECRET_KEY`, `OPENING_FEE_TOKEN_SECRET`. `STRIPE_PUBLISHABLE_KEY` is public by design (served to the browser) but still set via env so test/live switch together.

### 8. Privacy & consent
- **Cookie consent** (`cookie-consent.js`) — Microsoft Clarity loads only after explicit opt-in; "Reject" keeps it off. First-party consent cookie (~6-month expiry, PECR/ePrivacy).
- **Privacy-policy consent** — a required checkbox on the contact-our-team form.
- **Contact details in the handoff URL (PII policy, founder decision 2026-06-15).** To let the external registration pre-fill, `ecBuildHandoffURL` forwards contact details as URL params — but only when a call-site opts in, so each surface carries the minimum it holds: the anonymous **web CTA passes none**; the **PDF/email links carry the user's own email** (which they gave us to receive the proposal); the **Sales-callback flow carries firstname/lastname/phone/email/company** (entered on a consented form); the **paywall carries the email + the `opening` token** (the email is the only thing typed on the paywall; it asks for no company details). PDF/email "Start setup" links now return to the checker (`/?resume=…`) rather than registration, so they can't bypass the fee. The trade-off is accepted knowingly: GET params surface in server logs, browser history, and the `Referer` header. Email is dropped unless it parses as an address. `test/handoffUrl.test.mjs` pins the gating (no-`opts` call ⇒ zero PII).

---

## Per-endpoint protection matrix

| Endpoint | Method | Rate-limit | Anti-spam | Notes |
|----------|--------|:---------:|:---------:|-------|
| `send-analysis` | POST | ✅ | ✅ | + email/PDF validation, XSS escaping, URL allow-lists |
| `send-verify-code` | POST | ✅ | — | HMAC token issue, 10-min TTL |
| `verify-code` | POST | ✅ | — | constant-time HMAC verify + brute-force lock |
| `hubspot-lead` | POST | ✅ | ✅ | CRM lead forward (UTM attribution) |
| `opening-fee` | GET | — | — | public fee config; publishable key only, `pk_` guard |
| `opening-fee` create | POST | ✅ | ✅ | field validation, server-fixed amount, idempotency key; optional promo code looked up in Stripe + ledger check |
| `opening-fee` confirm | POST | ✅ | origin | server-side PI re-read (discount must add up), HMAC token, ledger write for a discounted payment |
| `opening-fee` promo | POST | ✅ | origin | Stripe promotion-code lookup + ledger check; `{valid, reason}` only, never a Stripe message |

---

## Tests (`test/`, run with `node --test test/*.test.mjs`) — 292 tests

Security / boundary coverage:
- **`sendAnalysisValidators.test.mjs`** — `escapeHtml` (XSS payloads), `safeSessionLink` / `isAllowedBookingURL` (phishing/allow-list incl. `app.altery.com`), `sanitizeEmailStrings`, `safeSubject` (header injection).
- **`antiSpam.test.mjs`** — honeypot, origin allow-list, time-gate.
- **`handoffUrl.test.mjs`** — the "Start setup" redirect targets the external app with the full non-PII profile + first-touch UTMs (no internal `/setup`); crypto flag only when served; PII rides the URL **only** when a call-site opts in (web CTA ⇒ zero PII).
- **`ecRecommendEdge.test.mjs`** — recommendation never returns an undefined entity / never throws.
- **`noDashes.test.mjs`** — guards all checker i18n dicts against em/en-dash regressions.
- **`openingFee.test.mjs`** — fee constants + client mirror match, 32-char token-secret floor, validators (email-only payload, company fields from an old client ignored, field order), exact PaymentIntent metadata (no company keys), Stripe form encoding + client (headers, timeout, never throws), token round-trip / tamper / wrong secret / garbage / determinism with payload exactly `{pi, cc, iat, lm}`, test-mode tokens (`lm:false`) refused unless `allowTestMode`, and the registration snippet in `docs/OPENING-FEE.md` run against real tokens (must agree with `lib/opening-fee-token.js`).
- **`openingFeeApi.test.mjs`** — the handler against a stubbed Stripe: config on/off + no secret in it, short secret ⇒ off, every create field rejected, company fields from an old client ignored and never forwarded, terms, anti-spam, exact PaymentIntent params (metadata key set) + Idempotency-Key, client amount ignored, Stripe errors → 502 without message, per-IP and per-email rate limits (normalized; junk requests can't lock an address out), confirm (succeeded → `{ok, token, email, country, plan, entity}` + verifying token, old company metadata not echoed, bad country metadata → 502, test-mode PI → `lm:false` token, wrong amount/currency/kind → 404, unpaid → 402, malformed id → 400 before Stripe). Promo codes: the `promo` action (valid/partial/invalid/expired/used, exact lookup query, ledger read by normalized email, malformed codes never reach Stripe, outage → 502 not "invalid", 503/403, 10/min per IP), create with a free code (no PaymentIntent, Customer written with the exact metadata + hashed Idempotency-Key, counter bumped, `{free, token, …}` with a `cus_` + `promo` token; used → 400; failed write → 502, no token), create with a partial code (PI for the discounted amount + promo metadata, answer carries amount/display, used → 400), confirm of a discounted PI (accepted, `promo` in token and answer, ledger written once with `payment_intent`, re-confirm writes nothing, ledger failures never block the token, figures that don't add up → 404, full-price PI unchanged).
- **`openingFeePromo.test.mjs`** — `lib/opening-fee-promo.js`: code normalization, classification of Stripe's promotion_code object (invalid/expired/ok, counter parsing), discount maths (percent, GBP amount_off, rounding, 30p floor ⇒ free, foreign currency ⇒ invalid), `formatGbp`, and the Stripe calls with their exact request shapes (lookup query, `GET /v1/customers?email=&limit=100`, `POST /v1/customers` form body + Idempotency-Key, counter read/write, refused ids make no call, failures never throw).
- **`clientIp.test.mjs`** — rate-limit IP extraction: left-most entry, fallbacks, length cap. **`server.test.mjs`** also pins that malformed percent-encoding answers 400 and the server stays up.

Product / data coverage: `i18nIntegrity` (10-lang key symmetry), `dataValidity`, `ecRecommend`, `ecCost`, `ecQualitativeMatrix`, `ecUtm`, `tariffUrls`, `personaMapping`, `jsxGlobals`, `syntax`.

**Not unit-tested (browser/DOM only):** the PDF render + pagination (html2canvas/jsPDF), React screen flows, cookie-consent DOM. Verify by generating a PDF / clicking through.

---

## Operational checklist before production
1. Set env vars in Vercel prod: `UPSTASH_REDIS_REST_URL/TOKEN` (rate-limit), `VERIFY_SECRET` (same value for both verify endpoints), `BREVO_API_KEY`, `FROM_EMAIL`.
2. Verify the Brevo sending domain (SPF/DKIM on `send.altery.com`) so transactional email isn't sandboxed.
3. Paywall: `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` (same mode) + `OPENING_FEE_TOKEN_SECRET` (`openssl rand -hex 32`, shared with registration through the secret store). Upstash matters more here: per-instance memory limits are weaker against card testing.
4. Register the checker's production domain in Stripe (Settings → Payment methods → Payment method domains, or `POST /v1/payment_method_domains` with `domain_name`) so Apple Pay / Google Pay appear; they never show on localhost. The domain isn't chosen yet, so this is a rollout step (`docs/DEPLOY.md` §9).
5. Registration enforces one application per payment: UNIQUE on the token's `pi` (`docs/OPENING-FEE.md` §5).

## By-design choices (not vulnerabilities)
- Endpoints are **unauthenticated** — pre-onboarding tool; defence is rate-limit + anti-spam + validation, not auth.
- The 6-digit verification code uses `Math.random` — fine because it's never on the wire (TLS), gated by an HMAC tied to email+exp, a 10-min TTL, and the 5-attempt lock.
- Onboarding + KYB are **external** (`app.altery.com`); this app collects no KYB data and never sees card data (Stripe iframe).
- `confirm` returns the email/country/plan/entity stored on a PaymentIntent to whoever presents its id. PI ids are unguessable and only reach the paying browser (and its history, via the 3-D Secure return URL); this is what lets a reload or redirect return finish the handoff without a login.
- The `promo` check answers whether a code exists to anyone who asks (that is its job); the 10/min + 30/hr per-IP limit and the 3-character minimum keep enumeration expensive, and a code is worth nothing without a work email that has not redeemed it. A free redemption's token is issued once, in the `create` answer; a lost answer leaves a ledger record and no token, which ops resolve by hand (`docs/OPENING-FEE.md` §8-9).
- The opening token is **proof of one payment**, not a login credential and not tied to a company when issued. Registration binds it at first use (UNIQUE `pi`, second application refused, optional `cc` mismatch flag). Accepted trade-off of the email-only paywall (founder decision 2026-09-23): a token that leaks (it rides a GET URL, so history and logs) can be claimed by whoever submits it first; the rightful payer then sees the "already used" message, and support compares the claiming application's email with the payment's `metadata.email`.
- The fee is **non-refundable** by product policy; an exceptional manual refund in Stripe does not revoke the token (ops flag the application by hand).
