// checker-pdf.js — PDF + email infrastructure for the eligibility checker.
//
// Loaded as a classic <script> in /index.html. Exports four functions to
// window so the checker's screens/modals can call them at render time:
//
//   ecLoadStripe         — promise-based Stripe.js loader with diagnostic errors
//   ecWaitForPdfLibs     — polls until window.html2canvas + window.jspdf are ready
//   ecBuildAnalysisHTML  — builds the proposal HTML string (no JSX, plain template)
//   ecSendAnalysisEmail  — composes the email body + posts to /api/send-analysis
//                          with the html2canvas/jsPDF-rendered PDF attached
//
// References data constants (EC_PLANS, EC_ENTITIES, EC_CALENDLY_URL,
// EC_ALTERY_LOGO_B64, STRIPE_PUBLISHABLE_KEY, …) and helper functions
// (ecComputeCostBreakdown, ecOutcomesForSavings, ecGenProposalRef, …)
// via Global Lexical Declarations across classic scripts.

// ─── ecLoadStripe ──────────────────────────────────────────────
// Loads Stripe.js with proper script-tag lifecycle handling.
// Returns a Promise resolving to the window.Stripe constructor, or
// rejecting with a specific Error containing diagnostic info.
//
// Distinguishes three failure modes for accurate error messages:
//   1. Script load failure (network/CSP/firewall/adblocker) → load
//      event never fires, error event does
//   2. Script loads but window.Stripe stays undefined (Stripe refused
//      to initialise on origin, e.g. file://) → load fires but poll
//      never picks up window.Stripe
//   3. Overall timeout (15s) for slow networks
//
// Handles three DOM states:
//   a. Stripe already loaded → resolves immediately
//   b. Script tag in DOM (from <head>) — may have loaded before this
//      runs, so we poll AND listen for load/error
//   c. No script tag → inject one + listen
function ecLoadStripe() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("No window object available"));
    }
    if (window.Stripe) {
      return resolve(window.Stripe);
    }

    const STRIPE_SRC = "https://js.stripe.com/v3/";
    let scriptEl = document.querySelector('script[src^="https://js.stripe.com/v3"]');
    let scriptWasNew = false;

    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.src = STRIPE_SRC;
      scriptEl.async = true;
      document.head.appendChild(scriptEl);
      scriptWasNew = true;
    }

    let settled = false;
    let pollHandle = null;
    let timeoutHandle = null;

    const cleanup = () => {
      if (pollHandle) clearInterval(pollHandle);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      scriptEl.removeEventListener("load", onLoad);
      scriptEl.removeEventListener("error", onError);
    };
    const settle = (fn, val) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(val);
    };

    function onLoad() {
      // Script fetched OK — give Stripe up to 2s to set window.Stripe.
      // If it doesn't, the origin probably isn't accepted (file://,
      // sandbox, etc.) and Stripe.js refused to init silently.
      const startedAt = Date.now();
      pollHandle = setInterval(() => {
        if (window.Stripe) {
          settle(resolve, window.Stripe);
        } else if (Date.now() - startedAt > 2000) {
          const origin = (window.location && window.location.origin) || "file://";
          settle(reject, new Error(
            "Stripe.js loaded but didn't initialise (window.Stripe is undefined). " +
            "Stripe may have refused to run on origin \"" + origin + "\". " +
            "Try serving the file via a web server (http(s)://) instead."
          ));
        }
      }, 50);
    }
    function onError() {
      settle(reject, new Error(
        "Stripe.js script failed to load. Likely cause: blocked by network, " +
        "firewall, ad-blocker, sandbox iframe, or Content Security Policy. " +
        "Check the browser console for the exact network error."
      ));
    }

    scriptEl.addEventListener("load", onLoad);
    scriptEl.addEventListener("error", onError);

    // The <head> script may have fired its load event before this
    // listener was attached. Poll concurrently to catch that race.
    if (!scriptWasNew) {
      pollHandle = setInterval(() => {
        if (window.Stripe) settle(resolve, window.Stripe);
      }, 50);
    }

    timeoutHandle = setTimeout(() => {
      settle(reject, new Error(
        "Stripe.js load timeout (15s). Check DevTools → Network for the " +
        "request to js.stripe.com/v3/."
      ));
    }, 15000);
  });
}

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

// EC_ALTERY_LOGO_B64 + EC_CALENDLY_URL → moved to /checker-pdf-assets.js
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

  const leadText = t("ec.r.lead", {
    entity: entityName,
    licence: entityLicence,
    note: entityNote,
  });

  // ─── Section blocks ────────────────────────────────────────────

  // Reasoning bullets — same data as the result page, formatted
  // for print with check-circle markers.
  const reasoningHTML = (rec.reasoning || []).map((r) => {
    const text = t(r.key, r.vars || {});
    return `
      <div style="display:flex;gap:14px;margin-bottom:14px;align-items:flex-start;">
        <div style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:${C.primary};color:${C.white};display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;">✓</div>
        <div style="font-size:13.5px;line-height:21px;color:${C.ink};flex:1;">${text}</div>
      </div>`;
  }).join("");

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

  // Crypto reroute callout — only when EU-incorporated user had
  // crypto signal (industry or services) and got routed to UK.
  const cryptoRerouteHTML = rec.cryptoReroute ? `
    <div style="background:${C.warn};border:1px solid ${C.warnBorder};border-radius:12px;padding:16px 18px;margin:0 0 28px;">
      <div style="font-size:13px;font-weight:600;color:${C.ink};margin-bottom:6px;">${t("ec.pdf.cryptoReroute.head")}</div>
      <div style="font-size:12.5px;line-height:19px;color:${C.inkSoft};">${t("ec.pdf.cryptoReroute.body")}</div>
    </div>` : "";

  // Cost breakdown — Altery vs typical business bank. This is
  // the document's anchor calculation: the number the customer
  // remembers, forwards, and quotes to their CFO.
  const cost = ecComputeCostBreakdown(rec);
  const outcomes = cost ? ecOutcomesForSavings(cost.savings.annual) : [];

  const fmtEUR = (n) => "€" + (n || 0).toLocaleString("en-US");

  const costMathHTML = cost ? `
    <div style="margin:0 0 18px;">
      <div style="font-size:10px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">${t("ec.pdf.costMath.head")}</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <tr>
          <td style="width:50%;padding:14px 16px;background:${C.surface};border:1px solid ${C.border};border-radius:12px 0 0 12px;vertical-align:top;">
            <div style="font-size:11px;color:${C.primary};font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">${t("ec.pdf.costMath.altery")}</div>
            ${cost.altery.subscription > 0 ? `
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:3px 0;">
              <span>${t("ec.pdf.costMath.subscription")}</span><span style="font-variant-numeric:tabular-nums;">${fmtEUR(cost.altery.subscription)}</span>
            </div>` : ""}
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:3px 0;">
              <span>${t("ec.pdf.costMath.fx")}</span><span style="font-variant-numeric:tabular-nums;">${fmtEUR(cost.altery.fx)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:3px 0;">
              <span>${t("ec.pdf.costMath.swift")}</span><span style="font-variant-numeric:tabular-nums;">${fmtEUR(cost.altery.swift)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:3px 0;">
              <span>${t("ec.pdf.costMath.local")}</span><span style="font-variant-numeric:tabular-nums;">${fmtEUR(cost.altery.local)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13.5px;color:${C.ink};padding:10px 0 0;margin-top:6px;border-top:1px solid ${C.border};">
              <span style="font-weight:600;">${t("ec.pdf.costMath.total")}</span><span style="font-weight:700;font-variant-numeric:tabular-nums;">${fmtEUR(cost.altery.total)}</span>
            </div>
          </td>
          <td style="width:50%;padding:14px 16px;background:${C.white};border:1px solid ${C.border};border-left:0;border-radius:0 12px 12px 0;vertical-align:top;">
            <div style="font-size:11px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">${t("ec.pdf.costMath.bank")}</div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:3px 0;">
              <span>${t("ec.pdf.costMath.fx")}</span><span style="font-variant-numeric:tabular-nums;">${fmtEUR(cost.bank.fx)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:3px 0;">
              <span>${t("ec.pdf.costMath.swift")}</span><span style="font-variant-numeric:tabular-nums;">${fmtEUR(cost.bank.swift)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.inkSoft};padding:3px 0;">
              <span>${t("ec.pdf.costMath.local")}</span><span style="font-variant-numeric:tabular-nums;">${fmtEUR(cost.bank.local)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13.5px;color:${C.ink};padding:10px 0 0;margin-top:31px;border-top:1px solid ${C.border};">
              <span style="font-weight:600;">${t("ec.pdf.costMath.total")}</span><span style="font-weight:700;font-variant-numeric:tabular-nums;">${fmtEUR(cost.bank.total)}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Savings band — loss-framed: "you're leaving on the table" -->
      <div style="background:${C.savingsBg};border:1.5px solid ${C.savings};border-radius:12px;padding:18px 22px;margin-top:14px;">
        <div style="font-size:11px;color:${C.savings};font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${t("ec.pdf.costMath.savings.label")}</div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-size:24px;font-weight:700;color:${C.savings};font-variant-numeric:tabular-nums;letter-spacing:-0.01em;">${fmtEUR(cost.savings.monthly)}<span style="font-size:14px;color:${C.savings};font-weight:500;"> ${t("ec.pdf.costMath.perMonth")}</span></div>
          <div style="font-size:14px;color:${C.savings};font-weight:600;font-variant-numeric:tabular-nums;">${fmtEUR(cost.savings.annual)} ${t("ec.pdf.costMath.perYear")}</div>
        </div>
      </div>

      <div style="font-size:11px;color:${C.muted};line-height:16px;margin-top:10px;">${t("ec.pdf.costMath.assumptions", { volume: ecFormatVolume(rec.monthlyVolume), txCount: cost.meta.txCount, fxPct: cost.meta.fxVolumePct })}</div>
    </div>` : "";

  // "What €X annual buys you" — future-self visualization. Turns
  // an abstract money number into 2-3 concrete business outcomes
  // (hire, runway, marketing) the founder can already picture.
  const outcomesHTML = outcomes.length ? `
    <div style="background:${C.beige};border:1px solid ${C.beigeBorder};border-radius:12px;padding:16px 20px;margin:0 0 30px;">
      <div style="font-size:11px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">${t("ec.pdf.outcomes.head", { amount: fmtEUR(cost.savings.annual) })}</div>
      ${outcomes.map((o) => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:4px 0;">
          <div style="flex-shrink:0;width:6px;height:6px;border-radius:50%;background:${C.primary};margin-top:8px;"></div>
          <div style="font-size:13px;color:${C.ink};line-height:19px;">${t(o.key, { value: o.value })}</div>
        </div>`).join("")}
    </div>` : "";

  // Altery vs typical business bank — comparison table. By the
  // end of these 8 rows the customer has made the case for
  // switching to themselves. Each row a single fact that
  // accumulates into a clear winner.
  const comparisonRows = [
    "setup", "kyb", "fx", "swift", "multiCcy", "crypto", "api", "multiEntity"
  ];
  const comparisonHTML = `
    <div style="margin:0 0 30px;">
      <div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px;">${t("ec.pdf.comparison.head")}</div>
      <table style="width:100%;border-collapse:collapse;background:${C.surface};border:1px solid ${C.border};border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:${C.white};">
            <th style="text-align:left;font-size:11px;font-weight:600;color:${C.muted};padding:10px 14px;border-bottom:1px solid ${C.border};text-transform:uppercase;letter-spacing:0.06em;width:38%;"></th>
            <th style="text-align:left;font-size:11px;font-weight:600;color:${C.primary};padding:10px 14px;border-bottom:1px solid ${C.border};text-transform:uppercase;letter-spacing:0.06em;">Altery</th>
            <th style="text-align:left;font-size:11px;font-weight:600;color:${C.muted};padding:10px 14px;border-bottom:1px solid ${C.border};text-transform:uppercase;letter-spacing:0.06em;">${t("ec.pdf.comparison.bank")}</th>
          </tr>
        </thead>
        <tbody>
          ${comparisonRows.map((row, i) => `
            <tr ${i > 0 ? `style="border-top:1px solid ${C.border};"` : ""}>
              <td style="padding:10px 14px;font-size:12px;color:${C.muted};font-weight:500;">${t(`ec.pdf.comparison.row.${row}.label`)}</td>
              <td style="padding:10px 14px;font-size:12px;color:${C.ink};font-weight:500;">${t(`ec.pdf.comparison.row.${row}.altery`)}</td>
              <td style="padding:10px 14px;font-size:12px;color:${C.muted};">${t(`ec.pdf.comparison.row.${row}.bank`)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
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
            <div style="flex-shrink:0;width:16px;height:16px;border-radius:4px;border:1.5px solid ${C.primary};display:inline-flex;align-items:center;justify-content:center;color:${C.primary};font-size:10px;font-weight:700;margin-top:2px;">✓</div>
            <div style="font-size:12.5px;color:${C.ink};line-height:18px;">${t(`ec.pdf.checklist.${id}`)}</div>
          </div>`).join("")}
        <div style="font-size:11px;color:${C.muted};line-height:16px;margin-top:10px;padding-top:10px;border-top:1px solid ${C.border};">${t("ec.pdf.checklist.note")}</div>
      </div>
    </div>`;

  // Volume-specific advisor note — sales voice. Rendered as a
  // beige-bordered italic stripe so it visually reads as a side-
  // comment from a real advisor rather than another data block.
  const volumeHintHTML = monthlyVolume ? `
    <div style="margin:0 0 30px;padding:2px 0 2px 14px;border-left:3px solid ${C.beige};font-size:12.5px;line-height:19px;color:${C.inkSoft};font-style:italic;">
      ${t(ecVolumeHintKey(monthlyVolume))}
    </div>` : "";

  // Numbered timeline. Sells "how easy it is to start" — each step
  // calibrated to set realistic expectations (10 min setup, 48h to
  // live, 5 days for cards). Numbers in navy circles for visual
  // anchor and easy scanning.
  const stepsHTML = [1, 2, 3, 4].map((n) => `
    <div style="display:flex;gap:14px;margin-bottom:14px;align-items:flex-start;">
      <div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:${C.beige};border:1.5px solid ${C.primary};color:${C.primary};display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;">${n}</div>
      <div style="flex:1;">
        <div style="font-size:13.5px;font-weight:600;color:${C.ink};line-height:19px;">${t(`ec.pdf.steps.${n}.title`)}</div>
        <div style="font-size:12px;color:${C.muted};line-height:18px;margin-top:2px;">${t(`ec.pdf.steps.${n}.body`)}</div>
      </div>
    </div>`).join("");

  const sessionToken = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)).toLowerCase();

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
  ${t("ec.pdf.preparedFor")} <span style="color:${C.ink};font-weight:500;">${email}</span>
</div>` : ""}
  </div>

  <!-- Body -->
  <div style="padding:28px 40px 28px;">

${personaLine ? `<div style="font-size:13px;font-weight:500;color:${C.primary};margin:0 0 10px;letter-spacing:-0.005em;">${personaLine}</div>` : ""}

<div style="font-size:10px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">${t("ec.pdf.recommendation")}</div>

<h1 style="font-size:26px;font-weight:700;letter-spacing:-0.02em;line-height:32px;color:${C.ink};margin:0 0 14px;">
  <span style="color:${C.primary};">${entityName}</span> ${t("ec.r.title.middle")} <span style="color:${C.primary};">${planName}</span>${t("ec.r.title.after")}
</h1>

<p style="font-size:14px;line-height:21px;color:${C.inkSoft};margin:0 0 20px;">${leadText}</p>

<div style="display:inline-block;padding:7px 14px 7px 10px;background:${C.beige};border:1px solid ${C.beigeBorder};border-radius:999px;font-size:12px;color:${C.ink};margin-bottom:28px;">
  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${C.success};margin-right:8px;vertical-align:middle;"></span>
  ${entityName} · ${entityLicence}
</div>

${cryptoRerouteHTML}

${costMathHTML}

${outcomesHTML}

${volumeHintHTML}

<!-- Why we recommend -->
<div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">
  ${t("ec.r.reasoning.head", { plan: planName })}
</div>
<div style="margin-bottom:32px;">${reasoningHTML}</div>

${comparisonHTML}

<!-- Selected services — compact card list -->
<div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">
  ${t("ec.pdf.services.head")}
</div>
<div style="margin-bottom:30px;">${servicesHTML}</div>

<!-- Pricing detail -->
<div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">
  ${t("ec.pdf.pricing.head", { plan: planName })}
</div>
<div style="background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:14px 20px;margin-bottom:32px;">
  <table style="width:100%;border-collapse:collapse;">${feeTableHTML}</table>
</div>

${checklistHTML}

<!-- Numbered timeline — sells "how easy it is to start" -->
<div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">
  ${t("ec.pdf.nextSteps.head")}
</div>
<div style="margin-bottom:26px;">${stepsHTML}</div>

<!-- Setup CTA block — navy, prominent. Mono-spaced URL for legibility -->
<div style="background:${C.primary};border-radius:12px;padding:16px 20px;color:${C.white};margin-bottom:20px;">
  <div style="font-size:10.5px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">${t("ec.pdf.continueSetup")}</div>
  <div style="font-size:14px;color:${C.white};font-family:${FF_MONO};letter-spacing:-0.005em;">altery.com/setup/${sessionToken}</div>
</div>

<!-- Account team — humanises the proposal. Validity notice gives
     it the legal-document weight of a real commercial proposal. -->
<div style="background:${C.beige};border:1px solid ${C.beigeBorder};border-radius:12px;padding:16px 20px;margin-bottom:16px;">
  <div style="font-size:10px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">${t("ec.pdf.team.head")}</div>
  <div style="font-size:13px;line-height:19px;color:${C.ink};margin-bottom:10px;">${t("ec.pdf.signature.body")}</div>
  <div style="font-size:12.5px;line-height:18px;color:${C.inkSoft};margin-bottom:12px;">${t("ec.pdf.team.body")}</div>
  <a href="${EC_CALENDLY_URL}" style="display:inline-block;font-size:12.5px;color:${C.primary};text-decoration:none;font-weight:500;border-bottom:1px solid ${C.primary};line-height:18px;">${t("ec.pdf.team.calendly")} →</a>
</div>

<!-- Validity notice — soft urgency, commercial-proposal convention -->
<div style="font-size:11px;color:${C.muted};line-height:16px;margin-bottom:8px;text-align:center;font-style:italic;">${t("ec.pdf.validity")}</div>

  </div>

  <!-- Footer — sub-fold legal block -->
  <div style="background:${C.surface};padding:22px 40px;border-top:1px solid ${C.border};font-size:10.5px;line-height:16px;color:${C.muted};">
<div style="margin-bottom:4px;color:${C.ink};font-weight:600;">Altery</div>
<div>${t("ec.pdf.footer.tagline")}</div>
<div style="margin-top:8px;">${t("ec.pdf.footer.entities")}</div>
  </div>

</div>`;
}

// Convert a Blob to a base64 string (without the data:URL prefix).
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
async function ecSendAnalysisEmail({ rec, email, t }) {
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
    const canvas = await window.html2canvas(target, {
      scale: 2,
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

    // Reserve 12mm at the bottom of each page for the page-number
    // line. We slice the captured canvas into chunks that fit in
    // (pageHeight − footerHeight) instead of pageHeight, then
    // stamp the page numbers into the reserved band after. This
    // is cleaner than overlaying numbers on top of the rendered
    // image, which would risk colliding with footer text.
    const footerHeight    = 12;                 // mm reserved at bottom
    const contentHeight   = pageHeight - footerHeight;
    const pxPerMm         = canvas.width / pageWidth;
    const slicePxHeight   = Math.floor(contentHeight * pxPerMm);

    let sliceY = 0;
    let pageIdx = 0;
    while (sliceY < canvas.height) {
      const thisSlicePx = Math.min(slicePxHeight, canvas.height - sliceY);

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
      pdf.addImage(sliceImgData, "JPEG", 0, 0, pageWidth, sliceMmHeight);

      sliceY  += slicePxHeight;
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
    console.info("[ecSendAnalysisEmail] PDF blob:", blob.size, "bytes,", "canvas:", canvas.width + "×" + canvas.height, "pages:", totalPages);

    const pdfBase64 = await ecBlobToBase64(blob);

    // Display fields the server template needs for the email body.
    const planName = t(rec.plan.nameKey);
    const entityName = t(rec.entity.nameKey);
    const personaIndustries = ["saas", "apps", "games", "edtech", "affiliate", "creator", "crypto"];
    const personaLine = rec.ind && personaIndustries.includes(rec.ind.value)
      ? t("ec.r.persona." + rec.ind.value + ".line")
      : "";
    const sessionToken = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)).toLowerCase();
    const sessionLink = "https://altery.com/setup/" + sessionToken;

    // Resolve every localized string the email body needs, on the
    // client where the i18n dictionary already lives. The server
    // never needs to know about translations — it just slots these
    // strings into its template. Keeps i18n logic in one place and
    // keeps the API function tiny.
    const emailStrings = {
      subject:        t("ec.email.subject",   { plan: planName }),
      preheader:      t("ec.email.preheader", { plan: planName, entity: entityName }),
      eyebrow:        t("ec.email.eyebrow"),
      titleMid:       t("ec.r.title.middle"),
      titleEnd:       t("ec.r.title.after"),
      lead:           t("ec.email.lead"),
      pillActive:     t("ec.email.pillActive"),
      cta:            t("ec.email.cta"),
      tail1:          t("ec.email.tail1"),
      tail2:          t("ec.email.tail2"),
      calendlyCta:    t("ec.email.calendlyCta"),
      footerTagline:  t("ec.pdf.footer.tagline"),
      footerEntities: t("ec.pdf.footer.entities"),
    };

    const apiRes = await fetch("/api/send-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        pdfBase64,
        filename,
        planName,
        entityName,
        personaLine,
        sessionLink,
        langCode,
        calendlyURL: EC_CALENDLY_URL,
        emailStrings,
      }),
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
  ecLoadStripe, ecWaitForPdfLibs, ecBuildAnalysisHTML, ecSendAnalysisEmail,
});
