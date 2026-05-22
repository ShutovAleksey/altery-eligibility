# Altery Eligibility Checker — Project Context

> **For Claude Code:** read this file first in any new session. After reading, run `git log --oneline -20` and `git status` to see the latest state.

---

## Working with this user

The user (Aleksey Shutov, founder/CEO of Altery) primarily works in **claude.ai web** with another Claude instance for strategy, design, and complex code generation. He uses **you (Claude Code in VS Code)** as the execution layer:
- Apply the changes the other Claude planned
- Run git operations (status / diff / add / commit / push)
- Search the repo, find files, run scripts
- Handle anything that needs the local filesystem or terminal

Workflow expectation:
- He gives you a task (often pasted from claude.ai conversation)
- You execute, show diff, ask permission before destructive operations
- He approves → you push to GitHub → Vercel auto-deploys

When in doubt — show him the diff/plan before committing. He values seeing the change before it goes live.

---

## What this project is

A two-surface React app deployed at `altery-eligibility.vercel.app`. Pre-onboarding tool for Altery Business banking.

1. **The checker** (`/`) — anonymous 5-question quiz that recommends entity (UK / EU / MENA) and plan (Starter / Pro / Ultra), ends with a "Your savings opportunity" hook + email-capture PDF + "Start setup" CTA.
2. **The onboarding** (`/setup/`) — 14-step KYB flow that receives URL params from the checker handoff and includes a real Stripe Payment Element activation step.

---

## Current architecture (post-refactor)

The checker used to be a single ~13,000-line `index.html`. As of mid-May 2026 it's modular across 15 files. `index.html` is now ~200 lines — meta, CDN scripts, script-load manifest, i18n bootstrap, `ReactDOM.createRoot(<EcApp />)`. Everything else lives in its own module.

```
altery-eligibility/                       ← GitHub repo, deployed to Vercel
│
├── index.html                            ← ~200 lines: <head>, CDN, script order, createRoot
├── checker.css                           ← All checker styles (~2700 lines, was inline in <style>)
│
├── components.jsx                        ← Shared AlteryPay DS (Button, Input, Tag, Modal, …)
├── icons.jsx                             ← Shared Icon + 60+ icon SVGs (used by checker AND setup)
│
│ ─── CHECKER MODULES ────────────────────────────────────────────
├── checker-atoms.jsx                     ← Title / Field / WhyWeAsk
├── checker-flag-lang.jsx                 ← useT hook, Flag, LangSwitcher (loads early)
├── checker-screens.jsx                   ← EcApp + EcIco + question/result screens
├── checker-modals.jsx                    ← Fees / Perks / PlanCompare / Handoff / Payment modals
│
├── checker-data.js                       ← EC_COUNTRIES, EC_PLANS, EC_ENTITIES (13 constants)
├── checker-helpers.js                    ← ecRecommend, ecComputeCostBreakdown, ecFormatVolume, …
├── checker-pdf-assets.js                 ← EC_ALTERY_LOGO_B64 + EC_BOOKING_URL
├── checker-pdf.js                        ← ecLoadStripe, ecWaitForPdfLibs, ecBuildAnalysisHTML, ecSendAnalysisEmail
│
├── inline-flags.js                       ← 247 country flag SVGs as base64 data URIs (window.__FLAGS)
├── i18n-dict-ec.js                       ← English source strings
├── i18n-dict-ec-translations.js          ← German + Russian
├── i18n-dict-ec-nl-tr.js                 ← Dutch + Turkish
├── i18n-dict-ec-it-es.js                 ← Italian + Spanish
├── i18n-dict-ec-pl-pt-fr.js              ← Polish + Portuguese + French
├── i18n-dict-ec-countries.js             ← Localised country + corridor names (10 langs)
│
│ ─── ONBOARDING (modular bundle in /setup/) ─────────────────────
├── setup/index.html                      ← Entry; loads scripts in dependency order
├── setup/tokens.css, onboarding-flow.css, onboarding-payment.css, i18n.css
├── setup/i18n.js + 4 dict files          ← 10 languages
├── setup/i18n-react.jsx                  ← useT hook + LangSwitcher for setup
├── setup/flags.jsx                       ← Setup-specific Flag with hardcoded SVGs
├── setup/date-picker.jsx, phone-input.jsx
├── setup/onboarding-atoms.jsx            ← Ico, Field, TopRow, Title, WhyWeAsk, Celebrate
├── setup/onboarding-shell.jsx            ← Header with progress, sections
├── setup/onboarding-screens-1.jsx        ← prep → welcome → password → verify → phone → country → business-info → activity
├── setup/onboarding-screens-2.jsx        ← documents → ubo-list → ubo-form → review → submit
├── setup/onboarding-screens-payment.jsx  ← Plan card + ScreenActivation (real Stripe Payment Element)
├── setup/onboarding-app.jsx              ← Main App, ALL_STEPS, URL param parsing, formState reducer
└── setup/assets/                         ← Logos (white/dark), 245 country flag SVGs
│
├── api/                                  ← Vercel serverless functions
│   ├── config.js                         ← Shared config (Stripe keys env-loaded)
│   ├── create-payment-intent.js          ← Stripe PaymentIntent creation (manual capture for presubmit)
│   └── send-analysis.js                  ← Resend email delivery with PDF attachment
├── images/                               ← Checker brand assets + perk illustrations
├── vercel.json                           ← cleanUrls + rewrite /setup/:token → /setup/index.html
├── package.json
├── CLAUDE.md                             ← This file
├── BUGS-AND-FIXES.md                     ← Bug tracker, fix patterns
├── README.md                             ← Public-facing repo readme
├── RESULT-REDESIGN-BRIEF.md              ← Current strategic initiative (see below)
└── altery-eligibility-checker-hypothesis.pdf  ← Research basis for the redesign
```

### How modules talk to each other

Every JSX module is loaded as a separate `<script type="text/babel">`; classic `.js` modules use plain `<script>`. They share data through `window.X` assignments at the bottom of each file (`Object.assign(window, { … })`), or via cross-script Lexical Declarations for `const`s. React hooks (`useState` / `useEffect` / `useRef` / `useMemo` / `useLayoutEffect` / `useSyncExternalStore`) are destructured ONCE at the top of `/checker-flag-lang.jsx`; every other classic script resolves them at render time from the per-realm lexical slot.

**Do not redeclare hooks at top-level of another `<script type="text/babel">` file** — Babel-standalone's compiled output collides on the per-realm lexical slot and throws `Identifier 'useState' has already been declared` at appendChild (same family as the historical `_excluded` bug).

---

## How the two surfaces connect

1. User lands on `/` → answers 5 questions → sees result page with cost-projection hook
2. Optionally emails themselves the PDF proposal (Resend via `/api/send-analysis`)
3. Clicks "Start setup" → `window.location.href = "/setup?token=…&plan=pro&entity=uk&currency=GBP&volume=750000"`
4. Onboarding reads URL params, skips prep checklist, goes straight to welcome
5. 13 KYB screens → real Stripe Payment Element for activation fee (presubmit auth)
6. Payment success → `ScreenSubmit` shows "Application in review"

---

## Tech stack

- **No build step.** React 18 + Babel Standalone (compiled in-browser). Trade-off accepted: simpler ops, ~1s first-load Babel compile.
- **Vercel** for hosting + serverless functions (10s `maxDuration` on `api/*.js`).
- **Stripe** for payment — real Payment Element on activation, manual capture for presubmit. Live keys via Vercel env vars.
- **Resend** for transactional email (PDF base64-attached). Sandbox `onboarding@resend.dev` only ships to account-owner — domain verification needed for prod (see BUGS-AND-FIXES.md → I-001).
- **html2canvas + jsPDF** UMD (from CDN) for PDF generation in `/checker-pdf.js`. Invisible 0×0 mounted-wrapper trick.

---

## Brand & design tokens

- Primary navy: `#002780` — corporate, headers, primary CTAs
- Accent: `#006FFF` — links, focus rings, secondary actions
- Header dark navy: `#000537` — `.ec-header` background
- Beige: `#F0EBE3` — outcome callouts, account-team panel
- Savings orange: `#C2410C` text on `#FFF7ED` bg — loss-framed "leaving on the table"
- Ink: `#11141A`, Muted: `#69707C`, Border: `#D7DAE0`
- Success: `#0A9F52`, Danger: `#CD1918`, Warning: `#FF771C`
- Fonts: Inter for UI, IBM Plex Mono for numbers/code
- Radii: `--r-md` 12px (default Input radius), `--r-sm` 8px, `--r-lg` 16px
- Focus shadow: `--sh-focus = 0 0 0 3px rgba(0,111,255,0.30)`

---

## 🚧 CURRENT INITIATIVE — Result page redesign

Full brief: **`RESULT-REDESIGN-BRIEF.md`** (read it before touching result-page code).
Research basis: **`altery-eligibility-checker-hypothesis.pdf`** (skim only).

**Why now:** primary research (Signicat, Fenergo, McKinsey, Forrester, Gartner) confirms:
- B2B buyers are 80% self-directed and bring ~13 stakeholders → the result page IS the artifact, must be shareable
- Treasurers asking why business banking is harder than personal banking → premium-document feel needed
- No competitor (3S Money, Revolut, Wise, Airwallex, Mercury, Brex) does personalised cost projection vs typical bank → lean into this hard

**What changes:** 7 sections (A→G) replacing the current result page. Hero is the savings number (massive type), then rationale, outcome cards, 5-minute prep affordance, PDF/share section, trust strip, footer CTA repeat. Type/colour/spacing system specified strictly in the brief.

**Process:** 3 passes per the brief — structure first, copy+i18n second, motion+polish third. Each pass is its own commit so any can be reverted independently.

**Status:** brief landed in repo, awaiting kickoff signal from user. Don't start Pass 1 without confirmation.

---

## Recent major iterations (newest first)

**Result-page-and-handoff UX polish (May 18)**
- Q2 (country): dropped entity-routing leak (4 tag keys × 10 langs + "Why UK, not EU?" callout)
- Q3 (services): no checkboxes pre-selected by default
- Savings-opportunity block: redesigned with side-by-side bank-vs-Altery comparison row + bigger savings band
- Handoff modal: "Or send me the proposal" + "Back" are now paired DS ghost Buttons; Work-email field uses canonical DS Input (extended Input with autoFocus/inputMode/autoComplete/onKeyDown/etc.)
- Fix: `.lang-menu__flag` centering bug (missing `display: inline-flex`)

**Modular refactor (May 17–18)** — `index.html` 13,338 → 204 lines (−98.5%)
- Pulled DS primitives, screens, modals, data, helpers, PDF logic, i18n dicts, flags bootstrap, and CSS each into their own file (~15 modules total)
- Dropped `{...rest}` from canonical DS components (IconButton/Input/Textarea/Card) to defeat Babel-standalone's `_excluded` helper collision across scripts
- Single React-hook destructure now lives in `/checker-flag-lang.jsx` (loaded early); all other files resolve hooks via cross-script Lexical Declarations

**Real Stripe Payment Element in onboarding (~May 17)** — closes old I-002
- `ScreenActivation` mounts the Payment Element, calls `/api/create-payment-intent` with manual capture, confirms via `stripe.confirmPayment`
- Plan prices real; presubmit auth refunded on KYB reject

**Onboarding flow integration (May 17)**
- Copied Claude Design's onboarding bundle into `setup/`
- Added `payment` step between `review` and `submit` in `ALL_STEPS`
- Checker handoff redirects to `/setup` with URL params
- Vercel rewrite preserves `/setup/{token}` pretty URL from PDF/email

**Psychological sales conversion (May 15)**
- "Your savings opportunity" loss-framed hook
- PDF: cost-projection table, outcomes block, comparison vs typical bank, onboarding checklist, signature, validity
- Helper `ecComputeCostBreakdown(rec)` — FX 0.65% vs 2.5%, SWIFT €10+0.25% vs €40

**Email delivery via Resend (May 14)**
- `/api/send-analysis` with PDF attached as base64
- Sandbox-only until domain verification (see I-001)

---

## Still-open issues / mocked surfaces

Tracked in detail in **BUGS-AND-FIXES.md**. Headline list:

1. **Resend domain verification** (I-001) — currently sandbox can only ship to account owner. Verify `send.altery.com` in Resend dashboard + set `FROM_EMAIL` env var in Vercel.
2. **KYB submission backend** — `ScreenSubmit` is a static state; needs `/api/submit-kyb` forwarding to KYB provider.
3. **`ecFeeRegion` and `ecHeroIdentifier`** — referenced by EcFeesModal and EcEntityHero but never defined. Those modal/hero paths throw ReferenceError when opened. Pre-existing, not from the refactor.
4. **Currency mapping for MENA** — checker passes `currency: rec.entity.id === "uk" ? "GBP" : "EUR"`. MENA entities may want USD.

---

## Conventions

- **Comments**: explain *why* not *what*. Code shows what; comments explain decisions, constraints, tradeoffs.
- **i18n keys**: dot-separated. `ec.*` = eligibility checker, `ob.*` = onboarding. Example: `ec.r.opportunity.head`, `ob.step.payment`.
- **i18n files & language order**:
  - Checker EN → `i18n-dict-ec.js`
  - Checker DE + RU → `i18n-dict-ec-translations.js`
  - Checker NL + TR → `i18n-dict-ec-nl-tr.js`
  - Checker IT + ES → `i18n-dict-ec-it-es.js`
  - Checker PL + PT + FR → `i18n-dict-ec-pl-pt-fr.js`
  - Country & corridor names → `i18n-dict-ec-countries.js` (all 10 langs in one file)
  - Onboarding → `setup/i18n-dict-ob*.js` (4 files, same pattern)
  - **Every new visible string needs translations in all 10 languages.**
- **CSS naming**: BEM-ish — `.ec-block__element` for checker, `.ob-block__element` for onboarding, `.pp-` for payment.
- **No build dependencies for SPA code.**
- **DS Button variants** (from `/components.jsx`): `primary` (the action), `accent`, `secondary` (accent-soft bg), `outline` (transparent + border), `ghost` (cancel/back), `danger`, `dangerSoft`, `link`. One primary CTA per screen.
- **DS Input now forwards** `autoFocus / autoComplete / inputMode / name / maxLength / pattern / onKeyDown` (added in the handoff-modal fix) — use the DS `<Input>` rather than bespoke `<input>` whenever possible.
- **Always test PDF generation** after changes to `ecBuildAnalysisHTML` or `ecSendAnalysisEmail`.

---

## Vercel deploy traps (learnt the hard way)

1. **Don't put `runtime: "nodejs20.x"` in `vercel.json`'s `functions` block.** AWS Lambda syntax, not Vercel. Either omit `runtime` (Vercel auto-detects) OR use `"runtime": "@vercel/node@5.4.2"`.
2. **`cleanUrls: true` + relative paths = 404 cascade.** All `setup/` asset paths must use absolute `/setup/...` prefix.
3. **Vercel rewrites apply to all matching routes.** A rewrite for `/setup/:token → /setup/index.html?token=:token` will also rewrite `/setup/assets/...` unless the rewrite source is specific enough.

---

## Useful commands

```bash
# Local preview
npx vercel dev

# Syntax-check an API or extracted module
node --check api/send-analysis.js
node --check checker-helpers.js

# Find every reference to an i18n key
grep -rn "ec\.r\.opportunity\.head" --include='*.js' --include='*.jsx' --include='*.html' .

# Audit translation completeness — must be 10 occurrences per checker key
for k in "ec.r.opportunity.head" "ec.handoff.email.label"; do
  echo "$k: $(grep -c "\"$k\"" i18n-dict-ec*.js)"
done

# Test full build locally (mimics Vercel)
npx vercel build
```

---

## Don't do these things

- Don't redeclare `const { useState, … } = React;` at top level of any module — owned by `/checker-flag-lang.jsx`. Babel-standalone's per-realm lexical slot collides → SyntaxError at appendChild.
- Don't add `{...rest}` to a DS component in `/components.jsx` — same Babel-standalone issue with the `_excluded` helper.
- Don't use `localStorage` in React artifacts inside Claude.ai sandbox — blocked. Use React state.
- Don't put `<form>` tags in inline-Babel JSX — Babel-standalone doesn't handle native form submission. Use `<button onClick>`.
- Don't add a build step (webpack/vite) without strong reason — intentional architecture decision.
- Don't invent Altery capabilities (Confirmed / In progress / Provider-dependent / Unknown statuses).
- Don't reproduce 20+ words verbatim from any source — copyright. Paraphrase.
- Don't hardcode "Step N of M" eyebrows — breaks when flows change.
- Don't use relative paths in HTML inside `/setup/`.
- Don't put `runtime: "nodejs20.x"` in `vercel.json`.
- Don't ship in English-only — every visible string must be translated to all 10 langs.
