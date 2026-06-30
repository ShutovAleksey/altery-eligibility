// checker-pdf.js — PDF + email infrastructure for the eligibility checker.
//
// Loaded as a classic <script> in /index.html. Exports three functions to
// window so the checker's screens/modals can call them at render time:
//
//   ecWaitForPdfLibs     — polls until window.html2canvas + window.jspdf are ready
//   ecBuildAnalysisHTML  — builds the proposal HTML string (no JSX, plain template)
//   ecSendAnalysisEmail  — composes the email body + posts to /api/send-analysis
//                          with the html2canvas/jsPDF-rendered PDF attached
//
// References data constants (EC_PLANS, EC_ENTITIES, EC_BOOKING_URL,
// EC_ALTERY_LOGO_B64, STRIPE_PUBLISHABLE_KEY, …) and helper functions
// (ecComputeCostBreakdown, ecOutcomesForSavings, ecGenProposalRef, …)
// via Global Lexical Declarations across classic scripts.

// ── Analysis PDF generation ───────────────────────────────────────
// When a user clicks "Send analysis" in the handoff modal's email
// stage, we generate a beautifully-laid-out PDF and trigger a local
// download — simulating email delivery in this no-backend prototype.
//
// The HTML template below uses inline CSS exclusively (no external
// stylesheets, no class dependencies) so the exact same template can
// serve as the email body in production via SendGrid/Mailgun. The
// PDF rendering uses html2pdf.js which internally rasterises the DOM
// through html2canvas before piping through jsPDF; we tune the scale
// to 2x for crisp typography.
//
// Design intent: a credible business deliverable — branded header,
// persona-aware hero, reasoning bullets, services breakdown, fee
// schedule, next-steps CTA, and a clean footer with legal entity
// references. Two-page maximum for typical recommendations; longer
// configurations paginate cleanly thanks to html2pdf's auto page
// breaks.

// Wait for the two PDF libs (html2canvas + jsPDF, loaded async via
// separate CDN scripts) to populate their globals before attempting
// capture. Polling rather than load events because (a) the scripts
// may already be cached and parsed before this code path is reached,
// (b) reading window.* is cheap, (c) it's resilient to script-tag
// ordering changes. Times out after 10s with a clear error so the
// handoff modal surfaces something useful instead of hanging.
function ecWaitForPdfLibs(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const ready = () => !!(window.html2canvas && (window.jspdf?.jsPDF || window.jsPDF));
    if (ready()) return resolve();
    const start = Date.now();
    const tick = () => {
      if (ready()) return resolve();
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("PDF libs (html2canvas / jsPDF) failed to load within " + timeoutMs + "ms"));
      }
      setTimeout(tick, 80);
    };
    tick();
  });
}

// EC_ALTERY_LOGO_B64 + EC_BOOKING_URL → moved to /checker-pdf-assets.js
// (loaded as classic <script> in <head>, on window via Object.assign).

// Build the analysis HTML string. Pure function — takes the
// recommendation, recipient email, and translator; returns markup.

// Build the analysis HTML string. Pure function — takes the
// recommendation, recipient email, and translator; returns markup.
//
// Tone: this isn't a generic system-generated PDF — it's a sales
// proposal. Header reads "PROPOSAL #..." with a reference number,
// AT A GLANCE box leads with the savings hook in warm orange,
// services and pricing are presented as the configuration we'd
// deliver, and the doc closes with a numbered timeline + named
// account team contact. Visual language is "premium document"
// (beige header, navy accents, generous white space) rather than
// "marketing email" (saturated full-bleed color).
function ecBuildAnalysisHTML({ rec, email, t, langCode }) {
  // SECURITY (ALT-SEC-005): `email` is user-supplied and gets spliced into
  // this HTML, which ecSendAnalysisEmail later mounts via `inner.innerHTML`.
  // The upstream email-format regex still permits HTML-significant chars in
  // the local part (e.g. `a"><img src=x>@x.co`), so escape before
  // interpolation. URL contexts (ecContactRequestUrl / ecBuildHandoffURL)
  // percent-encode their inputs separately and are unaffected.
  const ecEscapeHtml = (s) => String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  const safeEmail = email ? ecEscapeHtml(email) : "";

  // Brand palette — duplicated as literals rather than CSS vars so
  // the HTML is fully self-contained for email rendering.
  const C = {
    primary:      "#002780",  // Altery navy (body text accent, CTAs)
    headerBg:     "#000537",  // Midnight navy — same as .ec-header on-screen
    primaryLight: "#B3D1FF",  // Light blue accent (title highlights)
    ink:          "#14171F",  // Body text
    inkSoft:      "#4B5063",  // Secondary text
    muted:        "#6B6F7B",  // Tertiary / labels
    border:       "#E5E7EE",  // Neutral dividers
    hairline:     "#F0F1F4",  // Faint internal hairline — subordinate to border
    surface:      "#F8F7F4",  // Off-white panel bg
    beige:        "#F0EBE3",  // Brand beige — body callouts only
    beigeBorder:  "#E5E0D5",
    success:      "#18A058",  // Active-status dot
    warn:         "#FDF6EC",  // Crypto reroute callout bg
    warnBorder:   "#F4E1B5",
    savings:      "#C2410C",  // Warm orange — sales highlight
    savingsBg:    "#FFF7ED",
    white:        "#FFFFFF",
  };

  const FF = "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
  const FF_MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";

  const dateStr = (() => {
    try {
      const map = { en: "en-GB", de: "de-DE", ru: "ru-RU", nl: "nl-NL", tr: "tr-TR", it: "it-IT", es: "es-ES", pl: "pl-PL", pt: "pt-PT", fr: "fr-FR" };
      const locale = map[langCode] || "en-GB";
      return new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  })();

  // Resolve all the i18n-driven strings + computed bits up front so
  // the template body stays readable.
  const planName     = t(rec.plan.nameKey);
  const planPrice    = rec.plan.price + (t(rec.plan.cycleKey || "ec.plan.cycleMo") || "");
  const entityName   = t(rec.entity.nameKey);
  const entityLicence= t(rec.entity.licenceKey);
  const entityNote   = rec.entity.noteKey ? t(rec.entity.noteKey) : "";
  const monthlyVolume= rec.monthlyVolume || 0;
  const savings      = ecEstimateSavings(monthlyVolume);
  const proposalRef  = ecGenProposalRef();

  const personaIndustries = ["saas", "apps", "games", "edtech", "affiliate", "creator", "crypto"];
  const personaLine = rec.ind && personaIndustries.includes(rec.ind.value)
    ? t(`ec.r.persona.${rec.ind.value}.line`)
    : null;

  const leadText = t("ec.entity." + rec.entity.id + ".lead");

  // One consistent check indicator across the whole document: a round navy
  // disc with a centered white checkmark, drawn as an SVG path. A ✓ text
  // glyph (and flex/line-height text centering) sits slightly off-centre
  // under html2canvas; an SVG filling the disc with a viewBox-centered path
  // is pixel-stable at any size. `mt` nudges the top margin for flex rows.
  const checkDisc = (px, mt) =>
    `<div style="flex-shrink:0;width:${px}px;height:${px}px;border-radius:50%;background:${C.primary};${mt ? "margin-top:" + mt + "px;" : ""}">` +
      `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" style="display:block;"><path d="M6 12.5l3.8 3.8L18 7.7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
    `</div>`;

  // ─── Section blocks ────────────────────────────────────────────

  // Reasoning bullets — same data as the result page, formatted
  // for print with check-circle markers.
  // Table-row layout (not flex) — html2canvas drifts flex bullets vertically
  // during raster (same reason includedItemsHTML below uses a table).
  const reasoningHTML = `<table style="width:100%;border-collapse:collapse;">` + (rec.reasoning || []).map((r) => {
    const text = t(r.key, r.vars || {});
    return `
      <tr>
        <td style="width:22px;padding:0 14px 14px 0;vertical-align:top;">${checkDisc(22)}</td>
        <td style="padding:0 0 14px;vertical-align:top;font-size:13px;line-height:19px;color:${C.ink};">${text}</td>
      </tr>`;
  }).join("") + `</table>`;

  // Selected services — keep cards compact so they don't blow the
  // page count out.
  const selectedSvcs = (rec.services || [])
    .map((v) => EC_SERVICES.find((s) => s.value === v))
    .filter(Boolean);
  const servicesHTML = selectedSvcs.map((s) => `
    <div style="padding:12px 14px;background:${C.surface};border:1px solid ${C.border};border-radius:10px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:600;color:${C.ink};margin-bottom:2px;">${t(s.titleKey)}</div>
      <div style="font-size:12px;line-height:17px;color:${C.muted};">${t(s.bodyKey)}</div>
    </div>`).join("");

  // Entity hero — mirrors the on-screen result page's hero block:
  // licence pill + regulator-reference pill + (optional) crypto-fluent
  // pill, then an IBAN/sort-code preview chip with masked tail and a
  // caption. Replaces the single beige status pill that used to sit
  // here: the on-screen block carries more trust signals (FRN deep
  // link, account-format preview) which belong in a printable
  // proposal even more than on the screen.
  const heroIban = (typeof ecHeroIdentifier === "function") ? ecHeroIdentifier(rec.entity) : null;
  const heroFlagCode = heroIban ? ecCurrencyFlag(heroIban.currency) : null;
  const heroFlagSrc = (heroFlagCode && typeof window !== "undefined" && window.__FLAGS && window.__FLAGS[heroFlagCode]) || null;
  const heroIbanMasked = heroIban ? maskTailDots(heroIban.value) : null;
  const regulatory = rec.entity && rec.entity.regulatory;
  const pillStyle = `display:inline-block;padding:5px 12px;background:${C.beige};border:1px solid ${C.beigeBorder};border-radius:999px;font-size:12px;color:${C.ink};margin:0 6px 6px 0;line-height:1.4;font-weight:500;`;
  const entityHeroHTML = `
    <div style="margin:0 0 28px;">
      <div style="margin-bottom:${heroIban ? "14px" : "0"};">
        <span style="${pillStyle}">${entityLicence}</span>
        ${regulatory ? `<span style="${pillStyle}">${regulatory.refLabel}</span>` : ""}
        ${rec.cryptoOpen ? `<span style="${pillStyle}">${t("ec.r.crypto.fluent")}</span>` : ""}
      </div>
      ${heroIban ? `
        <div style="display:inline-block;padding:8px 18px 8px 12px;background:${C.beige};border:1px solid ${C.beigeBorder};border-radius:999px;line-height:22px;font-size:13px;color:${C.ink};white-space:nowrap;">
          ${heroFlagSrc ? `<img src="${heroFlagSrc}" alt="" width="22" height="22" style="display:inline-block;vertical-align:middle;border-radius:50%;margin-right:10px;border:1px solid ${C.beigeBorder};"/>` : ""}
          <span style="vertical-align:middle;font-weight:600;letter-spacing:0.005em;">${heroIban.currency}</span>
          <span style="display:inline-block;vertical-align:middle;width:1px;height:14px;background:${C.beigeBorder};margin:0 12px;"></span>
          <span style="vertical-align:middle;font-family:${FF_MONO};letter-spacing:0.04em;">${heroIbanMasked}</span>
        </div>
        <div style="font-size:11px;color:${C.muted};line-height:16px;margin-top:8px;">${t("ec.r.iban.caption", { currency: heroIban.currency })}</div>
      ` : ""}
    </div>`;

  // "What's included in your plan" — perks list pulled straight from
  // rec.plan.perkKeys (the same list shown on the result-page card and
  // in the compare modal). Renders as a checked list inside a surface
  // panel — same visual idiom as the onboarding checklist below, so
  // the document has a consistent "things you get / things to bring"
  // affordance pair.
  // Table-based row layout (not flex) because html2canvas occasionally
  // mis-aligns flex items vertically during rasterisation — the bullet
  // circle drifts above or below its row's text baseline. Table cells
  // hold their vertical-align:top contract reliably.
  const includedItemsHTML = (rec.plan.perkKeys || []).map((k) => `
    <tr>
      <td style="width:22px;padding:6px 12px 6px 0;vertical-align:top;">
        ${checkDisc(18)}
      </td>
      <td style="padding:6px 0;vertical-align:top;font-size:13px;color:${C.ink};line-height:19px;">${t(k)}</td>
    </tr>`).join("");
  const includedHTML = `
    <div style="margin:0 0 30px;">
      <div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px;">${t("ec.pdf.included.head")}</div>
      <div style="background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:8px 20px;">
        <table style="width:100%;border-collapse:collapse;">${includedItemsHTML}</table>
      </div>
    </div>`;

  // Pricing table — same five lines as before; the AT A GLANCE box
  // upstairs already led with the headline price and savings, so
  // this is the detail backup.
  const fees = rec.plan.fees || {};
  const cycleSuffix = t(rec.plan.cycleKey || "ec.plan.cycleMo");
  const feeRows = [
    { label: t("ec.pdf.fee.subscription"), value: `${rec.plan.price}${cycleSuffix}`, bold: true },
    { label: t("ec.pdf.fee.fasterPay"),    value: fees.fasterPay || "—" },
    { label: "SEPA",                        value: fees.sepa || "—" },
    { label: "SWIFT",                       value: fees.swift || "—" },
    { label: t("ec.pdf.fee.fx"),           value: fees.fxMarkup || "—" },
  ];
  const feeTableHTML = feeRows.map((r, i) => `
    <tr ${i > 0 ? `style="border-top:1px solid ${C.border};"` : ""}>
      <td style="padding:9px 0;color:${C.muted};font-size:13px;">${r.label}</td>
      <td style="padding:9px 0;color:${C.ink};font-weight:${r.bold ? "600" : "500"};text-align:right;font-size:13px;font-variant-numeric:tabular-nums;">${r.value}</td>
    </tr>`).join("");

  // "At a glance" — 3-column TLDR card that sits between the hero and
  // the reasoning bullets. Plan / Entity / FX margin, each in
  // a labelled column. Table-based layout (not flex) for html2canvas
  // fidelity — flex panels occasionally render at the wrong width on
  // the off-screen render container we use during PDF assembly.
  const atGlanceHTML = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:${C.surface};border:1px solid ${C.border};border-radius:14px;margin:0 0 30px;">
      <tr>
        <td style="vertical-align:top;padding:18px 22px;width:33%;">
          <div style="font-size:10px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">${t("ec.pdf.atGlance.plan")}</div>
          <div style="font-size:17px;font-weight:700;color:${C.ink};line-height:22px;letter-spacing:-0.01em;">${planName}</div>
          <div style="font-size:12px;color:${C.muted};margin-top:4px;font-variant-numeric:tabular-nums;">${planPrice}</div>
        </td>
        <td style="width:1px;background:${C.hairline};padding:26px 0;"></td>
        <td style="vertical-align:top;padding:18px 22px;width:33%;">
          <div style="font-size:10px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">${t("ec.pdf.atGlance.entity")}</div>
          <div style="font-size:17px;font-weight:700;color:${C.ink};line-height:22px;letter-spacing:-0.01em;">${entityName}</div>
          <div style="font-size:12px;color:${C.muted};margin-top:4px;">${entityLicence}</div>
        </td>
        <td style="width:1px;background:${C.hairline};padding:26px 0;"></td>
        <td style="vertical-align:top;padding:18px 22px;width:33%;">
          <div style="font-size:10px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">${t("ec.cmp.row.fxMarkup")}</div>
          <div style="font-size:17px;font-weight:700;color:${C.primary};line-height:22px;letter-spacing:-0.01em;">${rec.plan && rec.plan.fees ? rec.plan.fees.fxMarkup : "—"}</div>
          <div style="font-size:12px;color:${C.muted};margin-top:4px;">${t("ec.pdf.atGlance.costOn", { plan: planName })}</div>
        </td>
      </tr>
    </table>`;

  // Rate card (Jun 2026, 3rd pass): publish the plan's unit RATES, not a
  // computed monthly total (which scales with volume into a scary number).
  // No total, no competitor, no savings — just transparent per-rail pricing.
  const planFees = rec.plan && rec.plan.fees;
  const costMathHTML = planFees ? `
    <div style="margin:0 0 18px;">
      <div style="font-size:10px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">${t("ec.r.rates.head", { plan: planName })}</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <tr>
          <td style="width:100%;padding:16px 18px;background:${C.surface};border:1px solid ${C.border};border-radius:12px;vertical-align:top;">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:4px 0;">
              <span>${t("ec.r.method.line.subscription")}</span><span style="font-weight:600;color:${C.ink};">${rec.plan.price}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:4px 0;">
              <span>${t("ec.r.plan.compare.fee.fxMarkup")}</span><span style="font-weight:600;color:${C.ink};">${planFees.fxMarkup}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:4px 0;">
              <span>${t("ec.r.plan.compare.fee.swift")}</span><span style="font-weight:600;color:${C.ink};">${planFees.swift}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:4px 0;">
              <span>${t("ec.r.plan.compare.fee.sepa")}</span><span style="font-weight:600;color:${C.ink};">${planFees.sepa}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:4px 0;">
              <span>${t("ec.r.plan.compare.fee.fasterPay")}</span><span style="font-weight:600;color:${C.ink};">${planFees.fasterPay}</span>
            </div>
          </td>
        </tr>
      </table>

      <div style="font-size:11px;color:${C.muted};line-height:16px;margin-top:12px;">${t("ec.r.rates.caption", { plan: planName })}</div>
    </div>` : "";

  // Altery-only "what your plan includes" — replaces the retired named-
  // competitor price/capability tables. No comparison, no competitor column;
  // reuses the result-page value lines (already in 10 languages). Crypto is
  // deliberately omitted (jurisdiction-gated).
  const includedItems = ["transparency", "speed", "reach", "acceptance"];
  const comparisonHTML = `
    <div style="margin:0 0 28px;">
      <div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">${t("ec.pdf.plus.head")}</div>
      <div style="background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:16px 20px;">
        ${includedItems.map((k) => `
          <div style="display:flex;gap:10px;align-items:flex-start;padding:5px 0;">
            ${checkDisc(16, 1)}
            <div style="font-size:12px;color:${C.ink};line-height:18px;">${t("ec.r.value." + k)}</div>
          </div>`).join("")}
      </div>
    </div>`;

  // Onboarding checklist — neutralizes the #1 friction: "what do
  // I need to prepare?" By spelling it out before they ask, we
  // remove the procrastination excuse and reward their earlier
  // engagement (we already have their volume answer pre-filled).
  const checklistItems = ["incorporation", "directorIds", "addressProof", "businessActivities", "volume"];
  const checklistHTML = `
    <div style="margin:0 0 30px;">
      <div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px;">${t("ec.pdf.checklist.head")}</div>
      <div style="background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:14px 18px;">
        ${checklistItems.map((id) => `
          <div style="display:flex;gap:12px;align-items:flex-start;padding:6px 0;">
            ${checkDisc(16, 2)}
            <div style="font-size:12px;color:${C.ink};line-height:18px;">${t(`ec.pdf.checklist.${id}`)}</div>
          </div>`).join("")}
        <div style="font-size:11px;color:${C.muted};line-height:16px;margin-top:10px;padding-top:10px;border-top:1px solid ${C.border};">${t("ec.pdf.checklist.note")}</div>
      </div>
    </div>`;

  // Volume-specific advisor note — sales voice. Rendered as a
  // beige-bordered italic stripe so it visually reads as a side-
  // comment from a real advisor rather than another data block.
  const volumeHintHTML = monthlyVolume ? `
    <div style="margin:0 0 30px;padding:2px 0 2px 14px;border-left:3px solid ${C.beige};font-size:12px;line-height:19px;color:${C.inkSoft};font-style:italic;">
      ${t(ecVolumeHintKey(monthlyVolume))}
    </div>` : "";

  // Numbered timeline. Sells "how easy it is to start" — each step
  // calibrated to set realistic expectations (10 min setup, 48h to
  // live, 5 days for cards). Numbers in navy circles for visual
  // anchor and easy scanning.
  // Table-row layout for the same html2canvas alignment reason as the
  // included list above — flex circles drift vertically during raster.
  const stepRow = (n) => `
    <tr>
      <td style="width:42px;padding:0 14px 14px 0;vertical-align:top;">
        <div style="width:28px;height:28px;border-radius:50%;background:${C.beige};border:1.5px solid ${C.primary};color:${C.primary};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;">${n}</div>
      </td>
      <td style="padding:0 0 14px;vertical-align:top;">
        <div style="font-size:13px;font-weight:600;color:${C.ink};line-height:19px;">${t(`ec.pdf.steps.${n}.title`)}</div>
        <div style="font-size:12px;color:${C.muted};line-height:18px;margin-top:2px;">${t(`ec.pdf.steps.${n}.body`)}</div>
      </td>
    </tr>`;
  const step1HTML = `<table style="width:100%;border-collapse:collapse;">${stepRow(1)}</table>`;
  const remainingStepsHTML = `<table style="width:100%;border-collapse:collapse;">` + [2, 3, 4].map(stepRow).join("") + `</table>`;

  // Handoff URL → external corporate-registration app (app.altery.com).
  // Carries the full non-PII profile (plan/entity/currency/volume/country/
  // industry/services/corridors) + first-touch UTMs, and — because this is a
  // PDF link the recipient asked us to send them — their own email, so
  // registration pre-fills it. (Per the PII policy in ecBuildHandoffURL,
  // only the PDF/email links carry email; the anonymous web CTA does not.)
  const handoffURL = ecBuildHandoffURL(rec, rec.plan, null, { email });
  const handoffDisplay = "app.altery.com/registration";

  // ─── Full document ───────────────────────────────────────────
  return `
<div style="font-family:${FF};color:${C.ink};background:${C.white};width:720px;margin:0;padding:0;-webkit-font-smoothing:antialiased;">

  <!-- Header pill — midnight navy (#000537), rounded 16px. Mirrors
   the .ec-header element from the on-screen checker exactly:
   same bg, same wordmark SVG (rasterized to PNG for html2canvas
   reliability), same proportions. Sits inside a wrapper with
   padding so the rounded edges show on white doc background. -->
  <div style="padding:24px 24px 0;">
<div style="background:${C.headerBg};border-radius:16px;padding:20px 28px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 12px 32px rgba(0,6,57,.16);">
  <div style="display:flex;align-items:center;gap:18px;">
    <img src="data:image/png;base64,${EC_ALTERY_LOGO_B64}" alt="Altery" width="71" height="24" style="display:block;border:0;"/>
    <div style="width:1px;height:24px;background:rgba(255,255,255,.18);"></div>
    <div style="font-size:13px;font-weight:500;color:rgba(255,255,255,.82);letter-spacing:-0.005em;">${t("ec.pdf.subtitle")}</div>
  </div>
  <div style="text-align:right;line-height:16px;">
    <div style="font-size:10px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:0.1em;">${t("ec.pdf.proposal")} · ${proposalRef}</div>
    <div style="font-size:11px;color:rgba(255,255,255,.92);margin-top:3px;">${dateStr}</div>
  </div>
</div>
${email ? `
<div style="margin-top:18px;font-size:11px;color:${C.muted};">
  ${t("ec.pdf.preparedFor")} <span style="color:${C.ink};font-weight:500;">${safeEmail}</span>
</div>` : ""}
  </div>

  <!-- Body -->
  <div style="padding:28px 40px 28px;">

${personaLine ? `<div style="font-size:13px;font-weight:500;color:${C.primary};margin:0 0 10px;letter-spacing:-0.005em;">${personaLine}</div>` : ""}

<div style="font-size:10px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">${t("ec.pdf.recommendation")}</div>

<!-- Title — html2canvas rasterises the bold space character narrower
     than the on-screen browser does, so words visually merge in the
     bitmap ("AlteryLtd · UK on theProplan."). Explicit word-spacing
     widens the gap by ~3px at 26px which restores legible separation
     without affecting the on-screen render this template also feeds. -->
<h1 style="font-size:26px;font-weight:700;letter-spacing:0;word-spacing:0.2em;line-height:32px;color:${C.ink};margin:0 0 14px;">
  <span style="color:${C.primary};">${entityName}</span> ${t("ec.r.title.middle")} <span style="color:${C.primary};">${planName}</span>${t("ec.r.title.after")}
</h1>

<p style="font-size:14px;line-height:21px;color:${C.inkSoft};margin:0 0 22px;">${leadText}</p>

${entityHeroHTML}

<!-- Section 1: At-a-glance TLDR card. Crypto-reroute callout used to
     sit above this; removed 2026-05-29 — the reasoning bullets already
     explain crypto-fluent routing where relevant, and the standalone
     callout read as filler. -->
${atGlanceHTML}

<!-- Section 2: Why this plan — reasoning bullets citing the user's
     own answers. Anchored at top because trust is the gate to the
     rest of the document. -->
<div style="margin-bottom:32px;">
  <div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">
    ${t("ec.r.reasoning.head", { plan: planName })}
  </div>
  ${reasoningHTML}
</div>

<!-- Section 3: What's included on this plan — perk list. Comes
     before pricing so the reader sees value before cost. -->
${includedHTML}

<!-- Section 4: Pricing detail — per-rail tariff table + a quiet
     link out to the full pricing page so anyone curious about other
     tiers can see the whole grid without leaving the checker context. -->
<div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">
  ${t("ec.pdf.pricing.head", { plan: planName })}
</div>
<div style="background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:14px 20px;margin-bottom:14px;">
  <table style="width:100%;border-collapse:collapse;">${feeTableHTML}</table>
</div>
<div style="margin:0 0 32px;">
  <a href="https://altery.com/fees/business/" style="display:inline-block;font-size:12px;color:${C.primary};text-decoration:none;font-weight:500;border-bottom:1px solid ${C.primary};line-height:18px;">${t("ec.pdf.allPlans")} →</a>
</div>

<!-- Section 5: Cost math — Altery vs typical bank with savings band. -->
${costMathHTML}


<!-- Section 7: Comparison vs other banks — multi-comparator matrix.
     Capability matrix ("Beyond cost / Where Altery wins") that used
     to follow was removed 2026-05-29 — bulky three-column read that
     restated the comparison-table information in prose. -->
${comparisonHTML}

<!-- Section 8: Selected services — the rails the user picked, for
     reference during onboarding. -->
<div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">
  ${t("ec.pdf.services.head")}
</div>
<div style="margin-bottom:30px;">${servicesHTML}</div>

<!-- Section 10: Onboarding checklist — what to prepare before
     starting setup. -->
${checklistHTML}

<!-- Numbered timeline. Step 1 + the setup CTA are kept in one block: the
     CTA fulfils step 1's "via the link below" and sits high enough that it
     always renders (it used to live at the document tail and could be
     dropped on long proposals). Steps 2-4 follow. The <a href> points at the
     external registration handoff; link annotation wired by
     ecAddLinkAnnotations during PDF assembly. -->
<div style="margin-bottom:26px;">
  <div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">
    ${t("ec.pdf.nextSteps.head")}
  </div>
  <div style="margin-bottom:14px;">${step1HTML}</div>
  <a href="${handoffURL}" style="display:block;text-decoration:none;background:${C.primary};border-radius:12px;padding:16px 20px;color:${C.white};">
    <div style="font-size:10px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">${t("ec.pdf.continueSetup")}</div>
    <div style="font-size:14px;color:${C.white};font-family:${FF_MONO};letter-spacing:-0.005em;">${handoffDisplay} · ${proposalRef}</div>
  </a>
</div>
<div style="margin-bottom:26px;">${remainingStepsHTML}</div>

<!-- Account team — humanises the proposal. Validity notice gives
     it the legal-document weight of a real commercial proposal. -->
<div style="background:${C.beige};border:1px solid ${C.beigeBorder};border-radius:12px;padding:16px 20px;margin-bottom:16px;">
  <div style="font-size:10px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">${t("ec.pdf.team.head")}</div>
  <div style="font-size:13px;line-height:19px;color:${C.ink};margin-bottom:10px;">${t("ec.pdf.signature.body")}</div>
  <div style="font-size:12px;line-height:18px;color:${C.inkSoft};margin-bottom:12px;">${t("ec.pdf.team.body")}</div>
  <a href="${ecContactRequestUrl(rec, email)}" style="display:inline-block;font-size:12px;color:${C.primary};text-decoration:none;font-weight:500;border-bottom:1px solid ${C.primary};line-height:18px;">${t("ec.pdf.team.booking")} →</a>
</div>

  </div>

  <!-- Footer — sub-fold legal block -->
  <div style="background:${C.surface};padding:22px 40px;border-top:1px solid ${C.border};font-size:10px;line-height:16px;color:${C.muted};">
<div style="margin-bottom:4px;color:${C.ink};font-weight:600;">Altery</div>
<div>${t("ec.pdf.footer.tagline")}</div>
<div style="margin-top:8px;">${t("ec.pdf.footer.entities")}</div>
<div style="margin-top:8px;">${t("ec.pdf.disclaimer")}</div>
  </div>

</div>`;
}

// Convert a Blob to a base64 string (without the data:URL prefix).
// Walk the rendered DOM and overlay each text node onto the current
// PDF page with renderingMode="invisible" — the bitmap on the page
// stays the visible representation, the invisible text rides on top
// so PDF readers can select / copy / search the text.
//
// Why this approach: html2canvas rasterises everything to pixels, so
// the bitmap alone has no machine-readable text. Rebuilding the whole
// template via native jsPDF text/box calls would mean rewriting ~500
// lines of HTML→PDF and losing the gradients/shadow/custom-flag visuals
// we just shipped. The overlay trick keeps the visual intact AND makes
// selection work — same pattern OCR'd PDFs use.
//
// Per-line positioning uses Range.getClientRects() which returns one
// rect per visually-wrapped line. For multi-line text nodes the text
// content is approximated by character-ratio across lines (not
// word-perfect, but selection rectangles align with the bitmap text
// well enough that drag-select-and-copy produces the right output).
// Walk the rendered DOM for <a href> elements and overlay a clickable
// link annotation on the current PDF page wherever they appear. This is
// the bitmap-PDF analogue of a real hyperlink — pdf.link() adds an
// invisible hot-zone region that PDF readers treat as clickable; on
// click the reader opens the target URL.
//
// Without these annotations, our html2canvas pipeline produces a PDF
// where any <a href="..."> in the source HTML renders as plain visible
// text — the underlying anchor tag is flattened to pixels and stripped
// of clickability. Adding pdf.link() restores it.
//
// Multi-line links use Range.getClientRects() so each visually-wrapped
// line gets its own hit region — selecting / clicking on line 2 of a
// wrapped link still routes to the same URL.
function ecAddLinkAnnotations(pdf, target, sliceTopPx, sliceBottomPx, pxPerMm, canvasScale, pageTopMm) {
  const targetRect = target.getBoundingClientRect();
  const anchors = target.querySelectorAll("a[href]");
  const topOffsetMm = pageTopMm || 0;
  for (const a of anchors) {
    const url = a.getAttribute("href");
    if (!url) continue;
    // Skip in-page anchors and mailto/tel (mailto's the email client's
    // problem already — actually let's keep these too since they're
    // genuinely useful in a printed proposal); only really skip empty
    // or javascript: hrefs.
    if (url.startsWith("javascript:") || url === "#") continue;

    const range = document.createRange();
    range.selectNodeContents(a);
    const rects = range.getClientRects();
    if (!rects.length) continue;

    for (const rect of rects) {
      const topCanvasPx    = (rect.top    - targetRect.top) * canvasScale;
      const bottomCanvasPx = (rect.bottom - targetRect.top) * canvasScale;
      // Skip rects whose entire vertical range falls outside this page.
      if (bottomCanvasPx <= sliceTopPx || topCanvasPx >= sliceBottomPx) continue;

      const xMm    = (rect.left - targetRect.left) * canvasScale / pxPerMm;
      const wMm    = rect.width  * canvasScale / pxPerMm;
      const hMm    = rect.height * canvasScale / pxPerMm;
      const yPageMm = topOffsetMm + (topCanvasPx - sliceTopPx) / pxPerMm;
      // jsPDF.link signature: link(x, y, w, h, { url })
      pdf.link(xMm, yPageMm, wMm, hMm, { url });
    }
  }
}

function ecAddInvisibleTextLayer(pdf, target, sliceTopPx, sliceBottomPx, pxPerMm, canvasScale, pageTopMm) {
  const targetRect = target.getBoundingClientRect();
  const topOffsetMm = pageTopMm || 0;
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    if (!rects.length) continue;

    const parent = node.parentElement;
    if (!parent) continue;
    const cs = window.getComputedStyle(parent);
    // Bail on hidden text — visibility:hidden / display:none / opacity:0
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
    const fontSizePx = parseFloat(cs.fontSize) || 12;
    const fontSizePt = fontSizePx * 0.75; // CSS px → PDF pt (assumes 96 DPI)

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      // canvas-pixel Y of this line, relative to the target's top edge.
      const lineTopCanvasPx    = (rect.top    - targetRect.top) * canvasScale;
      const lineBottomCanvasPx = (rect.bottom - targetRect.top) * canvasScale;
      // Skip lines outside this page's slice band.
      if (lineBottomCanvasPx <= sliceTopPx || lineTopCanvasPx >= sliceBottomPx) continue;

      const xMm = (rect.left - targetRect.left) * canvasScale / pxPerMm;
      const pageRelTopMm = topOffsetMm + (lineTopCanvasPx - sliceTopPx) / pxPerMm;
      // Baseline roughly = top + 80% of font-size (matches Helvetica's
      // ascender height ≈ 0.8 em). Imperfect for the actual rendered
      // font (Inter / IBM Plex Mono) but close enough — used for
      // selection-rectangle placement, not for visible glyphs.
      const baselineYmm = pageRelTopMm + fontSizePx * 0.8 * canvasScale / pxPerMm;

      // Per-line text: single-line nodes use the full text; multi-line
      // nodes get char-ratio approximation across rects.
      let lineText;
      if (rects.length === 1) {
        lineText = text;
      } else {
        const start = Math.floor(i * text.length / rects.length);
        const end   = Math.floor((i + 1) * text.length / rects.length);
        lineText = text.slice(start, end);
      }
      lineText = lineText.replace(/\s+/g, " ").trim();
      if (!lineText) continue;

      pdf.setFontSize(fontSizePt);
      try {
        pdf.text(lineText, xMm, baselineYmm, { renderingMode: "invisible" });
      } catch (e) {
        // jsPDF can throw on text with characters outside its default
        // encoding (WinAnsi). Log and skip the offending node rather
        // than failing the whole PDF generation. Cyrillic / CJK text
        // may silently miss from selection until we embed a Unicode
        // font — tracked as a follow-up.
      }
    }
  }
}

// Used to ship the generated PDF bytes inside a JSON request body
// to /api/send-analysis. Multi-MB payloads stream fine through
// FileReader; this function returns a Promise that resolves with
// the trimmed base64.
function ecBlobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("FileReader failed"));
    reader.onload = () => {
      const result = String(reader.result || "");
      // Strip the "data:application/pdf;base64," prefix.
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

// Send the analysis email — the actual production path. Generates
// the PDF client-side from the same HTML template, then POSTs the
// base64 bytes + minimal context to /api/send-analysis, which uses
// Resend to ship a transactional email with the PDF attached.
//
// Generating the PDF on the client (rather than server-side via
// Puppeteer) keeps the serverless function lightweight, cold-starts
// fast, and avoids per-invocation CPU cost on the email path.
// Trade-off: a few extra MB on the user's browser bundle (the
// html2pdf script, which we load async).
async function ecSendAnalysisEmail({ rec, email, t, forwardedBy, antiSpam }) {
  await ecWaitForPdfLibs();

  const langCode = (window.__I18N && typeof window.__I18N.getLang === "function")
    ? window.__I18N.getLang() : "en";

  const html = ecBuildAnalysisHTML({ rec, email, t, langCode });

  // ── Mount strategy ────────────────────────────────────────────
  // Past attempts failed because html2pdf's worker chain wraps our
  // element in its own overlay/container with style overrides that
  // race html2canvas's capture step — the canvas ended up the right
  // *height* (so PDF had right number of pages) but blank content.
  //
  // We now bypass html2pdf entirely and call html2canvas + jsPDF
  // directly. Mount uses a 0×0 overflow:hidden wrapper around a
  // full-size inner element. The wrapper visually clips everything
  // to zero (user sees nothing flash on screen), but the inner
  // element's getBoundingClientRect() reports its full intrinsic
  // size — which is what html2canvas uses to allocate the capture
  // canvas. No position:fixed shenanigans, no left:-9999px, no
  // opacity tricks; just normal flow constrained by a clip.
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;z-index:-1;pointer-events:none;";

  const inner = document.createElement("div");
  inner.style.cssText = "width:720px;background:#fff;";
  inner.innerHTML = html;
  wrapper.appendChild(inner);

  document.body.appendChild(wrapper);

  // Wait for one full paint cycle (double-RAF) plus a generous
  // image-decode window. The inline base64 logo decodes async
  // even though no network is involved; 250ms covers slow devices.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 250));

  const planSlug = (rec.plan?.id || "plan").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `Altery-eligibility-${planSlug}-${stamp}.pdf`;

  try {
    // Step 1 — render the element to a canvas via html2canvas. We
    // pass the inner element directly (not its parent) so dimensions
    // are read from the element's own border box, ignoring the 0×0
    // wrapper clip.
    const target = inner.firstElementChild;

    // Page-break candidates are collected after the per-page height is
    // known (see below), so any block that fits on a page can be kept whole.
    // canvas is rendered at scale=2 so canvas-pixel Y = CSS Y * 2.
    const CANVAS_SCALE = 2;
    const targetRect = target.getBoundingClientRect();

    const canvas = await window.html2canvas(target, {
      scale: CANVAS_SCALE,
      useCORS: true,
      allowTaint: true,         // lets the inline base64 PNG render even on strict origins
      logging: false,
      backgroundColor: "#ffffff",
      // foreignObjectRendering is false by default and we keep it that
      // way: the SVG-foreignObject path produces blank canvases for
      // some templates; walking the DOM by hand is slower but reliable.
      foreignObjectRendering: false,
      imageTimeout: 3000,
    });

    // Sanity check — empty canvas means html2canvas silently failed.
    // Throwing here is better than shipping a blank PDF.
    if (!canvas || canvas.width < 50 || canvas.height < 50) {
      throw new Error("html2canvas produced empty canvas: " + (canvas?.width || 0) + "×" + (canvas?.height || 0));
    }

    const imgData = canvas.toDataURL("image/jpeg", 0.94);
    if (!imgData || imgData.length < 2000) {
      throw new Error("Canvas produced empty data URL (length=" + (imgData?.length || 0) + ")");
    }

    // Step 2 — build the PDF. html2pdf's bundle exposes jsPDF as
    // window.jspdf.jsPDF; some loaders expose plain window.jsPDF
    // instead, so we accept both.
    const jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const pageWidth  = pdf.internal.pageSize.getWidth();   // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight();  // 297mm

    // Reserve breathing room at the top and bottom of every page. The
    // captured canvas is one continuous render of the whole document;
    // without explicit margins the slicer butted content right up against
    // the page edge on every page after the first, which made the PDF
    // feel cramped — text touching the top fold, no whitespace below the
    // last paragraph before the page number band.
    //
    // We treat the page as: [topMargin][content area][bottomMargin], with
    // the content image placed at y=topMargin and the page-number footer
    // drawn inside bottomMargin. Width still maps 1:1 to pageWidth so
    // content scale is unchanged — only the per-page slice height shrinks,
    // which adds pages but preserves typography exactly.
    const topMargin       = 14;                 // mm reserved at top
    const bottomMargin    = 14;                 // mm reserved at bottom (incl. page number)
    const contentHeight   = pageHeight - topMargin - bottomMargin;
    const pxPerMm         = canvas.width / pageWidth;
    const slicePxHeight   = Math.floor(contentHeight * pxPerMm);

    // Collect page-break candidates: the top Y of every element that fits
    // within one content page. An element shorter than the page is treated
    // as ATOMIC — we do NOT expose its children as break points, so a slice
    // can never land inside a card / list / table / panel. We descend only
    // into elements taller than a page (those MUST split, e.g. a very long
    // list), exposing their children as finer break points. Net effect: any
    // block that doesn't fit in the space left on the current page is pushed
    // whole onto the next page — works for any plan's generated PDF with no
    // per-section hints.
    const breakCandidates = new Set([0]);
    const collectBreaks = (el) => {
      if (!el || el.nodeType !== 1) return;
      const r = el.getBoundingClientRect();
      const top = Math.round((r.top - targetRect.top) * CANVAS_SCALE);
      const h   = Math.round(r.height * CANVAS_SCALE);
      if (top > 0) breakCandidates.add(top);
      if (h > slicePxHeight) {
        for (const child of el.children) collectBreaks(child);
      }
    };
    collectBreaks(target);
    breakCandidates.add(canvas.height);   // tail, so the last page reaches the bottom
    const breakYs = [...breakCandidates].sort((a, b) => a - b);

    // Smart slicing — for each page take the largest candidate that fits in
    // (sliceY, sliceY + slicePxHeight]. Because candidates sit only between
    // whole blocks, the cut never lands inside one.
    let sliceY = 0;
    let pageIdx = 0;
    while (sliceY < canvas.height) {
      const maxEndY = Math.min(sliceY + slicePxHeight, canvas.height);
      let sliceEndY = -1;
      // Largest candidate Y that's strictly > sliceY and ≤ maxEndY
      for (const y of breakYs) {
        if (y > sliceY && y <= maxEndY) sliceEndY = y;
      }
      // Fallback when nothing fits (a single element taller than one page,
      // or a final tail that doesn't reach any candidate)
      if (sliceEndY === -1) sliceEndY = maxEndY;

      const thisSlicePx = sliceEndY - sliceY;

      // Draw the slice into a throwaway canvas at full resolution,
      // export as JPEG, and place on the page.
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width  = canvas.width;
      sliceCanvas.height = thisSlicePx;
      const sctx = sliceCanvas.getContext("2d");
      sctx.fillStyle = "#ffffff";
      sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sctx.drawImage(canvas, 0, sliceY, canvas.width, thisSlicePx, 0, 0, canvas.width, thisSlicePx);
      const sliceImgData = sliceCanvas.toDataURL("image/jpeg", 0.94);
      const sliceMmHeight = thisSlicePx / pxPerMm;

      if (pageIdx > 0) pdf.addPage();
      pdf.addImage(sliceImgData, "JPEG", 0, topMargin, pageWidth, sliceMmHeight);

      // Invisible text layer — for every text node intersecting this
      // slice, place its content at the matching position with PDF
      // renderingMode "invisible" (text is selectable + copy-able but
      // not drawn; the bitmap underneath provides the actual visual).
      // Same trick OCR'd PDFs use for "scanned + searchable" documents.
      // Font is the jsPDF default Helvetica — sizes track CSS computed
      // font-size; positions track each text-rect's bounding box. The
      // last arg shifts every Y coordinate down by topMargin so the
      // selection regions align with the image's new in-page origin.
      ecAddInvisibleTextLayer(pdf, target, sliceY, sliceEndY, pxPerMm, CANVAS_SCALE, topMargin);
      // And: hyperlink hot-zones for every <a href> element on this page,
      // so the "Schedule a 15-min intro call" CTA (and any other anchors)
      // are actually clickable in the resulting PDF. Without this the
      // bitmap-PDF strips clickability — anchor tags flatten to pixels.
      ecAddLinkAnnotations(pdf, target, sliceY, sliceEndY, pxPerMm, CANVAS_SCALE, topMargin);

      sliceY  = sliceEndY;
      pageIdx += 1;
    }

    // Stamp page numbers in the reserved footer band. Muted grey
    // small print, centered. Format mirrors common business
    // document conventions: "2 / 5" rather than "Page 2 of 5"
    // because the latter is wordy in non-English layouts.
    const totalPages = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFontSize(8);
      pdf.setTextColor(107, 111, 123);  // muted #6B6F7B
      pdf.text(`${p} / ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: "center" });
    }

    const blob = pdf.output("blob");
    const pdfBase64 = await ecBlobToBase64(blob);

    // Display fields the server template needs for the email body.
    const planName = t(rec.plan.nameKey);
    const entityName = t(rec.entity.nameKey);
    const personaIndustries = ["saas", "apps", "games", "edtech", "affiliate", "creator", "crypto"];
    const personaLine = rec.ind && personaIndustries.includes(rec.ind.value)
      ? t("ec.r.persona." + rec.ind.value + ".line")
      : "";
    // Email CTA destination — same self-contained handoff URL the PDF
    // uses internally. One ?p=<base64url> payload pre-fills the entire
    // onboarding from the original checker answers, so a colleague who
    // gets the email forwarded picks up exactly where the original
    // recipient left off. Origin must point at the actual deployment
    // (Vercel preview, future altery.com when it routes to this app),
    // never at a hardcoded altery.com that doesn't host the setup flow.
    const emailOrigin = (typeof window !== "undefined" && window.location && window.location.origin)
      ? window.location.origin
      : "https://altery-eligibility.vercel.app";
    // Embed the recipient email in the payload so when they click the
    // link from their inbox (or forward it to a colleague), the
    // onboarding welcome screen pre-fills the same address. Recipient
    // is the canonical "this is the founder" email; forwards can still
    // override on the welcome screen.
    const sessionLink = ecBuildHandoffURL(rec, rec.plan, emailOrigin, { email });

    // Resolve every localized string the email body needs, on the
    // client where the i18n dictionary already lives. The server
    // never needs to know about translations — it just slots these
    // strings into its template. Keeps i18n logic in one place and
    // keeps the API function tiny.
    // Forwarded-copy mode: when an existing recipient shares the PDF
    // with a colleague, we surface that context inline so the new
    // reader sees who sent it and why. Localized client-side; server
    // just slots the string into a banner above the hero. Empty
    // string when this is the primary send (no banner rendered).
    const safeForwarder = (typeof forwardedBy === "string" && forwardedBy.includes("@"))
      ? forwardedBy.trim()
      : "";
    const forwardedByBanner = safeForwarder
      ? t("ec.email.forwarded.banner", { forwarder: safeForwarder, plan: planName })
      : "";
    const forwardedByLabel = safeForwarder
      ? t("ec.email.forwarded.label")
      : "";

    // Capability matrix used to be rendered into the email body here
    // and slotted as ${capabilityHTML}. Removed 2026-05-29 — that
    // content lives in the PDF, and inboxes scan better when the email
    // is a short wrapper around the attachment, not a duplicate of it.

    const emailStrings = {
      subject:        safeForwarder
        ? t("ec.email.forwarded.subject", { forwarder: safeForwarder, plan: planName })
        : t("ec.email.subject", { plan: planName }),
      preheader:      safeForwarder
        ? t("ec.email.forwarded.preheader", { forwarder: safeForwarder, plan: planName })
        : t("ec.email.preheader", { plan: planName, entity: entityName }),
      eyebrow:        t("ec.email.eyebrow"),
      titleMid:       t("ec.r.title.middle"),
      titleEnd:       t("ec.r.title.after"),
      lead:           t("ec.email.lead"),
      cta:            t("ec.email.cta"),
      tail1:          t("ec.email.tail1"),
      tail2:          t("ec.email.tail2"),
      bookingCta:    t("ec.email.bookingCta"),
      footerTagline:  t("ec.pdf.footer.tagline"),
      footerEntities: t("ec.pdf.footer.entities"),
      forwardedByBanner,
      forwardedByLabel,
    };

    // Anti-spam fields (honeypot + form-load timestamp) — server
    // rejects if honeypot non-empty or form submitted <3 s after
    // mount. See lib/anti-spam.js. Only sent when caller supplies
    // them; older clients without these fields still work.
    const apiPayload = {
      email,
      pdfBase64,
      filename,
      planName,
      entityName,
      personaLine,
      sessionLink,
      langCode,
      bookingURL: ecContactRequestUrl(rec, email),
      emailStrings,
      forwardedBy: safeForwarder,
    };
    if (antiSpam) {
      if (typeof antiSpam.website === "string") apiPayload.website = antiSpam.website;
      if (typeof antiSpam.formLoadedAt === "number") apiPayload.formLoadedAt = antiSpam.formLoadedAt;
    }
    const apiRes = await fetch("/api/send-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiPayload),
    });

    if (!apiRes.ok) {
      // Try to read the structured error from the function. The API
      // sends { error, code, ... } on non-2xx so the client can
      // surface specific failures (no_api_key, bad_email, etc.).
      let detail = "";
      try {
        const j = await apiRes.json();
        detail = j?.error || j?.code || "";
        console.error("[ecSendAnalysisEmail] API error:", apiRes.status, j);
      } catch (_) {
        detail = "HTTP " + apiRes.status;
      }
      throw new Error("Email send failed: " + detail);
    }

    const okJson = await apiRes.json().catch(() => ({}));
    return { ok: true, id: okJson?.id || null };
  } finally {
    // Always clean up the offscreen wrapper so subsequent runs and
    // the accessibility tree stay tidy.
    document.body.removeChild(wrapper);
  }
}

Object.assign(window, {
  ecWaitForPdfLibs, ecBuildAnalysisHTML, ecSendAnalysisEmail,
});
