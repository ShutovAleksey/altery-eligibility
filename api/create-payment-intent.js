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

// Plan annual fees, expressed in MAJOR currency units (£ or €) — these
// mirror the prices the frontend shows on the plan and payment screens
// (see `PLANS` in setup/onboarding-screens-payment.jsx). The Stripe
// PaymentIntent wants the smallest unit, so the handler multiplies by
// 100 below. Whitelist also doubles as currency validation: anything
// outside {gbp, eur} is rejected before reaching Stripe.
const PLAN_ANNUAL_MAJOR = {
  gbp: { starter: 500,  pro: 1000, ultra: 3000 },
  eur: { starter: 600,  pro: 1200, ultra: 3600 },
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
    const { planId, currency = "eur", mode = "live" } = req.body || {};
    const cur = String(currency).toLowerCase();

    // Resolve amount server-side from the whitelist — never trust the
    // amount the client sends. Reject unknown currencies up-front so we
    // don't accidentally pass an unsupported ISO code to Stripe and get
    // a confusing 4xx back.
    const table = PLAN_ANNUAL_MAJOR[cur];
    if (!table) {
      return res.status(400).json({
        error: `Unsupported currency '${currency}'. Use 'gbp' or 'eur'.`,
      });
    }
    const annualMajor = table[planId] || table.pro;
    const amount = annualMajor * 100; // major → pence / cents

    // Pre-submit mode authorises now and captures later (on KYB approval)
    // — manual capture matches the on-screen legal copy "we'll capture
    // the fee only after your application is approved". Live mode (post-
    // approval activation) charges immediately with automatic capture.
    const captureMethod = mode === "presubmit" ? "manual" : "automatic";

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: cur,
      capture_method: captureMethod,
      // Let Stripe auto-enable all eligible payment methods based on
      // the account's dashboard configuration + customer location.
      // Card, Apple/Google Pay, Link, SEPA, iDEAL, Bancontact, EPS,
      // P24, Giropay, Sofort, Klarna, Afterpay, BLIK, Multibanco,
      // bank transfer — depending on what's enabled in the account.
      automatic_payment_methods: { enabled: true },
      metadata: {
        planId: String(planId || "unknown"),
        mode: String(mode),
        source: "altery-eligibility-prototype",
      },
      description: "Altery — " + (planId || "unknown") + " plan (" + mode + ")",
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      planId,
      amount,
      currency: cur,
      captureMethod,
    });
  } catch (err) {
    console.error("[create-payment-intent] Stripe error:", err);
    return res.status(500).json({
      error: err.message || "Internal server error",
      type: err.type || "unknown",
    });
  }
}
