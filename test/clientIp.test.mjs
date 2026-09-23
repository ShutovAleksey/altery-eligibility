// clientIp (lib/rate-limit.js) feeds every per-IP rate-limit key, including
// the ones on the payment endpoint. It trusts the left-most X-Forwarded-For
// entry, which is only correct when the proxy overwrites the header (Vercel
// does; docs/DEPLOY.md §6 has the Nginx config that does). What the code
// itself must guarantee: a stable value and a bounded key length.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "../lib/rate-limit.js";

const req = (headers) => ({ headers });

test("left-most X-Forwarded-For entry, trimmed", () => {
  assert.equal(clientIp(req({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientIp(req({ "x-forwarded-for": "2001:db8::1" })), "2001:db8::1");
});

test("falls back to X-Real-IP, then 'unknown'", () => {
  assert.equal(clientIp(req({ "x-forwarded-for": " , 10.0.0.1", "x-real-ip": "198.51.100.4" })), "198.51.100.4");
  assert.equal(clientIp(req({ "x-real-ip": " 198.51.100.4 " })), "198.51.100.4");
  assert.equal(clientIp(req({})), "unknown");
  assert.equal(clientIp({}), "unknown");
});

test("a huge header can't blow up the rate-limit key", () => {
  const ip = clientIp(req({ "x-forwarded-for": "9".repeat(10_000) + ", 10.0.0.1" }));
  assert.ok(ip.length <= 64, `capped, got ${ip.length}`);
  assert.ok(clientIp(req({ "x-real-ip": "x".repeat(5000) })).length <= 64);
});
