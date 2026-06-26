// Shared Brevo (formerly Sendinblue) transactional-email helper.
// The transactional email endpoint (send-analysis) calls
// sendEmail() instead of duplicating the Brevo API
// shape per file. Keeps mapping logic in one place — if Brevo bumps the
// API contract, only this file needs to change.
//
// Why Brevo vs Resend: founder preference (saved in project memory on
// 2026-05-20). Brevo's free tier is 300 emails/day rather than Resend's
// 3 000/month — better for the batch-style flows at higher volume, fine
// for the eligibility checker's drip rate either way.
//
// API surface kept Resend-shaped on purpose so the call sites don't
// have to know which provider is underneath:
//   sendEmail({ from, to, subject, html, attachments?, replyTo?, tags? })
//
// Required env on Vercel (Project Settings → Environment Variables):
//   BREVO_API_KEY  — generate at app.brevo.com → SMTP & API → API Keys
//   FROM_EMAIL     — "Altery <hello@send.altery.com>" or any verified
//                    sender. Falls back to a Brevo sandbox sender that
//                    only ships to the verified account owner (useful
//                    for local dev, not for production).
//
// Domain verification: do this before going live. Brevo dashboard →
// Senders & IP → Domains → Add → set up SPF / DKIM DNS records on
// send.altery.com. Without it, only the account owner's address
// receives mail.

const BREVO_API = "https://api.brevo.com/v3/smtp/email";

// Sandbox fallback — only ships to the Brevo account owner's email.
// Production must override with FROM_EMAIL pointing at a verified domain.
const FROM_DEFAULT = "Altery <onboarding@brevo-default.send>";

// Parse "Name <email@host>" into a {name, email} object the way Brevo
// expects. Accepts plain "email@host" too — name defaults to "Altery".
// Returns null if the input has no plausible email — caller should
// fall back to FROM_DEFAULT in that case.
function parseAddress(raw, defaultName) {
  if (!raw || typeof raw !== "string") return null;
  // "Name <email@host>" — split on the last "<"
  const match = raw.match(/^\s*(.+?)\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim() || (defaultName || "Altery");
    const email = match[2].trim();
    if (!email.includes("@")) return null;
    return { name, email };
  }
  // Bare email
  if (raw.includes("@")) {
    return { name: defaultName || "Altery", email: raw.trim() };
  }
  return null;
}

/**
 * Send one transactional email through Brevo.
 *
 * @param {object} opts
 * @param {string} [opts.from]        — sender, "Name <email@host>" or "email@host".
 *                                       Defaults to process.env.FROM_EMAIL, then
 *                                       to FROM_DEFAULT (sandbox).
 * @param {string} opts.to            — single recipient email.
 * @param {string} opts.subject
 * @param {string} opts.html          — full HTML body.
 * @param {Array}  [opts.attachments] — Resend-shaped [{filename, content (base64)}]
 *                                       converted internally to Brevo's
 *                                       [{name, content}] shape.
 * @param {string} [opts.replyTo]     — reply-to email (or "Name <email>").
 * @param {Array}  [opts.tags]        — Resend-shaped [{name, value}] OR plain
 *                                       string[]; flattened to string[] for Brevo.
 * @returns {Promise<{ok: boolean, status: number, messageId?: string, error?: string, code?: string, upstream_body?: string, sender_used?: string}>}
 */
export async function sendEmail(opts) {
  if (!process.env.BREVO_API_KEY) {
    return {
      ok: false,
      status: 500,
      error: "BREVO_API_KEY not set. Sign up at brevo.com, generate a key, add it in Vercel → Project Settings → Environment Variables, then redeploy.",
      code: "no_api_key",
    };
  }

  const fromRaw  = opts.from || process.env.FROM_EMAIL || FROM_DEFAULT;
  const sender   = parseAddress(fromRaw, "Altery") || parseAddress(FROM_DEFAULT, "Altery");

  const toEmail  = typeof opts.to === "string" ? opts.to.trim() : "";
  if (!toEmail || !toEmail.includes("@")) {
    return { ok: false, status: 400, error: "Invalid recipient address", code: "bad_recipient" };
  }

  const body = {
    sender,
    to: [{ email: toEmail }],
    subject: opts.subject,
    htmlContent: opts.html,
  };

  if (opts.replyTo) {
    const reply = parseAddress(opts.replyTo, "Altery");
    if (reply) body.replyTo = reply;
  }

  // Brevo attachment shape: [{ name: "file.pdf", content: "<base64>" }].
  // We accept Resend's [{ filename, content }] for convenience and remap.
  if (Array.isArray(opts.attachments) && opts.attachments.length > 0) {
    body.attachment = opts.attachments.map((a) => ({
      name:    a.filename || a.name || "attachment",
      content: a.content,
    }));
  }

  // Brevo tags are plain strings, not {name, value} objects. Flatten if
  // we received the Resend shape.
  if (Array.isArray(opts.tags) && opts.tags.length > 0) {
    body.tags = opts.tags.map((t) =>
      typeof t === "string" ? t
      : (t && t.value) ? String(t.value)
      : (t && t.name)  ? String(t.name)
      : String(t)
    );
  }

  try {
    const res = await fetch(BREVO_API, {
      method: "POST",
      headers: {
        "api-key":      process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept":       "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[brevo] send error:", res.status, text, "from=", sender.email);
      return {
        ok: false,
        status: 502,
        error: "Email service rejected the send",
        code: "brevo_error",
        upstream_status: res.status,
        upstream_body:   text.slice(0, 500),
        sender_used:     sender.email,
      };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: true, status: 200, messageId: data?.messageId || data?.id || null };

  } catch (err) {
    console.error("[brevo] fetch threw:", err);
    return {
      ok:    false,
      status: 502,
      error: err.message || "Email service request failed",
      code:  "brevo_throw",
    };
  }
}
