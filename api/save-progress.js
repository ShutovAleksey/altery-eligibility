// Vercel serverless function: bundles the user's in-progress
// onboarding state into a stateless magic-link and emails it to them.
//
// "Save & continue later" lives entirely in the URL — the email contains
// a link of the shape /setup?resume=<base64url-payload>.<sig>. When the
// user opens the link from any device, the onboarding boots, the client
// posts the token to /api/load-progress, the server validates the HMAC
// + exp, and the decoded payload hydrates formState.
//
// Same VERIFY_SECRET as the verification-code endpoints. No DB.
//
// Why stateless: a stored state would mean either a database, KV store,
// or trust that the email link is the only way back. The HMAC approach
// is the simplest design that lets the user open the link on any
// device, never expires their data prematurely, and survives without
// any infrastructure beyond a serverless function.

// Drop the "node:" prefix — see send-verify-code.js for rationale.
import { createHmac } from "crypto";
import { sendEmail } from "../lib/email.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 14 days — matches the "The link works for 14 days" copy already in
// the resume modal's success state. Long enough that genuine "I'll
// finish next weekend" cases work; short enough that a leaked link
// won't open a year later.
const RESUME_TTL_MS = 14 * 24 * 60 * 60 * 1000;

// Hard cap on serialized state size. Modern email clients handle URLs
// up to ~8KB cleanly; some preserve URLs up to 16KB but Outlook clips
// around 2KB in plain text. Cap at 6KB base64 ≈ 4.5KB JSON to stay
// safe across the board. Anything bigger and we bail — the user is
// almost certainly deep in UBO territory at that point and should
// finish KYB in one sitting.
const MAX_PAYLOAD_BYTES = 6 * 1024;

function b64urlEncode(s) {
  return Buffer.from(s, "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(message, secret) {
  return createHmac("sha256", secret).update(message).digest("hex");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  try {

  // BREVO_API_KEY presence is checked inside sendEmail(); we surface
  // its no_api_key code below if the helper rejects.
  const secret = process.env.VERIFY_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "VERIFY_SECRET not set", code: "no_verify_secret" });
  }

  const body = req.body || {};
  const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
    return res.status(400).json({ error: "Invalid email address", code: "bad_email" });
  }
  if (!body.state || typeof body.state !== "object") {
    return res.status(400).json({ error: "Missing state payload", code: "no_state" });
  }
  if (typeof body.step !== "string" || !body.step) {
    return res.status(400).json({ error: "Missing step", code: "no_step" });
  }

  const exp = Date.now() + RESUME_TTL_MS;
  const payload = {
    state: body.state,
    step:  body.step,
    email: emailRaw,
    exp,
  };
  const part1 = b64urlEncode(JSON.stringify(payload));

  if (part1.length > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({
      error: "Form state too large to package into a URL link. Try again from an earlier step or finish in one session.",
      code: "payload_too_large",
      size: part1.length,
    });
  }

  const sig = sign(part1, secret);
  const token = `${part1}.${sig}`;

  // Origin of the deployment that issued this email. We use the same
  // forwarded-host trick the analysis email uses so the magic link
  // points back at wherever the user opened the onboarding from (Vercel
  // preview, production domain after migration, etc.), never at a
  // hardcoded URL that breaks across environments.
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host  = (req.headers["x-forwarded-host"] || req.headers.host || "altery-eligibility.vercel.app").split(",")[0].trim();
  const resumeURL = `${proto}://${host}/setup?resume=${token}`;

  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#F8F7F4;font-family:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;color:#14171F;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px 28px;box-shadow:0 8px 28px rgba(0,6,57,0.08);">
    <tr><td>
      <div style="font-size:11px;font-weight:600;color:#6B6F7B;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">Resume your application</div>
      <h1 style="font-size:22px;font-weight:600;line-height:30px;color:#14171F;margin:0 0 14px;letter-spacing:-0.01em;">Pick up where you left off</h1>
      <p style="font-size:14px;line-height:21px;color:#4B5063;margin:0 0 22px;">Your Altery application has been saved. Open it on any device — answers, documents, and progress are all preserved.</p>
      <a href="${resumeURL}" style="display:inline-block;background:#002780;color:#fff;text-decoration:none;padding:14px 26px;border-radius:12px;font-size:15px;font-weight:500;line-height:1;">Resume application →</a>
      <p style="font-size:12px;line-height:18px;color:#6B6F7B;margin:22px 0 0;">This link works for 14 days. If you didn't request it, you can safely ignore this email — your saved progress isn't affected.</p>
      <p style="font-size:11px;line-height:16px;color:#6B6F7B;margin:18px 0 0;">Altery Ltd (UK · FCA-licensed EMI) · Altery EU (CY · Central Bank of Cyprus EMI) · Altery MENA (DIFC · DFSA)</p>
    </td></tr>
  </table>
</body></html>`;

  const sendResult = await sendEmail({
    to:      emailRaw,
    subject: "Your saved Altery application — continue when you're ready",
    html,
    tags:    ["save-progress"],
  });

  if (!sendResult.ok) {
    return res.status(sendResult.status || 502).json({
      error: sendResult.error || "Email service rejected the send",
      code:  sendResult.code  || "brevo_error",
      upstream_status: sendResult.upstream_status,
      upstream_body:   sendResult.upstream_body,
      sender_used:     sendResult.sender_used,
    });
  }
  return res.status(200).json({ ok: true, sentTo: emailRaw, expiresAt: exp });

  } catch (outerErr) {
    // Outer catch — anything that goes wrong before/around the email
    // send call (HMAC compute, JSON.stringify size blowup, header parsing,
    // unexpected runtime quirks) still returns structured JSON so the
    // client error-mapping can do its job rather than seeing a generic
    // Vercel 500.
    console.error("[save-progress] outer error:", outerErr && outerErr.stack || outerErr);
    return res.status(500).json({ error: (outerErr && outerErr.message) || "Internal server error", code: "internal" });
  }
}
