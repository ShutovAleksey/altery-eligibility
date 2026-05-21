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

// Abuse limits — the endpoint is unauthenticated, so we cap input size
// and validate format. A determined attacker can still send spam through
// us; production should add rate limiting (Upstash / Vercel KV).
const MAX_PDF_BYTES = 2_500_000;      // 2.5 MB — generous for our PDFs
const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Build a short, inbox-friendly email body. The PDF carries the full
// detail; this is the wrapper that greets the user before they click
// the attachment. Inline styles only (every email client renders inline
// CSS reliably; <style> blocks get stripped in Gmail, Outlook, etc.).
//
// Visual structure mirrors the on-screen checker's result-page hero:
// persona eyebrow → entity-and-plan title with light-blue accents →
// muted lead → beige entity pill with success dot → CTA. Recipients
// who saw the result page should feel they're reading the same artifact.
function buildEmailHTML({ planName, entityName, sessionLink, personaLine, logoURL, calendlyURL, strings, langCode, forwardedBy }) {
  const C = {
    primary:      "#002780",
    headerBg:     "#000537",  // Midnight navy — same as on-screen .ec-header
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
  const FF = "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
  const lang = (langCode || "en").slice(0, 5);
  const s = strings || {};

  // Wordmark PNG (rendered from the same SVG used in the on-screen
  // checker header). We use a PNG via URL rather than inline SVG
  // because Outlook desktop doesn't render inline SVG reliably — PNG
  // ships across every major email client.
  const logoImg = logoURL ? `<img src="${logoURL}" alt="Altery" width="71" height="24" style="display:block;border:0;" />` : `<div style="font-size:22px;font-weight:700;color:${C.white};letter-spacing:-0.01em;line-height:1;">altery</div>`;

  // Calendly secondary CTA — only rendered when a URL was provided
  // (it's optional). Slim underlined link beneath the primary setup
  // button to give the "I'd rather talk to a human" cohort an easy
  // path without competing with the self-serve CTA visually.
  const calendlyBlock = calendlyURL ? `
        <tr><td style="padding:14px 36px 0;">
          <a href="${calendlyURL}" style="display:inline-block;font-size:13px;color:${C.primary};text-decoration:none;font-weight:500;border-bottom:1px solid ${C.primary};line-height:18px;">${s.calendlyCta || "Schedule a 15-min intro call"} →</a>
        </td></tr>` : "";

  // Forwarder banner — rendered only when this email is a forwarded copy
  // (i.e. the original recipient shared with a colleague). Sits in the
  // first body row above the hero to give the new reader immediate context
  // about who shared the analysis and why. Uses the soft beige surface so
  // it reads as a system note, not promotional copy.
  const forwarderBlock = forwardedBy ? `
        <tr><td style="padding:24px 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.beige};border:1px solid ${C.beigeBorder};border-radius:12px;">
            <tr><td style="padding:14px 18px;">
              <div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px;">
                ${s.forwardedByLabel || "Shared with you"}
              </div>
              <div style="font-size:13px;line-height:19px;color:${C.ink};">
                ${s.forwardedByBanner || `<strong>${forwardedBy}</strong> shared this Altery Business banking analysis with you — they're exploring an account and thought you should see it too.`}
              </div>
            </td></tr>
          </table>
        </td></tr>` : "";

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Altery</title>
</head>
<body style="margin:0;padding:0;background:${C.surface};font-family:${FF};-webkit-font-smoothing:antialiased;">
  <!-- Hidden preheader: shows next to subject in inbox lists -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${C.surface};">
    ${s.preheader || `Your ${planName} plan recommendation on ${entityName} — full PDF attached.`}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.surface};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:${C.white};border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(0,6,57,0.08);">

        <!-- Header pill — midnight navy, rounded. Mirrors .ec-header
             from the on-screen checker. -->
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

        <!-- Hero — eyebrow + persona + title-with-accents + lead + pill -->
        <tr><td style="padding:32px 36px 4px;">

          ${personaLine ? `<div style="font-size:13px;font-weight:500;line-height:19px;color:${C.primary};margin:0 0 10px;letter-spacing:-0.005em;">${personaLine}</div>` : ""}

          <div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">
            ${s.eyebrow || "Recommended for your business"}
          </div>

          <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:30px;color:${C.ink};margin:0 0 14px;">
            <span style="color:${C.primary};">${entityName}</span> ${s.titleMid || "is built for your"} <span style="color:${C.primary};">${planName}</span>${s.titleEnd || " account."}
          </h1>

          <p style="font-size:14px;line-height:21px;color:${C.inkSoft};margin:0 0 18px;">
            ${s.lead || "We've put together a full eligibility analysis covering our reasoning, your selected services, fees, and your personal setup link. It's attached as a PDF — open it whenever you're ready."}
          </p>

          <!-- Entity status pill — beige bg, success dot, matches result page -->
          <div style="margin:0 0 26px;">
            <span style="display:inline-block;padding:7px 14px 7px 10px;background:${C.beige};border:1px solid ${C.beigeBorder};border-radius:999px;font-size:12px;color:${C.ink};line-height:1;">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${C.success};margin-right:8px;vertical-align:middle;"></span>
              ${entityName} · ${s.pillActive || "Active"}
            </span>
          </div>

        </td></tr>

        <!-- CTA block — pill button with arrow, matches checker primary CTA -->
        <tr><td style="padding:0 36px 0;">
          <a href="${sessionLink}" style="display:inline-block;background:${C.primary};color:${C.white};text-decoration:none;padding:15px 28px;border-radius:12px;font-size:15px;font-weight:500;letter-spacing:0.005em;line-height:1;">
            ${s.cta || "Continue to setup"} &nbsp;→
          </a>
        </td></tr>

        ${calendlyBlock}

        <!-- Tail copy -->
        <tr><td style="padding:24px 36px 32px;">
          <p style="font-size:13px;line-height:20px;color:${C.inkSoft};margin:0 0 12px;">
            ${s.tail1 || "Setup takes about 10 minutes and saves as you go. Your answers from the eligibility check are pre-filled, so onboarding picks up where this analysis left off."}
          </p>
          <p style="font-size:13px;line-height:20px;color:${C.muted};margin:0;">
            ${s.tail2 || `Questions? Just reply to this email or write to <a href="mailto:sales@altery.com" style="color:${C.primary};text-decoration:underline;">sales@altery.com</a> — we're here to help.`}
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:${C.surface};padding:22px 36px;border-top:1px solid ${C.border};font-size:11px;line-height:16px;color:${C.muted};">
          <div style="color:${C.ink};font-weight:600;margin-bottom:4px;">Altery</div>
          <div>${s.footerTagline || "Business finance for digital companies banks struggle to understand."}</div>
          <div style="margin-top:8px;">${s.footerEntities || "Altery Ltd (UK · FCA-licensed EMI) · Altery EU (CY · Central Bank of Cyprus EMI) · Altery MENA (DIFC · DFSA)"}</div>
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

  try {
    const body = req.body || {};
    const {
      email, pdfBase64, filename,
      planName, entityName, sessionLink, personaLine,
      langCode, calendlyURL, emailStrings,
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
    const safePlan   = String(planName).slice(0, 40);
    const safeEntity = String(entityName).slice(0, 60);
    const safeLink   = (typeof sessionLink === "string" && sessionLink.startsWith("https://"))
      ? sessionLink
      : "https://altery.com";
    const safePersona = typeof personaLine === "string" ? String(personaLine).slice(0, 120) : "";

    // Only accept booking URLs from trusted scheduling hosts. Defensive —
    // anyone with access to the client could POST a different URL claiming
    // to be a booking page, but the allow-list keeps user-clickable links
    // pointing at trusted destinations.
    const safeCalendly = (typeof calendlyURL === "string"
      && /^https:\/\/(calendly\.com|cal\.com|calendar\.app\.google|calendar\.google\.com)\//.test(calendlyURL))
      ? calendlyURL
      : "";

    const safeLang = (typeof langCode === "string" && /^[a-z]{2,5}$/i.test(langCode))
      ? langCode.toLowerCase()
      : "en";

    // emailStrings is the localized copy bundle built client-side. We
    // pass it through to buildEmailHTML which slot-fills the template;
    // missing keys fall through to English defaults inside the builder.
    const safeStrings = (emailStrings && typeof emailStrings === "object") ? emailStrings : {};

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
    const subject = (typeof safeStrings.subject === "string" && safeStrings.subject.length > 0)
      ? safeStrings.subject.slice(0, 120)
      : `Your ${safePlan} account on Altery — analysis attached`;

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
      calendlyURL: safeCalendly,
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
