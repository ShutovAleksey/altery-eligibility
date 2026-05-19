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
// ───────────────────────────────────────────────────────────────────────
// Native PDF generator (replaces the html2canvas → bitmap pipeline).
//
// Why this rewrite: the user reported that the previous PDF (a) couldn't
// have text copied / selected / searched, and (b) sliced elements mid-cut
// across page boundaries. The first problem is fundamental to html2canvas
// — it rasterises everything to pixels, so the resulting PDF is a glorified
// scan. The invisible-text overlay trick worked for Latin only and broke
// on Cyrillic / CJK because jsPDF's default font (Helvetica) has no
// glyphs there.
//
// This module instead builds the PDF natively via jsPDF's text + rect +
// line primitives, with the Inter variable font embedded for full
// multi-language support (Inter covers Latin Extended + Cyrillic + Greek
// in a single ~860 KB TTF). Every character is native PDF text — fully
// selectable, fully searchable, fully copyable in any PDF reader.
//
// Trade-off accepted in exchange for that text quality:
//   - The dark-navy radial-gradient hero band of the screen result page
//     is replaced by a flat ink/navy header. jsPDF has no native gradient
//     primitive; faking it via gridded fills looks worse than a clean flat.
//   - Custom flag SVGs are not embedded — we use just the country code.
//   - Visual fidelity is roughly Stripe/Mercury receipt-tier (clean,
//     editorial, no ornament) rather than the marketing-grade hero card.
//
// File size benefit: ~80–200 KB native PDF vs ~900 KB bitmap PDF.

// Lazy-load Inter font binary (~860 KB) on first PDF generation; cached
// in window.__INTER_TTF afterwards. We fetch the static TTF from /fonts/,
// base64-encode it, and hand to jsPDF's VFS so it can embed.
async function ecLoadInterFont() {
  if (window.__INTER_TTF) return window.__INTER_TTF;
  const resp = await fetch("/fonts/Inter.ttf", { cache: "force-cache" });
  if (!resp.ok) throw new Error("Failed to load /fonts/Inter.ttf: " + resp.status);
  const buf = await resp.arrayBuffer();
  // Base64-encode in 16 KB chunks — String.fromCharCode chokes on the
  // full ~860 KB array via spread (call-stack overflow) in some engines.
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x4000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  window.__INTER_TTF = btoa(binary);
  return window.__INTER_TTF;
}

// Build the entire proposal PDF natively. Returns nothing — mutates the
// jsPDF instance directly. Caller is responsible for output / saving.
function ecBuildNativePdf(pdf, rec, t) {
  // ── Layout constants ─────────────────────────────────────────────
  const PAGE_W = 210, PAGE_H = 297;        // A4 portrait, mm
  const MARGIN = { top: 18, right: 18, bottom: 24, left: 18 };
  const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right;  // 174 mm
  const PT_TO_MM = 0.3528;                 // 1 pt ≈ 0.3528 mm

  // Brand palette (mirrors the on-screen result-page tokens)
  const C = {
    ink:         [17, 20, 26],
    inkSoft:     [75, 80, 99],
    muted:       [105, 112, 124],
    mutedSoft:   [155, 161, 170],
    border:      [215, 218, 224],
    borderSoft:  [232, 233, 237],
    surface:     [255, 255, 255],
    surfaceTint: [248, 247, 244],
    beige:       [240, 235, 227],
    beigeBorder: [229, 224, 213],
    navy:        [0, 39, 128],
    navyDark:    [0, 12, 46],
    accent:      [0, 111, 255],
    accentSoft:  [235, 241, 255],
    orange:      [194, 65, 12],
    orangeBg:    [255, 247, 237],
    green:       [10, 159, 82],
    white:       [255, 255, 255],
  };

  // ── Cursor + paint state ─────────────────────────────────────────
  let y = MARGIN.top;
  let onFirstPage = true;

  pdf.setFont("Inter", "normal");

  const setFill   = (rgb) => pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setStroke = (rgb) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const setColor  = (rgb) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);

  function newPage() {
    pdf.addPage();
    y = MARGIN.top;
    onFirstPage = false;
  }
  function ensureSpace(needMm) {
    if (y + needMm > PAGE_H - MARGIN.bottom) newPage();
  }

  // Compute the visual height a text string would occupy at given size +
  // width (used for "ensure block fits on page or push to next" logic).
  function measureText(text, size, maxW) {
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(String(text), maxW);
    return lines.length * size * 1.35 * PT_TO_MM;
  }

  // Draw a text block at the current Y. Advances Y. opts:
  //   { size=10, color=C.ink, x=MARGIN.left, maxWidth=CONTENT_W,
  //     align="left"|"center"|"right", lineHeight=1.35,
  //     upper=false, letterSpacing=0 }
  function drawText(text, opts = {}) {
    const size = opts.size || 10;
    const color = opts.color || C.ink;
    const x = opts.x ?? MARGIN.left;
    const maxW = opts.maxWidth ?? CONTENT_W;
    const align = opts.align || "left";
    const lineHeight = opts.lineHeight || 1.35;
    let body = String(text == null ? "" : text);
    if (opts.upper) body = body.toUpperCase();

    pdf.setFontSize(size);
    setColor(color);

    if (opts.letterSpacing) {
      pdf.setCharSpace(opts.letterSpacing);
    }

    const lines = pdf.splitTextToSize(body, maxW);
    const lineMm = size * lineHeight * PT_TO_MM;
    // Baseline is ~0.78 of font-size below top-of-line in mm
    const ascentMm = size * 0.78 * PT_TO_MM;

    for (const line of lines) {
      ensureSpace(lineMm);
      const tx = align === "right"  ? x + maxW
              : align === "center" ? x + maxW / 2
              : x;
      pdf.text(line, tx, y + ascentMm, { align });
      y += lineMm;
    }

    if (opts.letterSpacing) pdf.setCharSpace(0);
  }

  // Draw a filled / stroked rectangle at the current Y (or absolute Y if
  // opts.yAbs provided). Does NOT advance Y on its own — callers that
  // want the cursor to land beneath the box should add { advance: true }.
  function drawRect(x, w, h, opts = {}) {
    const yAt = opts.yAbs ?? y;
    if (opts.fill && opts.stroke) {
      setFill(opts.fill);
      setStroke(opts.stroke);
      pdf.setLineWidth(opts.lineWidth || 0.2);
      pdf.roundedRect(x, yAt, w, h, opts.r || 0, opts.r || 0, "FD");
    } else if (opts.fill) {
      setFill(opts.fill);
      pdf.roundedRect(x, yAt, w, h, opts.r || 0, opts.r || 0, "F");
    } else if (opts.stroke) {
      setStroke(opts.stroke);
      pdf.setLineWidth(opts.lineWidth || 0.2);
      pdf.roundedRect(x, yAt, w, h, opts.r || 0, opts.r || 0, "S");
    }
    if (opts.advance) y = yAt + h;
  }

  // Horizontal rule
  function drawHr(opts = {}) {
    const x = opts.x ?? MARGIN.left;
    const w = opts.width ?? CONTENT_W;
    const color = opts.color || C.borderSoft;
    setStroke(color);
    pdf.setLineWidth(opts.lineWidth || 0.2);
    pdf.line(x, y, x + w, y);
    if (opts.advance) y += (opts.gap || 4);
  }

  // ── Currency formatter — narrow no-break space thousands separator ──
  const NBSP = " ";
  const fmtMoney = (n, curr = "€") => curr + (Math.round(n) || 0).toLocaleString("en-US").replace(/,/g, NBSP);
  const fmtVolume = (typeof window.ecFormatVolume === "function")
    ? window.ecFormatVolume
    : (n) => fmtMoney(n);

  // ── Compute the recommendation breakdown — same helpers as on-screen ─
  const cost = (typeof window.ecComputeCostBreakdown === "function")
    ? window.ecComputeCostBreakdown(rec)
    : null;
  const outcomes = (cost && cost.savings && typeof window.ecOutcomesForSavings === "function")
    ? window.ecOutcomesForSavings(cost.savings.annual || 0)
    : [];

  const entity = rec.entity || {};
  const plan = rec.plan || {};
  const entityName = t(entity.nameKey || "ec.entity.uk.name");
  const entityLicence = t(entity.licenceKey || "ec.entity.uk.licence");
  const entityNote = t(entity.noteKey || "ec.entity.uk.note");
  const planName = t(plan.nameKey || "ec.plan.starter.name");
  const planFit = t(plan.fitKey || "ec.plan.starter.fit");
  const planPrice = plan.priceKey ? t(plan.priceKey) : (plan.price || "");
  const planCycle = t(plan.cycleKey || "ec.plan.cycle.month");

  // Persona line — only for ICP-aligned industries
  const personaIndustries = ["saas", "apps", "games", "edtech", "affiliate", "creator", "crypto"];
  const personaLine = rec.ind && personaIndustries.includes(rec.ind.value)
    ? t("ec.r.persona." + rec.ind.value + ".line")
    : "";

  // ─────────────────────────────────────────────────────────────────
  // SECTION: HEADER — Altery wordmark + entity status line
  // ─────────────────────────────────────────────────────────────────
  // Solid navy band, height ~24mm. Wordmark as bold text (we don't have
  // the logo SVG renderable in jsPDF without rasterising it; the text
  // wordmark is recognisable and stays selectable).
  setFill(C.navyDark);
  pdf.rect(0, 0, PAGE_W, 28, "F");
  drawText("ALTERY", {
    size: 18,
    color: C.white,
    x: MARGIN.left,
    maxWidth: CONTENT_W,
    letterSpacing: 0.5,
  });
  y -= 1;  // tighten before subtitle
  drawText("Business finance for digital companies banks struggle to understand.", {
    size: 9,
    color: [180, 200, 230],
    x: MARGIN.left,
    maxWidth: CONTENT_W,
  });
  y = 36;  // jump below the band

  // ─────────────────────────────────────────────────────────────────
  // SECTION: HERO — proposal-style title block
  // ─────────────────────────────────────────────────────────────────
  if (personaLine) {
    drawText(personaLine, { size: 11, color: C.accent });
    y += 1;
  }
  drawText(t("ec.r.eyebrow") || "Recommended for your business", {
    size: 9, color: C.muted, upper: true, letterSpacing: 0.6,
  });
  y += 2;
  drawText(entityName, { size: 22, color: C.ink });
  drawText((t("ec.r.title.middle") || "on the") + " " + planName + (t("ec.r.title.after") || " plan."), {
    size: 22, color: C.muted,
  });
  y += 3;
  drawText(t("ec.r.lead", { entity: entityName, licence: entityLicence, note: entityNote }), {
    size: 11, color: C.inkSoft,
  });
  y += 4;
  // Entity-status pill (beige)
  const pillText = `${entityName} · ${entityLicence}`;
  pdf.setFontSize(9);
  const pillTextW = pdf.getTextWidth(pillText);
  const pillW = pillTextW + 14;
  drawRect(MARGIN.left, pillW, 8, { fill: C.beige, stroke: C.beigeBorder, r: 4 });
  setFill(C.green);
  pdf.circle(MARGIN.left + 4, y + 4, 1.2, "F");
  setColor(C.ink);
  pdf.text(pillText, MARGIN.left + 8, y + 5.4);
  y += 14;

  // ─────────────────────────────────────────────────────────────────
  // SECTION: SAVINGS — comparison table + monthly saving hero band
  // ─────────────────────────────────────────────────────────────────
  if (cost && cost.savings && cost.savings.monthly >= 100) {
    // Estimate height to push the whole block to next page if it won't fit
    ensureSpace(80);

    drawText(t("ec.r.savings.head") || "Your monthly costs — comparison", {
      size: 9, color: C.muted, upper: true, letterSpacing: 0.6,
    });
    y += 3;

    // Two-column comparison card
    const cardH = 36;
    const colW = (CONTENT_W - 6) / 2;
    drawRect(MARGIN.left, colW, cardH, { stroke: C.border, r: 4 });
    drawRect(MARGIN.left + colW + 6, colW, cardH, { stroke: C.border, r: 4 });

    // Left col — Altery
    pdf.setFontSize(9); setColor(C.muted);
    pdf.text((t("ec.r.savings.altery") || "ALTERY").toUpperCase(), MARGIN.left + 6, y + 7);
    pdf.setFontSize(12); setColor(C.ink);
    const altX = MARGIN.left + 6;
    let lineY = y + 14;
    const altLines = [
      ["Plan subscription", planPrice + " " + planCycle],
      ["FX margin",         fmtMoney(cost.altery.fx)],
      ["SWIFT cross-border", fmtMoney(cost.altery.swift)],
      ["Local payments",    fmtMoney(cost.altery.local)],
    ];
    for (const [label, val] of altLines) {
      pdf.setFontSize(10); setColor(C.inkSoft);
      pdf.text(label, altX, lineY);
      setColor(C.ink);
      pdf.text(String(val), MARGIN.left + colW - 6, lineY, { align: "right" });
      lineY += 6;
    }
    setStroke(C.borderSoft); pdf.setLineWidth(0.15);
    pdf.line(MARGIN.left + 6, lineY - 3, MARGIN.left + colW - 6, lineY - 3);
    pdf.setFontSize(11); setColor(C.ink);
    pdf.text("Total / month", altX, lineY + 1);
    pdf.text(fmtMoney(cost.altery.total), MARGIN.left + colW - 6, lineY + 1, { align: "right" });

    // Right col — typical bank
    const bankX = MARGIN.left + colW + 12;
    pdf.setFontSize(9); setColor(C.muted);
    pdf.text((t("ec.r.savings.bank") || "TYPICAL BUSINESS BANK").toUpperCase(), bankX, y + 7);
    lineY = y + 14;
    const bankLines = [
      ["FX margin",         fmtMoney(cost.bank.fx)],
      ["SWIFT cross-border", fmtMoney(cost.bank.swift)],
      ["Local payments",    fmtMoney(cost.bank.local)],
    ];
    for (const [label, val] of bankLines) {
      pdf.setFontSize(10); setColor(C.inkSoft);
      pdf.text(label, bankX, lineY);
      setColor(C.ink);
      pdf.text(String(val), MARGIN.left + 2 * colW - 6 + 6, lineY, { align: "right" });
      lineY += 6;
    }
    setStroke(C.borderSoft);
    pdf.line(bankX, lineY - 3, MARGIN.left + 2 * colW - 6 + 6, lineY - 3);
    pdf.setFontSize(11); setColor(C.ink);
    pdf.text("Total / month", bankX, lineY + 1);
    pdf.text(fmtMoney(cost.bank.total), MARGIN.left + 2 * colW - 6 + 6, lineY + 1, { align: "right" });

    y += cardH + 6;

    // Savings hero band
    ensureSpace(28);
    drawRect(MARGIN.left, CONTENT_W, 26, { fill: C.orangeBg, stroke: C.orange, r: 4, lineWidth: 0.4 });
    pdf.setFontSize(9); setColor(C.orange);
    pdf.text((t("ec.r.savings.heroLabel") || "YOUR MONTHLY SAVING").toUpperCase(), MARGIN.left + 8, y + 8);
    pdf.setFontSize(22); setColor(C.orange);
    pdf.text(fmtMoney(cost.savings.monthly), MARGIN.left + 8, y + 19);
    pdf.setFontSize(11); setColor(C.orange);
    const monthSuffix = (t("ec.r.savings.cycle") || "/month");
    const monthW = pdf.getTextWidth(fmtMoney(cost.savings.monthly));
    pdf.text(monthSuffix, MARGIN.left + 8 + monthW + 2, y + 19);
    pdf.setFontSize(11); setColor(C.orange);
    pdf.text(fmtMoney(cost.savings.annual) + " / year", MARGIN.left + CONTENT_W - 8, y + 19, { align: "right" });
    y += 30;

    drawText(t("ec.r.savings.note", { volume: fmtVolume(rec.monthlyVolume) }), {
      size: 9, color: C.muted, lineHeight: 1.45,
    });
    y += 6;
  }

  // ─────────────────────────────────────────────────────────────────
  // SECTION: OUTCOMES — "What €X / year could fund"
  // ─────────────────────────────────────────────────────────────────
  if (outcomes && outcomes.length) {
    ensureSpace(40);
    drawText((t("ec.pdf.outcomes.head", { amount: cost && cost.savings ? fmtMoney(cost.savings.annual) : "" }) || "WHAT THIS COULD FUND"), {
      size: 9, color: C.muted, upper: true, letterSpacing: 0.6,
    });
    y += 3;
    const boxH = Math.max(20, outcomes.length * 9 + 12);
    drawRect(MARGIN.left, CONTENT_W, boxH, { fill: C.beige, r: 4 });
    let boxY = y + 8;
    for (const o of outcomes) {
      setFill(C.navy);
      pdf.circle(MARGIN.left + 8, boxY - 1, 1.4, "F");
      setColor(C.ink);
      pdf.setFontSize(10);
      pdf.text(t(o.key, { value: o.value }), MARGIN.left + 14, boxY);
      boxY += 8;
    }
    y += boxH + 6;
  }

  // ─────────────────────────────────────────────────────────────────
  // SECTION: REASONING — "Why we recommend X" bullets
  // ─────────────────────────────────────────────────────────────────
  if (rec.reasoning && rec.reasoning.length) {
    ensureSpace(30);
    drawText(t("ec.r.reasoning.head", { plan: planName }) || "Why we recommend this plan", {
      size: 9, color: C.muted, upper: true, letterSpacing: 0.6,
    });
    y += 3;
    for (const r of rec.reasoning.slice(0, 3)) {
      const bulletText = t(r.key, r.vars || {});
      const bulletH = measureText(bulletText, 10, CONTENT_W - 8) + 2;
      ensureSpace(bulletH);
      // navy circle bullet
      setFill(C.navy);
      pdf.circle(MARGIN.left + 2.2, y + 2.5, 1.6, "F");
      setColor(C.white);
      pdf.setFontSize(7);
      pdf.text("✓", MARGIN.left + 2.2, y + 3.3, { align: "center" });
      // text body
      drawText(bulletText, {
        size: 10, color: C.inkSoft, x: MARGIN.left + 8, maxWidth: CONTENT_W - 8,
      });
      y += 1;
    }
    y += 4;
  }

  // ─────────────────────────────────────────────────────────────────
  // SECTION: SERVICES — selected services list (from rec.services)
  // ─────────────────────────────────────────────────────────────────
  if (rec.services && rec.services.length) {
    ensureSpace(20);
    drawText(t("ec.pdf.services.head") || "Selected services", {
      size: 9, color: C.muted, upper: true, letterSpacing: 0.6,
    });
    y += 3;
    for (const svcId of rec.services) {
      const svcLabelKey = "ec.q3.opt." + svcId + ".title";
      const svcDescKey  = "ec.q3.opt." + svcId + ".desc";
      const label = t(svcLabelKey);
      const desc  = t(svcDescKey);
      const labelH = measureText(label, 11, CONTENT_W - 4);
      const descH  = desc && desc !== svcDescKey
        ? measureText(desc, 9, CONTENT_W - 4) + 1
        : 0;
      ensureSpace(labelH + descH + 6);
      drawRect(MARGIN.left, CONTENT_W, labelH + descH + 6, { fill: C.surfaceTint, r: 3 });
      const startY = y;
      drawText(label, { size: 11, color: C.ink, x: MARGIN.left + 6, maxWidth: CONTENT_W - 12 });
      if (desc && desc !== svcDescKey) {
        drawText(desc, { size: 9, color: C.muted, x: MARGIN.left + 6, maxWidth: CONTENT_W - 12 });
      }
      y = startY + labelH + descH + 7;
    }
    y += 2;
  }

  // ─────────────────────────────────────────────────────────────────
  // SECTION: SETUP URL — big navy box with the personal /setup link
  // ─────────────────────────────────────────────────────────────────
  ensureSpace(30);
  const refToken = (typeof window.ecGenProposalRef === "function") ? window.ecGenProposalRef() : "EL-0000";
  const setupUrl = "altery.com/setup/" + refToken.toLowerCase().replace(/-/g, "");
  drawText(t("ec.pdf.nextSteps.continueLabel") || "CONTINUE YOUR SETUP", {
    size: 9, color: C.muted, upper: true, letterSpacing: 0.6,
  });
  y += 3;
  drawRect(MARGIN.left, CONTENT_W, 18, { fill: C.navy, r: 4 });
  pdf.setFontSize(14); setColor(C.white);
  pdf.text(setupUrl, MARGIN.left + 8, y + 11);
  y += 22;

  // ─────────────────────────────────────────────────────────────────
  // SECTION: VALIDITY + FOOTER
  // ─────────────────────────────────────────────────────────────────
  ensureSpace(20);
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  drawText(t("ec.pdf.validity", { date: validUntil }) || `This proposal is valid for 30 days from issue (through ${validUntil}). Rates and conditions confirmed at activation.`, {
    size: 8, color: C.muted, lineHeight: 1.45,
  });
  y += 6;

  // Footer band — Altery legal line at the very bottom of the LAST page
  const totalPages = pdf.internal.getNumberOfPages();
  pdf.setPage(totalPages);
  setFill(C.surfaceTint);
  pdf.rect(0, PAGE_H - 18, PAGE_W, 18, "F");
  setColor(C.ink);
  pdf.setFontSize(9);
  pdf.text("Altery", MARGIN.left, PAGE_H - 11);
  pdf.setFontSize(8); setColor(C.muted);
  pdf.text(t("ec.pdf.footer.entities") || "Altery Ltd (UK · FCA-licensed EMI) · Altery EU (CY · Central Bank of Cyprus EMI) · Altery MENA (DIFC · DFSA)",
    MARGIN.left, PAGE_H - 6, { maxWidth: CONTENT_W });

  // ─────────────────────────────────────────────────────────────────
  // PAGE NUMBERS — stamp "n / N" centered above the footer band
  // ─────────────────────────────────────────────────────────────────
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8); setColor(C.muted);
    pdf.text(`${p} / ${totalPages}`, PAGE_W / 2, PAGE_H - 20, { align: "center" });
  }
}

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
function ecAddInvisibleTextLayer(pdf, target, sliceTopPx, sliceBottomPx, pxPerMm, canvasScale) {
  const targetRect = target.getBoundingClientRect();
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
      const pageRelTopMm = (lineTopCanvasPx - sliceTopPx) / pxPerMm;
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
async function ecSendAnalysisEmail({ rec, email, t }) {
  await ecWaitForPdfLibs();

  const langCode = (window.__I18N && typeof window.__I18N.getLang === "function")
    ? window.__I18N.getLang() : "en";

  const planSlug = (rec.plan?.id || "plan").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `Altery-eligibility-${planSlug}-${stamp}.pdf`;

  // ── Build the PDF natively via jsPDF ──────────────────────────────
  // The previous html2canvas pipeline produced a bitmap PDF with no
  // selectable text (the invisible-text overlay hack worked for Latin
  // only — Cyrillic / CJK characters silently dropped because jsPDF's
  // default Helvetica has no glyphs there). Now we draw the proposal
  // natively, embedding the Inter variable TTF for full Unicode
  // coverage. Every character is real PDF text — fully selectable,
  // searchable, copy-able, accessible to screen readers.
  const jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

  // Load + register Inter (~860 KB TTF) so jsPDF can embed it.
  try {
    const interB64 = await ecLoadInterFont();
    pdf.addFileToVFS("Inter.ttf", interB64);
    pdf.addFont("Inter.ttf", "Inter", "normal");
  } catch (e) {
    console.warn("[ecSendAnalysisEmail] Inter font load failed, falling back to Helvetica (no Cyrillic):", e);
  }

  ecBuildNativePdf(pdf, rec, t);

  const blob = pdf.output("blob");
  const totalPages = pdf.internal.getNumberOfPages();
  console.info("[ecSendAnalysisEmail] PDF blob:", blob.size, "bytes, pages:", totalPages);

  const pdfBase64 = await ecBlobToBase64(blob);

  // ── Email body fields the server template needs ──────────────────
  const planName = t(rec.plan.nameKey);
  const entityName = t(rec.entity.nameKey);
  const personaIndustries = ["saas", "apps", "games", "edtech", "affiliate", "creator", "crypto"];
  const personaLine = rec.ind && personaIndustries.includes(rec.ind.value)
    ? t("ec.r.persona." + rec.ind.value + ".line")
    : "";
  const sessionToken = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)).toLowerCase();
  const sessionLink = "https://altery.com/setup/" + sessionToken;

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
}

Object.assign(window, {
  ecLoadStripe, ecWaitForPdfLibs,
  ecLoadInterFont, ecBuildNativePdf, ecSendAnalysisEmail,
});
