// Vercel serverless function: sends the analysis PDF to the user's
// email via Brevo. The client (EcHandoffModal) generates the PDF
// locally via html2pdf and POSTs the bytes here as base64.
//
// Why Brevo: chosen as the post-Vercel-migration provider (founder
// preference, 2026-05-20). Brevo's transactional API supports
// attachments and gives 300 emails/day on the free tier — sufficient
// for the eligibility checker's drip rate. All provider-specific
// shape lives in lib/email.js so this file stays focused on payload
// validation + HTML composition.
//
// Setup required before this works in production:
//   1. Sign up at brevo.com, generate an API key (SMTP & API → API Keys)
//   2. In Vercel: Project Settings → Environment Variables → add
//      BREVO_API_KEY (and redeploy)
//   3. Verify the sending domain in Brevo (Senders & IP → Domains →
//      Add → set up SPF/DKIM on send.altery.com). Without verification
//      Brevo only delivers to the account-owner address.
//   4. Set FROM_EMAIL to "Altery <hello@send.altery.com>" or similar.

import { sendEmail } from "../lib/email.js";
import { rateLimitAll, clientIp, send429 } from "../lib/rate-limit.js";
import { checkAntiSpam, sendAntiSpamReject } from "../lib/anti-spam.js";
import { escapeHtml, safeSessionLink, isAllowedBookingURL, sanitizeEmailStrings, safeSubject } from "../lib/send-analysis-validators.js";

// Abuse limits — the endpoint is unauthenticated, so we cap input size
// and validate format. A determined attacker can still send spam through
// us; production should add rate limiting (Upstash / Vercel KV).
const MAX_PDF_BYTES = 2_500_000;      // 2.5 MB — generous for our PDFs
const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// HTML escaping, the session/booking URL allow-lists, and the email-string
// sanitizer live in lib/send-analysis-validators.js (imported above so they
// can be unit-tested independently — see test/sendAnalysisValidators.test.mjs).

// Build a short, inbox-friendly email body. The PDF carries the full
// detail; this is the wrapper that greets the user before they click
// the attachment. Inline styles only (every email client renders inline
// CSS reliably; <style> blocks get stripped in Gmail, Outlook, etc.).
//
// Visual structure mirrors the on-screen checker's result-page hero:
// persona eyebrow → entity-and-plan title with light-blue accents →
// muted lead → beige entity pill with success dot → CTA. Recipients
// who saw the result page should feel they're reading the same artifact.
function buildEmailHTML({ planName, entityName, sessionLink, personaLine, logoURL, bookingURL, strings, langCode, forwardedBy }) {
  // Light palette — used as the inline-style base. Every email client
  // can render inline styles, so this is the lowest-common-denominator
  // appearance. Dark-mode clients (Apple Mail, Outlook iOS/Android,
  // Outlook.com auto-dark) override these via the <style> block below.
  const C = {
    primary:      "#002780",
    headerBg:     "#000537",  // Midnight navy — always navy in both themes
    primaryLight: "#B3D1FF",
    ink:          "#14171F",
    inkSoft:      "#4B5063",
    muted:        "#6B6F7B",
    border:       "#E5E7EE",
    surface:      "#F8F7F4",
    beige:        "#F0EBE3",
    beigeBorder:  "#E5E0D5",
    success:      "#18A058",
    white:        "#FFFFFF",
  };
  // Dark-mode equivalents — applied via .t-* class overrides inside
  // @media (prefers-color-scheme: dark) and [data-ogsc] / [data-ogsb]
  // selectors. Primary text in dark mode uses the on-screen accent
  // (light blue) so the entity / plan name reads on a dark card.
  const D = {
    surface:      "#0E0F14",
    card:         "#1A1B22",
    ink:          "#E8E9ED",
    inkSoft:      "#B0B3BD",
    muted:        "#8A8E99",
    border:       "#2D2F38",
    primary:      "#B3D1FF",
    beige:        "#2C2620",
    beigeBorder:  "#3D3530",
  };
  // System font stack — Inter is the brand face on-screen, but @font-face
  // doesn't apply in most email clients. The fallback chain lands on a
  // platform-native sans-serif everywhere (system-ui macOS/iOS/modern,
  // Segoe UI on Windows, Roboto on Android, Helvetica Neue on macOS).
  const FF = "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
  const lang = (langCode || "en").slice(0, 5);
  const s = strings || {};

  // Wordmark PNG (rendered from the same SVG used in the on-screen
  // checker header). We use a PNG via URL rather than inline SVG
  // because Outlook desktop doesn't render inline SVG reliably — PNG
  // ships across every major email client. The wordmark is white on
  // transparent and always sits on the navy header pill, so the same
  // image works in light and dark mode without swapping.
  const logoImg = logoURL ? `<img src="${logoURL}" alt="Altery" width="71" height="24" style="display:block;border:0;" />` : `<div style="font-size:22px;font-weight:700;color:${C.white};letter-spacing:-0.01em;line-height:1;">altery</div>`;

  // Booking secondary CTA — only rendered when a URL was provided
  // (it's optional). Slim underlined link beneath the primary setup
  // button to give the "I'd rather talk to a human" cohort an easy
  // path without competing with the self-serve CTA visually.
  const bookingBlock = bookingURL ? `
        <tr><td style="padding:14px 36px 0;">
          <a href="${bookingURL}" class="t-primary-text t-primary-border" style="display:inline-block;font-size:13px;color:${C.primary};text-decoration:none;font-weight:500;border-bottom:1px solid ${C.primary};line-height:18px;">${s.bookingCta || "Schedule a 15-min intro call"} →</a>
        </td></tr>` : "";

  // Forwarder banner — rendered only when this email is a forwarded copy
  // (i.e. the original recipient shared with a colleague). Sits in the
  // first body row above the hero to give the new reader immediate context
  // about who shared the analysis and why. Uses the soft beige surface so
  // it reads as a system note, not promotional copy.
  //
  // SECURITY: `forwardedBy` is user-controlled (the original recipient
  // types it in EcHandoffModal's send-copy form). It MUST be HTML-
  // escaped before splicing into the template even though we also
  // validate it against EMAIL_RE upstream — defence in depth, and the
  // regex is permissive enough that some HTML chars survive (e.g. a
  // local-part like `user+"><img>`).
  const forwardedBySafe = forwardedBy ? escapeHtml(forwardedBy) : "";

  // Footer support line. The localized copy (s.tail2) is HTML-escaped by
  // sanitizeEmailStrings, so it carries a {email} placeholder instead of raw
  // markup (otherwise the <a> tag would render as literal text in the inbox).
  // We splice in our own constant mailto link here: it is server-built, so
  // it's safe to emit unescaped, while the surrounding localized text stays
  // escaped.
  const salesLink = `<a href="mailto:sales@altery.com" class="t-primary-text" style="color:${C.primary};text-decoration:underline;">sales@altery.com</a>`;
  const tail2Html = (s.tail2 || "Questions? You'll always reach a real person, never a bot. Just reply to this email or write to {email}, and our team is happy to help.").replace("{email}", salesLink);
  const forwarderBlock = forwardedBy ? `
        <tr><td style="padding:24px 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="t-beige" style="background:${C.beige};border:1px solid ${C.beigeBorder};border-radius:12px;">
            <tr><td style="padding:14px 18px;">
              <div class="t-muted" style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px;">
                ${s.forwardedByLabel || "Shared with you"}
              </div>
              <div class="t-ink" style="font-size:13px;line-height:19px;color:${C.ink};">
                ${s.forwardedByBanner || `<strong>${forwardedBySafe}</strong> shared this Altery Business banking analysis with you — they're exploring an account and thought you should see it too.`}
              </div>
            </td></tr>
          </table>
        </td></tr>` : "";

  // Cross-client, dark-mode-aware <style> block. Loaded by every modern
  // client (Apple Mail, Gmail web & mobile apps, Outlook 2019+, Outlook
  // .com, Yahoo). Older Outlook desktop (2007-2016) strips it but those
  // versions don't have auto-dark either, so the inline-style light
  // base ships unchanged. Two override layers:
  //   1. @media (prefers-color-scheme: dark) — Apple Mail, Outlook iOS/
  //      Android, modern Gmail mobile, Yahoo iOS.
  //   2. [data-ogsc] / [data-ogsb] — Outlook.com auto-dark hooks.
  // The header navy pill stays navy in both themes (brand-fixed) — the
  // white wordmark always sits on dark navy regardless of card mode.
  const headStyle = `
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    a { color: ${C.primary}; }
    @media (prefers-color-scheme: dark) {
      .t-surface { background-color: ${D.surface} !important; }
      .t-card { background-color: ${D.card} !important; box-shadow: 0 8px 28px rgba(0,0,0,0.45) !important; }
      .t-ink { color: ${D.ink} !important; }
      .t-ink-soft { color: ${D.inkSoft} !important; }
      .t-muted { color: ${D.muted} !important; }
      .t-primary-text { color: ${D.primary} !important; }
      .t-primary-border { border-bottom-color: ${D.primary} !important; }
      .t-border { border-color: ${D.border} !important; }
      .t-beige { background-color: ${D.beige} !important; border-color: ${D.beigeBorder} !important; }
      .t-footer-bg { background-color: ${D.surface} !important; }
      a { color: ${D.primary} !important; }
    }
    [data-ogsc] .t-surface,
    [data-ogsb] .t-surface { background-color: ${D.surface} !important; }
    [data-ogsc] .t-card,
    [data-ogsb] .t-card { background-color: ${D.card} !important; }
    [data-ogsc] .t-ink { color: ${D.ink} !important; }
    [data-ogsc] .t-ink-soft { color: ${D.inkSoft} !important; }
    [data-ogsc] .t-muted { color: ${D.muted} !important; }
    [data-ogsc] .t-primary-text { color: ${D.primary} !important; }
    [data-ogsc] .t-primary-border { border-bottom-color: ${D.primary} !important; }
    [data-ogsc] .t-border { border-color: ${D.border} !important; }
    [data-ogsc] .t-beige { background-color: ${D.beige} !important; border-color: ${D.beigeBorder} !important; }
    [data-ogsc] .t-footer-bg,
    [data-ogsb] .t-footer-bg { background-color: ${D.surface} !important; }
  `;

  return `<!doctype html>
<html lang="${lang}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<title>Altery</title>
<style>${headStyle}</style>
</head>
<body class="t-surface" style="margin:0;padding:0;background:${C.surface};font-family:${FF};-webkit-font-smoothing:antialiased;">
  <!-- Hidden preheader: shows next to subject in inbox lists -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${C.surface};">
    ${s.preheader || `Your ${planName} plan recommendation on ${entityName} — full PDF attached.`}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="t-surface" style="background:${C.surface};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="t-card" style="max-width:600px;background:${C.white};border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(0,6,57,0.08);">

        <!-- Header pill — midnight navy, rounded. Brand-fixed in both
             themes; the white wordmark always lands on dark navy. -->
        <tr><td style="padding:24px 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.headerBg};border-radius:16px;">
            <tr>
              <td style="padding:20px 28px;">
                ${logoImg}
              </td>
            </tr>
          </table>
        </td></tr>

        ${forwarderBlock}

        <!-- Hero — eyebrow + persona + title-with-accents + lead.
             Status pill and capability matrix removed; the PDF carries
             those, and the email reads as a clean wrapper. -->
        <tr><td style="padding:32px 36px 24px;">

          ${personaLine ? `<div class="t-primary-text" style="font-size:13px;font-weight:500;line-height:19px;color:${C.primary};margin:0 0 10px;letter-spacing:-0.005em;">${personaLine}</div>` : ""}

          <div class="t-muted" style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">
            ${s.eyebrow || "Recommended for your business"}
          </div>

          <h1 class="t-ink" style="font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:30px;color:${C.ink};margin:0 0 14px;">
            <span class="t-primary-text" style="color:${C.primary};">${entityName}</span> ${s.titleMid || "is built for your"} <span class="t-primary-text" style="color:${C.primary};">${planName}</span>${s.titleEnd || " account."}
          </h1>

          <p class="t-ink-soft" style="font-size:14px;line-height:21px;color:${C.inkSoft};margin:0;">
            ${s.lead || "We've put together a full eligibility analysis covering our reasoning, your selected services, fees, and your personal setup link. It's attached as a PDF, so open it whenever you're ready."}
          </p>

        </td></tr>

        <!-- CTA block — pill button with arrow, matches checker primary
             CTA. Brand color stays navy + white in both themes — the
             button is the most theme-stable element of the email. -->
        <tr><td style="padding:0 36px 0;">
          <a href="${sessionLink}" style="display:inline-block;background:${C.primary};color:${C.white};text-decoration:none;padding:15px 28px;border-radius:12px;font-size:15px;font-weight:500;letter-spacing:0.005em;line-height:1;">
            ${s.cta || "Continue to setup"} &nbsp;→
          </a>
        </td></tr>

        ${bookingBlock}

        <!-- Tail copy -->
        <tr><td style="padding:24px 36px 32px;">
          <p class="t-ink-soft" style="font-size:13px;line-height:20px;color:${C.inkSoft};margin:0 0 12px;">
            ${s.tail1 || "Setup takes about 10 minutes and saves as you go. Your answers from the eligibility check are pre-filled, so onboarding picks up where this analysis left off."}
          </p>
          <p class="t-muted" style="font-size:13px;line-height:20px;color:${C.muted};margin:0;">
            ${tail2Html}
          </p>
        </td></tr>

        <!-- Footer — rounded pill floating inside the card with the
             same 24px padding ring as the header so the email reads
             symmetrically (rounded pill top, rounded pill bottom). -->
        <tr><td style="padding:0 24px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="t-footer-bg" style="background:${C.surface};border-radius:16px;">
            <tr><td style="padding:20px 28px;font-size:11px;line-height:16px;color:${C.muted};">
              <div class="t-ink" style="color:${C.ink};font-weight:600;margin-bottom:4px;">Altery</div>
              <div class="t-muted" style="color:${C.muted};">${s.footerTagline || "Business finance for digital companies banks struggle to understand."}</div>
              <div class="t-muted" style="margin-top:8px;color:${C.muted};">${s.footerEntities || "Altery Ltd (UK · FCA-licensed EMI) · Altery EU (CY · Central Bank of Cyprus EMI) · Altery MENA (DIFC · DFSA)"}</div>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default async function handler(req, res) {
  // CORS — Vercel serves frontend + API on the same origin so this is
  // mostly belt-and-braces, but keeping it explicit prevents surprises
  // during local development with `vercel dev`.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  // BREVO_API_KEY presence is checked inside sendEmail(); we let the
  // helper surface the no_api_key code rather than duplicating the
  // check here. Lets us swap providers without touching this file.

  // Anti-spam first — honeypot field + Origin header + form-age gate.
  // Cheap checks, catch most automated submissions before they spend
  // any rate-limit budget. See lib/anti-spam.js.
  const spamCheck = checkAntiSpam(req);
  if (!spamCheck.ok) return sendAntiSpamReject(res, spamCheck);

  // Rate-limit BEFORE parsing the body — cheaper to reject early.
  // Per-IP caps catch scripted spammers; per-email-recipient caps
  // prevent flooding any single mailbox via our verified domain.
  const ip = clientIp(req);
  const recipient = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const rl = await rateLimitAll([
    { key: `send-analysis:ip:${ip}`,      limit: 10, windowMs: 60_000      }, // 10/min per IP
    { key: `send-analysis:ip:${ip}:h`,    limit: 50, windowMs: 3600_000    }, // 50/hour per IP
    ...(recipient ? [
      { key: `send-analysis:to:${recipient}`, limit: 5, windowMs: 3600_000 }, // 5/hour to any recipient
    ] : []),
  ]);
  if (!rl.allowed) return send429(res, rl.retryAfter);

  try {
    const body = req.body || {};
    const {
      email, pdfBase64, filename,
      planName, entityName, sessionLink, personaLine,
      langCode, bookingURL, emailStrings,
      forwardedBy,
    } = body;

    // Input validation — server-side, never trust the client.
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email address", code: "bad_email" });
    }
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return res.status(400).json({ error: "Missing PDF payload", code: "no_pdf" });
    }
    const approxBytes = Math.floor(pdfBase64.length * 0.75);
    if (approxBytes > MAX_PDF_BYTES) {
      return res.status(413).json({ error: "PDF too large", code: "pdf_too_large" });
    }
    if (!planName || !entityName) {
      return res.status(400).json({ error: "Missing recommendation context", code: "bad_context" });
    }

    const cleanEmail = email.trim();
    // SECURITY: planName / entityName / personaLine flow into the HTML
    // body of the outbound email at multiple splice points. Length-cap
    // first (prevent overly large payloads), then HTML-escape so a
    // malicious client cannot inject markup into the email recipient's
    // inbox. Same logic for forwardedBy below.
    const safePlan    = escapeHtml(String(planName).slice(0, 40));
    const safeEntity  = escapeHtml(String(entityName).slice(0, 60));
    // SECURITY: previously this was a `startsWith("https://")` check
    // which is open to phishing — any https URL would pass. Tightened
    // to allow-list our deployment host so the email-CTA "Continue to
    // setup" cannot be repurposed to point at attacker domains.
    const safeLink   = safeSessionLink(sessionLink);
    const safePersona = typeof personaLine === "string" ? escapeHtml(String(personaLine).slice(0, 120)) : "";

    // Only accept booking URLs from trusted scheduling hosts. Defensive —
    // anyone with access to the client could POST a different URL claiming
    // to be a booking page, but the allow-list keeps user-clickable links
    // pointing at trusted destinations. Trimmed to the Google Calendar
    // hosts we actually use; add more if/when the provider changes.
    const safeBooking = isAllowedBookingURL(bookingURL);

    const safeLang = (typeof langCode === "string" && /^[a-z]{2,5}$/i.test(langCode))
      ? langCode.toLowerCase()
      : "en";

    // emailStrings is the localized copy bundle built client-side. SECURITY:
    // every value is HTML-escaped + length-capped (sanitizeEmailStrings)
    // before it slot-fills the template, so a malicious client cannot inject
    // markup into the recipient's inbox. Missing keys fall through to English
    // defaults inside buildEmailHTML. `subject` is handled separately below
    // (it's an email header, not HTML).
    const safeStrings = sanitizeEmailStrings(emailStrings);

    // forwardedBy — the original recipient's email when this send is a
    // colleague forward. Validated as an email (same regex as recipient)
    // and capped at 80 chars so an attacker can't inject markup or a
    // payload disguised as the sender label. Empty string ⇒ no banner.
    const safeForwardedBy = (typeof forwardedBy === "string"
      && EMAIL_RE.test(forwardedBy.trim())
      && forwardedBy.trim().length <= 80)
      ? forwardedBy.trim()
      : "";

    // Subject — localized client-side (already plan-interpolated).
    // Fall back to a constructed English subject if the client didn't
    // send one (older client cached in browser).
    const subject = safeSubject(
      emailStrings && emailStrings.subject,
      `Your ${safePlan} account on Altery, analysis attached`
    );

    // Absolute URL to the brand wordmark PNG. Adapts automatically when
    // the user points a custom domain at this Vercel deployment.
    const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
    const host  = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    const logoURL = host ? `${proto}://${host}/images/altery-logo.png` : "";

    const html = buildEmailHTML({
      planName:    safePlan,
      entityName:  safeEntity,
      sessionLink: safeLink,
      personaLine: safePersona,
      logoURL,
      bookingURL: safeBooking,
      strings:     safeStrings,
      langCode:    safeLang,
      forwardedBy: safeForwardedBy,
    });

    const safeFilename = (typeof filename === "string" && /^[A-Za-z0-9_\-.]+\.pdf$/.test(filename))
      ? filename
      : "altery-analysis.pdf";

    // Reply-To routes user replies to the sales inbox instead of the
    // sender address (which lives on send.altery.com or similar
    // sub-domain). Especially useful when sending from a sandbox.
    const replyTo = process.env.REPLY_TO || "sales@altery.com";

    const sendResult = await sendEmail({
      to:          cleanEmail,
      subject,
      html,
      attachments: [{ filename: safeFilename, content: pdfBase64 }],
      replyTo,
      tags:        ["eligibility-checker", `plan:${safePlan.toLowerCase()}`],
    });

    if (!sendResult.ok) {
      // Surface upstream details (status, body excerpt, sender used) so
      // the client can show actionable errors. sender_used in particular
      // is the most common diagnosis — wrong FROM_EMAIL, unverified
      // domain, etc.
      return res.status(sendResult.status || 502).json({
        error: sendResult.error || "Email service rejected the send",
        code:  sendResult.code  || "brevo_error",
        upstream_status: sendResult.upstream_status,
        upstream_body:   sendResult.upstream_body,
        sender_used:     sendResult.sender_used,
      });
    }
    return res.status(200).json({ ok: true, id: sendResult.messageId || null });

  } catch (err) {
    console.error("[send-analysis] unexpected error:", err);
    return res.status(500).json({
      error: err.message || "Internal server error",
      code:  "internal",
    });
  }
}
