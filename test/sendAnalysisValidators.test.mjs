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

test("safeSessionLink allow-lists hosts and falls back to altery.com", () => {
  assert.equal(safeSessionLink("https://altery.com/setup"), "https://altery.com/setup");
  assert.equal(safeSessionLink("https://app.altery.com/n/registration-corporate?plan=pro"), "https://app.altery.com/n/registration-corporate?plan=pro");
  assert.equal(safeSessionLink("https://altery-eligibility.vercel.app/setup?x=1"), "https://altery-eligibility.vercel.app/setup?x=1");
  assert.equal(safeSessionLink("https://altery-pr-42.vercel.app/setup"), "https://altery-pr-42.vercel.app/setup");
  assert.equal(safeSessionLink("https://phish.example.com/altery"), "https://altery.com");
  assert.equal(safeSessionLink("http://altery.com"), "https://altery.com"); // non-https
  assert.equal(safeSessionLink("javascript:alert(1)"), "https://altery.com");
  assert.equal(safeSessionLink("https://evil.vercel.app"), "https://altery.com"); // vercel but no 'altery'
  assert.equal(safeSessionLink(null), "https://altery.com");
  assert.equal(safeSessionLink("not a url"), "https://altery.com");
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
