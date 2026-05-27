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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Only these contact properties may be written through this public,
// unauthenticated endpoint — prevents arbitrary property injection.
const ALLOWED_PROPS = [
  "email",
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
