# Bugs & Fixes — Altery Eligibility

Active and known issues, plus fix patterns for the most common recurring problems.

---

## 🟡 KNOWN ISSUES (not breaking, but tracked)

### I-001 — Resend sandbox can't send to non-owner emails

**Symptom:** Emails to anyone other than the Resend account-owner address fail silently or with a 422.

**Cause:** Resend's `onboarding@resend.dev` sandbox sender only ships to the email address registered with the Resend account. Intentional anti-abuse.

**Fix path (one-time setup, no code change):**
1. Resend dashboard → Domains → Add `send.altery.com` (sub-domain, not root)
2. Add the SPF / DKIM (3 CNAMEs) DNS records they output, at the registrar of `altery.com`
3. Wait ~15 min for verification (turns green in dashboard)
4. Vercel → Settings → Environment Variables → set `FROM_EMAIL=Altery <hello@send.altery.com>`
5. Redeploy

Also recommended at the same time:
- Add DMARC record `_dmarc.altery.com` TXT `v=DMARC1; p=none; rua=mailto:dmarc-reports@altery.com` (start with `p=none` for reporting; tighten after a few weeks)
- Why sub-domain: keeps the main `altery.com` reputation isolated from any future marketing sends. Stripe, Notion, Linear all do this.

**Code reference:** `api/send-analysis.js` lines 25–28 wire the `FROM_EMAIL` env var; default fallback is the sandbox sender.

---

### I-003 — KYB submission backend is a static UI state

`setup/onboarding-screens-2.jsx` → `ScreenSubmit` renders an "Application in review" status but nothing is actually submitted server-side. Need a real `/api/submit-kyb` endpoint that forwards `formState` (already collected via the `formState` reducer in `setup/onboarding-app.jsx`) to a KYB provider (Sumsub / Veriff / internal).

---

### I-004 — Currency mapping for MENA entities

In the checker's handoff redirect:

```js
currency: rec.entity.id === "uk" ? "GBP" : "EUR"
```

MENA entities probably want `USD` (or `AED`), not `EUR`. Small correctness issue; doesn't break anything but routes wrong currency hint into onboarding.

---

### I-005 — `ecFeeRegion` and `ecHeroIdentifier` are referenced but undefined

Found during Pass 2.2 of the refactor. `EcFeesModal` and `EcEntityHero` (in `/checker-modals.jsx` and `/checker-screens.jsx`) call these helpers; they were never defined anywhere in the codebase. Code paths that hit them throw `ReferenceError`. Pre-existing — not introduced by the refactor.

Likely fix: stub `ecFeeRegion(entity)` to return `entity.id === "mena" ? "mena" : "uk-eu"` (or whatever the EC_FEE_SCHEDULE key shape is); stub `ecHeroIdentifier(entity)` to return the first non-SWIFT-only account from `entity.accounts`. Both belong in `/checker-helpers.js`.

---

## ✅ FIXED (kept here as a "do not regress" reference)

### B-000 — Vercel build fails with "Function Runtimes must have a valid version"
Fixed in `48bb016` and follow-up. `vercel.json` had `"runtime": "nodejs20.x"` in the `functions` block — that's AWS Lambda syntax, not Vercel. Either omit `runtime` (Vercel auto-detects from package.json) or use `"runtime": "@vercel/node@5.4.2"`.

### B-001 — `/setup` returns 404 on all assets
Fixed early May 17. Caused by `cleanUrls: true` serving `/setup/index.html` at the bare URL `/setup`, which makes the browser treat `setup` as a file and resolve all relative paths against the parent. Fixed by switching every asset path inside `setup/index.html` and `setup/onboarding-shell.jsx` to an absolute `/setup/...` prefix. Don't reintroduce relative paths inside `/setup/`.

### B-002 — Babel-standalone `_excluded` collision (Identifier already declared)
Fixed in `b7aa4b5`. Happened when two `<script type="text/babel">` files both used `{...rest}` destructure — Babel-standalone emits `let _excluded = […]` as a helper at top of each compiled script, and the per-realm Global Lexical Declarations slot doesn't allow `let` redeclaration across classic scripts.

Fix recipe (used for Button in commit `9b1ace3`, then for IconButton/Input/Textarea/Card in `b7aa4b5`): remove the rest pattern from the function signature, and drop the matching `{...rest}` on the inner element. Lose `data-*` forwarding — acceptable trade.

### B-003 — `useState already declared` after Pass 3.1/3.2 of the refactor
Fixed in `cd4a28f`. Same family as B-002: three separate `<script type="text/babel">` files each had `const { useState, … } = React;` at top. Solution: only `/checker-flag-lang.jsx` (the earliest-loading JSX module) owns the destructure; every later script uses unqualified names that resolve via cross-script Lexical lookup at render time.

**Future-proof rule:** any new `.jsx` module is added to the load chain AFTER `/checker-flag-lang.jsx` and must NOT redeclare React hooks at top level.

### B-004 — `</script>` swallowed by an over-eager awk delete (Pass 3.3 of the refactor)
Fixed in `8aa7ff6`. When extracting big inline regions, two awk deletions chained together happened to include the final `ReactDOM.createRoot(<EcApp/>)` mount call and the closing `</script>` tag. Result: blank page in prod for ~10 min before the next commit landed.

**Future-proof rule:** when using awk to delete an inline range, always verify by printing the file tail and confirming the last few lines look intact before pushing.

### B-005 — `.lang-menu__flag` clipped/uncentered in language dropdown
Fixed in `5c52d0e`. The pill version had `display: inline-flex; align-items/justify-content: center;` so the 18px Flag centred in the 22px round container. The menu version was missing those three properties → flag sat top-left, weird clipping. Same bug existed in `setup/i18n.css`, fixed at the same time.

### I-002 — Onboarding payment was a UI mock
Fixed by commits `cd6dc626` (real Stripe Payment Element on activation screen) and `7fe5b18` (manual capture for presubmit auth). The `ScreenActivation` component now mounts the Payment Element, calls `/api/create-payment-intent` with `capture_method: manual` for presubmit, and confirms via `stripe.confirmPayment()`. The presubmit auth is later captured-or-refunded depending on KYB outcome.

---

## Common patterns

### Adding an i18n key

Every new visible string needs translations in all 10 languages. File map:

```
Checker (root):
  EN                 → i18n-dict-ec.js
  DE + RU            → i18n-dict-ec-translations.js
  NL + TR            → i18n-dict-ec-nl-tr.js
  IT + ES            → i18n-dict-ec-it-es.js
  PL + PT + FR       → i18n-dict-ec-pl-pt-fr.js
  Country names      → i18n-dict-ec-countries.js (all 10 langs in one file)

Onboarding (/setup/):
  EN                 → setup/i18n-dict-ob.js
  DE + RU            → setup/i18n-dict-ob-de-ru.js
  NL + TR + IT       → setup/i18n-dict-ob-nl-tr-it.js
  ES + PL + PT + FR  → setup/i18n-dict-ob-es-pl-pt-fr.js
```

Audit count — must equal 10 for every key:

```bash
grep -c '"YOUR_NEW_KEY"' i18n-dict-ec*.js | grep -v ':0'
```

### Adjusting strings across all 10 languages at once

The bulk edits in May 17–18 (e.g. dropping the `ec.q2.tag.*` keys, rewriting `ec.r.opportunity.lead`) used inline Python scripts with `re.sub` to walk each dict file and apply per-language replacements. Pattern lives in commit messages of `53972dd` and `2b9a2d5` if you need a template.

### Routing in onboarding

`ALL_STEPS` in `setup/onboarding-app.jsx` is the source of truth for step order. `STEP_INDEX` in `setup/onboarding-shell.jsx` is derived but must match. `SECTIONS` defines which steps belong to which top-of-page section pill.

If you add a step, update **three** places: `ALL_STEPS`, `STEP_INDEX`, and the relevant entry in `SECTIONS`.

### Sectioning a step as "all-sections-done" (review / payment / submit)

`sectionState()` in `setup/onboarding-shell.jsx` has a `reviewSteps` array — if the user is on one of these, all 4 section pills show completed. Add new tail-end steps there.

### Extending the DS Input or Button

Both live in `/components.jsx`. After the refactor:
- **Button**: rewritten without `{ … }` destructure (commit `9b1ace3`). All props read via `props.x`. Adding a new prop means adding it to the destructure-less reader at the top and using it inside. Do not reintroduce rest spread.
- **Input**: forwards `autoFocus / autoComplete / inputMode / name / maxLength / pattern / onKeyDown` plus the originals. If you need yet another HTML attr (e.g. `min` / `max` for type=number), add to the destructure AND the inner `<input>`. Strictly additive — call-sites don't need to change.
