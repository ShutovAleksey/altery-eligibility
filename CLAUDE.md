# Altery Eligibility Checker — Project Context

> **For Claude Code:** Read this file first in any new session. It carries the working context that's normally lost between chats. After reading, also do: `git log --oneline -20` to see recent changes.

---

## What this is

A single-page React app (Babel-compiled inline in `index.html`) deployed at `altery-eligibility.vercel.app`. Purpose: pre-onboarding eligibility checker for Altery Business banking — a 5-question quiz that recommends the right entity (UK / EU / MENA), plan (Starter / Pro / Ultra), and routes the user to KYB onboarding.

The whole system is **two surfaces**:
1. **The checker** — `/index.html` — anonymous quiz, ends with "Your savings opportunity" pitch + email-capture PDF proposal + "Start setup" CTA
2. **The onboarding** — `/setup/` — 14-step KYB flow imported from Claude Design (separate bundle of files, modular React with Babel)

## Architecture

```
altery-eligibility/                  ← GitHub repo, deployed to Vercel
├── index.html                       ← The CHECKER (single ~13k-line file, all React/JSX/CSS inline)
├── setup/                           ← The ONBOARDING (modular bundle from Claude Design)
│   ├── index.html                   ← Entry, loads scripts in dependency order
│   ├── tokens.css                   ← Design tokens (Altery navy #002780, accent #006FFF, etc.)
│   ├── onboarding-flow.css
│   ├── onboarding-payment.css
│   ├── i18n.js + 4 dict files       ← 10 languages: en/de/ru/nl/tr/it/es/pl/pt/fr
│   ├── components.jsx               ← Shared DS (Button, Input, Tag, Modal, etc.)
│   ├── icons.jsx, flags.jsx
│   ├── date-picker.jsx, phone-input.jsx
│   ├── onboarding-atoms.jsx         ← Title, Field, TopRow, WhyWeAsk
│   ├── onboarding-shell.jsx         ← Header with progress, sections
│   ├── onboarding-screens-1.jsx     ← prep → welcome → password → verify → phone → country → business-info → activity
│   ├── onboarding-screens-2.jsx     ← documents → ubo-list → ubo-form → review → submit
│   ├── onboarding-screens-payment.jsx  ← Plan card, payment screen (ScreenActivation)
│   ├── onboarding-app.jsx           ← Main App, ALL_STEPS, URL param parsing
│   └── assets/                      ← Logo (white/dark variants), 245 country flag SVGs
├── api/                             ← Vercel serverless functions
│   ├── config.js                    ← Shared config (Stripe keys env-loaded)
│   ├── create-payment-intent.js     ← Stripe PaymentIntent creation
│   └── send-analysis.js             ← Resend-based email delivery with PDF attachment
├── images/                          ← Checker brand assets + perk illustrations
├── vercel.json                      ← cleanUrls + rewrite /setup/:token → /setup/index.html?token=:token
└── package.json                     ← Vercel runtime deps (node 20.x)
```

## How the two surfaces connect

User flow:
1. Lands on `/` → answers 5 questions in checker → sees recommended entity + plan + cost-projection hook
2. Optionally emails themselves the PDF proposal (Resend email with attached PDF, both via `/api/send-analysis`)
3. Clicks "Start setup" → checker calls `EcHandoffModal.onContinueToSetup` → does `window.location.href = "/setup?token=...&plan=pro&entity=uk&currency=GBP&volume=750000"`
4. Onboarding at `/setup/` reads URL params, skips prep checklist, goes straight to welcome
5. User runs through 13 KYB screens
6. Hits the **payment screen** (`ScreenActivation` with `mode="presubmit"`) — authorises activation fee
7. Payment success → `ScreenSubmit` shows "Application in review"

## Tech stack

- **No build step**. React 18 + Babel Standalone (compiled in-browser). Trade-off: simpler ops, slower first load (~1s Babel compile). Will migrate to Vite when complexity demands.
- **Vercel** for hosting + serverless functions (10s max duration on `api/*.js`).
- **Stripe** for payment (test keys in env, live keys come from Vercel env vars).
- **Resend** for transactional email (PDF attachment via base64).
- **html2canvas + jsPDF** UMD (loaded from CDN) for PDF generation — not html2pdf wrapper. The 0×0 invisible-mounted wrapper trick is used; see `ecGenerateProposalPDF` in `index.html`.

## Brand & design tokens

- Primary navy: `#002780` (corporate, headers, primary CTAs)
- Accent: `#006FFF` (links, secondary actions)
- Header dark navy: `#000537` (.ec-header background, matches midnight-navy on altery.com)
- Beige: `#F0EBE3` (callout backgrounds, account-team panel)
- Savings orange: `#C2410C` text on `#FFF7ED` bg (loss-framed "leaving on the table" treatment)
- Ink: `#11141A` (text)
- Muted: `#69707C` (secondary text)
- Border: `#D7DAE0`
- Success: `#0A9F52`, Danger: `#CD1918`, Warning: `#FF771C`
- Fonts: Inter for UI, IBM Plex Mono for numbers/code

## Recent major iterations (newest first)

**Onboarding flow integration (May 17)**
- Copied Claude Design's onboarding bundle into `setup/`
- Added `payment` step between `review` and `submit` in ALL_STEPS
- `ScreenActivation` extended with `mode="presubmit"` — different eyebrow/title/CTA copy because the application hasn't been approved yet; authorisation captured on KYB approve, refunded on reject
- Checker's `onContinueToSetup` redirects to `/setup` with URL params; replaces the previous `EcPaymentModal` Stripe trigger
- Added `ob.step.payment` i18n key for 10 languages
- Vercel rewrite preserves pretty `/setup/{token}` URL from PDF/email

**Psychological sales conversion redesign (May 15)**
- Added "Your savings opportunity" loss-framed hook on result page
- PDF: cost-projection table (Altery vs typical bank), outcomes block ("what €X/year funds"), comparison table (8 rows), onboarding checklist, signature, validity notice
- Handoff modal: value-prop list before email capture, "now do these 3 things" after-send, send-to-colleague viral hook
- Helper `ecComputeCostBreakdown(rec)` — conservative coefficients, FX 0.65% vs 2.5%, SWIFT €10+0.25% vs €40 flat, 60% FX exposure assumption
- All 10 langs translated (~80 new keys per lang)

**Email delivery via Resend (May 14)**
- `/api/send-analysis` POSTs to Resend with PDF attachment as base64
- `FROM_EMAIL` env var (default sandbox `onboarding@resend.dev`)
- **Known issue**: sandbox only sends to account-owner email. Production needs domain verification on Resend dashboard (e.g. `send.altery.com`).

**PDF generation (May 11–14)**
- Direct `html2canvas` + `jsPDF` UMD loading (NOT html2pdf wrapper — its toContainer races html2canvas)
- 0×0 overflow:hidden wrapper for invisible-but-measurable mounting
- Canvas slicing per page (not full-image y-offset) keeps footer space clean for page numbers

## Mocked surfaces (these need real wiring before prod traffic)

1. **Onboarding payment is a UI mock.** `ScreenActivation` uses `setTimeout` to simulate Stripe processing. Real wiring: import Stripe.js into `setup/index.html`, replace fake card inputs with Stripe Payment Element, call `/api/create-payment-intent` on mount, `stripe.confirmCardPayment()` on submit. ~80 lines in `onboarding-screens-payment.jsx`.

2. **KYB submission backend.** `ScreenSubmit` shows "in review" as static state. Real wiring: new endpoint `/api/submit-kyb` that accepts onboarding state, forwards to KYB provider (Sumsub/Veriff/internal), returns ref ID.

3. **Onboarding form state persistence.** Each screen has its own `useState`, nothing persists across reload. Need central state collected into single object, saved to localStorage on every change, sent on submit.

4. **Resend domain verification.** Currently sandbox only works to account-owner email. Must verify `send.altery.com` (or chosen subdomain) in Resend dashboard before sending to customer addresses.

5. **Currency mapping for MENA.** Checker passes `currency: rec.entity.id === "uk" ? "GBP" : "EUR"`. MENA entities may want USD — confirm with product and extend the conditional.

## Conventions

- **Comments**: write the *why* not the *what*. Code shows what; comments explain decisions, constraints, tradeoffs.
- **i18n keys**: dot-separated namespace. EC = eligibility checker, OB = onboarding. Example: `ec.r.opportunity.head`, `ob.step.payment`.
- **i18n languages, file order**: en, de, ru, nl, tr, it, es, pl, pt, fr. Each new key must appear in all 10.
- **CSS naming**: BEM-ish — `.ec-block__element` for checker, `.ob-block__element` for onboarding, `.pp-` for payment.
- **No build dependencies for SPA code**. If you reach for webpack/vite, stop and reconsider — we've stayed inline-Babel intentionally so Vercel deploys are zero-config.
- **Stripe test keys** live in `.env.local` (gitignored) for dev, Vercel env vars for production.
- **Always test PDF generation** after changes to `ecGenerateProposalPDF` — the html2canvas + jsPDF pipeline is fragile (CDN script load order, async paint timing, page slicing). User-facing artifact, regressions are expensive.

## Useful commands

```bash
# Local preview (after `npm install -g vercel`)
vercel dev

# Lint check on serverless functions
node --check api/send-analysis.js

# Find untranslated keys
grep -rn "ec\.\|ob\." index.html setup/*.jsx | grep -v "i18n-dict"

# Audit translation completeness — should be 10 occurrences per key
for k in "ec.r.opportunity.head" "ob.step.payment"; do
  echo "$k: $(grep -c "\"$k\"" index.html setup/i18n-dict-*.js)"
done
```

## Don't do these things

- Don't use `localStorage` inside React artifacts the checker generates — claude.ai sandbox blocks them. Use React state instead.
- Don't put `<form>` tags in React Babel-compiled JSX — the inline Babel compiler doesn't handle native form submission cleanly. Use `<button onClick>`.
- Don't add a build step (webpack/vite) without a strong reason. The inline-Babel setup is deliberate.
- Don't invent Altery capabilities. Check `context/00_core_context_altery.md` in the Claude Design handoff bundle (if you have it) for confirmed/in-progress/provider-dependent status. Don't say "supports crypto" when crypto is provider-dependent.
- Don't reproduce 20+ words verbatim from any source the user provides — copyright. Paraphrase.
- Don't hardcode "Step N of M" eyebrows — breaks when flows change. Use neutral labels.
