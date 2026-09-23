// Tests for the analysis-email validators (lib/send-analysis-validators.js).
// These are the XSS-critical boundary: every client-supplied string that
// reaches the outbound email HTML flows through escapeHtml / sanitizeEmailStrings,
// and the click-through URLs flow through the allow-lists. A regression here
// would let a malicious client inject markup into a recipient's inbox or
// repoint the email's CTA at a phishing page.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml, safeSessionLink, isAllowedBookingURL, sanitizeEmailStrings, safeSubject,
} from "../lib/send-analysis-validators.js";

test("escapeHtml neutralizes every HTML-significant char", () => {
  assert.equal(escapeHtml("&"), "&amp;");
  assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  assert.equal(escapeHtml('"q"'), "&quot;q&quot;");
  assert.equal(escapeHtml("it's"), "it&#x27;s");
  assert.equal(escapeHtml("<img src=x onerror=alert(1)>"), "&lt;img src=x onerror=alert(1)&gt;");
  assert.equal(escapeHtml(""), "");
  assert.equal(escapeHtml(5), "5");
  // & must be escaped first so existing entities aren't double-mangled
  assert.equal(escapeHtml("a&<b"), "a&amp;&lt;b");
});

const VERCEL_KEYS = ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"];
function withVercelEnv(values, fn) {
  const prev = Object.fromEntries(VERCEL_KEYS.map((k) => [k, process.env[k]]));
  try {
    for (const k of VERCEL_KEYS) delete process.env[k];
    Object.assign(process.env, values);
    fn();
  } finally {
    for (const k of VERCEL_KEYS) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}

test("safeSessionLink allow-lists hosts and falls back to altery.com", () => withVercelEnv({}, () => {
  assert.equal(safeSessionLink("https://altery.com/setup"), "https://altery.com/setup");
  assert.equal(safeSessionLink("https://app.altery.com/n/registration-corporate?plan=pro"), "https://app.altery.com/n/registration-corporate?plan=pro");
  assert.equal(safeSessionLink("https://altery-eligibility.vercel.app/setup?x=1"), "https://altery-eligibility.vercel.app/setup?x=1");
  assert.equal(safeSessionLink("https://phish.example.com/altery"), "https://altery.com");
  assert.equal(safeSessionLink("http://altery.com"), "https://altery.com"); // non-https
  assert.equal(safeSessionLink("javascript:alert(1)"), "https://altery.com");
  assert.equal(safeSessionLink("https://evil.vercel.app"), "https://altery.com");
  // Anyone can register a *.vercel.app project with "altery" in its name, and
  // this link is the CTA of an email from our verified sender.
  assert.equal(safeSessionLink("https://altery-pr-42.vercel.app/setup"), "https://altery.com");
  assert.equal(safeSessionLink("https://altery-pay.vercel.app/?resume=abc"), "https://altery.com");
  assert.equal(safeSessionLink(null), "https://altery.com");
  assert.equal(safeSessionLink("not a url"), "https://altery.com");
}));

test("safeSessionLink accepts the checker's own resume link (the email CTA since the opening-fee paywall)", () => withVercelEnv({}, () => {
  const resume = "https://altery-eligibility.vercel.app/?resume=eyJ2IjoxLCJjIjoiRlIifQ&utm_source=google";
  assert.equal(safeSessionLink(resume), resume);
}));

test("safeSessionLink accepts a Vercel preview only as the deployment's own host", () => {
  withVercelEnv({ VERCEL_URL: "altery-eligibility-abc123-altery.vercel.app", VERCEL_BRANCH_URL: "altery-eligibility-git-paywall-altery.vercel.app" }, () => {
    const own = "https://altery-eligibility-abc123-altery.vercel.app/?resume=abc";
    assert.equal(safeSessionLink(own), own);
    const branch = "https://altery-eligibility-git-paywall-altery.vercel.app/?resume=abc";
    assert.equal(safeSessionLink(branch), branch);
    assert.equal(safeSessionLink("https://altery-pr-7.vercel.app/?resume=abc"), "https://altery.com", "another preview is not this deployment");
  });
});

test("safeSessionLink accepts a self-hosted checker domain listed in ALLOWED_ORIGINS", () => {
  const prev = process.env.ALLOWED_ORIGINS;
  try {
    delete process.env.ALLOWED_ORIGINS;
    assert.equal(safeSessionLink("https://check.altery.com/?resume=abc"), "https://altery.com", "not allowed until configured");

    process.env.ALLOWED_ORIGINS = " https://check.altery.com/ , https://other.example.org,not a url,http://plain.example";
    assert.equal(safeSessionLink("https://check.altery.com/?resume=abc"), "https://check.altery.com/?resume=abc");
    assert.equal(safeSessionLink("https://other.example.org/?resume=abc"), "https://other.example.org/?resume=abc");
    // Only https entries count; malformed entries are ignored, not fatal.
    assert.equal(safeSessionLink("https://plain.example/?resume=abc"), "https://altery.com");
    // Exact host match: a lookalike subdomain of an allowed host is still rejected.
    assert.equal(safeSessionLink("https://check.altery.com.evil.example/"), "https://altery.com");
    // The link itself must still be https even for a configured host.
    assert.equal(safeSessionLink("http://check.altery.com/?resume=abc"), "https://altery.com");
  } finally {
    if (prev === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = prev;
  }
});

test("isAllowedBookingURL only accepts anchored Google Calendar hosts", () => {
  assert.equal(isAllowedBookingURL("https://calendar.app.google/abc"), "https://calendar.app.google/abc");
  assert.equal(isAllowedBookingURL("https://calendar.google.com/x"), "https://calendar.google.com/x");
  assert.equal(isAllowedBookingURL("https://evil.com/calendar.app.google"), "");
  assert.equal(isAllowedBookingURL("https://calendar.app.google.evil.com/x"), ""); // not anchored at host
  assert.equal(isAllowedBookingURL("http://calendar.google.com/x"), ""); // non-https
  assert.equal(isAllowedBookingURL(undefined), "");
});

test("sanitizeEmailStrings escapes every value, excludes subject, drops non-strings", () => {
  const out = sanitizeEmailStrings({
    cta: "<img src=x onerror=alert(1)>",
    eyebrow: "Recommended & more",
    subject: "<b>excluded</b>",
    bad: 42,
    nested: { x: 1 },
  });
  assert.equal(out.cta, "&lt;img src=x onerror=alert(1)&gt;");
  assert.equal(out.eyebrow, "Recommended &amp; more");
  assert.ok(!("subject" in out), "subject must be excluded (it is an email header, not HTML)");
  assert.ok(!("bad" in out), "non-string value dropped");
  assert.ok(!("nested" in out), "non-string value dropped");
});

test("sanitizeEmailStrings is safe against bad shapes and caps length", () => {
  assert.deepEqual(sanitizeEmailStrings(null), {});
  assert.deepEqual(sanitizeEmailStrings(undefined), {});
  assert.deepEqual(sanitizeEmailStrings("nope"), {});
  assert.deepEqual(sanitizeEmailStrings([1, 2, 3]), {});
  assert.equal(sanitizeEmailStrings({ lead: "a".repeat(1000) }, 400).lead.length, 400);
});

test("safeSubject strips CR/LF (header injection) and caps; falls back when empty", () => {
  assert.equal(safeSubject("Hello", "FB"), "Hello");
  assert.equal(safeSubject("a\r\nBcc: victim@x.com", "FB"), "a Bcc: victim@x.com");
  assert.equal(safeSubject("", "Fallback"), "Fallback");
  assert.equal(safeSubject("   ", "FB"), "FB");
  assert.equal(safeSubject(null, "FB"), "FB");
  assert.equal(safeSubject("x".repeat(200), "FB", 120).length, 120);
});
