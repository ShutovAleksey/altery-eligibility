// Vercel serverless function: upserts a HubSpot contact (keyed by email)
// with the eligibility-checker context. Once checker_entity is set, the
// HubSpot owner-rotation workflow (enrollment trigger "checker_entity is
// known") routes the lead to the next available salesperson.
//
// Why server-side: the legacy Forms-submission endpoint silently drops
// custom-property values for new-builder forms, and the write needs a
// Service Key token that must never reach the browser. This endpoint
// holds the token (process.env.HUBSPOT_TOKEN) and writes through the CRM
// Contacts API. Host is api.hubapi.com for all regions incl. EU — data
// residency is determined by the account/token, not a regional host.
//
// Setup required:
//   1. HubSpot → Settings → Integrations → Service Keys → create a key
//      with scopes crm.objects.contacts.read + crm.objects.contacts.write.
//   2. Vercel → Project Settings → Environment Variables → add
//      HUBSPOT_TOKEN (and redeploy).

import { rateLimitAll, clientIp, send429 } from "../lib/rate-limit.js";
import { checkAntiSpam, sendAntiSpamReject } from "../lib/anti-spam.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Only these contact properties may be written through this public,
// unauthenticated endpoint — prevents arbitrary property injection.
// `company` and `phone` are HubSpot's built-in Contact properties
// (no setup needed in the dashboard). The `checker_*` set marks the
// lead as eligibility-checker origin — sales filters on "checker_entity
// is known" instead of needing a separate lead_source property.
const ALLOWED_PROPS = [
  "email",
  "firstname",
  "lastname",
  "company",
  "phone",
  "checker_entity",
  "checker_plan",
  "checker_monthly_volume_gbp",
  "checker_est_annual_savings_gbp",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Anti-spam first — honeypot field + Origin header + form-age gate.
  // Cheap checks that catch most automated submissions before they
  // spend rate-limit budget. See lib/anti-spam.js.
  const spamCheck = checkAntiSpam(req);
  if (!spamCheck.ok) return sendAntiSpamReject(res, spamCheck);

  // Rate-limit BEFORE talking to HubSpot. An unrestricted endpoint
  // here would let an attacker dump thousands of fake leads into the
  // sales pipeline — confusing Sales metrics and burning HubSpot
  // contact quota.
  const ip = clientIp(req);
  const incomingEmail = typeof req.body?.properties?.email === "string"
    ? req.body.properties.email.trim().toLowerCase() : "";
  const rl = await rateLimitAll([
    { key: `hubspot-lead:ip:${ip}:m`, limit: 5,  windowMs: 60_000   },  // 5/min per IP
    { key: `hubspot-lead:ip:${ip}:h`, limit: 30, windowMs: 3600_000 },  // 30/hour per IP
    ...(incomingEmail ? [
      { key: `hubspot-lead:email:${incomingEmail}`, limit: 3, windowMs: 3600_000 }, // 3/hour per email
    ] : []),
  ]);
  if (!rl.allowed) return send429(res, rl.retryAfter);

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) {
    console.error("[hubspot-lead] HUBSPOT_TOKEN not configured");
    return res.status(500).json({ error: "not_configured" });
  }

  const incoming = (req.body && req.body.properties) || {};
  const email = String(incoming.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "bad_email" });
  }

  // Whitelist + clamp — never forward arbitrary keys to the CRM.
  const properties = {};
  for (const key of ALLOWED_PROPS) {
    const v = incoming[key];
    if (v != null && v !== "") properties[key] = String(v).slice(0, 200);
  }
  properties.email = email;

  try {
    // Batch upsert by email → creates the contact or updates the existing
    // one in a single call, so repeat checker runs don't duplicate.
    const hsRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          inputs: [{ idProperty: "email", id: email, properties }],
        }),
      }
    );

    if (!hsRes.ok) {
      const detail = await hsRes.text().catch(() => "");
      console.error("[hubspot-lead] HubSpot error", hsRes.status, detail);
      return res.status(502).json({ error: "hubspot_error", status: hsRes.status });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[hubspot-lead] request failed", e);
    return res.status(502).json({ error: "request_failed" });
  }
}
