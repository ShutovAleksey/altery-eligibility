// Vercel serverless function: validates a resume token from an email
// magic-link and returns the decoded form state to the onboarding SPA.
//
// Why server-side validation (rather than decode-and-trust on the
// client): the resume URL embeds the user's KYB form state — name,
// email, phone, business details, eventually shareholder PII. If a
// link is forwarded, the recipient gets the raw URL. We use HMAC to
// prove the link was issued by save-progress and hasn't been tampered
// with; the client can't do this check itself because the secret
// stays on the server.
//
// Required env: VERIFY_SECRET (same as send/verify-code endpoints).

// Drop the "node:" prefix — see send-verify-code.js for rationale.
import { createHmac, timingSafeEqual } from "crypto";

function b64urlDecode(s) {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return Buffer.from(b64, "base64").toString("utf8");
}

function sign(message, secret) {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const secret = process.env.VERIFY_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "VERIFY_SECRET not set", code: "no_verify_secret" });
  }

  // Accept token from query (GET) or body (POST) — POST keeps long
  // tokens out of server access logs, GET is simpler to test.
  const token = (req.method === "POST" ? (req.body && req.body.token) : req.query.token) || "";
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Missing token", code: "no_token" });
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return res.status(400).json({ error: "Malformed token", code: "bad_token" });
  }
  const [part1, suppliedSig] = parts;

  const expectedSig = sign(part1, secret);
  if (!safeEqualHex(expectedSig, suppliedSig)) {
    return res.status(400).json({ error: "Token signature invalid", code: "bad_sig" });
  }

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(part1));
  } catch {
    return res.status(400).json({ error: "Payload not parseable", code: "bad_payload" });
  }

  if (!payload || typeof payload.exp !== "number" || typeof payload.email !== "string"
      || typeof payload.step !== "string" || !payload.state || typeof payload.state !== "object") {
    return res.status(400).json({ error: "Payload shape unexpected", code: "bad_shape" });
  }

  if (Date.now() > payload.exp) {
    return res.status(400).json({ error: "Link expired — request a fresh resume email", code: "expired" });
  }

  return res.status(200).json({
    ok:    true,
    email: payload.email,
    step:  payload.step,
    state: payload.state,
    exp:   payload.exp,
  });
}
