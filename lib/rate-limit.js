// Lightweight rate-limit helper for the unauthenticated public APIs.
// Two backends, chosen at request time:
//
//   1. Upstash Redis (preferred) — set UPSTASH_REDIS_REST_URL and
//      UPSTASH_REDIS_REST_TOKEN in Vercel env vars and rate-limit
//      state is consistent across every serverless invocation, every
//      region, every cold-start. Free tier handles ~10k commands/day,
//      enough for thousands of requests per hour.
//
//   2. In-memory Map (fallback) — used automatically if Upstash env
//      vars are missing or the API call fails. Caveats: Vercel may
//      run multiple isolated instances, so a distributed attacker
//      can split traffic across instances and get partial bypass.
//      Still cuts most automated spam from a single source.
//
// API: rateLimit(key, { limit, windowMs })
//   key       — arbitrary string scoping the bucket (we typically
//               include endpoint + IP and a separate call for email)
//   limit     — max successful requests within the window
//   windowMs  — sliding window in milliseconds
// Returns: { allowed: boolean, retryAfter: number|null }
//
// IPs come from req.headers["x-forwarded-for"] (Vercel injects this);
// callers should use clientIp(req) below.

const MEM = new Map(); // key → array of timestamps (ms)

async function rateLimitUpstash(key, limit, windowMs) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    // Pipeline: increment counter, set TTL only on first hit (NX),
    // read remaining TTL so we can return retry-after.
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, windowMs.toString(), "NX"],
        ["PTTL", key],
      ]),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const count = Number(data?.[0]?.result || 0);
    const ttlMs = Number(data?.[2]?.result || windowMs);
    if (count > limit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil(ttlMs / 1000)) };
    }
    return { allowed: true, retryAfter: null };
  } catch (e) {
    console.warn("[rate-limit] Upstash unreachable, falling back to memory:", e?.message || e);
    return null;
  }
}

function rateLimitMemory(key, limit, windowMs) {
  const now = Date.now();
  const arr = MEM.get(key) || [];
  // Drop expired timestamps. Cheap because the window is short and
  // each call appends at most one entry.
  const recent = arr.filter(t => t > now - windowMs);
  if (recent.length >= limit) {
    const oldest = recent[0];
    const retryMs = Math.max(0, oldest + windowMs - now);
    return { allowed: false, retryAfter: Math.max(1, Math.ceil(retryMs / 1000)) };
  }
  recent.push(now);
  MEM.set(key, recent);
  // Crude garbage collection — every ~1k entries, prune the whole map.
  // Keeps memory under control even when a stream of unique keys lands.
  if (MEM.size > 5000) {
    for (const [k, v] of MEM) {
      const r = v.filter(t => t > now - windowMs);
      if (r.length === 0) MEM.delete(k);
      else MEM.set(k, r);
    }
  }
  return { allowed: true, retryAfter: null };
}

async function rateLimit(key, opts) {
  const { limit, windowMs } = opts;
  const upstash = await rateLimitUpstash(key, limit, windowMs);
  if (upstash) return upstash;
  return rateLimitMemory(key, limit, windowMs);
}

// Apply a list of rate-limit checks; first one that fails short-
// circuits the whole request. Each check is { key, limit, windowMs }.
// Use this when you want layered limits (per-IP AND per-email).
async function rateLimitAll(checks) {
  for (const check of checks) {
    const r = await rateLimit(check.key, { limit: check.limit, windowMs: check.windowMs });
    if (!r.allowed) return r;
  }
  return { allowed: true, retryAfter: null };
}

function clientIp(req) {
  const fwd = req.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  const real = req.headers?.["x-real-ip"];
  if (typeof real === "string" && real.length > 0) return real;
  return "unknown";
}

// Set the standard rate-limit response on Express-style res.
// 429 + Retry-After is what every well-behaved client expects.
function send429(res, retryAfter, message) {
  res.setHeader("Retry-After", String(retryAfter));
  return res.status(429).json({
    error: message || "Too many requests — please try again in a minute.",
    code:  "rate_limited",
    retryAfter,
  });
}

export { rateLimit, rateLimitAll, clientIp, send429 };
