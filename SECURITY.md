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
> carrying first-touch UTMs + plan/entity/currency/volume context
> (`ecBuildHandoffURL` in `checker-helpers.js`). No payment or KYB data is
> collected or stored by this app anymore.

---

## Defence layers

### 1. Transport & security headers (`vercel.json`)
Set on every response:
- **Content-Security-Policy** — restricts script/style/connect origins (Stripe origins removed; `frame-src 'none'`).
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

> **Operational:** set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in Vercel prod, else the limiter degrades to per-instance memory (a distributed attacker can partially bypass; single-source spam is still cut).

### 3. Anti-spam (`lib/anti-spam.js`) — on `send-analysis` + `hubspot-lead`
Three cheap server-side gates: **honeypot** (hidden `website` field), **origin allow-list** (reject mismatched cross-origin POST; allow missing Origin + vercel-altery previews), **time-gate** (reject submits under 3 s or over 24 h). Generic rejection message; logged `x-forwarded-for` is CR/LF-stripped + capped.

### 4. Input validation at the boundary (`api/*`)
Email regex-validated/trimmed/lowercased; PDF capped at 2.5 MB; filenames `^[A-Za-z0-9_\-.]+\.pdf$`; language code `^[a-z]{2,5}$`. Server-side, never trusting the client.

### 5. Output encoding / XSS (`lib/send-analysis-validators.js`)
The outbound analysis email is HTML built from client-supplied localized copy. All of it is sanitised:
- **`escapeHtml`** + **`sanitizeEmailStrings`** — every client string (plan/entity/persona/forwarder + the whole `emailStrings` copy bundle) is HTML-escaped + length-capped.
- **`safeSubject`** — subject is CR/LF-stripped + capped (mail-header injection).
- **URL allow-lists** — `safeSessionLink` (the "Start setup" CTA → only altery.com / `app.altery.com` / our vercel host) and `isAllowedBookingURL` (Google Calendar only). Any non-allowed URL collapses to a safe default, so a client can't repoint the email's links at a phishing page.

### 6. Email verification (`api/send-verify-code.js` + `api/verify-code.js`)
**Stateless HMAC**, no database: issuer signs `HMAC(email:code:exp, VERIFY_SECRET)` and returns an opaque token (the code is never in the token; the secret never on the wire). Verifier recomputes + compares with **`timingSafeEqual`** (constant-time) after validating token shape, 6-digit format, and 10-min expiry. **Brute-force lock:** 5 attempts per token / 10 min.

### 7. Secrets
All in Vercel env vars, never in the repo/client: `BREVO_API_KEY`, `VERIFY_SECRET`, `UPSTASH_REDIS_REST_URL/TOKEN`, `FROM_EMAIL`. (Stripe keys removed with the payment flow.)

### 8. Privacy & consent
- **Cookie consent** (`cookie-consent.js`) — Microsoft Clarity loads only after explicit opt-in; "Reject" keeps it off. First-party consent cookie (~6-month expiry, PECR/ePrivacy).
- **Privacy-policy consent** — a required checkbox on the contact-our-team form.

---

## Per-endpoint protection matrix

| Endpoint | Method | Rate-limit | Anti-spam | Notes |
|----------|--------|:---------:|:---------:|-------|
| `send-analysis` | POST | ✅ | ✅ | + email/PDF validation, XSS escaping, URL allow-lists |
| `send-verify-code` | POST | ✅ | — | HMAC token issue, 10-min TTL |
| `verify-code` | POST | ✅ | — | constant-time HMAC verify + brute-force lock |
| `hubspot-lead` | POST | ✅ | ✅ | CRM lead forward (UTM attribution) |

---

## Tests (`test/`, run with `node --test test/*.test.mjs`) — 142 tests

Security / boundary coverage:
- **`sendAnalysisValidators.test.mjs`** — `escapeHtml` (XSS payloads), `safeSessionLink` / `isAllowedBookingURL` (phishing/allow-list incl. `app.altery.com`), `sanitizeEmailStrings`, `safeSubject` (header injection).
- **`antiSpam.test.mjs`** — honeypot, origin allow-list, time-gate.
- **`handoffUrl.test.mjs`** — the "Start setup" redirect targets the external app with plan/entity/currency/volume + first-touch UTMs (no internal `/setup`).
- **`ecRecommendEdge.test.mjs`** — recommendation never returns an undefined entity / never throws.
- **`noDashes.test.mjs`** — guards all checker i18n dicts against em/en-dash regressions.

Product / data coverage: `i18nIntegrity` (10-lang key symmetry), `dataValidity`, `ecRecommend`, `ecCost`, `ecQualitativeMatrix`, `ecUtm`, `tariffUrls`, `personaMapping`, `jsxGlobals`, `syntax`.

**Not unit-tested (browser/DOM only):** the PDF render + pagination (html2canvas/jsPDF), React screen flows, cookie-consent DOM. Verify by generating a PDF / clicking through.

---

## Operational checklist before production
1. Set env vars in Vercel prod: `UPSTASH_REDIS_REST_URL/TOKEN` (rate-limit), `VERIFY_SECRET` (same value for both verify endpoints), `BREVO_API_KEY`, `FROM_EMAIL`.
2. Verify the Brevo sending domain (SPF/DKIM on `send.altery.com`) so transactional email isn't sandboxed.

## By-design choices (not vulnerabilities)
- Endpoints are **unauthenticated** — pre-onboarding tool; defence is rate-limit + anti-spam + validation, not auth.
- The 6-digit verification code uses `Math.random` — fine because it's never on the wire (TLS), gated by an HMAC tied to email+exp, a 10-min TTL, and the 5-attempt lock.
- Onboarding + payment are **external** (`app.altery.com`); this app no longer collects KYB or card data.
