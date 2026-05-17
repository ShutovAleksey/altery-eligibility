/* global React, useT, Button, Tag, Alert, Input, Modal, Card, Spinner,
          Icon, Flag, Field, WhyWeAsk,
          EC_FEE_SCHEDULE, EC_PLANS, EC_ENTITIES, EC_PERKS,
          ecCurrencyFlag, ecCurrencyName, ecComputeCostBreakdown,
          ecOutcomesForSavings, ecGenProposalRef, ecLoadStripe,
          ecBuildAnalysisHTML, ecSendAnalysisEmail, ecWaitForPdfLibs,
          EcIco, EcAccountPreview, EC_CALENDLY_URL */
// checker-modals.jsx — all the modal/handoff/payment overlays the result
// page can open.
//
// Loaded as <script type="text/babel" src="/checker-modals.jsx"> in
// /index.html after /checker-screens.jsx. Exports to window:
//
//   EcFeesModal          — full fee schedule popup, opened by the "View all fees" link
//   EcBankHistory        — inline trust-signals strip (used inside the handoff modal)
//   EcPerks              — perk grid (used on the result page and in the handoff)
//   EcPlanComparisonModal — "Compare plans" popup with three plan cards
//   EcPlanIcon           — small helper, renders a tier icon from EcIco
//   EcPlanCompareCard    — single plan card inside EcPlanComparisonModal
//   EcHandoffModal       — final "Start setup" confirmation, value-prop summary,
//                          email-the-proposal flow
//   EcPaymentModal       — Stripe Payment Element modal for the activation fee
//
// All dependencies (DS components, data, helpers, the PDF/email functions in
// /checker-pdf.js, the inline EcIco from /checker-screens.jsx) resolve at
// render time through the standard scope chain.
//
// useState/useEffect/etc. are NOT redeclared here — the inline text/babel
// block in /index.html owns that destructure, and a second top-level
// `const useState = …` would collide in the per-realm lexical slot
// (SyntaxError: Identifier 'useState' has already been declared).

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
  // FX cap and SWIFT cap detection — read from plan perkKeys text.
  // The modal sources its plan-specific values from the same i18n
  // strings the perks list uses, so changing one updates both.
  const allPerkText = plan.perkKeys.map((k) => t(k)).join(" ");
  const fxMatch = allPerkText.match(/(\d+(?:\.\d+)?)\s*%/);
  const fxCap = fxMatch ? `Up to ${fxMatch[1]}%` : "On request";
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
          aria-label={t("ec.r.plan.compare.closeAria")}
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


//
// Image loading defenses:
//   • referrerPolicy="no-referrer" — Framer's CDN sometimes refuses
//     hotlinks where the Referer header doesn't match altery.com or
//     framer.media; stripping the referrer entirely sidesteps this.
//   • onError → React state tracks per-card failures and re-renders
//     without the image div. Card collapses to title+body — no
//     broken-image icon, no layout glitch.
// ── EcBankHistory ──────────────────────────────────────────────────
// Optional inline question on the result page: "Have you been
// declined or restricted by another bank or EMI before?". Lives
// between caveats and the primary CTAs so it's findable but never
// blocks the path to "Set up account". Two visual states: question
// (title + lead + 3 buttons) and answered (single-line confirmation
// with check icon). State is local — for the prototype the answer
// is purely cosmetic; in production we'd lift it up to the result
// payload so sales has a warm hook ("we saw you ran the checker and
// mentioned a previous rejection — we route those to specialist").
function EcBankHistory() {
  const t = useT();
  const [answer, setAnswer] = useState(null);
  if (answer) {
    return (
      <div className="ec-bankHistory ec-bankHistory--answered">
        <span className="ec-bankHistory__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="ec-bankHistory__thanks">{t("ec.r.bankHistory.thanks." + answer)}</span>
      </div>
    );
  }
  return (
    <div className="ec-bankHistory">
      <div className="ec-bankHistory__head">
        <div className="ec-bankHistory__title">{t("ec.r.bankHistory.title")}</div>
        <div className="ec-bankHistory__lead">{t("ec.r.bankHistory.lead")}</div>
      </div>
      <div className="ec-bankHistory__options" role="group" aria-label={t("ec.r.bankHistory.title")}>
        <button type="button" className="ec-bankHistory__opt" onClick={() => setAnswer("yes")}>
          {t("ec.r.bankHistory.yes")}
        </button>
        <button type="button" className="ec-bankHistory__opt" onClick={() => setAnswer("no")}>
          {t("ec.r.bankHistory.no")}
        </button>
        <button type="button" className="ec-bankHistory__opt" onClick={() => setAnswer("prefer")}>
          {t("ec.r.bankHistory.prefer")}
        </button>
      </div>
    </div>
  );
}

function EcPerks({ services }) {
  const t = useT();
  const [failed, setFailed] = useState(() => new Set());
  // Sort perks so selected services float to the front. Mapping is
  // direct service → perk where it exists: cards → businessCards,
  // multiUser → multiUser, multiEntity → multiEntity, mass →
  // permissions (mass payouts depend on approval flows), fx →
  // currencyExchange. Services without a direct perk match (accounts,
  // crossBorder, local, api, crypto) don't boost any perk. Stable
  // sort keeps original order among unboosted perks.
  const perksSorted = React.useMemo(() => {
    const svcSet = new Set(services || []);
    const serviceToPerk = {
      cards:       "businessCards",
      mass:        "permissions",
      fx:          "currencyExchange",
      multiUser:   "multiUser",
      multiEntity: "multiEntity",
    };
    const boosted = new Set();
    svcSet.forEach((svc) => {
      const perkKey = serviceToPerk[svc];
      if (perkKey) boosted.add(perkKey);
    });
    return [...EC_PERKS].sort((a, b) => {
      const aB = boosted.has(a.key) ? 0 : 1;
      const bB = boosted.has(b.key) ? 0 : 1;
      return aB - bB; // stable: ties keep original order
    });
  }, [services]);
  return (
    <div className="ec-perks">
      <div className="ec-perks__head">{t("ec.r.perks.head")}</div>
      <div
        className="ec-perks__slider"
        role="region"
        aria-label={t("ec.r.perks.head")}
        tabIndex={0}
      >
        {perksSorted.map((p) => {
          const showImage = p.imageUrl && !failed.has(p.key);
          return (
            <div className="ec-perks__card" key={p.key}>
              {showImage && (
                <div className="ec-perks__card__media">
                  <img
                    src={p.imageUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailed((prev) => {
                        const next = new Set(prev);
                        next.add(p.key);
                        return next;
                      })
                    }
                  />
                </div>
              )}
              <div className="ec-perks__card__content">
                <div className="ec-perks__card__title">{t(p.titleKey)}</div>
                <div className="ec-perks__card__body">{t(p.bodyKey)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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

        <div className="ec-plan-compare__footnote">
          {t("ec.r.plan.compare.fee.footnote")}
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

  // Fee rows — real numbers + binary differentiators from Altery's
  // public comparison table. UK Faster Pay, SEPA and SWIFT are the
  // transaction-fee differentiators; FX markup is the spread-side;
  // bulk transfers is a binary capability gate (Starter doesn't get
  // it). Compound SWIFT pricing ("€10 + 0.25%") renders as-is in
  // mono — that's how Altery shows it on the real page.
  const feeRows = [
    { labelKey: "ec.r.plan.compare.fee.fasterPay", value: plan.fees.fasterPay, kind: "value" },
    { labelKey: "ec.r.plan.compare.fee.sepa",      value: plan.fees.sepa,      kind: "value" },
    { labelKey: "ec.r.plan.compare.fee.swift",     value: plan.fees.swift,     kind: "value" },
    { labelKey: "ec.r.plan.compare.fee.fxMarkup",  value: plan.fees.fxMarkup,  kind: "value" },
    { labelKey: "ec.r.plan.compare.fee.bulk",      value: plan.fees.bulk,      kind: "binary" },
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

      <div className="ec-plan-compare__perks">
        {plan.perkKeys.map((k, i) => (
          <div key={i} className="ec-plan-compare__perk">
            <EcIco.check />
            <span>{t(k)}</span>
          </div>
        ))}
      </div>

      <div className="ec-plan-compare__section">
        <div className="ec-plan-compare__sectionHead">{t("ec.r.plan.compare.fitsHead")}</div>
        <div className="ec-plan-compare__fits">{t(plan.fitKey)}</div>
      </div>

      <div className="ec-plan-compare__section">
        <div className="ec-plan-compare__sectionHead">{t("ec.r.plan.compare.feesHead")}</div>
        <div className="ec-plan-compare__fees">
          {feeRows.map((row, i) => (
            <div key={i} className="ec-plan-compare__feeRow">
              <span className="ec-plan-compare__feeLabel">{t(row.labelKey)}</span>
              {row.kind === "binary" ? (
                row.value ? (
                  <span className="ec-plan-compare__feeValue ec-plan-compare__feeValue--tick">
                    <EcIco.check style={{ width: 14, height: 14 }} />
                  </span>
                ) : (
                  <span className="ec-plan-compare__feeValue ec-plan-compare__feeValue--muted">
                    {t("ec.r.plan.compare.fee.notIncluded")}
                  </span>
                )
              ) : (
                <span className="ec-plan-compare__feeValue">{row.value}</span>
              )}
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

function EcHandoffModal({ rec, onClose, onContinueToSetup }) {
  const t = useT();
  // Three-state machine, not a boolean — keeps the JSX readable and
  // makes adding future states (e.g. "loading", "error-retry") trivial.
  const [stage, setStage] = useState("commit");
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
      // /api/send-analysis, which uses Resend to ship a
      // transactional email to the address the user entered.
      // The PDF is attached; a brief HTML body provides the
      // inbox greeting + setup CTA. See api/send-analysis.js
      // for server-side details (env vars, sender domain).
      await ecSendAnalysisEmail({ rec, email, t });
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
      // Reuses the same end-to-end pipeline as the primary send.
      // Cheaper to regenerate the PDF than to thread cached bytes
      // through state — 2s of compute against vastly simpler code.
      await ecSendAnalysisEmail({ rec, email: colleagueEmail.trim(), t });
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
            <div className="ec-handoff__actions">
              <Button
                variant="primary"
                size="xl"
                onClick={onContinueToSetup}
                iconRight="arrowRight"
              >
                {t("ec.handoff.continue")}
              </Button>
            </div>
            <button
              className="ec-handoff__altLink"
              type="button"
              onClick={() => setStage("email")}
            >
              {t("ec.handoff.emailOnly")}
            </button>
          </>
        )}

        {stage === "email" && (() => {
          // Compute personalised cost projection so the value-prop
          // bullets can quote the user's specific monthly savings
          // figure. Falls back to a generic bullet when the volume
          // is too small for credible projection.
          const cost = ecComputeCostBreakdown(rec);
          const fmt = (n) => "€" + (n || 0).toLocaleString("en-US");
          return (
          <>
            <h2 id="ec-handoff-title" className="ec-modal__title">
              {t("ec.handoff.email.title")}
            </h2>
            <p className="ec-handoff__lead">{t("ec.handoff.email.lead")}</p>

            {/* Value-prop list — the conversion driver. Three
                concrete bullets, the first personalized with
                the user's savings number. Reads as upgrade, not
                chore. */}
            <ul className="ec-handoff__value">
              <li className="ec-handoff__value__item">
                <span className="ec-handoff__value__tick" aria-hidden="true">✓</span>
                <span>{cost && cost.savings.monthly >= 100
                  ? t("ec.handoff.email.value.costPersonal", { monthly: fmt(cost.savings.monthly) })
                  : t("ec.handoff.email.value.costGeneric")}</span>
              </li>
              <li className="ec-handoff__value__item">
                <span className="ec-handoff__value__tick" aria-hidden="true">✓</span>
                <span>{t("ec.handoff.email.value.comparison")}</span>
              </li>
              <li className="ec-handoff__value__item">
                <span className="ec-handoff__value__tick" aria-hidden="true">✓</span>
                <span>{t("ec.handoff.email.value.checklist")}</span>
              </li>
            </ul>

            <div className="ec-handoff__field">
              <label className="ec-handoff__label" htmlFor="ec-handoff-email">
                {t("ec.handoff.email.label")}
              </label>
              <input
                id="ec-handoff-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className={"ec-handoff__input" + (showError ? " is-error" : "")}
                placeholder={t("ec.handoff.email.placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid && !submitting) sendEmail();
                }}
                disabled={submitting}
                autoFocus
              />
              {showError && (
                <div className="ec-handoff__error" role="alert">{t("ec.handoff.email.error")}</div>
              )}
            </div>

            {submitError && (
              <div className="ec-handoff__error" role="alert">{submitError}</div>
            )}

            <div className="ec-handoff__actions">
              <Button
                variant="primary"
                size="xl"
                onClick={sendEmail}
                disabled={submitting || !isValid}
              >
                {submitting ? t("ec.handoff.submitting") : t("ec.handoff.email.send")}
              </Button>
            </div>
            <button
              className="ec-handoff__altLink"
              type="button"
              onClick={() => setStage("commit")}
              disabled={submitting}
            >
              {t("ec.handoff.email.back")}
            </button>
            <p className="ec-handoff__privacy">{t("ec.handoff.trust")}</p>
          </>
          );
        })()}

        {stage === "sent" && (
          <>
            <div className="ec-handoff__successIcon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2"/>
                <path d="m10 16 4 4 8-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 id="ec-handoff-title" className="ec-modal__title">{t("ec.handoff.sent.title")}</h2>
            <p className="ec-handoff__lead">{t("ec.handoff.sent.lead", { email })}</p>

            {/* "Now do these 3 things" — implementation intention
                list. Keeps momentum past the success state, plants
                the idea of forwarding (the second checkbox), and
                offers the booking path explicitly. */}
            <div className="ec-handoff__nextSteps">
              <div className="ec-handoff__nextSteps__head">{t("ec.handoff.sent.nextHead")}</div>
              <ol className="ec-handoff__nextSteps__list">
                <li className="ec-handoff__nextSteps__item is-done">
                  <span className="ec-handoff__nextSteps__num" aria-hidden="true">✓</span>
                  <div>
                    <div className="ec-handoff__nextSteps__title">{t("ec.handoff.sent.step1.title")}</div>
                    <div className="ec-handoff__nextSteps__body">{t("ec.handoff.sent.step1.body", { email })}</div>
                  </div>
                </li>
                <li className="ec-handoff__nextSteps__item">
                  <span className="ec-handoff__nextSteps__num" aria-hidden="true">2</span>
                  <div>
                    <div className="ec-handoff__nextSteps__title">{t("ec.handoff.sent.step2.title")}</div>
                    <div className="ec-handoff__nextSteps__body">{t("ec.handoff.sent.step2.body")}</div>
                  </div>
                </li>
                <li className="ec-handoff__nextSteps__item">
                  <span className="ec-handoff__nextSteps__num" aria-hidden="true">3</span>
                  <div>
                    <div className="ec-handoff__nextSteps__title">{t("ec.handoff.sent.step3.title")}</div>
                    <div className="ec-handoff__nextSteps__body">
                      <a href={EC_CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="ec-handoff__nextSteps__link">
                        {t("ec.handoff.sent.step3.link")} →
                      </a>
                    </div>
                  </div>
                </li>
              </ol>
            </div>

            {/* Send-to-colleague — inline second-email capture.
                Converts a single lead into two aligned stakeholders
                when the founder forwards to their CFO/co-founder.
                Showing a small success state inline (not modal
                transition) keeps the original sent context intact. */}
            <div className="ec-handoff__colleague">
              {!colleagueSent ? (
                <>
                  <div className="ec-handoff__colleague__head">{t("ec.handoff.sent.colleague.head")}</div>
                  <div className="ec-handoff__colleague__row">
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      className={"ec-handoff__colleague__input" + (showColleagueError ? " is-error" : "")}
                      placeholder={t("ec.handoff.sent.colleague.placeholder")}
                      value={colleagueEmail}
                      onChange={(e) => setColleagueEmail(e.target.value)}
                      onBlur={() => setColleagueTouched(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isColleagueValid && !colleagueSubmitting) sendColleagueCopy();
                      }}
                      disabled={colleagueSubmitting}
                    />
                    <button
                      type="button"
                      className="ec-handoff__colleague__btn"
                      onClick={sendColleagueCopy}
                      disabled={colleagueSubmitting || !isColleagueValid}
                    >
                      {colleagueSubmitting ? t("ec.handoff.submitting") : t("ec.handoff.sent.colleague.send")}
                    </button>
                  </div>
                  {showColleagueError && (
                    <div className="ec-handoff__error" role="alert">{t("ec.handoff.email.error")}</div>
                  )}
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
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

// ──────────────────── Payment-modal Stripe constants ────────────────────
// Demo limitations (clearly documented to user):
//   1. `pk_test_...` placeholder — replace with your Stripe pk to enable
//   2. Real `stripe.confirmPayment(clientSecret)` needs a backend to create
//      the PaymentIntent. The submit button here validates the form via
//      elements.submit() then shows a demo-mode notice in place of the
//      actual charge. Backend integration is a one-line swap on the marked
//      TODO inside EcPaymentModal.
//   3. Amounts use EUR for max payment-method coverage; real pricing
//      currency localises by country of incorporation in production.

// Stripe credentials — REPLACE BEFORE PRODUCTION.
// The "pk_test_..." here is Stripe's well-known docs/demo test key, useful
// for local testing only. The real key is fetched at runtime from
// /api/config; this is the fallback if that endpoint is unreachable.
const STRIPE_PUBLISHABLE_KEY = "pk_test_TYooMQauvdEDq54NiTphI7jx";

// Per-plan demo amounts in EUR cents. Used because EUR unlocks the broadest
// payment method set (SEPA / iDEAL / Bancontact / EPS / etc.). The user's
// plan-price display stays in the entity's pricing currency (GBP for UK,
// EUR for EU, USD for MENA) — these amounts are the EUR-equivalent for
// the Stripe demo charge only.
const STRIPE_DEMO_AMOUNTS = {
  starter: 5500,   // €55  (≈ £50)
  pro:     11000,  // €110 (≈ £100)
  ultra:   33000,  // €330 (≈ £300)
};

// Payment-method matrix surfaced in the fallback UI when Stripe can't load
// in the current environment. This isn't a fake Stripe widget — it's an
// honest "here's what would appear" reference list. The set reflects what
// Stripe enables for EUR currency + EU customer location (max coverage),
// grouped by category. Brand names aren't translated.
const STRIPE_FALLBACK_METHODS = [
  { labelKey: "ec.r.payment.fallback.cards",     items: "Visa · Mastercard · Amex · JCB · Discover · UnionPay" },
  { labelKey: "ec.r.payment.fallback.wallets",   items: "Apple Pay · Google Pay · Link · Samsung Pay" },
  { labelKey: "ec.r.payment.fallback.bankDebit", items: "SEPA Direct Debit · BACS · iDEAL · Bancontact" },
  { labelKey: "ec.r.payment.fallback.bnpl",      items: "Klarna · Afterpay · Clearpay · Affirm" },
  { labelKey: "ec.r.payment.fallback.local",     items: "EPS · P24 · Giropay · Sofort · BLIK · Multibanco" },
  { labelKey: "ec.r.payment.fallback.transfer",  items: "Bank transfer · Wire" },
];

function EcPaymentModal({ activePlan, onClose }) {
  const t = useT();
  const mountRef = useRef(null);
  const expressMountRef = useRef(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  // Holds the latest confirm-flow function. Shared between the bottom
  // Subscribe button and the Express Checkout 'confirm' event handler
  // so both paths run identical validation+backend+confirm logic.
  const runPaymentFlowRef = useRef(null);
  const [status, setStatus] = useState({ loading: false, message: null, kind: null });
  const [elementReady, setElementReady] = useState(false);
  // True when Stripe couldn't load in this environment. Activates the
  // fallback UI which lists payment methods that would normally appear.
  const [stripeBlocked, setStripeBlocked] = useState(false);
  // True when Express Checkout Element has at least one wallet button
  // to show (Apple Pay in Safari with verified domain, Google Pay in
  // Chrome with account activation, Link, etc.). Controls visibility
  // of the "or pay with card" divider — hidden when no wallets exist
  // so we don't render an awkward divider with nothing above it.
  const [expressAvailable, setExpressAvailable] = useState(false);

  // ESC closes + lock body scroll while modal is open
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

  // Mount Stripe Payment Element via the loader utility. On failure
  // (script blocked, refused to init, timeout) we surface a specific
  // error message + activate the fallback UI with method list.
  useEffect(() => {
    let cancelled = false;
    let paymentElement = null;
    let expressElement = null;

    const init = async () => {
      // Step 1 — get the publishable key. Prefer backend /api/config
      // (so the key lives in Vercel env vars, not hardcoded); fall
      // back to the demo constant if the backend isn't deployed yet.
      let publishableKey = STRIPE_PUBLISHABLE_KEY;
      try {
        const r = await fetch("/api/config");
        if (r.ok) {
          const data = await r.json();
          if (data && data.publishableKey) {
            publishableKey = data.publishableKey;
          }
        }
      } catch (e) {
        // No backend reachable — using hardcoded demo key. This is
        // expected when the file is served as a standalone HTML.
        console.warn("[EcPaymentModal] /api/config unavailable, using hardcoded demo key");
      }
      if (cancelled) return;

      // Step 2 — load Stripe.js via the canonical script URL with
      // proper error diagnosis (script blocked vs origin refusal vs
      // timeout). See ecLoadStripe definition for failure modes.
      let StripeCtor;
      try {
        StripeCtor = await ecLoadStripe();
      } catch (err) {
        if (cancelled) return;
        console.error("[EcPaymentModal] Stripe load failed:", err);
        setStripeBlocked(true);
        setStatus({
          loading: false,
          message: t("ec.r.payment.loadError"),
          kind: "error",
        });
        return;
      }
      if (cancelled || !mountRef.current) return;

      // Step 3 — initialise Stripe + mount Payment Element. Deferred
      // flow (paymentMethodCreation: 'manual') means we don't need a
      // PaymentIntent client_secret to mount — the secret is fetched
      // at submit time from /api/create-payment-intent.
      const amount = STRIPE_DEMO_AMOUNTS[activePlan.id] || STRIPE_DEMO_AMOUNTS.pro;
      const stripe = StripeCtor(publishableKey);
      stripeRef.current = stripe;
      // Diagnostic: confirm which Stripe key actually got used. The
      // suffix should match the key in your Vercel env vars + Stripe
      // Dashboard. If it doesn't, /api/config isn't returning the
      // right key (env var missing / wrong project / cached deploy).
      console.log("[Altery] Stripe initialised. Key prefix:", publishableKey.slice(0, 14), "suffix:", publishableKey.slice(-8));

      const elements = stripe.elements({
        mode: "payment",
        amount: amount,
        currency: "eur",
        paymentMethodCreation: "manual",
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary:    "#002780",
            colorBackground: "#FFFFFF",
            colorText:       "#11141A",
            colorDanger:     "#CF4E3C",
            fontFamily:      "'Inter', system-ui, sans-serif",
            fontSizeBase:    "14px",
            borderRadius:    "10px",
          },
          rules: {
            ".Input": {
              border: "1px solid #D7DAE0",
              boxShadow: "none",
            },
            ".Input:focus": {
              border: "1px solid #002780",
              boxShadow: "0 0 0 3px rgba(0, 39, 128, 0.10)",
            },
            ".Label": {
              fontWeight: "500",
              color: "#11141A",
            },
          },
        },
      });
      elementsRef.current = elements;

      paymentElement = elements.create("payment", {
        layout: { type: "tabs", defaultCollapsed: false },
      });
      paymentElement.on("ready", () => {
        if (!cancelled) setElementReady(true);
      });
      paymentElement.mount(mountRef.current);

      // ─── Express Checkout Element ──────────────────────────
      // Renders prominent wallet buttons (Apple Pay, Google Pay,
      // Link, PayPal) ABOVE the Payment Element. Only shows wallets
      // the user's browser actually supports + account has enabled:
      //   • Apple Pay → Safari on Apple device + verified domain +
      //                 card in Wallet
      //   • Google Pay → Chrome/Edge + Stripe account activation +
      //                  card in Google Pay
      //   • Link → opt-in, requires activation
      // If nothing's available, the element renders nothing (height
      // 0) and the divider stays hidden via expressAvailable state.
      if (expressMountRef.current) {
        expressElement = elements.create("expressCheckout", {
          buttonHeight: 48,
          buttonTheme: {
            applePay: "black",
            googlePay: "black",
            paypal: "gold",
          },
          paymentMethods: {
            applePay: "auto",
            googlePay: "auto",
            link: "auto",
            paypal: "auto",
          },
        });

        expressElement.on("ready", (event) => {
          if (cancelled) return;
          const methods = event && event.availablePaymentMethods;
          const hasAny = methods && Object.values(methods).some(Boolean);
          // Diagnostic: shows EXACTLY which wallets Stripe will render
          // for this browser + Stripe account combo. If methods is
          // null/undefined/empty — no wallets will appear, and you
          // need to fix the account (activate in Dashboard) and/or
          // browser (Chrome with Google Pay setup, Safari with Apple
          // Pay + verified domain).
          console.log("[Altery] ExpressCheckout ready. Available wallets:", methods, "→ hasAny:", hasAny);
          if (!hasAny) {
            console.warn(
              "[Altery] No wallets available. Common causes:\n" +
              "  • Apple Pay: domain not verified in Stripe Dashboard → Settings → Payment method domains\n" +
              "  • Google Pay: testing in Safari/Firefox (Chrome/Edge only) OR account not activated\n" +
              "  • Link/PayPal: not activated in Stripe Dashboard → Settings → Payment methods"
            );
          }
          setExpressAvailable(!!hasAny);
        });

        // Confirm handler — fired when user taps an Apple Pay /
        // Google Pay / Link / PayPal button and authorises in the
        // native sheet. Same backend+confirm flow as the Subscribe
        // button (handlePay); minor differences: no return early on
        // missing refs (the click guarantees they're set), and we
        // don't redirect since wallets confirm inline.
        expressElement.on("confirm", async () => {
          setStatus({ loading: true, message: null, kind: null });

          const { error: submitError } = await elementsRef.current.submit();
          if (submitError) {
            setStatus({
              loading: false,
              message: submitError.message || "Validation failed",
              kind: "error",
            });
            return;
          }

          let clientSecret;
          try {
            const response = await fetch("/api/create-payment-intent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                planId: activePlan.id,
                amount: STRIPE_DEMO_AMOUNTS[activePlan.id] || STRIPE_DEMO_AMOUNTS.pro,
                currency: "eur",
              }),
            });
            if (!response.ok) {
              const body = await response.text();
              throw new Error("HTTP " + response.status + ": " + body.slice(0, 200));
            }
            const data = await response.json();
            clientSecret = data.clientSecret;
            if (!clientSecret) throw new Error("Backend returned no clientSecret");
          } catch (err) {
            console.error("[ExpressCheckout] Backend error:", err);
            setStatus({
              loading: false,
              message: t("ec.r.payment.backendError", { error: err.message || "unknown" }),
              kind: "error",
            });
            return;
          }

          const { error: confirmError, paymentIntent } =
            await stripeRef.current.confirmPayment({
              elements: elementsRef.current,
              clientSecret,
              confirmParams: {
                return_url:
                  window.location.origin +
                  window.location.pathname +
                  "?paid=1",
              },
              redirect: "if_required",
            });

          if (confirmError) {
            setStatus({
              loading: false,
              message: confirmError.message || "Payment failed",
              kind: "error",
            });
            return;
          }
          if (paymentIntent && paymentIntent.status === "succeeded") {
            setStatus({
              loading: false,
              message: t("ec.r.payment.success"),
              kind: "success",
            });
          }
        });

        expressElement.mount(expressMountRef.current);
      }
    };

    init();

    return () => {
      cancelled = true;
      try { if (paymentElement) paymentElement.destroy(); } catch (e) { /* noop */ }
      try { if (expressElement) expressElement.destroy(); } catch (e) { /* noop */ }
    };
  }, [activePlan.id, t]);

  const handlePay = async () => {
    if (!stripeRef.current || !elementsRef.current) return;
    setStatus({ loading: true, message: null, kind: null });

    // Step 1 — client-side Element validation. Stripe collects the
    // user's payment details and verifies completeness. Errors here
    // (card incomplete, bank not selected, etc.) are surfaced inline.
    const { error: submitError } = await elementsRef.current.submit();
    if (submitError) {
      setStatus({
        loading: false,
        message: submitError.message || "Validation failed",
        kind: "error",
      });
      return;
    }

    // Step 2 — ask our backend to create a PaymentIntent for this
    // plan amount and return its client_secret. The backend lives at
    // /api/create-payment-intent (Vercel serverless function); see
    // api/create-payment-intent.js for the source. The secret key
    // (sk_test_...) stays server-side — never reaches the browser.
    let clientSecret;
    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: activePlan.id,
          amount: STRIPE_DEMO_AMOUNTS[activePlan.id] || STRIPE_DEMO_AMOUNTS.pro,
          currency: "eur",
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error("HTTP " + response.status + ": " + body.slice(0, 200));
      }
      const data = await response.json();
      clientSecret = data.clientSecret;
      if (!clientSecret) throw new Error("Backend returned no clientSecret");
    } catch (err) {
      console.error("[EcPaymentModal] Backend error:", err);
      setStatus({
        loading: false,
        message: t("ec.r.payment.backendError", { error: err.message || "unknown" }),
        kind: "error",
      });
      return;
    }

    // Step 3 — confirm the PaymentIntent. For card payments this
    // happens inline (no redirect). Methods that need redirects (iDEAL,
    // Klarna, Bancontact, etc.) send the user to a third-party page
    // and return them to return_url with ?payment_intent=... appended.
    // We pass redirect: 'if_required' so cards succeed without leaving
    // the page; everything else uses the redirect dance.
    const { error: confirmError, paymentIntent } =
      await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        clientSecret,
        confirmParams: {
          return_url:
            window.location.origin +
            window.location.pathname +
            "?paid=1",
        },
        redirect: "if_required",
      });

    if (confirmError) {
      setStatus({
        loading: false,
        message: confirmError.message || "Payment failed",
        kind: "error",
      });
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      setStatus({
        loading: false,
        message: t("ec.r.payment.success"),
        kind: "success",
      });
    } else {
      // Edge case — e.g. requires_action that didn't redirect, or
      // processing for delayed payment methods like SEPA Debit.
      setStatus({
        loading: false,
        message: t("ec.r.payment.processingState", {
          status: (paymentIntent && paymentIntent.status) || "unknown",
        }),
        kind: "info",
      });
    }
  };

  const planName = t(activePlan.nameKey);
  const planPrice = activePlan.priceKey ? t(activePlan.priceKey) : activePlan.price;
  const cycleText = t(activePlan.cycleKey).replace(/^\/\s*/, "");

  const content = (
    <div className="ec-modal__backdrop" onClick={onClose} role="presentation">
      <div
        className="ec-modal ec-modal--payment"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ec-payment-modal-title"
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

        <div className="ec-payment__head">
          <h2 id="ec-payment-modal-title" className="ec-payment__title">
            {t("ec.r.payment.title")}
          </h2>
          <div className="ec-payment__planSummary">
            <span className="ec-payment__planIcon">
              <EcPlanIcon iconKey={activePlan.iconKey} size={14} />
            </span>
            <span>
              <b>{planName}</b> · {planPrice}{" "}
              <span className="ec-payment__cycle">/ {cycleText}</span>
            </span>
          </div>
          <p className="ec-payment__lead">{t("ec.r.payment.lead")}</p>
        </div>

        {/* Express Checkout Element — renders prominent wallet
            buttons (Apple Pay / Google Pay / Link / PayPal) when
            available. Mount node is empty for React (same reason as
            Payment Element — Stripe owns DOM here). When no wallets
            are available the element has height 0 and the divider
            stays hidden via expressAvailable. */}
        {!stripeBlocked && (
          <div className="ec-payment__expressWrap">
            <div ref={expressMountRef} className="ec-payment__expressMount" />
          </div>
        )}

        {/* "Or pay another way" divider — only between Express
            Checkout and Payment Element, only when Express actually
            renders wallets. */}
        {!stripeBlocked && expressAvailable && (
          <div className="ec-payment__orDivider" aria-hidden="true">
            <span>{t("ec.r.payment.orPayWith")}</span>
          </div>
        )}

        {/* Stripe Payment Element mount.
            CRITICAL: mountRef div MUST be empty for React. Stripe
            replaces the node's children with its own iframe, and if
            React thinks there are other children inside, the
            reconciler crashes on unmount with NotFoundError. The
            loading indicator therefore lives as an absolutely-
            positioned sibling, not as a child of the mount node. */}
        {!stripeBlocked && (
          <div className="ec-payment__stripeMountWrap">
            <div ref={mountRef} className="ec-payment__stripeMount" />
            {!elementReady && !status.message && (
              <div className="ec-payment__stripeLoading">
                {t("ec.r.payment.loading")}
              </div>
            )}
          </div>
        )}

        {/* Fallback UI — appears when Stripe.js couldn't load in the
            preview environment. Honest demo state, not a fake Stripe
            widget: dashed border + explicit "preview environment"
            framing + the payment-method matrix that would normally be
            rendered by Payment Element. */}
        {stripeBlocked && (
          <div className="ec-payment__fallback" role="region" aria-label={t("ec.r.payment.fallback.title")}>
            <div className="ec-payment__fallback__head">
              <EcIco.alert style={{ width: 18, height: 18, flex: "0 0 18px" }} />
              <div>
                <div className="ec-payment__fallback__title">{t("ec.r.payment.fallback.title")}</div>
                <div className="ec-payment__fallback__lead">{t("ec.r.payment.fallback.lead")}</div>
              </div>
            </div>
            <div className="ec-payment__fallback__methods">
              {STRIPE_FALLBACK_METHODS.map((group, i) => (
                <div key={i} className="ec-payment__fallback__group">
                  <span className="ec-payment__fallback__groupLabel">{t(group.labelKey)}</span>
                  <span className="ec-payment__fallback__groupItems">{group.items}</span>
                </div>
              ))}
            </div>
            <div className="ec-payment__fallback__hint">
              {t("ec.r.payment.fallback.hint")}
            </div>
          </div>
        )}

        {status.message && (
          <div className={"ec-payment__alert ec-payment__alert--" + (status.kind || "info")}>
            {status.message}
          </div>
        )}

        {stripeBlocked ? (
          <button
            type="button"
            className="ec-payment__submit"
            onClick={onClose}
          >
            {t("ec.r.payment.fallback.close")}
          </button>
        ) : (
          <button
            type="button"
            className="ec-payment__submit"
            onClick={handlePay}
            disabled={status.loading || !elementReady}
          >
            {status.loading
              ? t("ec.r.payment.processing")
              : t("ec.r.payment.pay", { price: planPrice })}
          </button>
        )}

        {!stripeBlocked && (
          <>
            <div className="ec-payment__note">
              {t("ec.r.payment.testNote")}
            </div>
            <div className="ec-payment__note">
              {t("ec.r.payment.currencyNote")}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

Object.assign(window, {
  EcFeesModal, EcBankHistory, EcPerks,
  EcPlanComparisonModal, EcPlanIcon, EcPlanCompareCard,
  EcHandoffModal, EcPaymentModal,
});
