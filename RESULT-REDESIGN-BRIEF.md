# Result Page Redesign — Strategic + Design Brief

> **For Claude Code:** read this file completely before touching any code. It's both a strategy document (why we're changing) and a design brief (what specifically to do). Acceptance criteria are at the bottom.

---

## 1. Context — why this redesign matters now

We just completed a hypothesis brief based on primary research from Signicat, Fenergo, McKinsey, Forrester, Gartner, and competitor analysis (3S Money, Revolut, Wise, Airwallex, Mercury, Brex). Full document at `/altery-eligibility-checker-hypothesis.pdf` if you want the long read. Key findings that drive THIS redesign:

**1. The buyer is 80% self-directed.** Gartner 2024: B2B buyers spend only 17% of buying time in direct contact with vendors. They want artifacts they can study alone — calculators, comparisons, PDFs. **Our result page IS that artifact.** It must work as a standalone document, not a sales pitch waiting for follow-up.

**2. The buyer brings 13 stakeholders.** Forrester 2024 State of Business Buying: average B2B buying committee is 13 people; 89% of decisions cross 2+ departments. **Our result page must be shareable** — designed to be forwarded to a CFO who hasn't seen the quiz, and still make sense.

**3. 86% of B2B purchases stall.** Forrester 2024: stall happens because one stakeholder's concern wasn't surfaced early. **Our result page must pre-answer the most common objections:** is this legit? what's the catch? what does it cost in 6 months?

**4. Treasurers are asking "why is business banking harder than personal."** McKinsey 2025 Transaction Banking report quoted this verbatim. **Our result page must feel as easy as a personal banking app**, while delivering institutional-grade clarity.

**5. 38% of fintech onboarding abandons happen because user doesn't have documents at hand.** Signicat Battle to Onboard 2022. **The result page must include a "5-minute prep" affordance** — show them exactly what they'll need before they click "Start setup."

**6. None of our competitors do personalized cost projection vs alternative.** Audit confirmed: 3S Money has eligibility + FX calc but no vs-bank comparison. Revolut has eligibility, no calc. Everyone else: in-flow only. **This is our unique moment of differentiation.** The result page must lean into it hard.

---

## 2. Information architecture — what goes on the page and in what order

The current result page tries to do too much in equal weight. Top-tier designers establish a clear hierarchy where ~80% of the visual attention goes to 1-2 hero elements. Reorder as follows:

### Section A: HERO (above the fold, no scroll)

**A1. Single line of personal recognition.**
"You qualify for Altery Pro · UK entity"
- Type size: 48-56px (desktop), 32-36px (mobile)
- Font weight: 600 (semibold), not bold — restraint
- Letter-spacing: -0.02em (tight, modern)
- Color: ink (`#11141A`), not navy. Navy is for accent moments, not always-on.

**A2. The savings hero number.**
"€9 500 / month"
- Type size: **massive** — 72-96px desktop, 48-56px mobile
- Font: IBM Plex Mono (tabular figures — this is non-negotiable, numbers must align if user changes input)
- Color: orange `#C2410C` on warm beige background `#FFF7ED`
- Above the number: tiny eyebrow caption in muted gray "Your annual saving with Altery vs typical bank"
- Below the number: "€114 000 / year" in smaller (24px) gray secondary

**A3. Loss-framed micro-copy.**
"That's what you're leaving on the table right now."
- Type size: 18-20px
- Color: muted gray `#69707C`
- One sentence, no explanation. Restraint creates weight.

**A4. Single primary CTA.**
"Start your setup → £100 authorisation, refundable"
- Filled navy button, generous padding (16px vertical, 28px horizontal)
- Right of it, secondary text-link button: "Email yourself the proposal"
- **No third CTA.** Top designers know multiple CTAs = no CTA.

> **Critical rule for section A:** the entire hero section must fit in one viewport on a 13" laptop (1366×768) without scroll. Test this. If it doesn't fit, kill secondary elements, not hero ones.

### Section B: WHY this is your answer (builds trust before scroll commitment)

Two-column layout, asymmetric (60/40 split).

**B1. Left column (60%): a 3-bullet rationale.**
- "Based on your monthly volume of €120 000 across EUR and GBP"
- "Optimised for your industry: SaaS / B2B subscriptions"
- "UK entity unlocks faster GBP settlement and lower FX margin"

Type: 15px body in ink. Bullets use • (middle dot), not - or *.

**B2. Right column (40%): a small stats card.**
- "5 of 6 founders in your situation chose Pro"
- "Average activation: 2.3 business days"
- "Funded within 7 days: 87% of approved"

Type: numbers in IBM Plex Mono 24px, labels below in 12px muted.

> **Restraint check:** no icons in this section. Top-tier work uses icons sparingly. Numbers and prose only.

### Section C: WHAT this unlocks (outcomes, not features)

This is where most pages list features. We don't. We translate features into business outcomes using `ecOutcomesForSavings()`.

Three cards in a row, equal width. Each card:

```
€33 000 — Hire a junior ops engineer
The €9 500/mo you keep covers a loaded €110k salary in 3 months.

€18 000 — Run an EU paid acquisition test
Launch a 6-month campaign without touching the P&L.

€36 000 — Extend runway by 4 months
Without raising another round.
```

Visual:
- Card background: warm beige `#F0EBE3` with 12px border-radius
- Generous padding: 24-32px
- Number in IBM Plex Mono 28px, ink color
- Headline below in 16px semibold
- Body below in 13px muted

> **Why this works (research-backed):** Forrester says financial stakeholders need ROI framing. McKinsey's "treasurers asking why" quote means we must speak in their language. "Hiring an engineer" is more vivid than "saving 9% on FX."

### Section D: The 5-minute prep affordance

This is new based on Signicat finding (38% abandon because no documents at hand).

A clean horizontal card with checklist styling:

```
Before you click "Start setup", make sure you have:

  [☐] Your incorporation certificate (PDF/photo)
  [☐] Proof of business address (utility bill or lease)
  [☐] Director ID (passport or driving licence)
  [☐] Information about your UBOs (25%+ ownership)
  [☐] Last 3 months of bank statements (any bank)

Estimated time: 5 minutes prep + 8 minutes onboarding.
```

Visual:
- Subtle border, no fill
- Checkboxes are visual only, not interactive
- After the list: "Save this list" (text link) → triggers PDF download or email
- A small "Why we ask" disclosure expands to show: "Standard KYB requirement. We don't store originals after approval — see our retention policy."

### Section E: PDF + share affordance (the artifact for stakeholders)

This is the section that addresses the "13 stakeholders" finding.

```
Sharing with your CFO or board?

[Download proposal as PDF]    [Email to a colleague]

A 4-page proposal with cost breakdown, comparison vs typical bank,
and validity to 14 June 2026. Designed to forward.
```

Visual:
- Background: very subtle navy tint `#F4F6FC`
- Two equal pill buttons, both outlined-navy style
- Body text 14px

> **Why this works:** because we know they'll share. Making the act easy and explicit converts "maybe I'll send it" into action. The "designed to forward" line is permission — it tells the founder we built this for their CFO too.

### Section F: Quiet trust strip

A single horizontal row of trust markers, no big section header. Just facts.

```
FCA-regulated EMI · DIFC branch in Dubai · Funds held at partner banks · 100% liquidity
```

Type: 12px muted gray, all caps with letter-spacing 0.05em (creates institutional feel). Centered. Generous vertical padding (40-60px) above and below.

> **Restraint check:** no "trusted by" logos unless we have actually-recognisable customers we can name. Logos of "Acme Corp" and "Innotech" hurt credibility more than they help.

### Section G: Footer CTA repeat

For users who scrolled the whole page. Same CTA as section A, in a softer container.

---

## 3. Visual system — what makes this look top-tier

Specifying these as **rules**, not suggestions. Top designers obey the system; mid designers improvise.

### 3.1 Type scale (use these exact sizes, nothing else)

| Token | Size (desktop) | Size (mobile) | Usage |
|---|---|---|---|
| display-hero | 88px | 56px | Savings number only |
| display-1 | 56px | 36px | Section A1 personal answer |
| display-2 | 32px | 24px | Section C card numbers |
| heading-1 | 24px | 20px | Section headers if any |
| heading-2 | 18px | 16px | Card titles, B1 bullet emphasis |
| body | 15px | 15px | Default body |
| body-sm | 13px | 13px | Captions, secondary |
| caption | 12px | 12px | Trust strip, fine print |

**Line-height:** body 1.5, headings 1.15, hero numbers 1.0.
**Letter-spacing:** body 0, headings -0.01em, hero numbers -0.03em.

### 3.2 Color palette (use ONLY these)

| Role | Hex | Usage |
|---|---|---|
| Ink | `#11141A` | Body text, headings |
| Muted | `#69707C` | Secondary text, captions |
| Border | `#D7DAE0` | Dividers, card outlines |
| Surface | `#FFFFFF` | Page background |
| Surface-warm | `#F0EBE3` | Outcome cards, accents |
| Surface-tint | `#F4F6FC` | Share section, subtle tints |
| Navy | `#002780` | Primary CTAs, accent moments |
| Navy-hover | `#001E66` | CTA hover state |
| Orange | `#C2410C` | Savings number text only |
| Orange-bg | `#FFF7ED` | Savings number background only |
| Green | `#0A9F52` | Trust marks, ✓ glyphs |

> **No gradient backgrounds. No drop shadows on cards (use border or background tint).** Top-tier finance UI uses flat color and subtle borders; gradients and shadows scream consumer-bank-circa-2018.

### 3.3 Spacing scale

Use multiples of 4: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Nothing else.

Section vertical spacing: 96-128px between major sections (A→B, B→C, etc.). This is generous. Generous spacing is what separates premium from cramped. **Resist the urge to fit more on the screen.**

### 3.4 Numbers must be tabular

Every number — savings, percentages, prices, durations — must be set in **IBM Plex Mono** with `font-variant-numeric: tabular-nums`. This means if the savings number changes from €9 500 to €12 800, the digits don't shift sideways. This is invisible to users but is a hallmark of finance-grade UI.

### 3.5 Motion (subtle, not theatrical)

- On page load: hero number animates from 0 to target value over 1.2s with `cubic-bezier(0.16, 1, 0.3, 1)` easing. Once.
- Hover on CTA: 200ms transition on background-color only. No transform, no shadow growth, no "pop." Restraint.
- Scroll: outcome cards (Section C) fade in + 8px translate-up as they enter viewport, staggered 80ms each. Once per page load.
- **No parallax. No scroll-jacking. No looping animations.** Top-tier finance never does this.

### 3.6 Specific design moves to apply

These are the kinds of decisions a senior designer makes that elevate the work:

1. **The savings number gets the biggest type on the page, by a wide margin** (88px hero vs 56px display-1 = 1.6x ratio). Hierarchy by SIZE, not just weight. Most pages bold-everything; restraint creates focus.

2. **Asymmetric layouts.** Section B is 60/40. Section E is two equal columns but the page itself is left-aligned at max-width 1100px, not centered with equal margins. Slight asymmetry feels designed; perfect symmetry feels generated.

3. **One accent color moment per section.** Section A: orange (savings). Section B: nothing accent, prose only. Section C: warm beige (outcomes). Section D: subtle border. Section E: navy tint. Section F: green (✓ marks). Each section has ONE accent — never two. This is the move that distinguishes design from decoration.

4. **The CTA button uses navy fill, not a gradient, not a "glowing" border.** Letter-spacing on the button label is 0 (not increased). The button has 6px border-radius (slightly rounded), not 24px (pill). 6px feels institutional; 24px feels consumer.

5. **No emojis anywhere on the page.** Not in headings, not in bullets, not in confirmations. Emojis kill trust for finance products targeting business buyers.

6. **Numbers separated by thin space, not comma:** "€9 500" not "€9,500". European convention, and looks more premium. Use Unicode U+202F (narrow no-break space).

7. **Don't use the word "amazing", "powerful", "seamless", "best-in-class", or "world-class".** These are tells of mid-tier copy. Replace with specific, declarative statements.

### 3.7 Reference designs to study

These are best-in-class for inspiration. Don't copy directly — extract the principles.

- **Stripe pricing pages** (stripe.com/pricing) — massive type, restraint, hierarchy by size
- **Linear (linear.app)** — surface treatment, monochrome with one accent, motion restraint
- **Mercury (mercury.com)** — editorial tone, specific numbers, premium feel without ornamentation
- **Ramp (ramp.com)** — outcomes-language ("save X hours"), CFO-grade specificity
- **Brex pricing page** — comparison tables done elegantly

Avoid as references: Revolut consumer marketing pages (too aggressive), Wise blog (too generic), any "fintech UI kit" on Dribbble (none of those translate).

---

## 4. Copy principles

### Voice
- Direct, declarative. "Here's your number." Not "We've calculated some great savings for you!"
- Second-person ("you", "your"). Never "businesses like yours."
- Numbers first, narrative second. Never lead with "Lorem ipsum about how Altery is different..." before the savings number.

### Tone
- Confident, not assertive. We don't oversell.
- Specific, not vague. "€9 500/mo" beats "significant savings."
- Honest about limits. The "validity to 14 June 2026" stamp is a confidence move.

### What to avoid
- Exclamation marks anywhere except actual surprises (none here)
- Questions that aren't real ("Ready to save?")
- "Click here" — use specific action labels
- Repeated CTAs with different wording — pick one phrasing and commit

---

## 5. Mobile-specific guidance

This will be viewed on mobile by ~40-50% of users. Some adjustments:

1. **Savings number scales down to 56px** — still hero-sized, but doesn't dominate the viewport so much it pushes everything off-screen.
2. **Section B becomes single-column** (rationale on top, stats card below). Card uses full width.
3. **Section C outcome cards stack vertically.** Don't try to keep them in a row on mobile — they become unreadable.
4. **CTA becomes full-width** with the "Email yourself the proposal" stacked below.
5. **Tap targets minimum 44×44px** (Apple HIG / Material baseline).
6. **Test in Safari mobile specifically** — that's our likely top user agent.

---

## 6. Where this lives in code

**File:** `index.html` in the repo `ShutovAleksey/altery-eligibility`.

**Find the existing result page region:** search for the function that renders after the user completes the quiz. Likely named `ResultPage` or `EcResultStep` or similar — search for "opportunity" or "your savings" in the file.

**Reuse existing helpers:**
- `ecComputeCostBreakdown(rec)` — returns the savings calculation. Don't rewrite. Use its `.monthlySavingsEur` and `.annualSavingsEur` outputs.
- `ecOutcomesForSavings(annualSavings)` — returns the "what this funds" array (hire / runway / marketing). Use for Section C.
- `ecGenerateProposalPDF(rec)` — already generates the PDF. Wire to the "Download proposal as PDF" button in Section E.

**i18n requirements (10 languages):**
The result page already has i18n keys like `ec.r.opportunity.head`. If you add new strings, add to all 10 languages: en/de/ru/nl/tr/it/es/pl/pt/fr. Convention is documented in `CLAUDE.md`. Don't ship in English-only.

**CSS approach:**
This codebase uses inline CSS at the top of `index.html` (no separate stylesheets, no build step). Add new styles in the existing `<style>` block. Use BEM-ish naming with `ec-result-v2-*` prefix to avoid colliding with existing classes. Once stable, the old classes can be removed in a follow-up commit.

**Don't:**
- Add new dependencies (no Framer Motion, no Tailwind, no animation libraries — we have Babel Standalone only)
- Migrate to a build step (intentional architecture decision documented in CLAUDE.md)
- Touch the checker quiz logic (only the result page)
- Touch the onboarding flow at /setup (separate codebase)

---

## 7. Acceptance criteria

Done means:

1. **Section A fits in 768px height viewport** with no scroll. Test on 1366×768.
2. **All numbers use IBM Plex Mono with tabular-nums.** Inspect any number on the page; should be monospace.
3. **No more than one accent color per section.** Audit visually.
4. **All 10 languages have the new keys translated.** Run the audit grep from CLAUDE.md.
5. **PDF download button in Section E works** — wired to `ecGenerateProposalPDF`.
6. **Email-self-the-proposal flow works** — wired to the existing handoff modal we built before.
7. **No new dependencies in package.json.** `git diff` should show only HTML/CSS/JS in `index.html` and possibly i18n strings.
8. **Lighthouse score ≥ 90 for Performance** on the result page (the hero animation should not block render).
9. **No console errors** when navigating from quiz completion to result page.
10. **Mobile (iPhone Safari) renders correctly** — savings number doesn't overflow, CTA is reachable with thumb, outcome cards stack.

---

## 8. Process suggestion

I'd suggest a 3-pass approach so we can review at checkpoints rather than getting one giant PR:

**Pass 1: Structure + spacing only (no copy polish, no animations).**
Build all 7 sections in correct order with placeholder text and the type/color/spacing system. Show me a screenshot. We adjust hierarchy if needed.

**Pass 2: Copy + numbers + i18n.**
Wire `ecComputeCostBreakdown` and `ecOutcomesForSavings`. Translate to all 10 languages. Show me the result. We adjust copy.

**Pass 3: Polish + motion + edge cases.**
Add the hero number animation, scroll-fade for outcome cards, hover states. Test mobile. Fix tap targets. Show me before commit.

Each pass commits separately so we can revert any one without losing the others.

---

**Start with Pass 1.** Don't write copy yet, don't translate, don't animate. Just establish the structure with the type/color system in place. Show me a screenshot of the desktop result page when Pass 1 is ready and I'll give Pass 2 feedback.

If anything in this brief is unclear, ask before guessing. A specific question costs me 30 seconds; rebuilding a wrong direction costs us a day.
