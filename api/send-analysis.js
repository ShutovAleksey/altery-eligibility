// Vercel serverless function: sends the analysis PDF to the user's
// email via Resend. The client (EcHandoffModal) generates the PDF
// locally via html2pdf and POSTs the bytes here as base64.
//
// Why Resend: cleanest DX, native attachment support, free tier of
// 3,000 emails/month is plenty for an eligibility checker. Mailgun /
// SendGrid would work too — only the fetch URL + auth header would
// change. The API contract used here (from, to, subject, html,
// attachments[{filename, content}]) is portable.
//
// Setup required before this works in production:
//   1. Sign up at resend.com, create an API key
//   2. In Vercel: Project Settings → Environment Variables → add
//      RESEND_API_KEY (and redeploy)
//   3. For the `from` address: either use the sandbox
//      "onboarding@resend.dev" (anyone receives, but Reply-To looks
//      odd) OR verify altery.com at resend.com/domains and use
//      "Altery <hello@altery.com>" — strongly preferred for deliverability
//
// The function uses raw fetch rather than the `resend` npm package
// to avoid adding a dependency for a single HTTP call.

const RESEND_API = "https://api.resend.com/emails";

// Sender. In production, set FROM_EMAIL in env to your verified domain
// address (e.g. "Altery <hello@altery.com>"). The sandbox default works
// without domain verification but ships from a generic resend.dev address.
const FROM_DEFAULT = "Altery <onboarding@resend.dev>";

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
function buildEmailHTML({ planName, entityName, sessionLink, personaLine, logoURL }) {
  const C = {
    primary:      "#002780",
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

  // Header logo block. URL-fetched (recipient's email client loads it
  // on display). Some clients block remote images by default — that's
  // acceptable because the "altery" wordmark next to it still identifies
  // the sender.
  const logoCell = logoURL ? `
    <td style="vertical-align:middle;padding-right:12px;width:34px;">
      <img src="${logoURL}" alt="" width="34" height="34" style="display:block;border-radius:7px;border:0;" />
    </td>` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Altery eligibility analysis</title>
</head>
<body style="margin:0;padding:0;background:${C.surface};font-family:${FF};-webkit-font-smoothing:antialiased;">
  <!-- Hidden preheader: shows next to subject in inbox lists -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${C.surface};">
    Your ${planName} plan recommendation on ${entityName} — full PDF attached.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.surface};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:${C.white};border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(0,6,57,0.08);">

        <!-- Header band — solid navy, mirrors the result-page hero bg -->
        <tr><td style="background:${C.primary};color:${C.white};padding:32px 36px 30px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              ${logoCell}
              <td style="vertical-align:middle;">
                <div style="font-size:22px;font-weight:700;letter-spacing:-0.01em;line-height:1;color:${C.white};">altery</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Hero — eyebrow + persona + title-with-accents + lead + pill -->
        <tr><td style="padding:32px 36px 4px;">

          ${personaLine ? `<div style="font-size:13px;font-weight:500;line-height:19px;color:${C.primary};margin:0 0 10px;letter-spacing:-0.005em;">${personaLine}</div>` : ""}

          <div style="font-size:11px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">
            Recommended for your business
          </div>

          <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:30px;color:${C.ink};margin:0 0 14px;">
            <span style="color:${C.primary};">${entityName}</span> is built for your <span style="color:${C.primary};">${planName}</span> account.
          </h1>

          <p style="font-size:14px;line-height:21px;color:${C.inkSoft};margin:0 0 18px;">
            We've put together a full eligibility analysis covering our reasoning, your selected services, fees, and your personal setup link. It's attached as a PDF — open it whenever you're ready.
          </p>

          <!-- Entity status pill — beige bg, success dot, matches result page -->
          <div style="margin:0 0 26px;">
            <span style="display:inline-block;padding:7px 14px 7px 10px;background:${C.beige};border:1px solid ${C.beigeBorder};border-radius:999px;font-size:12px;color:${C.ink};line-height:1;">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${C.success};margin-right:8px;vertical-align:middle;"></span>
              ${entityName} · Active
            </span>
          </div>

        </td></tr>

        <!-- CTA block — pill button with arrow, matches checker primary CTA -->
        <tr><td style="padding:0 36px 8px;">
          <a href="${sessionLink}" style="display:inline-block;background:${C.primary};color:${C.white};text-decoration:none;padding:15px 28px;border-radius:12px;font-size:15px;font-weight:500;letter-spacing:0.005em;line-height:1;">
            Continue to setup &nbsp;→
          </a>
        </td></tr>

        <!-- Tail copy -->
        <tr><td style="padding:24px 36px 32px;">
          <p style="font-size:13px;line-height:20px;color:${C.inkSoft};margin:0 0 12px;">
            Setup takes about 10 minutes and saves as you go. Your answers from the eligibility check are pre-filled, so onboarding picks up where this analysis left off.
          </p>
          <p style="font-size:13px;line-height:20px;color:${C.muted};margin:0;">
            Questions? Just reply to this email or write to <a href="mailto:hello@altery.com" style="color:${C.primary};text-decoration:underline;">hello@altery.com</a> — we're here to help.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:${C.surface};padding:22px 36px;border-top:1px solid ${C.border};font-size:11px;line-height:16px;color:${C.muted};">
          <div style="color:${C.ink};font-weight:600;margin-bottom:4px;">Altery</div>
          <div>Business finance for digital companies banks struggle to understand.</div>
          <div style="margin-top:8px;">Altery Ltd (UK · FCA-licensed EMI) · Altery EU (CY · Central Bank of Cyprus EMI) · Altery MENA (DIFC · DFSA)</div>
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

  // Hard requirement — refuse to attempt the send without the key,
  // and explain how to set it. A 500 with a clear message is more
  // useful than a silent failure during deploy.
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      error: "RESEND_API_KEY environment variable not set. Sign up at " +
             "resend.com, generate a key, add it in Vercel Dashboard → " +
             "Project Settings → Environment Variables, then redeploy.",
      code:  "no_api_key",
    });
  }

  try {
    const body = req.body || {};
    const { email, pdfBase64, filename, planName, entityName, sessionLink, personaLine } = body;

    // Input validation — server-side, never trust the client.
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email address", code: "bad_email" });
    }
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return res.status(400).json({ error: "Missing PDF payload", code: "no_pdf" });
    }
    // Base64 expands ~33% over binary, so check decoded size.
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

    // Build email body. Subject is concise + persona-aware where
    // possible; mailbox previews tend to truncate at ~40 chars.
    const subject = `Your ${safePlan} account on Altery — analysis attached`;

    // Absolute URL to the brand mark, computed from the inbound request
    // so it adapts automatically when the user points a custom domain
    // (altery.com etc.) at this Vercel deployment. We fall back to a
    // bare host header if x-forwarded-proto isn't present (local dev).
    const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
    const host  = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    const logoURL = host ? `${proto}://${host}/favicon.ico` : "";

    const html = buildEmailHTML({
      planName:    safePlan,
      entityName:  safeEntity,
      sessionLink: safeLink,
      personaLine: safePersona,
      logoURL,
    });

    const safeFilename = (typeof filename === "string" && /^[A-Za-z0-9_\-.]+\.pdf$/.test(filename))
      ? filename
      : "altery-analysis.pdf";

    // Resend API call. The `attachments` array takes either a `path`
    // (URL or local file) or `content` (base64 string). We send the
    // base64 we received from the client directly.
    const resendRes = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    process.env.FROM_EMAIL || FROM_DEFAULT,
        to:      [cleanEmail],
        subject,
        html,
        // Reply-To routes user replies to the sales inbox instead of
        // the (potentially generic) sender address. Especially useful
        // when sending from `onboarding@resend.dev` sandbox.
        reply_to: process.env.REPLY_TO || "hello@altery.com",
        attachments: [{ filename: safeFilename, content: pdfBase64 }],
        tags: [
          { name: "source", value: "eligibility-checker" },
          { name: "plan",   value: safePlan.toLowerCase() },
        ],
      }),
    });

    // Resend returns 200 with { id } on success; non-2xx with { message }
    // on error (invalid API key, sender domain unverified, malformed
    // recipient, etc.). Bubble the message up to the client for visibility.
    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("[send-analysis] Resend error:", resendRes.status, errBody);
      return res.status(502).json({
        error: "Email service rejected the send",
        code:  "resend_error",
        upstream_status: resendRes.status,
        upstream_body:   errBody.slice(0, 500),
      });
    }

    const data = await resendRes.json();
    return res.status(200).json({ ok: true, id: data?.id || null });

  } catch (err) {
    console.error("[send-analysis] unexpected error:", err);
    return res.status(500).json({
      error: err.message || "Internal server error",
      code:  "internal",
    });
  }
}
