/* global React, useT, Button, Checkbox, Tag, Alert, Input, Modal, Card, Spinner,
          Icon, Flag, Field, WhyWeAsk,
          EC_FEE_SCHEDULE, EC_PLANS, EC_ENTITIES, EC_SERVICES,
          ecCurrencyFlag, ecCurrencyName, ecComputeCostBreakdown,
          ecOutcomesForSavings, ecGenProposalRef,
          ecBuildAnalysisHTML, ecSendAnalysisEmail, ecWaitForPdfLibs,
          EcIco, ecSubmitHubspotLead */
// checker-modals.jsx — all the modal/handoff/payment overlays the result
// page can open.
//
// Loaded as <script type="text/babel" src="/checker-modals.jsx"> in
// /index.html after /checker-screens.jsx. Exports to window:
//
//   EcFeesModal          — full fee schedule popup, opened by the "View all fees" link
//   EcPlanComparisonModal — "Compare plans" popup with three plan cards
//   EcPlanIcon           — small helper, renders a tier icon from EcIco
//   EcPlanCompareCard    — single plan card inside EcPlanComparisonModal
//   EcHandoffModal       — final "Start setup" confirmation, value-prop summary,
//                          email-the-proposal flow
//
// All dependencies (DS components, data, helpers, the PDF/email functions in
// /checker-pdf.js, the inline EcIco from /checker-screens.jsx) resolve at
// render time through the standard scope chain.
//
// useState/useEffect/etc. are NOT redeclared here — the inline text/babel
// block in /index.html owns that destructure, and a second top-level
// `const useState = …` would collide in the per-realm lexical slot
// (SyntaxError: Identifier 'useState' has already been declared).

// Canonical plan-features list shown identically on every plan card
// inside EcPlanComparisonModal. Each row is a binary capability; the
// {starter,pro,ultra} flags decide green-check vs red-cross per card.
// Row labels reuse existing perk i18n strings (no new translations
// added for the feature names themselves).
const PLAN_CAPABILITIES = [
  { labelKey: "ec.plan.cap.am",             on: { starter: false, pro: true,  ultra: true  } },
  { labelKey: "ec.plan.ultra.p5",           on: { starter: false, pro: false, ultra: true  } },
  { labelKey: "ec.plan.ultra.negotiatedFx", on: { starter: false, pro: false, ultra: true  } },
  { labelKey: "ec.plan.ultra.users",        on: { starter: false, pro: false, ultra: true  } },
];

function EcFeesModal({ plan, entity, onClose }) {
  const t = useT();
  const region = ecFeeRegion(entity);
  const fees = EC_FEE_SCHEDULE[region];
  // Plan-specific values pulled directly from EC_PLANS (price) and
  // perks text (FX cap, SWIFT cap if present). Keeps the modal in
  // sync with whatever copy the plan card shows.
  const planPrice = plan.price; // e.g. "£100"
  const cycleSuffix = t(plan.cycleKey); // "/ month" etc.
  // Concatenate with non-breaking spaces — the cycle suffix usually
  // contains a regular space (e.g. "/ month") which the browser will
  // happily wrap at on narrow mobile cells. Replacing all ASCII
  // spaces with \u00A0 keeps the price-and-cycle unit on one line
  // regardless of CSS white-space behaviour. Belt-and-braces with
  // the .ec-fees__value { white-space: nowrap } rule.
  const monthlyFee = `${planPrice}${cycleSuffix}`.replace(/ /g, '\u00A0');
  // FX cap and SWIFT cap come straight from the plan's fees object.
  // Previously parsed out of perkKeys text via regex, but the perks
  // no longer carry a literal "X%" string (perk copy moved to feature
  // names like "Dedicated account manager"). plan.fees.fxMarkup is
  // the canonical string ("up to 0.7%") — title-case it for display.
  const fxRaw = (plan.fees && plan.fees.fxMarkup) || "";
  const fxCap = fxRaw ? fxRaw.replace(/^up\s+to\b/i, "Up to") : "On request";
  // SWIFT cap detection — still parsed from perkKeys text because no
  // structured field exists; falls back to null when no perk says "cap".
  const allPerkText = plan.perkKeys.map((k) => t(k)).join(" ");
  const swiftCapMatch = allPerkText.match(/(?:cap|capped).*?([€£$]\d+)/i);
  const swiftCapLabel = swiftCapMatch ? swiftCapMatch[1] : null;

  // Modal sections — order matches buyer logic: what does the
  // account cost → what does it cost to send → what does it cost
  // to receive → FX. Each section is a small table.
  const sections = [
    {
      headKey: "ec.fees.section.account",
      rows: [
        { labelKey: "ec.fees.row.opening",     value: fees.accountOpening },
        { labelKey: "ec.fees.row.monthly",     value: monthlyFee, highlight: true },
        { labelKey: "ec.fees.row.closure",     value: fees.accountClosure },
        { labelKey: "ec.fees.row.inactivity",  value: fees.inactivity },
      ],
    },
    {
      headKey: "ec.fees.section.outgoing",
      rows: [
        { labelKey: "ec.fees.row.internal",    value: fees.internal },
        { labelKey: "ec.fees.row.sepa",        value: fees.sepa },
        { labelKey: "ec.fees.row.fp",          value: fees.fp },
        { labelKey: "ec.fees.row.fedwire",     value: fees.fedwire },
        { labelKey: "ec.fees.row.achUsd",      value: fees.achUsd },
        { labelKey: "ec.fees.row.swiftGbp",    value: fees.swiftGbpOut },
        { labelKey: "ec.fees.row.swiftEur",    value: fees.swiftEurOut },
        { labelKey: "ec.fees.row.swiftUsd",    value: fees.swiftUsdOut },
      ],
    },
    {
      headKey: "ec.fees.section.incoming",
      rows: [
        { labelKey: "ec.fees.row.internalIn",  value: fees.internal },
        { labelKey: "ec.fees.row.sepaIn",      value: "Free" },
        { labelKey: "ec.fees.row.fpIn",        value: "Free" },
        { labelKey: "ec.fees.row.swiftIn",     value: fees.swiftIn },
      ],
    },
    {
      headKey: "ec.fees.section.fx",
      rows: [
        { labelKey: "ec.fees.row.fxMarkup",    value: fxCap, highlight: true },
        { labelKey: "ec.fees.row.exchange",    value: fees.exchange },
      ],
    },
  ];

  return ReactDOM.createPortal((
    <div className="ec-modal__backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ec-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="ec-modal__close"
          aria-label={t("ec.r.plan.compare.close")}
          onClick={onClose}
        >
          <EcIco.close style={{ width: 18, height: 18 }} />
        </button>
        <h2 className="ec-modal__title">{t("ec.fees.title")}</h2>
        <div className="ec-fees__subtitle">
          {t(plan.nameKey)} · {monthlyFee} · {t(entity.nameKey)}
        </div>

        {sections.map((s) => (
          <div className="ec-fees__section" key={s.headKey}>
            <div className="ec-fees__sectionHead">{t(s.headKey)}</div>
            <div className="ec-fees__table">
              {s.rows.map((r) => (
                <div
                  key={r.labelKey}
                  className={"ec-fees__row" + (r.highlight ? " ec-fees__row--highlight" : "")}
                >
                  <div className="ec-fees__label">{t(r.labelKey)}</div>
                  <div className={"ec-fees__value" + (r.value === "Currently unavailable" ? " ec-fees__value--muted" : "")}>
                    {r.value}
                  </div>
                </div>
              ))}
            </div>
            {/* SWIFT cap note — only render when active plan has the
                "SWIFT fee cap at X" perk (currently Ultra). Sits
                visually attached to the Outgoing section since SWIFT
                rows are in that group. */}
            {s.headKey === "ec.fees.section.outgoing" && swiftCapLabel && (
              <div className="ec-fees__planNote">
                {t("ec.fees.note.swiftCap", { cap: swiftCapLabel })}
              </div>
            )}
          </div>
        ))}

        <div className="ec-fees__footer">
          {t("ec.fees.footer.disclaimer")}<br/>
          <a
            href="https://altery.com/fees/business"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("ec.fees.footer.link")}
          </a>
        </div>
      </div>
    </div>
  ), document.body);
}

// ──────────────────── Plan comparison modal ────────────────────
// Opens from the "Compare all plans →" link. Shows plans that are NOT
// currently active. User can switch by clicking the CTA on any card.
// If user has switched away from the algorithm's recommendation, the
// originally-recommended plan reappears in the modal with a small
// badge — a breadcrumb back to the suggested choice.
//
// Portaled to document.body via ReactDOM.createPortal to escape any
// transform-creating ancestor (e.g. .ec-content's fade-in animation
// which leaves transform: translateY(0) as the final state and
// creates a containing block for position:fixed descendants).
function EcPlanComparisonModal({ activePlanId, recommendedPlanId, onSelect, onClose }) {
  const t = useT();

  // ESC key closes — keyboard a11y baseline
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while modal open — standard modal pattern
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Show the plans that are NOT currently active. If user has switched
  // away from the recommended plan, that plan reappears here with a
  // wasRecommended badge (their path back to the algorithm's choice).
  const planOrder = ["starter", "pro", "ultra"];
  const plans = planOrder
    .filter((id) => id !== activePlanId)
    .map((id) => ({
      ...EC_PLANS[id],
      id,
      wasRecommended: id === recommendedPlanId,
    }));

  const content = (
    <div className="ec-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="ec-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ec-plan-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="ec-modal__close"
          onClick={onClose}
          aria-label={t("ec.r.plan.compare.close")}
        >
          <EcIco.close style={{ width: 16, height: 16 }} />
        </button>

        <h2 id="ec-plan-modal-title" className="ec-modal__title">
          {t("ec.r.plan.compare.title")}
        </h2>

        <div className="ec-plan-compare__grid">
          {plans.map((plan) => (
            <EcPlanCompareCard
              key={plan.id}
              plan={plan}
              onSelect={() => onSelect(plan.id)}
            />
          ))}
        </div>

      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

// ────────────────────────────────────────────────────────────────
// EcMethodologyModal — "How we calculated this" disclosure that
// used to live as an inline <details> expander on the result page.
// Shows the apples-to-apples line-by-line cost table (subscription /
// FX / SWIFT / local / total), the per-user assumptions that fed
// the projection (corridor mix, tx count, fxRatio, FX margins,
// hidden-cost calibration), and the citation block with per-bank
// tariff links.
// ────────────────────────────────────────────────────────────────
function EcMethodologyModal({ cost, fmtNarrow, onClose }) {
  const t = useT();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const lang = (window.__I18N && window.__I18N.getLang && window.__I18N.getLang()) || "en";
  const asofDisplay = (() => {
    try {
      return new Date(cost.methodology.asof).toLocaleDateString(lang, {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch { return cost.methodology.asof; }
  })();

  const content = (
    <div className="ec-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="ec-modal ec-modal--method"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ec-method-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="ec-modal__close"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <EcIco.close style={{ width: 16, height: 16 }} />
        </button>

        <h2 id="ec-method-modal-title" className="ec-modal__title">
          {t("ec.r.method.summary")}
        </h2>

        <div className="ec-r__method__body">
          {/* Altery-only breakdown (Jun 2026): the bank comparison column,
              the bank-FX assumption line and the named-bank tariff source
              links were removed — this modal now shows only how Altery's own
              estimate is built from its published tariff + the user's inputs.
              Inline-styled to drop the old 3-column grid. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {[["subscription", cost.altery.subscription], ["fx", cost.altery.fx], ["swift", cost.altery.swift], ["local", cost.altery.local]].map((row) => (
              <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--c-ink-2)" }}>
                <span>{t("ec.r.method.line." + row[0])}</span><span>{fmtNarrow(row[1])}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, color: "var(--c-ink)", borderTop: "1px solid var(--c-border)", paddingTop: 9 }}>
              <span>{t("ec.r.method.line.total")}</span><span>{fmtNarrow(cost.altery.total)}</span>
            </div>
          </div>

          <ul className="ec-r__method__assumptions">
            {cost.methodology.assumptions.filter((a) => a.key !== "ec.r.method.bankFx").map((a, i) => (
              <li key={i}>{t(a.key, a.vars)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

// Helper: renders the chess-piece icon for a plan tier given its iconKey.
// Returns null if the icon doesn't exist — defensive against typos.
function EcPlanIcon({ iconKey, size = 22 }) {
  const Icon = EcIco[iconKey];
  if (!Icon) return null;
  return <Icon style={{ width: size, height: size }} />;
}

function EcPlanCompareCard({ plan, onSelect }) {
  const t = useT();
  const priceValue = plan.priceKey ? t(plan.priceKey) : plan.price;
  const cycleText = t(plan.cycleKey);

  // Fee rows — numeric transaction-fee differentiators from Altery's
  // public table. The Mass-payments capability used to live here as a
  // binary "tick / —" row, but it's already shown in the Products
  // section, so it's been removed. Compound SWIFT pricing
  // ("€10 + 0.25%") renders as-is in mono — same as Altery's page.
  const feeRows = [
    { labelKey: "ec.r.plan.compare.fee.fasterPay", value: plan.fees.fasterPay },
    { labelKey: "ec.r.plan.compare.fee.sepa",      value: plan.fees.sepa      },
    { labelKey: "ec.r.plan.compare.fee.swift",     value: plan.fees.swift     },
    { labelKey: "ec.r.plan.compare.fee.fxMarkup",  value: plan.fees.fxMarkup  },
  ];

  return (
    <div className="ec-plan-compare__card">
      {plan.wasRecommended && (
        <div className="ec-plan-compare__wasBadge">
          {t("ec.r.plan.compare.wasRecommended")}
        </div>
      )}

      <div className="ec-plan-compare__head">
        <div className="ec-plan-compare__nameRow">
          <div className="ec-plan-compare__iconBox">
            <EcPlanIcon iconKey={plan.iconKey} size={22} />
          </div>
          <div>
            <div className="ec-plan-compare__name">{t(plan.nameKey)}</div>
            <div className="ec-plan-compare__tagline">{t(plan.taglineKey)}</div>
          </div>
        </div>
        <div className="ec-plan-compare__price">
          <span className="ec-plan-compare__priceValue">{priceValue}</span>
          <span className="ec-plan-compare__priceCycle">/ {cycleText.replace(/^\/\s*/, "")}</span>
        </div>
      </div>

      <div className="ec-plan-compare__divider" />

      {/* Plan features — canonical 4-row binary list of qualitative
          capabilities, shown identically on every card so the eye can
          scan line-by-line: same vertical position = same feature,
          only the green-check / red-cross changes between Starter /
          Pro / Ultra. Reuses existing perk strings as row labels. */}
      <div className="ec-plan-compare__section">
        <div className="ec-plan-compare__sectionHead">{t("ec.r.plan.compare.featuresHead")}</div>
        <div className="ec-plan-compare__perks">
          {PLAN_CAPABILITIES.map((cap, i) => {
            const on = cap.on[plan.id];
            return (
              <div key={i}
                   className={"ec-plan-compare__perk" + (on ? "" : " ec-plan-compare__perk--off")}>
                {on ? <EcIco.check /> : <EcIco.close />}
                <span>{t(cap.labelKey)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Products included — iterates the full EC_SERVICES list in
          canonical order and shows a green tick for products the plan
          covers / a red cross for ones it doesn't. Identical row count
          across all three cards makes scan-comparison instant: eye
          stays on the same vertical position and only the icon/colour
          changes between Starter / Pro / Ultra. Inclusion is derived
          from svc.tier vs plan.id — starter & specialist services are
          on every plan, "pro" tier on Pro/Ultra, "ultra" only on Ultra. */}
      <div className="ec-plan-compare__section">
        <div className="ec-plan-compare__sectionHead">{t("ec.r.plan.compare.productsHead")}</div>
        <div className="ec-plan-compare__perks">
          {EC_SERVICES.map((svc, i) => {
            const tier = svc.tier;
            const included =
              (tier === "starter" || tier === "specialist") ||
              (tier === "pro"   && plan.id !== "starter") ||
              (tier === "ultra" && plan.id === "ultra");
            return (
              <div key={i}
                   className={"ec-plan-compare__perk" + (included ? "" : " ec-plan-compare__perk--off")}>
                {included ? <EcIco.check /> : <EcIco.close />}
                <span>{t(svc.titleKey)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ec-plan-compare__section">
        <div className="ec-plan-compare__sectionHead">{t("ec.r.plan.compare.feesHead")}</div>
        <div className="ec-plan-compare__fees">
          {feeRows.map((row, i) => (
            <div key={i} className="ec-plan-compare__feeRow">
              <span className="ec-plan-compare__feeLabel">{t(row.labelKey)}</span>
              <span className="ec-plan-compare__feeValue">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA — switch to this plan. Primary button, full width. */}
      <button
        type="button"
        className="ec-plan-compare__switch"
        onClick={onSelect}
      >
        {t("ec.r.plan.compare.switch")}
      </button>
    </div>
  );
}

// Request-a-callback form — the explicit, opt-in path to sales contact.
// This is now the ONLY thing that creates a HubSpot lead: requesting the
// PDF no longer does. Collects first + last name (email is known on the
// modal's sent stage, or carried in the PDF/email deep-link), writes the
// contact via ecSubmitHubspotLead, and promises a 2-hour response.
//
// `email` prefills + hides the email field when known. `rec` supplies the
// checker context on-screen; `context` carries it directly for the
// deep-link entry (which has no full rec to rebuild).
// Privacy-policy consent — a REQUIRED checkbox on the contact-our-team /
// sales-callback form only (GDPR lawful-basis capture at the point of
// collection). It is NOT shown on the "email me the proposal" handoff flow,
// since emailing the user their own PDF is not a team-contact action.
// Submit is blocked until it's ticked; rendered in brand navy. The link text
// lives inside the i18n string as <a>…</a> (same pattern as onboarding's
// ob.welcome.tos) so its position adapts per language; we splice in the
// real Privacy Policy URL here. stopPropagation on the anchor so clicking
// the link opens the policy without toggling the surrounding checkbox label.
const EC_PRIVACY_URL = "https://altery.com/legal/privacy-policy/";
function EcPrivacyConsent({ checked, onChange, error }) {
  const t = useT();
  const raw = t("ec.consent.privacy");
  const m = raw.match(/^([\s\S]*)<a>([\s\S]*?)<\/a>([\s\S]*)$/);
  const label = m ? (
    <span>
      {m[1]}
      <a href={EC_PRIVACY_URL} target="_blank" rel="noopener noreferrer"
         onClick={(e) => e.stopPropagation()}
         style={{ color: "var(--c-accent)", textDecoration: "underline" }}>{m[2]}</a>
      {m[3]}
    </span>
  ) : raw;
  return (
    <div className="ec-handoff__consent" style={{ margin: "2px 0" }}>
      <Checkbox checked={checked} onChange={onChange} label={label} error={error} tone="primary" />
    </div>
  );
}

function EcCallbackForm({ email: emailProp, rec, context }) {
  const t = useT();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname]   = useState("");
  const [company, setCompany]     = useState("");
  const [phone, setPhone]         = useState("");
  const [email, setEmail]         = useState(emailProp || "");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched]     = useState(false);
  const [error, setError]         = useState(null);
  const [done, setDone]           = useState(false);
  const [consent, setConsent]     = useState(false);
  // Anti-spam: honeypot input + mount-time stamp. See lib/anti-spam.js.
  // Bots that fill every field set `honeypot` non-empty; instant submits
  // fail the 3-second form-age check.
  const [honeypot, setHoneypot]   = useState("");
  const formLoadedAt = useRef(Date.now());

  const needEmail  = !emailProp;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  // Loose phone validation — at least 7 digits anywhere in the string,
  // intentionally accepting "+44 7700 900 000" / "+1 (415) 555-0123" /
  // "07700 900 000" without forcing a single format. Sales calls back,
  // not an automated SMS dialer.
  const phoneValid = /\d{7,}/.test(phone.replace(/\D/g, ""));
  const companyValid = company.trim().length > 0;
  const valid = firstname.trim().length > 0 && lastname.trim().length > 0
    && companyValid && phoneValid && emailValid && consent;

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    const res = await ecSubmitHubspotLead({
      email:     email.trim(),
      firstname: firstname.trim(),
      lastname:  lastname.trim(),
      company:   company.trim(),
      phone:     phone.trim(),
      rec,
      context,
      antiSpam: { website: honeypot, formLoadedAt: formLoadedAt.current },
    });
    setSubmitting(false);
    if (res && res.ok) setDone(true);
    else setError(t("ec.handoff.error"));
  };

  if (done) {
    return <div className="ec-callback__success">✓ {t("ec.callback.success")}</div>;
  }

  return (
    <div className="ec-callback">
      {/* Honeypot — invisible to humans, irresistible to dumb bots.
          Positioned off-screen rather than display:none so that
          headless browsers reading computed styles still "see" it. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <div className="ec-callback__row">
        <Input
          type="text"
          size="md"
          autoComplete="given-name"
          placeholder={t("ec.callback.firstname")}
          value={firstname}
          onChange={(e) => setFirstname(e.target.value)}
          disabled={submitting}
          style={{ flex: "1 1 0", minWidth: 0 }}
        />
        <Input
          type="text"
          size="md"
          autoComplete="family-name"
          placeholder={t("ec.callback.lastname")}
          value={lastname}
          onChange={(e) => setLastname(e.target.value)}
          disabled={submitting}
          style={{ flex: "1 1 0", minWidth: 0 }}
        />
      </div>
      <Input
        type="text"
        size="md"
        autoComplete="organization"
        placeholder={t("ec.callback.company")}
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        disabled={submitting}
      />
      <Input
        type="tel"
        size="md"
        inputMode="tel"
        autoComplete="tel"
        placeholder={t("ec.callback.phone")}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={submitting}
      />
      {needEmail && (
        <Input
          type="email"
          size="md"
          inputMode="email"
          autoComplete="email"
          placeholder={t("ec.handoff.email.label")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
      )}
      <EcPrivacyConsent checked={consent} onChange={setConsent} />
      {((touched && !valid) || error) && (
        <div className="ec-handoff__error" role="alert">{error || t("ec.callback.error")}</div>
      )}
      <Button
        variant="primary"
        size="lg"
        full
        onClick={submit}
        disabled={submitting || !consent || (touched && !valid)}
        style={{ height: 44 }}
      >
        {submitting ? t("ec.handoff.submitting") : t("ec.callback.submit")}
      </Button>
    </div>
  );
}

function EcHandoffModal({ rec, onClose, onContinueToSetup, initialStage }) {
  const t = useT();
  // Three-state machine, not a boolean — keeps the JSX readable and
  // makes adding future states (e.g. "loading", "error-retry") trivial.
  // Stages: "commit" (default — "Ready to set up your X account" with two
  // CTAs), "email" (proposal email capture), "sent" (success). Callers
  // that want to jump straight to email capture pass initialStage="email".
  const [stage, setStage] = useState(initialStage || "commit");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // "Send a copy to a colleague" flow — secondary send action on
  // the sent stage. Kept in its own state slice so primary email
  // flow doesn't get tangled with it; both reuse ecSendAnalysisEmail
  // under the hood (each invocation regenerates the PDF — cheap
  // enough that caching adds more code than it saves).
  const [colleagueEmail, setColleagueEmail] = useState("");
  const [colleagueTouched, setColleagueTouched] = useState(false);
  const [colleagueSubmitting, setColleagueSubmitting] = useState(false);
  const [colleagueSent, setColleagueSent] = useState(false);
  const [colleagueError, setColleagueError] = useState(null);
  // Sent-stage view router. "options" = success + two tile choices +
  // primary CTA; "forward" = colleague-share form (back arrow returns
  // to options); "callback" = callback-form (back arrow returns).
  // Switching views slides content right; modal height re-flows
  // naturally to fit the new view (no fixed height).
  const [sentView, setSentView] = useState("options");

  // Anti-spam: honeypot + mount-time stamp shared by both email-stage
  // sends (primary recipient and colleague copy). See lib/anti-spam.js.
  const [honeypot, setHoneypot] = useState("");
  const formLoadedAt = useRef(Date.now());

  // Engagement signal for the next-steps checklist on the sent stage.
  // colleagueSent → step 2 ("Forward to your CFO or co-founder") flips done.
  // Write-once locally — there's no value in toggling back, and refreshing
  // the modal regenerates state from scratch.

  // ESC close + body scroll lock
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const showError = touched && email.length > 0 && !isValid;

  const sendEmail = async () => {
    setTouched(true);
    if (!isValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Real email delivery: build the PDF locally, POST to
      // /api/send-analysis, which ships a transactional email (PDF
      // attached) to the address the user entered. See api/send-analysis.js
      // for server-side details (env vars, sender domain).
      await ecSendAnalysisEmail({
        rec,
        email,
        t,
        antiSpam: { website: honeypot, formLoadedAt: formLoadedAt.current },
      });
      setStage("sent");
    } catch (err) {
      console.error("[EcHandoffModal] email send failed:", err);
      setSubmitError(t("ec.handoff.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const isColleagueValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(colleagueEmail.trim());
  const showColleagueError = colleagueTouched && colleagueEmail.length > 0 && !isColleagueValid;

  const sendColleagueCopy = async () => {
    setColleagueTouched(true);
    if (!isColleagueValid) return;
    setColleagueSubmitting(true);
    setColleagueError(null);
    try {
      // Reuses the same end-to-end pipeline as the primary send. The
      // colleague copy is delivered with a forwarder banner so the
      // recipient immediately sees who shared it — turns a cold send
      // into a contextual one and aligns two stakeholders on the same
      // artifact. Cheaper to regenerate the PDF than to thread cached
      // bytes through state — 2s of compute against vastly simpler code.
      await ecSendAnalysisEmail({
        rec,
        email: colleagueEmail.trim(),
        t,
        forwardedBy: email.trim(),
        antiSpam: { website: honeypot, formLoadedAt: formLoadedAt.current },
      });
      setColleagueSent(true);
    } catch (err) {
      console.error("[EcHandoffModal] colleague copy failed:", err);
      setColleagueError(t("ec.handoff.error"));
    } finally {
      setColleagueSubmitting(false);
    }
  };

  const content = (
    <div
      className="ec-modal__backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ec-modal ec-modal--handoff" role="dialog" aria-modal="true" aria-labelledby="ec-handoff-title">
        <button
          className="ec-modal__close"
          onClick={onClose}
          aria-label={t("common.close")}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {stage === "commit" && (
          <>
            <div className="ec-handoff__commitIcon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="m9 16 4.5 4.5L23 11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 id="ec-handoff-title" className="ec-modal__title">
              {t("ec.handoff.title", { plan: t(rec.plan.nameKey) })}
            </h2>
            <p className="ec-handoff__lead">{t("ec.handoff.lead")}</p>
            {/* Stacked action pair — primary "Start setup" + secondary
                "Or send me the full proposal" — matches the
                AlteryPay DS pattern used by ResumeModal in onboarding
                (full-width primary on top, ghost full-width below). */}
            <div className="ec-handoff__actions">
              <Button
                variant="primary"
                size="xl"
                full
                onClick={onContinueToSetup}
                iconRight="arrowRight"
              >
                {t("ec.handoff.continue")}
              </Button>
              <Button
                variant="ghost"
                size="xl"
                full
                onClick={() => setStage("email")}
              >
                {t("ec.handoff.emailOnly")}
              </Button>
            </div>
          </>
        )}

        {stage === "email" && (() => {
          // Compute personalised cost projection so the value-prop
          // bullets can quote the user's specific monthly savings
          // figure. Falls back to a generic bullet when the volume
          // is too small for credible projection.
          const cost = ecComputeCostBreakdown(rec);
          // ecComputeCostBreakdown returns GBP-denominated numbers (see
          // EUR_TO_GBP in checker-helpers.js); the rest of the result
          // page is in £, so the modal matches to avoid currency whiplash.
          const fmt = (n) => "£" + (n || 0).toLocaleString("en-GB");
          return (
          <>
            <h2 id="ec-handoff-title" className="ec-modal__title">
              {t("ec.handoff.email.title")}
            </h2>
            <p className="ec-handoff__lead">{t("ec.handoff.email.lead")}</p>

            {/* Value-prop bullets used to live here (cost breakdown /
                bank comparison / prep checklist). All removed: the
                first two were content INSIDE the PDF, and the prep
                checklist felt like marketing noise on top of an
                already-clear lead. The "tailored to your business"
                line above carries the value-prop on its own. */}

            <div className="ec-handoff__field">
              {/* Honeypot — invisible to humans, irresistible to dumb
                  bots. See lib/anti-spam.js. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{
                  position: "absolute",
                  left: "-9999px",
                  top: "auto",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />
              <Input
                id="ec-handoff-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                size="lg"
                label={t("ec.handoff.email.label")}
                placeholder={t("ec.handoff.email.placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid && !submitting) sendEmail();
                }}
                disabled={submitting}
                autoFocus
                error={showError ? t("ec.handoff.email.error") : undefined}
              />
            </div>

            {submitError && (
              <div className="ec-handoff__error" role="alert">{submitError}</div>
            )}

            <div className="ec-handoff__actions">
              <Button
                variant="primary"
                size="xl"
                full
                onClick={sendEmail}
                disabled={submitting || !isValid}
              >
                {submitting ? t("ec.handoff.submitting") : t("ec.handoff.email.send")}
              </Button>
              <Button
                variant="ghost"
                size="xl"
                full
                iconLeft="arrowLeft"
                onClick={() => setStage("commit")}
                disabled={submitting}
              >
                {t("ec.handoff.email.back")}
              </Button>
            </div>
            <p className="ec-handoff__privacy">{t("ec.handoff.trust")}</p>
          </>
          );
        })()}

        {stage === "sent" && sentView === "options" && (
          <div key="options" className="ec-handoff__subView">
            <div className="ec-handoff__successIcon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2"/>
                <path d="m10 16 4 4 8-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 id="ec-handoff-title" className="ec-modal__title">{t("ec.handoff.sent.title")}</h2>
            <p className="ec-handoff__lead">{t("ec.handoff.sent.lead", { email })}</p>

            {/* Two secondary actions sit BETWEEN lead and primary CTA.
                Each is a clickable tile with a right-pointing chevron;
                click slides the modal to the corresponding form view.
                Replaces the previous in-place accordion expansion. */}
            <div className="ec-handoff__followups">
              <button type="button"
                      className="ec-handoff__followup"
                      onClick={() => setSentView("forward")}>
                <div className="ec-handoff__followup__text">
                  <div className="ec-handoff__followup__title">{t("ec.handoff.sent.step2.title")}</div>
                  <div className="ec-handoff__followup__body">{t("ec.handoff.sent.step2.body")}</div>
                </div>
                <svg className="ec-handoff__followup__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <button type="button"
                      className="ec-handoff__followup"
                      onClick={() => setSentView("callback")}>
                <div className="ec-handoff__followup__text">
                  <div className="ec-handoff__followup__title">{t("ec.callback.title")}</div>
                  <div className="ec-handoff__followup__body">{t("ec.callback.sla")}</div>
                </div>
                <svg className="ec-handoff__followup__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Primary CTA — start setup. Sits at the bottom of the
                options view so the secondary tiles are visible above
                it without competing visually. */}
            <div className="ec-handoff__actions">
              <Button
                variant="primary"
                size="xl"
                onClick={onContinueToSetup}
                iconRight="arrowRight"
              >
                {t("ec.handoff.continueAnyway")}
              </Button>
            </div>
          </div>
        )}

        {stage === "sent" && sentView === "forward" && (
          <div key="forward" className="ec-handoff__subView">
            <button type="button"
                    className="ec-handoff__back"
                    onClick={() => setSentView("options")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("common.back")}
            </button>
            <h2 id="ec-handoff-title" className="ec-modal__title">{t("ec.handoff.sent.step2.title")}</h2>
            <p className="ec-handoff__lead">{t("ec.handoff.sent.step2.body")}</p>

            {!colleagueSent ? (
              <>
                <div className="ec-handoff__colleague__row">
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    size="md"
                    placeholder={t("ec.handoff.sent.colleague.placeholder")}
                    value={colleagueEmail}
                    onChange={(e) => setColleagueEmail(e.target.value)}
                    onBlur={() => setColleagueTouched(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isColleagueValid && !colleagueSubmitting) sendColleagueCopy();
                    }}
                    disabled={colleagueSubmitting}
                    autoFocus
                    error={showColleagueError ? t("ec.handoff.email.error") : undefined}
                  />
                  <Button
                    variant="primary"
                    size="lg"
                    full
                    onClick={sendColleagueCopy}
                    disabled={colleagueSubmitting || !isColleagueValid}
                    style={{ height: 44 }}
                  >
                    {colleagueSubmitting ? t("ec.handoff.submitting") : t("ec.handoff.sent.colleague.send")}
                  </Button>
                </div>
                {colleagueError && (
                  <div className="ec-handoff__error" role="alert">{colleagueError}</div>
                )}
              </>
            ) : (
              <div className="ec-handoff__colleague__success">
                ✓ {t("ec.handoff.sent.colleague.success", { email: colleagueEmail })}
              </div>
            )}
          </div>
        )}

        {stage === "sent" && sentView === "callback" && (
          <div key="callback" className="ec-handoff__subView">
            <button type="button"
                    className="ec-handoff__back"
                    onClick={() => setSentView("options")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("common.back")}
            </button>
            <h2 id="ec-handoff-title" className="ec-modal__title">{t("ec.callback.title")}</h2>
            <p className="ec-handoff__lead">{t("ec.callback.sla")}</p>
            <EcCallbackForm email={email} rec={rec} />
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

Object.assign(window, {
  EcFeesModal,
  EcPlanComparisonModal, EcMethodologyModal, EcPlanIcon, EcPlanCompareCard,
  EcHandoffModal, EcCallbackForm,
});
