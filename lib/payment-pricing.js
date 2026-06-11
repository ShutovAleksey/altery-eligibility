// Activation-fee pricing for api/create-payment-intent.js, extracted so the
// whitelist + validation can be unit-tested without importing the Stripe SDK.
//
// Plan annual fees in MAJOR currency units (GBP / EUR), mirroring the prices
// the frontend shows on the plan and payment screens (PLANS in
// setup/onboarding-screens-payment.jsx). Stripe wants the smallest unit, so
// resolveActivationAmount multiplies by 100. The whitelist also validates
// currency: anything outside {gbp, eur} is rejected before reaching Stripe.
export const PLAN_ANNUAL_MAJOR = {
  gbp: { starter: 500,  pro: 1000, ultra: 3000 },
  eur: { starter: 600,  pro: 1200, ultra: 3600 },
};

// Returns { amount, annualMajor } for a known plan + currency, or { error }
// ("unsupported_currency" | "unknown_plan"). Callers MUST reject errors
// rather than charging a default: silently defaulting an unknown planId to
// 'pro' pricing would mischarge the customer.
export function resolveActivationAmount(currency, planId) {
  const table = PLAN_ANNUAL_MAJOR[String(currency).toLowerCase()];
  if (!table) return { error: "unsupported_currency" };
  if (!Object.prototype.hasOwnProperty.call(table, planId)) return { error: "unknown_plan" };
  const annualMajor = table[planId];
  return { amount: annualMajor * 100, annualMajor };
}
