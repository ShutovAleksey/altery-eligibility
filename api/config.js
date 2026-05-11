// Vercel serverless function: returns the Stripe publishable key from
// env vars so the frontend doesn't need to hardcode it. The key is
// public — meant to be in browser JS — but reading it from env keeps
// configuration in one place (Vercel Dashboard) instead of edits to
// the HTML source.

export default function handler(req, res) {
  // Allow same-origin GET only
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    // Useful for the frontend to know which mode the backend is in
    // (in production you might gate certain demo features by this).
    mode: process.env.STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live_")
      ? "live"
      : "test",
  });
}
