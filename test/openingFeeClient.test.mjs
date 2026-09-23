// Client side of the account opening fee:
//   • EC_OPENING_FEE (checker-data.js) must mirror the authoritative server
//     constants in lib/opening-fee.js. The server alone decides what is
//     charged, but the client shows the amount before the paywall and in
//     the consent line, so a silent drift would mean promising one price
//     and charging another.
//   • ecLoadOpeningFeeConfig (checker-helpers.js) must FAIL SAFE: any
//     network/HTTP/parse problem resolves to "disabled" (the checker then
//     behaves exactly as before the paywall), and `preview` only switches
//     on for localhost or ?paywall=preview.
//   • ecReadContactEmail / ecStoreContactEmail keep the email the visitor
//     already gave us in this tab (the paywall's work-email pre-fill):
//     emails only, trimmed, and never a throw when storage is refused.
//   • checker-paywall.jsx keeps the founder decisions of 2026-09-23 that no
//     unit test can reach (it is browser JSX): no company fields, wallets on
//     with Link off, the billing country owned by the page and sent on
//     confirm, and elements.submit() as the first await of the Pay click.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSandbox } from "./load.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const paywallSrc = fs.readFileSync(path.join(root, "checker-paywall.jsx"), "utf8");

// lib/opening-fee.js exposes the constants either as one frozen object
// (OPENING_FEE) or as separate named exports; accept both shapes so this
// parity check doesn't depend on how the backend module groups them.
async function serverFee() {
  const mod = await import("../lib/opening-fee.js");
  if (mod.OPENING_FEE) return { ...mod.OPENING_FEE };
  return {
    amount: mod.OPENING_FEE_AMOUNT,
    currency: mod.OPENING_FEE_CURRENCY,
    display: mod.OPENING_FEE_DISPLAY,
    termsVersion: mod.OPENING_FEE_TERMS_VERSION,
  };
}

// Minimal fetch Response stand-in; only what the helper reads.
const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok, status, json: async () => body,
});

function sandbox({ hostname = "example.test", search = "", fetchImpl } = {}) {
  const w = loadSandbox({ search });
  w.location.hostname = hostname;
  if (fetchImpl) w.fetch = fetchImpl;
  return w;
}

test("EC_OPENING_FEE mirrors lib/opening-fee.js exactly", async () => {
  const server = await serverFee();
  const w = loadSandbox();
  const client = { ...w.EC_OPENING_FEE };
  for (const k of ["amount", "currency", "display", "termsVersion"]) {
    assert.notEqual(server[k], undefined, `lib/opening-fee.js must export ${k}`);
    assert.equal(client[k], server[k], `EC_OPENING_FEE.${k} drifted from the server constant`);
  }
  // Founder decision, pinned: £100 in pence, GBP for every region.
  assert.equal(client.amount, 10000);
  assert.equal(client.currency, "gbp");
  assert.equal(client.display, "£100");
});

test("enabled server config is passed through, publishable key included", async () => {
  const calls = [];
  const w = sandbox({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({
        enabled: true, publishableKey: "pk_test_123",
        amount: 10000, currency: "gbp", display: "£100", termsVersion: "2026-09-23",
      });
    },
  });
  const cfg = await w.ecLoadOpeningFeeConfig();
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.preview, false);
  assert.equal(cfg.publishableKey, "pk_test_123");
  assert.equal(cfg.amount, 10000);
  assert.equal(cfg.display, "£100");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/opening-fee");
  assert.equal(calls[0].init.method, "GET");
});

test("config is fetched once per page and shared by every caller", async () => {
  let n = 0;
  const w = sandbox({ fetchImpl: async () => { n += 1; return jsonResponse({ enabled: false, publishableKey: null }); } });
  const [a, b] = await Promise.all([w.ecLoadOpeningFeeConfig(), w.ecLoadOpeningFeeConfig()]);
  const c = await w.ecLoadOpeningFeeConfig();
  assert.equal(n, 1);
  assert.equal(a, b);
  assert.equal(a, c);
});

test("network failure, HTTP error or bad JSON resolve to disabled with the local fee", async () => {
  const failures = {
    "fetch throws":  async () => { throw new Error("offline"); },
    "HTTP 500":      async () => jsonResponse({ error: "boom" }, { ok: false, status: 500 }),
    "bad JSON":      async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("x"); } }),
    "null body":     async () => jsonResponse(null),
  };
  for (const [label, fetchImpl] of Object.entries(failures)) {
    const w = sandbox({ fetchImpl });
    const cfg = await w.ecLoadOpeningFeeConfig();
    assert.equal(cfg.enabled, false, label);
    assert.equal(cfg.preview, false, `${label}: not on localhost, no ?paywall=preview`);
    assert.equal(cfg.publishableKey, null, label);
    assert.equal(cfg.amount, w.EC_OPENING_FEE.amount, label);
    assert.equal(cfg.display, w.EC_OPENING_FEE.display, label);
  }
  // No fetch at all (very old browser / sandbox default) is a failure too.
  const bare = loadSandbox();
  const cfg = await bare.ecLoadOpeningFeeConfig();
  assert.equal(cfg.enabled, false);
});

test("a failed load is marked and not cached: the next caller asks the server again", async () => {
  // One blip at page load must not switch the paywall off for the whole
  // visit (every later Start setup would reach registration unpaid).
  let n = 0;
  const w = sandbox({
    fetchImpl: async () => {
      n += 1;
      if (n === 1) throw new Error("blip");
      return jsonResponse({ enabled: true, publishableKey: "pk_test_1" });
    },
  });
  const first = await w.ecLoadOpeningFeeConfig();
  assert.equal(first.enabled, false);
  assert.equal(first.failed, true);
  const second = await w.ecLoadOpeningFeeConfig();
  assert.equal(second.enabled, true);
  assert.equal(second.failed, undefined, "a real answer carries no failure mark");
  assert.equal(n, 2);
  await w.ecLoadOpeningFeeConfig();
  assert.equal(n, 2, "a successful answer is cached");
});

test("enabled without a publishable key is treated as disabled (nothing to mount Stripe with)", async () => {
  const w = sandbox({ fetchImpl: async () => jsonResponse({ enabled: true, publishableKey: "" }) });
  const cfg = await w.ecLoadOpeningFeeConfig();
  assert.equal(cfg.enabled, false);
  assert.equal(cfg.publishableKey, null);
});

test("preview switches on only for localhost / 127.0.0.1 / ?paywall=preview, and only when disabled", async () => {
  const disabled = async () => jsonResponse({ enabled: false, publishableKey: null });
  const cases = [
    [{ hostname: "localhost" }, true],
    [{ hostname: "127.0.0.1" }, true],
    [{ search: "?paywall=preview" }, true],
    [{ search: "?resume=abc&paywall=preview" }, true],
    [{ search: "?paywall=on" }, false],
    [{ hostname: "altery-eligibility.vercel.app" }, false],
    [{ hostname: "localhost.evil.example" }, false],
  ];
  for (const [opts, want] of cases) {
    const w = sandbox({ ...opts, fetchImpl: disabled });
    assert.equal((await w.ecLoadOpeningFeeConfig()).preview, want, JSON.stringify(opts));
  }
  // Failure path honours preview too, so the UI can be reviewed with no API.
  const offline = sandbox({ hostname: "localhost", fetchImpl: async () => { throw new Error("x"); } });
  assert.equal((await offline.ecLoadOpeningFeeConfig()).preview, true);
  // A live fee is never "preview", even on localhost.
  const live = sandbox({ hostname: "localhost", fetchImpl: async () => jsonResponse({ enabled: true, publishableKey: "pk_test_1" }) });
  const cfg = await live.ecLoadOpeningFeeConfig();
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.preview, false);
});

test("malformed server fee fields fall back to the local mirror field by field", async () => {
  const w = sandbox({
    fetchImpl: async () => jsonResponse({
      enabled: true, publishableKey: "pk_test_1",
      amount: "10000", currency: "GBP!", display: "", termsVersion: 7,
    }),
  });
  const cfg = await w.ecLoadOpeningFeeConfig();
  assert.equal(cfg.amount, w.EC_OPENING_FEE.amount);
  assert.equal(cfg.currency, w.EC_OPENING_FEE.currency);
  assert.equal(cfg.display, w.EC_OPENING_FEE.display);
  assert.equal(cfg.termsVersion, w.EC_OPENING_FEE.termsVersion);
});

test("contact email: kept trimmed, read back, and only when it is an email", () => {
  const w = loadSandbox();
  assert.equal(w.ecReadContactEmail(), "", "nothing kept yet");
  assert.equal(w.ecStoreContactEmail("  founder@northwind.example "), "founder@northwind.example");
  assert.equal(w.sessionStorage.getItem("altery:ec:contact-email:v1"), "founder@northwind.example");
  assert.equal(w.ecReadContactEmail(), "founder@northwind.example");
  // Junk is refused and never replaces a good address.
  for (const bad of ["", "   ", "not-an-email", "a@b", null, undefined, 42, {}, "x".repeat(250) + "@example.com"]) {
    assert.equal(w.ecStoreContactEmail(bad), "", `refused: ${String(bad).slice(0, 30)}`);
  }
  assert.equal(w.ecReadContactEmail(), "founder@northwind.example");
  // A newer address replaces the old one.
  assert.equal(w.ecStoreContactEmail("ops@northwind.example"), "ops@northwind.example");
  assert.equal(w.ecReadContactEmail(), "ops@northwind.example");
  // Whatever sits in storage is re-validated on the way out.
  w.sessionStorage.setItem("altery:ec:contact-email:v1", "<script>alert(1)</script>");
  assert.equal(w.ecReadContactEmail(), "");
});

test("contact email: refused storage degrades to 'nothing kept', never a throw", () => {
  const w = loadSandbox();
  const boom = () => { throw new Error("SecurityError"); };
  w.sessionStorage.getItem = boom;
  w.sessionStorage.setItem = boom;
  assert.doesNotThrow(() => w.ecReadContactEmail());
  assert.equal(w.ecReadContactEmail(), "");
  // The cleaned value still comes back, so the page can use it in memory.
  assert.equal(w.ecStoreContactEmail(" ops@northwind.example"), "ops@northwind.example");
});

// ── checker-paywall.jsx source guards ─────────────────────────────────
// Comments stripped, so the prose explaining a rule can't satisfy it.
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
const paywallCode = stripComments(paywallSrc);

test("paywall: no company fields anywhere (company is bound at registration)", () => {
  for (const gone of ["companyName", "companyNumber", "ec.pw.company.", "ec.pw.field.company", "ec.pw.error.company", "ecFoldLookalikes"]) {
    assert.ok(!paywallCode.includes(gone), `checker-paywall.jsx must not reference ${gone}`);
  }
  // The create call sends exactly the fields the backend reads. promoCode
  // is `|| undefined`, so JSON.stringify drops it when no code is applied.
  const create = paywallCode.match(/action:\s*"create",([\s\S]*?)\}\);/);
  assert.ok(create, "create call not found");
  const keys = [...create[1].matchAll(/^\s*([A-Za-z]+):/gm)].map((m) => m[1]);
  assert.deepEqual(keys, ["attemptId", "country", "email", "plan", "entity", "acceptedTerms", "lang", "website", "formLoadedAt", "promoCode"]);
  assert.match(create[1], /promoCode:\s*promoCode \|\| undefined/);
  assert.ok(!/amount/.test(create[1]), "the client never sends an amount, discounted or not");
});

// ── Promo codes (founder decision, 2026-09-23) ─────────────────────────
test("paywall: the promo field sits under the work email and speaks through the ec.pw.promo.* keys", () => {
  assert.match(paywallCode, /const EC_PW_PROMO_ID = "ec-pw-promo";/);
  const emailAt = paywallCode.indexOf("id={EC_PW_FIELD_IDS.email}");
  const promoAt = paywallCode.indexOf("id={EC_PW_PROMO_ID}");
  const countryAt = paywallCode.indexOf("<CountrySelect");
  assert.ok(emailAt > 0 && promoAt > emailAt && countryAt > promoAt, "order: email, promo code, billing country");
  for (const k of ["ec.pw.promo.label", "ec.pw.promo.placeholder", "ec.pw.promo.apply", "ec.pw.promo.remove",
                   "ec.pw.promo.checking", "ec.pw.promo.applied", "ec.pw.promo.freeLabel"]) {
    assert.ok(paywallCode.includes(`t("${k}"`), `paywall must render ${k}`);
  }
  // Server reasons map to their own copy; anything else reads as unavailable.
  assert.match(paywallCode, /invalid:\s*"ec\.pw\.promo\.invalid",\s*expired:\s*"ec\.pw\.promo\.expired",\s*used:\s*"ec\.pw\.promo\.used"/);
  assert.match(paywallCode, /t\("ec\.pw\.error\.unavailable", \{ email: supportEmail \}\), supportEmail\);\s*\};/, "unknown reasons reuse ec.pw.error.unavailable");
  // Enter applies; the email goes along with the check when it is valid.
  assert.match(paywallCode, /if \(e\.key !== "Enter"\) return;\s*e\.preventDefault\(\);\s*applyPromo\(\);/);
  assert.match(paywallCode, /action:\s*"promo",\s*code:\s*code/);
  assert.match(paywallCode, /if \(!ecPwFieldErrors\(fields\)\.email\) body\.email = fields\.email\.trim\(\);/);
  // Analytics: applied / rejected / free redeemed.
  for (const ev of ["paywall_promo_applied", "paywall_promo_rejected", "paywall_free_redeemed"]) {
    assert.ok(paywallCode.includes(`"${ev}"`), `ecTrack event ${ev}`);
  }
});

test("paywall: a partial discount updates the Elements amount (elements.update({ amount })) before confirm", () => {
  // Built with the effective amount, kept in step by an effect, and re-sent
  // right before elements.submit() inside the Pay click.
  assert.match(paywallCode, /amount:\s*amountRef\.current,/, "the Element is built with the effective amount");
  assert.match(paywallCode, /useEffect\(\(\) => \{\s*const elements = elementsRef\.current;[\s\S]*?elements\.update\(\{ amount: chargeAmount \}\)/);
  const start = paywallCode.indexOf("const submit = async () => {");
  const end = paywallCode.indexOf("const retryConfirm", start);
  const body = paywallCode.slice(start, end);
  const upd = body.indexOf("elements.update({ amount: chargeAmount })");
  assert.ok(upd !== -1 && upd < body.indexOf("await elements.submit()"), "amount re-sent before elements.submit()");
  // The server's figure wins if it differs from the one checked earlier.
  assert.match(body, /r\.data\.amount !== chargeAmount[\s\S]*?elements\.update\(\{ amount: r\.data\.amount \}\)/);
  // The PaymentIntent is keyed on the code too: a code change means a new PI.
  assert.match(body, /JSON\.stringify\(\[attemptKey, countryCode, planId, entityId, applied \? applied\.code : ""\]\)/);
  // The discounted display drives the consent line and the Pay label.
  assert.match(paywallCode, /t\("ec\.pw\.consent", \{ fee: feeDisplay \}\)/);
  assert.match(paywallCode, /t\("ec\.pw\.cta\.pay", \{ fee: feeDisplay \}\)/);
});

test("paywall: the free path is its own click handler: one create call, no card, no attempt record", () => {
  const start = paywallCode.indexOf("const submitFree = async () => {");
  const end = paywallCode.indexOf("const submit = async () => {", start);
  assert.ok(start !== -1 && end > start, "submitFree must be defined before submit");
  const free = paywallCode.slice(start, end);
  assert.match(free, /ecPwPost\(createBody\(email, applied\.code\)\)/);
  assert.match(free, /r\.data\.free !== true \|\| typeof r\.data\.token !== "string"/);
  assert.match(free, /onPaid\(null, r\.data, \{ free: true, code: applied\.code \}\)/);
  for (const gone of ["ecPwSaveAttempt", "elements.submit", "confirmPayment", "stripeRef", "settle("]) {
    assert.ok(!free.includes(gone), `submitFree must not touch ${gone}`);
  }
  assert.match(paywallCode, /onClick=\{freeApplied \? submitFree : submit\}/);
  assert.match(paywallCode, /if \(busyRef\.current \|\| freeApplied\) return;/, "the paid handler refuses to run with a free code applied");
  // The preview shortcut is not taken on the free path (the server is asked for real).
  assert.ok(!free.includes("if (preview)"), "no preview shortcut in submitFree");
});

test("paywall: a free code hides billing country, the payment method section and consent; the button becomes the handoff", () => {
  assert.match(paywallCode, /CountrySelect && !walletSelected && !freeApplied &&/);
  assert.match(paywallCode, /hidden=\{!enabled \|\| stripeStatus === "failed" \|\| freeApplied \|\| undefined\}/, "the Element mount node stays, only hidden");
  assert.match(paywallCode, /\{!freeApplied && \(\s*<div className="ec-pw__consent">/);
  assert.match(paywallCode, /\{!freeApplied && preview && <Alert tone="info">\{t\("ec\.pw\.preview"\)\}<\/Alert>\}/);
  assert.match(paywallCode, /disabled=\{freeApplied \? !canContinueFree : !canPay\}/);
  assert.match(paywallCode, /\{freeApplied\s*\?\s*t\("ec\.pw\.success\.cta"\)/, "the button reuses the success screen's CTA");
  assert.match(paywallCode, /const canContinueFree = !busy && !promoChecking && !!config && !unavailable && !ecPwFieldErrors\(fields\)\.email;/);
  // The cost block shows the discounted figure with the fee struck through, and the free label.
  assert.match(paywallCode, /feeWas=\{applied \? fee : undefined\}/);
  assert.match(paywallCode, /feeCaption=\{freeApplied \? t\("ec\.pw\.promo\.freeLabel", \{ code: applied\.code \}\) : undefined\}/);
});

test("paywall: a create refused for the code (promo_used / promo_invalid) un-applies it under the promo field", () => {
  const start = paywallCode.indexOf("const failCreate = (r) => {");
  const end = paywallCode.indexOf("const createBody", start);
  assert.ok(start !== -1 && end > start, "failCreate not found");
  const fc = paywallCode.slice(start, end);
  assert.match(fc, /d\.error === "promo_used" \|\| d\.error === "promo_invalid"/);
  assert.match(fc, /focusAfterRef\.current = EC_PW_PROMO_ID;/);
  assert.match(fc, /setPromo\(\{ status: "error", reason: reason \}\);/);
  assert.match(fc, /intentRef\.current = null;/, "a PI created for the discounted fee is dropped");
});

test("paywall: Apple Pay + Google Pay on, Link off, card first, Stripe's country field hidden", () => {
  assert.match(paywallCode, /wallets:\s*\{\s*applePay:\s*"auto",\s*googlePay:\s*"auto",\s*link:\s*"never"\s*\}/);
  assert.match(paywallCode, /paymentMethodTypes:\s*\["card"\]/);
  assert.match(paywallCode, /paymentMethodOrder:\s*\["card",/);
  assert.match(paywallCode, /fields:\s*\{\s*billingDetails:\s*\{\s*address:\s*\{\s*country:\s*"never"\s*\}\s*\}\s*\}/);
  // A field set to "never" must be supplied on confirm, or Stripe refuses it.
  assert.match(paywallCode, /payment_method_data:\s*\{\s*billing_details:\s*\{\s*email:\s*clean\.email,\s*address:\s*\{\s*country:\s*clean\.country\s*\}/);
  // Picker changes reach the mounted Element in place.
  assert.match(paywallCode, /\.update\(\{\s*defaultValues:\s*\{\s*billingDetails:\s*\{\s*address:\s*\{\s*country:/);
});

test("paywall: elements.submit() is the first await of the Pay click (wallet sheets need the gesture)", () => {
  const start = paywallCode.indexOf("const submit = async () => {");
  const end = paywallCode.indexOf("const retryConfirm", start);
  assert.ok(start !== -1 && end > start, "submit handler not found");
  const body = paywallCode.slice(start, end);
  const firstAwait = body.search(/\bawait\s/);
  assert.ok(firstAwait !== -1, "submit awaits nothing?");
  assert.match(body.slice(firstAwait, firstAwait + 40), /^await\s+elements\.submit\(\)/,
    "the first await in submit() must be elements.submit(); got: " + body.slice(firstAwait, firstAwait + 60));
  // The prior-attempt re-check and the create call come after it.
  const submitAt = body.indexOf("await elements.submit()");
  assert.ok(body.indexOf('settle(stored.pi, "stored")') > submitAt, "prior-attempt check must follow elements.submit()");
  assert.ok(body.indexOf("ecPwPost(") > submitAt, "create call must follow elements.submit()");
});

test("paywall: attempt record is keyed by the normalised email and keeps {email, country}", () => {
  assert.match(paywallCode, /function ecPwNormEmail\(s\)\s*\{\s*return String\(s \|\| ""\)\.trim\(\)\.toLowerCase\(\);/);
  assert.match(paywallCode, /ecPwSaveAttempt\(attemptKey, intent\.id, "sent", \{ email: clean\.email, country: clean\.country \}\)/);
});

// ── Fee expectation-setting is structural, not small print ──────────────
// Founder decision (2026-09-23, second pass): the £100 is announced through
// UI structure (a sidebar step, the two-cell "Today · one-time / After
// activation · monthly" cost block, a plan-card row, the CTA label), and the
// scattered captions that did that job before are gone for good.
const screensSrc = fs.readFileSync(path.join(root, "checker-screens.jsx"), "utf8");
const modalsSrc  = fs.readFileSync(path.join(root, "checker-modals.jsx"), "utf8");
const pdfSrc     = fs.readFileSync(path.join(root, "checker-pdf.js"), "utf8");
const emailSrc   = fs.readFileSync(path.join(root, "api", "send-analysis.js"), "utf8");
const cssSrc     = fs.readFileSync(path.join(root, "checker.css"), "utf8");
const screensCode = stripComments(screensSrc);
const modalsCode  = stripComments(modalsSrc);

test("fee on: the result page CTA and the modal CTAs lead with 'Continue to account opening'", () => {
  assert.match(screensCode, /t\(paywallOn \? "ec\.r\.cta\.opening" : "ec\.r\.cta\.continue"\)/,
    "the result page's primary CTA must switch to ec.r.cta.opening when the fee is on");
  // Both Start-setup buttons in the proposal modal open the paywall.
  assert.match(modalsCode, /t\(feeOn \? "ec\.r\.cta\.opening" : "ec\.handoff\.continue"\)/);
  assert.match(modalsCode, /t\(feeOn \? "ec\.r\.cta\.opening" : "ec\.handoff\.continueAnyway"\)/);
  // The callback form inside the result page too; the standalone contact
  // page keeps sending to the checker ("Build my plan").
  assert.match(modalsCode, /toCheck \? "ec\.intro\.cta" : feeOn \? "ec\.r\.cta\.opening" : "ec\.r\.cta\.continue"/);
});

test("fee on: the sidebar carries the 'Account opening' step with the fee as its status", () => {
  assert.match(screensCode, /t\("ec\.sidebar\.step6"\)/);
  assert.match(screensCode, /t\("ec\.sidebar\.status\.fee", \{ fee: feeDisplay \}\)/);
  // Never clickable: no button and no onStepClick inside the fee step.
  const feeStep = screensCode.slice(screensCode.indexOf("{feeOn && (() => {"), screensCode.indexOf("})()}", screensCode.indexOf("{feeOn && (() => {")));
  assert.ok(feeStep.length > 0, "fee step block not found");
  assert.ok(!/<button|onStepClick/.test(feeStep), "the fee step must not be clickable");
});

test("the two-cell cost block is one component, used by the result page and the paywall", () => {
  // feeWas / feeCaption are the paywall's promo-code additions (struck-through
  // full fee, "Free with code" line); the result page passes neither.
  assert.match(screensCode, /function EcCosts\(\{ fee, planPrice, planName, feeWas, feeCaption \}\)/);
  assert.match(screensCode, /\{feeWas && <s className="ec-costs__was">\{feeWas\}<\/s>\}/);
  assert.match(screensCode, /\{feeCaption && <div className="ec-costs__note">\{feeCaption\}<\/div>\}/);
  for (const k of ["ec.r.costs.today", "ec.r.costs.fee", "ec.r.costs.after", "ec.r.plan.eyebrow"]) {
    assert.ok(screensCode.includes(`t("${k}"`), `EcCosts must render ${k}`);
  }
  assert.match(screensCode, /<EcCosts fee=\{feeConfig\.display\}/, "the rates card renders EcCosts when the fee is on");
  assert.match(paywallCode, /window\.EcCosts/, "the paywall reuses the result page's block");
  assert.match(paywallCode, /<Costs fee=\{feeDisplay\} planPrice=\{planPrice\} planName=\{planName\}/);
  assert.ok(cssSrc.includes(".ec-costs__was {") && cssSrc.includes(".ec-costs__note {"), "strike-through + note styles live with the block");
  // One CSS block, no per-screen copy (the cell/eyebrow rules are declared
  // once; the narrow-screen media query only re-flows the grid).
  assert.equal((cssSrc.match(/^\s*\.ec-costs__cell \{/gm) || []).length, 1);
  assert.equal((cssSrc.match(/^\s*\.ec-costs__when \{/gm) || []).length, 1);
  assert.ok(!cssSrc.includes(".ec-pw__feeAmount"), "the paywall's own fee figure styles are gone");
});

test("the old small-print disclosures are gone everywhere (source, dicts, CSS, email)", () => {
  const gone = [
    "EcFeeNote", "ec-fee-note", "ec.r.cta.feeCaption", "ec.r.rates.row.openingFee",
    "ec.pw.lead", "ec.pw.terms.head", "ec.pw.terms.body",
    "ec.pw.summary.fee", "ec.pw.summary.once", "ec.pw.summary.plan",
    "feeNote",
  ];
  const sources = { screensSrc, modalsSrc, paywallSrc, pdfSrc, emailSrc, cssSrc };
  for (const f of fs.readdirSync(root).filter((n) => /^i18n-dict-ec.*\.js$/.test(n))) {
    sources[f] = fs.readFileSync(path.join(root, f), "utf8");
  }
  const hits = [];
  for (const [name, text] of Object.entries(sources)) {
    for (const g of gone) if (text.includes(g)) hits.push(`${name}: ${g}`);
  }
  assert.deepEqual(hits, [], "removed disclosure still referenced:\n" + hits.join("\n"));
  // The PDF keeps the fee row in its tables, under the new label.
  assert.ok(pdfSrc.includes('t("ec.r.costs.fee")') && pdfSrc.includes('t("ec.r.costs.oneTimeValue", { fee: openingFee })'));
});
