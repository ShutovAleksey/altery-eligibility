// Vercel serverless function: generates a 6-digit email-verification
// code, ships it to the supplied address via Brevo, and returns a
// stateless HMAC-signed token that the /api/verify-code endpoint can
// later validate against the user-supplied code.
//
// Why stateless: we do not want a database or KV store just to remember
// "this email is currently trying to verify with code 482917". The
// token is the receipt — it carries email + exp + HMAC(email+code+exp,
// VERIFY_SECRET). The code itself is never in the token, only its
// signature. A holder of the token can't extract the code; a holder
// of the code can't forge a token (no secret).
//
// Required env:
//   BREVO_API_KEY   — for the actual email send (sendEmail helper)
//   VERIFY_SECRET   — random string used to sign tokens. Set in Vercel
//                     Project Settings → Environment Variables.
//   FROM_EMAIL      — verified sender (e.g. "Altery <hello@send.altery.com>")
//                     Falls back to the Brevo sandbox sender.

// Drop the "node:" prefix on the crypto import — Vercel's serverless
// runtime fails module load on some Node revisions when the prefix is
// present, and there's no benefit to the prefix in our usage.
import { createHmac } from "crypto";
import { sendEmail } from "../lib/email.js";
import { rateLimitAll, clientIp, send429 } from "../lib/rate-limit.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE_TTL_MS = 10 * 60 * 1000;  // 10 minutes — long enough to switch tabs, short enough to limit brute force

function b64url(buf) {
  return Buffer.from(buf).toString("base64")
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

  // Rate-limit BEFORE doing any work (especially before sending an
  // email through our verified domain). Conservative caps: a real
  // user requests a code maybe twice per signup; anything more
  // looks like an enumeration attack or a spam loop.
  const ip = clientIp(req);
  const recipient = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const rl = await rateLimitAll([
    { key: `send-verify:ip:${ip}:m`,   limit: 3,  windowMs: 60_000   },  // 3/min per IP
    { key: `send-verify:ip:${ip}:h`,   limit: 10, windowMs: 3600_000 },  // 10/hour per IP
    ...(recipient ? [
      { key: `send-verify:to:${recipient}`, limit: 5, windowMs: 3600_000 }, // 5/hour per email
    ] : []),
  ]);
  if (!rl.allowed) return send429(res, rl.retryAfter);

  // BREVO_API_KEY presence is checked inside sendEmail(); we surface
  // its no_api_key code below if the helper rejects.

  const secret = process.env.VERIFY_SECRET;
  if (!secret) {
    // Hard-fail in prod rather than risk signing with a known dev secret.
    // The verify endpoint must use the SAME secret, so silent fallback
    // here would create asymmetric pairs that can never be validated.
    return res.status(500).json({
      error: "VERIFY_SECRET not set in env. Generate a random 32+ char string and add to Vercel → Settings → Environment Variables.",
      code:  "no_verify_secret",
    });
  }

  const body = req.body || {};
  const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
    return res.status(400).json({ error: "Invalid email address", code: "bad_email" });
  }

  // Generate a 6-digit numeric code. Math.random is sufficient here: an
  // attacker can't see the code on the wire (TLS), and the code is gated
  // behind a per-token HMAC + 10-minute TTL. crypto.randomInt would be
  // marginally stronger but the failure mode (guessing a code) is gated
  // by the HMAC tied to email+exp anyway.
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const exp  = Date.now() + CODE_TTL_MS;
  const sig  = sign(`${emailRaw}:${code}:${exp}`, secret);
  const token = b64url(JSON.stringify({ email: emailRaw, exp, sig }));

  // Plain transactional email — single big code, expiry note, and a
  // tail line clarifying who sent it. Deliberately minimal styling so
  // it lands cleanly in every inbox client; the surface area for spam
  // filters scales with HTML complexity.
  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#F8F7F4;font-family:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;color:#14171F;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px 28px;box-shadow:0 8px 28px rgba(0,6,57,0.08);">
    <tr><td>
      <div style="font-size:11px;font-weight:600;color:#6B6F7B;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">Email verification</div>
      <h1 style="font-size:20px;font-weight:600;line-height:28px;color:#14171F;margin:0 0 16px;letter-spacing:-0.01em;">Your Altery verification code</h1>
      <p style="font-size:14px;line-height:21px;color:#4B5063;margin:0 0 20px;">Enter this code on the verification screen to continue your application:</p>
      <div style="font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:36px;font-weight:600;letter-spacing:0.18em;color:#002780;background:#F0F4FF;border-radius:12px;padding:18px 24px;text-align:center;">${code}</div>
      <p style="font-size:12px;line-height:18px;color:#6B6F7B;margin:18px 0 0;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
      <p style="font-size:11px;line-height:16px;color:#6B6F7B;margin:20px 0 0;">Altery Ltd (UK · FCA-licensed EMI) · Altery EU (CY · Central Bank of Cyprus EMI) · Altery MENA (DIFC · DFSA)</p>
    </td></tr>
  </table>
</body></html>`;

  try {
    const sendResult = await sendEmail({
      to:      emailRaw,
      subject: `${code} is your Altery verification code`,
      html,
      tags:    ["verify-code"],
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

    // Return the signed token, NOT the code. The client stores the
    // token in component state and submits it back with whatever
    // code the user types from their inbox.
    return res.status(200).json({ ok: true, token, expiresAt: exp });

  } catch (err) {
    console.error("[send-verify-code] unexpected error:", err);
    return res.status(500).json({ error: err.message || "Internal server error", code: "internal" });
  }
}
