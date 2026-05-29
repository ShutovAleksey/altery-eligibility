// Vercel serverless function: validates a 6-digit code against the
// stateless HMAC token issued by /api/send-verify-code.
//
// Stateless validation rule:
//   1. Decode the token → { email, exp, sig }
//   2. Reject if exp < now (code expired)
//   3. Recompute HMAC(email + ':' + submitted_code + ':' + exp, VERIFY_SECRET)
//   4. Constant-time compare against the sig in the token
//   5. Match → 200; mismatch → 400 with "code: mismatch"
//
// No DB lookup. The token IS the receipt. A holder of the original
// code can produce a matching signature only with the same secret +
// the same exp the issuing endpoint baked in.
//
// Required env:
//   VERIFY_SECRET — must match what /api/send-verify-code used.

// Drop the "node:" prefix — see send-verify-code.js for rationale.
import { createHmac, timingSafeEqual } from "crypto";
import { rateLimitAll, clientIp, send429 } from "../lib/rate-limit.js";

function b64urlDecode(s) {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return Buffer.from(b64, "base64").toString("utf8");
}

function sign(message, secret) {
  return createHmac("sha256", secret).update(message).digest("hex");
}

// Constant-time string compare. Prevents an attacker from timing the
// hmac diff to learn how many leading bytes of a guessed signature
// match — even though the win condition (guessing a valid 64-char hex
// HMAC) is already astronomically hard, the discipline matters.
function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  // Brute-force defence: a 6-digit code in a 10-min window is only
  // 1M combinations. Without throttling, ~167 guesses/sec finishes
  // brute force in under 2 hours. Lock the email after 5 attempts
  // in 10 minutes — legit users get 5 retries (the form usually
  // succeeds on the first), attackers are blocked.
  // Token is opaque (b64url JSON); attacker would need to feed the
  // same token repeatedly so we limit per-token.
  const ip = clientIp(req);
  const tokenPart = typeof req.body?.token === "string"
    ? req.body.token.slice(0, 64)  // truncate for stable cache key
    : "";
  const rl = await rateLimitAll([
    { key: `verify-code:ip:${ip}`,         limit: 30, windowMs: 600_000 },   // 30 attempts / 10 min per IP
    ...(tokenPart ? [
      { key: `verify-code:token:${tokenPart}`, limit: 5,  windowMs: 600_000 }, // 5 per code (the actual lock)
    ] : []),
  ]);
  if (!rl.allowed) return send429(res, rl.retryAfter, "Too many code attempts — request a new code or wait.");

  const secret = process.env.VERIFY_SECRET;
  if (!secret) {
    return res.status(500).json({
      error: "VERIFY_SECRET not set in env",
      code:  "no_verify_secret",
    });
  }

  const body = req.body || {};
  const { token, code } = body;
  if (!token || typeof token !== "string") return res.status(400).json({ error: "Missing token", code: "no_token" });
  if (!code  || typeof code  !== "string" || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Code must be 6 digits", code: "bad_code_format" });
  }

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(token));
  } catch {
    return res.status(400).json({ error: "Invalid token", code: "bad_token" });
  }

  if (!payload || typeof payload.email !== "string" || typeof payload.exp !== "number" || typeof payload.sig !== "string") {
    return res.status(400).json({ error: "Malformed token", code: "bad_token_shape" });
  }

  if (Date.now() > payload.exp) {
    return res.status(400).json({ error: "Code expired — please request a new one", code: "expired" });
  }

  const expectedSig = sign(`${payload.email}:${code}:${payload.exp}`, secret);

  if (!safeEqualHex(expectedSig, payload.sig)) {
    return res.status(400).json({ error: "Invalid code", code: "mismatch" });
  }

  return res.status(200).json({ ok: true, email: payload.email });
}
