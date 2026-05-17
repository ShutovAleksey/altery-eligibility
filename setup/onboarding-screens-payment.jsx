/* global React, Button, Input, Tag, Alert, Card, Segmented, Icon, Title, TopRow, Ico, WhyWeAsk, Flag, Checkbox */
// Onboarding — plan selection + plan details (no payment screen).
// Sits between Expected activity and Upload documents.
// Sub-screens: choose-plan → plan-details (optional deep-dive).
//
// Pricing model — directly mirrored from Altery's published business pricing:
//   • Three tiers: Starter / Pro / Ultra
//   • Annual fee paid once (£500 / £1,000 / £3,000 — or EUR equivalents)
//   • Activation happens AFTER approval — no money taken before then.
//   • Each tier carries a published fee schedule (account opening, GBP/EUR
//     in/out, SWIFT, FX margin, card issuance, monthly maintenance after Y1).
//
// Altery context rules:
//   • Capability-status: API/crypto labelled In progress / Provider-dependent.
//     No invented rails or processing times.
//   • Tone: clear, calm, operational. No "Oops".
//   • Money-movement disclosure: amount + currency + fee + recipient + method
//     + estimated time shown wherever a charge is referenced.

const { useState: _pUseState } = React;

// ──────────────── Plan catalogue ────────────────
// Pricing per the reference brief, expressed as a fee-schedule per plan rather
// than a single "subscription" — so businesses can see exactly what they pay
// per transaction. GBP is the canonical currency; EUR is shown at near-parity
// for businesses that bill in euro (provider-side FX still applies).
const PLANS = [
  {
    id: "starter",
    eyebrow: "Starter",
    name: "Starter",
    tagline: "Everything you need to open your first multi-currency business account and start sending globally.",
    monthly: { GBP: 50, EUR: 60 },
    annual: { GBP: 500, EUR: 600 },
    cap: "Up to £100k / month processed",
    cta: "Get Starter plan",
    color: "neutral",
    // What's INCLUDED — feature checklist (top half of the card)
    includes: [
      "Global and local account details",
      "SWIFT, SEPA & Faster Payments",
      "Visa company cards",
      "Apple Pay / Google Pay",
      "24/7 Support chat",
      "Mobile & web app",
    ],
    plusList: [],
    savePill: null,
    // FEE SCHEDULE — bottom half of the card
    fees: [
      { k: "FX on base currencies", v: "up to 0.8%" },
      { k: "Push to bank card", sub: "UK issued card", v: "0.7%" },
      { k: "Minimum fee", v: { GBP: "£1", EUR: "€1" } },
      { k: "Push to bank card", sub: "EU issued card", v: "1.5%" },
      { k: "Minimum cost", v: { GBP: "£1", EUR: "€1" } },
      { k: "Push to bank card", sub: "RoW issued card", v: { GBP: "£0.5 + 3%", EUR: "€0.5 + 3%" } },
      { k: "UK Faster Pay", sub: "Per transfer", v: { GBP: "£1", EUR: "€1" } },
      { k: "Outgoing SEPA", sub: "Per transfer", v: "€2" },
      { k: "Outgoing SWIFT", sub: "Per transfer", v: "€15 + 0.5%" },
      { k: "SWIFT fee cap", v: "No cap" },
    ],
  },
  {
    id: "pro",
    eyebrow: "Pro",
    name: "Pro",
    tagline: "Lower fees, dedicated account manager — built for businesses ready to grow across borders.",
    monthly: { GBP: 100, EUR: 120 },
    annual: { GBP: 1000, EUR: 1200 },
    cap: "Up to £1M / month processed",
    cta: "Get Pro plan",
    color: "primary",
    includes: [
      "All Starter features",
    ],
    plusList: [
      "Early access to new features",
      "Priority Support",
    ],
    savePill: "Save up to 50% on transaction fees",
    fees: [
      { k: "FX on base currencies", v: "up to 0.7%" },
      { k: "Push to bank card", sub: "UK issued card", v: "0.7%" },
      { k: "Minimum fee", v: { GBP: "£1", EUR: "€1" } },
      { k: "Push to bank card", sub: "EU issued card", v: "1.5%" },
      { k: "Minimum cost", v: { GBP: "£1", EUR: "€1" } },
      { k: "Push to bank card", sub: "RoW issued card", v: { GBP: "£0.5 + 3%", EUR: "€0.5 + 3%" } },
      { k: "UK Faster Pay", sub: "Per transfer", v: { GBP: "£1", EUR: "€1" } },
      { k: "Outgoing SEPA", sub: "Per transfer", v: "€2" },
      { k: "Outgoing SWIFT", sub: "Per transfer", v: "€15 + 0.5%" },
      { k: "SWIFT fee cap", v: "No cap" },
    ],
  },
  {
    id: "ultra",
    eyebrow: "Ultra",
    name: "Ultra",
    tagline: "The best rates, unlimited users, priority support — for high-volume businesses that need white-glove service",
    monthly: { GBP: 300, EUR: 360 },
    annual: { GBP: 3000, EUR: 3600 },
    cap: "Over £1M / month processed",
    cta: "Get Ultra plan",
    color: "ink",
    includes: [
      "All Pro features",
    ],
    plusList: [
      "Early access to new features",
      "A dedicated Relationship Manager",
    ],
    savePill: "Save up to 50% on transaction fees",
    fees: [
      { k: "FX on base currencies", v: "up to 0.5%" },
      { k: "Push to bank card", sub: "UK issued card", v: "0.7%" },
      { k: "Minimum fee", v: { GBP: "£1", EUR: "€1" } },
      { k: "Push to bank card", sub: "EU issued card", v: "1.5%" },
      { k: "Minimum cost", v: { GBP: "£1", EUR: "€1" } },
      { k: "Push to bank card", sub: "RoW issued card", v: { GBP: "£0.5 + 3%", EUR: "€0.5 + 3%" } },
      { k: "UK Faster Pay", sub: "Per transfer", v: { GBP: "£1", EUR: "€1" } },
      { k: "Outgoing SEPA", sub: "Per transfer", v: "€2" },
      { k: "Outgoing SWIFT", sub: "Per transfer", v: "€15 + 0.5%" },
      { k: "SWIFT fee cap", v: "No cap" },
    ],
  },
];

const CURRENCIES = {
  GBP: { sym: "£", label: "GBP", flag: "GB" },
  EUR: { sym: "€", label: "EUR", flag: "EU" },
};

function formatPrice(n, sym = "£") {
  return `${sym}${n.toLocaleString("en-GB")}`;
}
function priceFor(plan, currency) {
  return plan.annual[currency];
}
function feeValue(v, currency) {
  if (typeof v === "string") return v;
  return v[currency];
}

// ──────────────── Plan card ────────────────
// Reference-driven layout:
//   1) Plan name + tagline
//   2) Big monthly price + "/ month"
//   3) Feature checklist (with optional "Plus" divider + savings pill)
//   4) Full-width primary CTA "Get <Plan> plan"
//   5) Fee schedule block (subtle gray panel, key/value rows)
function CheckRow({ children }) {
  return (
    <li className="pp-feat__row">
      <svg className="pp-feat__check" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
        <path d="m3.5 8.2 3 3 6-7" stroke="var(--c-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span>{children}</span>
    </li>
  );
}

function PlanCard({ plan, currency, selected, onSelect }) {
  const sym = CURRENCIES[currency].sym;
  const price = plan.monthly[currency];

  return (
    <div className={`pp-card pp-card--ref ${selected ? "is-selected" : ""}`}>
      <div className="pp-card__name">{plan.name}</div>
      <p className="pp-card__tag">{plan.tagline}</p>

      <div className="pp-card__price">
        <span className="pp-card__amount">{sym}{price}</span>
        <span className="pp-card__per">/ month</span>
      </div>

      <ul className="pp-feat">
        {plan.includes.map((f, i) => <CheckRow key={i}>{f}</CheckRow>)}

        {plan.plusList.length > 0 && (
          <li className="pp-feat__divider" aria-hidden="true"><span>Plus</span></li>
        )}

        {plan.savePill && (
          <li className="pp-feat__pill">{plan.savePill}</li>
        )}

        {plan.plusList.map((f, i) => <CheckRow key={`p-${i}`}>{f}</CheckRow>)}
      </ul>

      <Button
        variant="primary"
        size="lg"
        onClick={onSelect}
        full
        style={{ marginTop: "auto", marginBottom: 16 }}
      >
        {selected ? `${plan.name} selected` : plan.cta}
      </Button>

      <div className="pp-fees">
        {plan.fees.map((f, i) => (
          <div key={i} className="pp-fees__row">
            <div className="pp-fees__k">
              <div className="pp-fees__k-main">{f.k}</div>
              {f.sub && <div className="pp-fees__k-sub">{f.sub}</div>}
            </div>
            <div className="pp-fees__v">{feeValue(f.v, currency)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────── Step: choose plan ────────────────
function ScreenPlan({ next, back, planId, setPlanId, currency, setCurrency }) {
  const cur = currency || "GBP";
  const selected = PLANS.find((p) => p.id === planId) || PLANS[1];

  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />
      <div className="pp-head">
        <div className="pp-head__main">
          <h1 className="pp-head__title">Pick the plan that fits how you move money</h1>
          <p className="pp-head__lead">
            All plans include a one-time £50 account opening fee, fully refundable if your application isn't approved. Your card is charged monthly only after we approve your account.
          </p>
        </div>
        <div className="pp-head__toggle">
          <Segmented
            value={cur}
            onChange={setCurrency}
            options={[
              { value: "GBP", label: "GBP £" },
              { value: "EUR", label: "EUR €" },
            ]}
          />
        </div>
      </div>

      <div className="pp-grid">
        {PLANS.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            currency={cur}
            selected={planId === p.id}
            onSelect={() => { setPlanId(p.id); next("documents"); }}
          />
        ))}
      </div>

      <div className="pp-foot">
        <a href="#" className="pp-foot__link" onClick={(e) => { e.preventDefault(); next("details"); }}>
          View full pricing
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path d="M9 3h4v4M13 3 7.5 8.5M11 8.5v4a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </div>
  );
}

// ──────────────── Step: plan details (full fee schedule) ────────────────
function ScreenPlanDetails({ next, back, planId, setPlanId, currency, setCurrency }) {
  const cur = currency || "GBP";
  const sym = CURRENCIES[cur].sym;
  const plan = PLANS.find((p) => p.id === planId) || PLANS[1];
  const price = priceFor(plan, cur);

  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />

      <div className="pp-detail-head">
        <div>
          <div className="t-overline" style={{color:"var(--c-accent)", marginBottom:8}}>{plan.eyebrow} plan</div>
          <h1 className="pp-detail-head__title">{plan.name} — full fee schedule</h1>
          <p className="pp-detail-head__lead">{plan.tagline}</p>
        </div>
        <div className="pp-detail-price">
          <div className="pp-detail-price__amt">
            {formatPrice(price, sym)}<span> / year</span>
          </div>
          <div className="pp-detail-price__sub">
            {plan.cap}
          </div>
          <div className="pp-detail-price__fee">
            Paid once on activation. Refunded if KYB is not approved.
          </div>
        </div>
      </div>

      <div className="pp-detail-controls">
        <Segmented
          value={cur}
          onChange={setCurrency}
          options={[
            { value: "GBP", label: "GBP £" },
            { value: "EUR", label: "EUR €" },
          ]}
        />
        <div className="pp-detail-controls__plans">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pp-pill ${p.id === plan.id ? "is-on" : ""}`}
              onClick={() => setPlanId(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="pp-detail-grid">
        <div className="pp-detail-block">
          <div className="pp-detail-block__title">Fees & limits</div>
          <ul className="pp-fee-list pp-fee-list--full">
            {plan.fees.map((f, i) => (
              <li key={i} className="pp-fee-list__row pp-fee-list__row--full">
                <div className="pp-fee-list__k">
                  {f.k}
                  {f.sub && <span className="pp-fee-list__sub">{f.sub}</span>}
                </div>
                <div className="pp-fee-list__v">
                  {feeValue(f.v, cur)}
                  {f.inProgress && <Tag tone="orange" size="sm" style={{marginLeft:6}}>In progress</Tag>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="pp-detail-block">
          <div className="pp-detail-block__title">What's included</div>
          <ul className="pp-detail-list pp-detail-list--simple">
            {plan.features.map((f, i) => (
              <li key={i}>
                <Icon name="check" size={14} stroke={2.2} color="var(--c-success)"/>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="pp-detail-block__title" style={{marginTop:24}}>Compare plans (annual fee)</div>
          <ul className="pp-detail-list">
            {PLANS.map((p) => (
              <li
                key={p.id}
                onClick={() => setPlanId(p.id)}
                className={p.id === plan.id ? "is-on" : ""}
                style={{cursor: "pointer"}}
              >
                <span className="pp-detail-list__radio" aria-hidden="true">
                  {p.id === plan.id && <span className="pp-detail-list__radio-dot"/>}
                </span>
                <span>
                  <span style={{display:"block", fontSize:12, color:"var(--c-muted)"}}>{p.eyebrow}</span>
                  <span style={{display:"block", color:"var(--c-ink)", fontWeight:600}}>{p.name}</span>
                </span>
                <span className="pp-detail-list__v">
                  {formatPrice(priceFor(p, cur), sym)}<span style={{color:"var(--c-muted)", fontWeight:500}}> / year</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Alert tone="info" title="No charge until your account is approved">
        We collect documents next, then run KYB. The {formatPrice(price, sym)} activation fee is taken only on the day your account opens — never before. Cancel any time before that with no charge.
      </Alert>

      <div className="ob-actions between">
        <Button variant="outline" size="lg" onClick={back} iconLeft="arrowLeft">Back to plans</Button>
        <Button variant="primary" size="lg" onClick={() => next("documents")} iconRight="arrowRight">
          Continue with {plan.name}
        </Button>
      </div>
    </div>
  );
}

// ──────────────── Activation screen (post-approval) ────────────────
// Shown when the application is approved — the FIRST money-movement step.
// Mirrors Altery rules: amount + currency + fee + recipient + method + ETA + confirmation.
function ScreenActivation({ planId, currency, mode, next, back }) {
  const cur = currency || "GBP";
  const sym = CURRENCIES[cur].sym;
  const plan = PLANS.find((p) => p.id === planId) || PLANS[1];
  const price = priceFor(plan, cur);
  const [state, setState] = _pUseState("idle"); // idle → processing → success
  const [method, setMethod] = _pUseState("card");

  // Pre-submit mode runs the same payment surface but reframes the
  // copy: the application hasn't been approved yet, so this is an
  // authorisation/commercial commitment, not an "activate now" charge.
  // Once paid, ScreenSubmit renders the KYB-in-review queue state and
  // the fee is held until approval (refunded on rejection within 5 BD).
  const isPresubmit = mode === "presubmit";

  // On successful pre-submit payment, transition to the submit screen.
  // useEffect rather than a setTimeout-in-render so the side effect
  // fires AFTER the render commits, avoiding React's "update during
  // render" warning. The 600ms delay gives the success-tick a moment
  // to register visually before the screen swaps — feels intentional
  // rather than glitchy.
  React.useEffect(() => {
    if (state === "success" && isPresubmit) {
      const t = setTimeout(() => next(), 600);
      return () => clearTimeout(t);
    }
  }, [state, isPresubmit]);

  if (state === "success") {
    if (isPresubmit) {
      // Brief celebration tile — visible for ~600ms while useEffect
      // schedules the screen transition. Cleaner than returning null
      // and flashing blank between screens.
      return (
        <div className="ob-content fade-in">
          <div className="pp-success">
            <div className="pp-success__tick" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                <path d="m6 12 4 4 8-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="t-overline" style={{color:"var(--c-success)", marginBottom:8}}>Authorisation captured</div>
            <h1 className="pp-success__title">Submitting your application…</h1>
            <p className="pp-success__lead">
              Your card has been authorised for {formatPrice(price, sym)}. We'll capture the fee only when KYB approves your account.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="ob-content fade-in">
        <div className="pp-success">
          <div className="pp-success__tick" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
              <path d="m6 12 4 4 8-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="t-overline" style={{color:"var(--c-success)", marginBottom:8}}>Account activated</div>
          <h1 className="pp-success__title">Welcome to Altery {plan.name}.</h1>
          <p className="pp-success__lead">
            We've taken {formatPrice(price, sym)} from your card and your accounts are live. You'll receive your account details and welcome email shortly.
          </p>
        </div>

        <div className="pp-success__grid">
          <div className="pp-success__cell">
            <div className="pp-success__cell-label">Activation fee paid</div>
            <div className="pp-success__cell-amt">{formatPrice(price, sym)}</div>
            <div className="pp-success__cell-sub">Visa ·· 4242 · Reference ALT-2026-00482</div>
          </div>
          <div className="pp-success__cell">
            <div className="pp-success__cell-label">Plan active until</div>
            <div className="pp-success__cell-amt" style={{fontSize:22}}>2 May 2027</div>
            <div className="pp-success__cell-sub">Renews annually unless cancelled</div>
          </div>
        </div>

        <div className="ob-actions">
          <Button variant="primary" size="xl" onClick={() => next("dashboard")} iconRight="arrowRight">
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Pre-submit and post-approval share the same form (card / Apple
  // Pay / Google Pay / SEPA) but differ in eyebrow, title, lead, CTA
  // copy, and the trust line beneath the form. All copy diffs are
  // gated through `isPresubmit` so the post-approval flow is untouched.
  const eyebrowText = isPresubmit
    ? "Activation fee · Authorise to submit"
    : "Approved · Ready to activate";
  const eyebrowColor = isPresubmit ? "var(--c-muted)" : "var(--c-success)";
  const titleText = isPresubmit
    ? `Authorise ${formatPrice(price, sym)} to submit your ${plan.name} application.`
    : `Pay ${formatPrice(price, sym)} to activate your ${plan.name} account.`;
  const leadText = isPresubmit
    ? `This authorisation travels with your KYB submission. We'll capture the ${formatPrice(price, sym)} fee only after your application is approved (typically within 48 working hours). If we cannot onboard you, no charge is made.`
    : `Your KYB review is complete and your account is approved. This one-off charge unlocks your accounts, cards, and ${plan.name.toLowerCase()} fee schedule for 12 months. Refunded in full within 5 business days if you cancel.`;
  const ctaText = isPresubmit
    ? `Authorise & submit · ${formatPrice(price, sym)}`
    : `Activate account · Pay ${formatPrice(price, sym)}`;
  const ctaWalletText = isPresubmit
    ? `Authorise & submit · ${formatPrice(price, sym)}`
    : `Activate · ${formatPrice(price, sym)}`;
  const legalText = isPresubmit
    ? `Recipient: Altery EMI Ltd · FCA #901037. You authorise Altery to capture the ${formatPrice(price, sym)} ${plan.name} activation fee from your card after your KYB application is approved. No charge before approval.`
    : `Recipient: Altery EMI Ltd · FCA #901037. You authorise Altery to charge your card now for the ${formatPrice(price, sym)} ${plan.name} activation fee.`;
  const summaryRowLabel = isPresubmit ? "Authorised today" : "Charged today";
  const summaryMetaLine = isPresubmit
    ? "Charged on approval · Refunded in full on rejection"
    : "14-day cooling-off period · Cancel any time";

  return (
    <div className="ob-content fade-in">
      <TopRow onBack={back} />

      <div className="pp-pay-head">
        <div className="t-overline" style={{color: eyebrowColor}}>{eyebrowText}</div>
        <h1 className="pp-pay-head__title">{titleText}</h1>
        <p className="pp-pay-head__lead">{leadText}</p>
      </div>

      <div className="pp-pay">
        <div className="pp-pay__form">
          <div className="pp-pay__tabs" role="tablist" aria-label="Payment method">
            {[
              { id: "card", label: "Card" },
              { id: "applepay", label: "Apple Pay" },
              { id: "googlepay", label: "Google Pay" },
              { id: "sepa", label: "SEPA" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={method === m.id}
                className={`pp-pay__tab ${method === m.id ? "is-on" : ""}`}
                onClick={() => setMethod(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {method === "card" && (
            <div className="ob-fields">
              <Input label="Email" type="email" defaultValue="anna@orbit.io"/>
              <Input
                label="Card number"
                defaultValue="4242 4242 4242 4242"
                suffix={<span className="pp-pay__brand">VISA <span className="pp-pay__brand-sep">··</span></span>}
              />
              <div className="ob-fields row">
                <Input label="Expiry" defaultValue="04 / 29"/>
                <Input label="CVC" defaultValue="123"/>
              </div>
              <Input label="Cardholder name" defaultValue="Anna Petrenko"/>

              <Button
                variant="primary"
                size="xl"
                onClick={() => {
                  setState("processing");
                  setTimeout(() => setState("success"), 1400);
                }}
                loading={state === "processing"}
                disabled={state === "processing"}
                iconLeft="lock"
                full
              >
                {ctaText}
              </Button>
              <p className="pp-pay__legal">
                {legalText}
              </p>
            </div>
          )}

          {method !== "card" && (
            <div className="pp-pay__wallet">
              <div className="pp-pay__wallet-card">
                <div className="pp-pay__wallet-title">Continue with {method === "applepay" ? "Apple Pay" : method === "googlepay" ? "Google Pay" : "SEPA Direct Debit"}</div>
                <div className="pp-pay__wallet-sub">{isPresubmit ? `Authorise ${formatPrice(price, sym)} — captured on approval.` : `Authorise ${formatPrice(price, sym)} to activate your account.`}</div>
              </div>
              <Button
                variant="primary"
                size="xl"
                onClick={() => { setState("processing"); setTimeout(() => setState("success"), 1400); }}
                loading={state === "processing"}
                full
                iconLeft="lock"
              >
                {ctaWalletText}
              </Button>
            </div>
          )}
        </div>

        <aside className="pp-pay__summary">
          <div className="pp-pay__summary-eyebrow">Activation summary</div>
          <div className="pp-pay__summary-plan">
            <div className="pp-pay__summary-plan-name">{plan.name}</div>
            <div className="pp-pay__summary-plan-tag">{plan.cap}</div>
          </div>

          <div className="pp-pay__row">
            <span>Annual plan fee</span>
            <span className="tabular">{formatPrice(price, sym)}</span>
          </div>
          <div className="pp-pay__row pp-pay__row--meta">
            <span>Recipient</span>
            <span>Altery EMI Ltd</span>
          </div>
          <div className="pp-pay__row pp-pay__row--meta">
            <span>Currency</span>
            <span>{cur}</span>
          </div>

          <div className="pp-pay__divider"/>

          <div className="pp-pay__row pp-pay__row--total">
            <span>{summaryRowLabel}</span>
            <span className="tabular">{formatPrice(price, sym)}</span>
          </div>
          <div className="pp-pay__row pp-pay__row--meta">
            <span>{summaryMetaLine}</span>
          </div>

          <div className="pp-pay__trust">
            <span><Icon name="lock" size={12} color="var(--c-muted)"/> PCI DSS Level 1</span>
            <span>FCA EMI #901037</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenPlan, ScreenPlanDetails, ScreenActivation, PLANS, CURRENCIES });
