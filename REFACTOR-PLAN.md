# Refactor plan — split `index.html` into modules

> Picked up after commit `5ae101c` (Phase R-cleanup, types, useReducer).
> Target HEAD when this plan is complete: `index.html` shrinks from ~13k
> lines to ~200, mirroring the modular structure already in `setup/`.

## Why split

`index.html` (the eligibility checker) currently holds **everything**
inline: i18n bootstrap, every React component, every screen, every data
constant, the PDF generator, and a 100 KB base64 logo. The file is
1.3 MB on disk and a single edit drags every reviewer through 13k lines
of unrelated context. The onboarding bundle at `/setup/` already shows
the target shape: one HTML shell that loads ~10 `.jsx` modules, each
under ~500 lines.

## Where we are now (HEAD = `5ae101c`)

Already done in earlier sessions:

- `/components.jsx` is the canonical AlteryPay DS source. Both
  `setup/index.html` and `index.html` load it via
  `<script type="text/babel" src="/components.jsx">`.
- The inline `Button` (plus `btnBase`/`btnSizes`/`btnVariants`) has been
  deleted from `index.html`. Other DS primitives (`Input`, `Tag`,
  `Alert`, `Select`, `SelectableListItem`) **are still duplicated**
  inline — the checker uses its local copies due to `const`-shadowing.
- `index.html` exposes its inline `Icon` to `window` just before
  `ReactDOM.createRoot` so the shared Button can resolve it at render
  time.

## Constraints

- **No build step.** `CLAUDE.md` is explicit: "Don't add webpack/vite
  without strong reason." Every extracted module must remain a
  `<script type="text/babel">` that Babel-standalone compiles in the
  browser.
- **Load order matters.** Babel-standalone processes scripts in DOM
  order. Each extracted module that depends on another must come
  *after* its dependencies in `index.html`.
- **Cross-module symbols go through `window`.** A `const X = …` at the
  top of a `<script type="text/babel">` is local to that script. To
  let later scripts see it, end the module with
  `Object.assign(window, { X, Y, … })`.
- **Babel-standalone 7.24.7** (the version `index.html` already pins
  via the cdnjs URL) has the same destructure-with-rest quirk that bit
  `/components.jsx` Button. Prefer direct prop reads (`props.x`) over
  `{x, ...rest}` patterns in extracted code.
- **Test after every commit.** Vercel auto-deploys on push. Walk the
  full checker flow in a real browser between extractions: pick a
  language, answer all 5 questions, see the result, download the PDF,
  click "Start setup" and confirm the URL params land on
  `/setup?plan=…&entity=…&token=…&email=…`.

## Section inventory in `index.html`

Approximate line ranges as of `5ae101c`:

| #  | Section                                          | Lines           | Size  | Risk |
|----|--------------------------------------------------|-----------------|------:|:----:|
| 1  | CDN scripts (React, ReactDOM, Babel, Stripe, h2c, jsPDF) | 2745–2770 | 25  | n/a — keep inline |
| 2  | Inline `<script>` bootstrap + i18n DICT init     | 2772–3500       | ~700  | medium |
| 3  | Inline EC i18n dicts (3 separate `<script>` blocks) | 3500–8350    | ~4800 | low — bulk text |
| 4  | `<script type="text/babel">` start + hook bindings | 8369–8543    | ~175  | medium |
| 5  | `ICONS` + `Icon` + `FLAG_FILES` + `Flag`         | 8382–8475       | ~95   | medium |
| 6  | `LangSwitcher`                                   | 8478–8540       | ~62   | low |
| 7  | DS-primitive duplicates (`Input` … `SelectableListItem`) | 8602–8845 | ~245  | low |
| 8  | Atoms — `Title`, `Field`, `WhyWeAsk`             | 8846–8916       | ~70   | low |
| 9  | EC data constants (`EC_COUNTRIES`…`EC_ENTITIES`) | 8917–9485       | ~570  | low |
| 10 | EC pure helpers (`ecRecommend`, `ecFeeRegion`, …) | 9183–9485      | ~300  | medium |
| 11 | `EcIco` icon set                                 | 9647–9759       | ~110  | low |
| 12 | `EcApp` + question screens                       | 9759–10985      | ~1230 | high |
| 13 | Modals (`EcFeesModal`, `EcPerks`, plan compare…) | 10626–10985     | ~360  | medium |
| 14 | PDF utilities + Stripe loader                    | 10985–11700     | ~720  | medium |
| 15 | `EcAltery…` base64 logo + Calendly URL           | 11118 (one line) + 11252 | ~1   | low — but huge string |
| 16 | `EcPaymentModal`, `EcHandoffModal`, etc.         | 11700–13328     | ~1630 | high |
| 17 | `ReactDOM.createRoot(<EcApp/>)`                  | 13330           | 1     | keep inline |

## Extraction order

Each numbered item below becomes one commit. Commit in this order — low
risk first, so a regression in Pass 3 can be reverted without losing
the safer earlier work.

### Pass 1 — low-risk, do first

**1.1** Delete inline DS-primitive duplicates from `index.html`
(`Input`, `Tag`, `Alert`, `Select`, `SelectableListItem`, lines
~8602–8845). They're already in `/components.jsx`. Use the same
recipe that worked for `Button` in `bef3eb3`:

- Diff the inline signature against `/components.jsx`. If checker
  call-sites use a prop the canonical version lacks, extend the
  canonical version *before* deleting the inline.
- Replace the inline block with a one-line comment pointing to
  `/components.jsx`.
- Hard-refresh and walk the checker; check console for
  "React does not recognize the … prop on a DOM element" warnings.

**1.2** Extract EC data constants → `/checker-data.jsx`. Pull
`EC_COUNTRIES`, `EC_CORRIDOR_GROUPS`, `EC_CORRIDORS`, `EC_INDUSTRIES`,
`EC_BUSINESS_TYPES`, `EC_SERVICES`, `TOTAL_STEPS`,
`COUNTRY_REGION_GROUPS`, `EC_VOLUME_BANDS`, `EC_FEE_SCHEDULE`,
`EC_PLANS`, `EC_PERKS`, `EC_ENTITIES`. End the file with
`Object.assign(window, { EC_COUNTRIES, EC_PLANS, … })`. In
`index.html`, add the load tag right after `/components.jsx` and
delete the inline blocks.

**1.3** Extract the base64 logo + Calendly URL →
`/checker-pdf-assets.js`. `EC_ALTERY_LOGO_B64` is a ~100 KB single
line; pulling it out shrinks `index.html` substantially and keeps git
diffs sane in future PDF edits. Plain `<script>` (no Babel) — these
are just two `const`s + an `Object.assign(window, ...)`.

### Pass 2 — medium risk

**2.1** Decide what to do with `Icon`. The checker's inline `Icon`
(line 8384) and `/setup/icons.jsx` define mostly-overlapping icon
sets. Options:
- Merge into one file (`/icons.jsx`), `Object.assign(window, { Icon, ICONS })`, load from both surfaces.
- Or keep two copies but ensure the checker's `Icon` is exported to
  `window` before the inline block exits (it already is, at the line
  added with `Object.assign(window, { Icon })` before
  `ReactDOM.createRoot`).

Recommendation: pick **merge** — one source of truth.

**2.2** Extract EC pure helpers → `/checker-helpers.jsx`. Functions
that operate on the data constants from 1.2 but have no JSX:
`ecRecommend`, `ecFeeRegion`, `ecHeroIdentifier`, `ecEstimateTxCount`,
`ecComputeCostBreakdown`, `ecOutcomesForSavings`, `ecVolumeHintKey`.
Loads after `/checker-data.jsx`. Exports each function on `window`.

**2.3** Extract Title/Field/WhyWeAsk atoms (lines 8846–8916). These
duplicate `setup/onboarding-atoms.jsx`. Either share that file or
create a small `/checker-atoms.jsx`.

### Pass 3 — high risk, do last

**3.1** Extract question screens → `/checker-screens.jsx`. `EcIntro`,
`EcCountry`, `EcIndustry`, `EcServices`, `EcVolume`, `EcCorridors`,
`EcCrypto`, `EcResult`, `EcQuestionHeader`. Depends on
`/checker-data.jsx`, `/checker-helpers.jsx`, `Icon`, `Flag`,
`/components.jsx`. After this, the inline JSX block in `index.html`
should be down to just `EcApp` + a few wrapper components.

**3.2** Extract modals → `/checker-modals.jsx`. `EcFeesModal`,
`EcBankHistory`, `EcPerks`, `EcPlanComparisonModal`, `EcHandoffModal`,
`EcPaymentModal`. Verify the Stripe Payment Element inside
`EcPaymentModal` still mounts — its lifecycle is delicate.

**3.3** Extract PDF generator → `/checker-pdf.jsx`.
`ecGenerateProposalPDF`, `ecLoadStripe`, `ecWaitForPdfLibs`. Depends
on `EC_ALTERY_LOGO_B64` and `EC_CALENDLY_URL` from 1.3. Verify
"Email me the proposal" still produces a PDF identical to today's.

**3.4** Final `index.html`: just the `<head>` + script load order +
`EcApp` body + `ReactDOM.createRoot`. Should end up around ~200
lines.

## After each commit

Walk this checklist in a real browser on the Vercel preview deploy:

1. Open `/` → checker landing renders, language switcher works.
2. Click through all 5 questions: country → industry → services →
   volume → corridors → crypto (skip if not applicable). Recommendation
   page renders.
3. Click "Email me the proposal", enter an email, send — PDF arrives in
   inbox. Open it; confirm logo, plan name, fee table look identical
   to a pre-refactor baseline screenshot.
4. Click "Start setup" → URL bar lands on
   `/setup?plan=…&entity=…&token=…&email=…` and the onboarding screen
   shows the pre-filled values.
5. Console must be clean — no "Cannot read property of undefined",
   no "X is not defined", no "React does not recognize prop".

If anything fails, `git revert HEAD` and re-plan that step alone.

## Estimates

- Pass 1: 3 commits, ~1 hour
- Pass 2: 3 commits, ~1.5 hours
- Pass 3: 4 commits, ~2–3 hours

Best done across 2 sessions: Pass 1 + 2 in one focused 90-minute
sitting, Pass 3 in another. After Pass 3 lands, **delete this file**
in the same commit — the plan is single-use.

## Out of scope (do NOT include here)

- Adding TypeScript / Vite / a bundler. `CLAUDE.md` forbids.
- Touching `setup/` files (they're already modular).
- Functional changes to the checker behaviour. The user explicitly
  scoped this as "without changing anything for end user".
- I18n key edits — translations stay byte-identical.
