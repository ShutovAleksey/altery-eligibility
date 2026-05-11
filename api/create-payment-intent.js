// Vercel serverless function: creates a Stripe PaymentIntent for the
// requested plan and returns its client_secret to the frontend. The
// frontend then calls stripe.confirmPayment(clientSecret) to charge.
//
// Secret key (sk_test_...) lives in Vercel env vars — never reaches
// the browser. Publishable key (pk_test_...) is served separately via
// /api/config.js for the frontend to use with window.Stripe(pk).
//
// Local development: `vercel dev` runs this at http://localhost:3000/api/...
// Production: deploys automatically on `vercel --prod`.

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // Pin the API version so Stripe behaviour stays stable across
  // their releases. Update intentionally when you want new features.
  apiVersion: "2024-12-18.acacia",
});

// Whitelist of plans we accept payments for — prevents arbitrary
// amount injection from a malicious client. The frontend sends a
// planId, the backend looks up the canonical amount here.
const PLAN_AMOUNTS_EUR = {
  starter: 5500,   // €55
  pro:     11000,  // €110
  ultra:   33000,  // €330
};

export default async function handler(req, res) {
  // CORS — Vercel serves both frontend and API on the same origin so
  // CORS isn't strictly needed in production. These headers help local
  // development and prevent surprises if someone embeds the prototype
  // elsewhere.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({
      error:
        "STRIPE_SECRET_KEY environment variable not set. Add it in " +
        "Vercel Dashboard → Project Settings → Environment Variables, " +
        "then redeploy with `vercel --prod`.",
    });
  }

  try {
    const { planId, currency = "eur" } = req.body || {};

    // Resolve amount server-side from the whitelist — never trust the
    // amount the client sends. Defaults to Pro if planId is unknown.
    const amount = PLAN_AMOUNTS_EUR[planId] || PLAN_AMOUNTS_EUR.pro;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      // Let Stripe auto-enable all eligible payment methods based on
      // the account's dashboard configuration + customer location.
      // This is what gives us the broadest method coverage — card,
      // Apple/Google Pay, Link, SEPA, iDEAL, Bancontact, EPS, P24,
      // Giropay, Sofort, Klarna, Afterpay, BLIK, Multibanco, and
      // bank transfer (depending on account settings).
      automatic_payment_methods: { enabled: true },
      metadata: {
        planId: String(planId || "unknown"),
        source: "altery-eligibility-prototype",
      },
      description: "Altery — " + (planId || "unknown") + " plan (test)",
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      planId,
      amount,
      currency,
    });
  } catch (err) {
    console.error("[create-payment-intent] Stripe error:", err);
    return res.status(500).json({
      error: err.message || "Internal server error",
      type: err.type || "unknown",
    });
  }
}
