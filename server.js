// HTTP entry-point for container deploys (chain: Cloudflare → Nginx → this).
//
// On Vercel the platform provided the server and wrapped each api/*.js as a
// serverless function. Off Vercel we provide that server here, with ZERO
// runtime npm dependencies — native node:http only (the api/lib code uses only
// stdlib + global fetch, so the image is just Node + our source files).
//
// Responsibilities:
//   • Route /api/send-analysis and /api/hubspot-lead to their handlers,
//     adapting node's req/res to the Vercel convention the handlers expect
//     (parsed `req.body`; `res.status().json()`).
//   • Serve the static SPA — correct Content-Type (notably .jsx →
//     application/javascript, which Babel-standalone requires), with an
//     index.html fallback for extension-less routes. Nginx can serve the
//     static files instead and proxy only /api/* here; serving them too keeps
//     the container self-contained either way.
//   • GET /healthz for the orchestrator's health probe.
//
// NOT handled here (by design, per the Cloudflare → Nginx → service chain):
//   • Security headers / CSP — set at Nginx.
//   • TLS / HTTP→HTTPS — Cloudflare / Nginx.
//   • Real client IP — Nginx must forward `X-Forwarded-For`; the handlers read
//     it for rate-limiting.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --- Docker / Swarm secrets ------------------------------------------------
// Secrets may arrive as env vars OR as FILES (the /run/secrets/<name>
// convention). The rest of the app reads process.env.* everywhere, so at startup
// we resolve + NORMALIZE each secret. Per secret, in order: a non-empty env value
// wins; else <NAME>_FILE (an explicit path); else /run/secrets/<name> (lower- or
// original-case). Either way the value is trimmed — secret managers (Docker,
// k8s, Vault, CI) routinely append a trailing newline, and a value like
// "xkeysib-…\n" then fails upstream (Brevo answers 401 "Key not found"). Runs
// synchronously before anything reads these; a missing file is simply skipped.
function hydrateSecretsFromFiles() {
  const VARS = [
    "BREVO_API_KEY", "FROM_EMAIL", "REPLY_TO", "HUBSPOT_TOKEN",
    "ALLOWED_ORIGINS", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
  ];
  for (const v of VARS) {
    // Explicit env wins — but trim it (a secret injected into env still carries
    // the manager's trailing newline, which we must strip).
    if (process.env[v] && process.env[v].trim()) {
      process.env[v] = process.env[v].trim();
      continue;
    }
    const candidates = [];
    if (process.env[v + "_FILE"]) candidates.push(process.env[v + "_FILE"]);
    candidates.push("/run/secrets/" + v.toLowerCase()); // conventional name
    candidates.push("/run/secrets/" + v);               // tolerate UPPER_CASE secret name
    for (const p of candidates) {
      try {
        const val = fs.readFileSync(p, "utf8").trim();
        if (val) { process.env[v] = val; break; }
      } catch { /* file absent / unreadable → try next candidate */ }
    }
  }
}
hydrateSecretsFromFiles();

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 6 * 1024 * 1024; // 6 MB — fits the ≤2.5 MB base64 PDF payload + headroom

// api route → lazy ESM import (default export is the Vercel-style handler).
// import() caches, so each module loads once on first hit.
const API_ROUTES = {
  "/api/send-analysis": () => import("./api/send-analysis.js"),
  "/api/hubspot-lead":  () => import("./api/hubspot-lead.js"),
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".jsx":  "application/javascript; charset=utf-8", // Babel-standalone needs a JS content-type
  ".mjs":  "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".woff2":"font/woff2",
  ".woff": "font/woff",
  ".txt":  "text/plain; charset=utf-8",
};

// Server-side files live in the image so server.js can run them, but they must
// NEVER be served as static — exposing api/ + lib/ source (or package.json)
// would leak backend code. Frontend modules at the root (checker-*.js,
// components.jsx, icons.jsx, images/, i18n dicts, …) are client code and ARE
// served; only these backend paths are blocked.
const DENY_DIRS = new Set(["api", "lib", "node_modules", "test", "scripts", "docs"]);
const DENY_FILES = new Set(["server.js", "package.json", "package-lock.json"]);
function isDenied(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  if (!clean) return false; // root → index.html
  const segs = clean.split("/");
  if (segs[0].startsWith(".")) return true;                        // dotfiles (.git, .env, …)
  if (DENY_DIRS.has(segs[0])) return true;                         // backend dirs
  if (segs.length === 1 && DENY_FILES.has(segs[0])) return true;   // root server files
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let len = 0;
    const chunks = [];
    req.on("data", (c) => {
      len += c.length;
      if (len > MAX_BODY) { reject(new Error("payload too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Add the Vercel-style helpers the handlers call onto node's ServerResponse.
function enhance(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    if (!res.headersSent) res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

async function handleApi(route, req, res) {
  enhance(res);
  if (req.method === "POST") {
    try {
      const raw = await readBody(req);
      req.body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      if (String(e && e.message).includes("too large")) return res.status(413).json({ error: "Payload too large" });
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  } else {
    req.body = {};
  }
  try {
    const mod = await API_ROUTES[route]();
    await mod.default(req, res);
  } catch (e) {
    console.error("[server] handler error", route, e);
    if (!res.headersSent) res.status(500).json({ error: "Internal error" });
  }
}

function resolveStatic(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.normalize(path.join(ROOT, clean));
  // Traversal guard: must stay inside ROOT.
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) return null;
  return resolved;
}

function serveStatic(req, res) {
  const urlPath = req.url.split("?")[0];
  if (isDenied(urlPath)) { res.statusCode = 404; return res.end("Not found"); }
  let fp = resolveStatic(urlPath);
  if (!fp) { res.statusCode = 403; return res.end("Forbidden"); }

  let stat = null;
  try { stat = fs.statSync(fp); } catch { stat = null; }
  if (stat && stat.isDirectory()) {
    fp = path.join(fp, "index.html");
    try { stat = fs.statSync(fp); } catch { stat = null; }
  }
  if (!stat) {
    // A missing asset (path has an extension) is a real 404. An extension-less
    // path is a client route → serve index.html (SPA), preserving query.
    if (path.extname(urlPath)) { res.statusCode = 404; return res.end("Not found"); }
    fp = path.join(ROOT, "index.html");
    try { stat = fs.statSync(fp); } catch { res.statusCode = 404; return res.end("Not found"); }
  }

  res.setHeader("Content-Type", MIME[path.extname(fp).toLowerCase()] || "application/octet-stream");
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(fp)
    .on("error", () => { if (!res.headersSent) res.statusCode = 500; res.end("Read error"); })
    .pipe(res);
}

export const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  if (urlPath === "/healthz") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ ok: true }));
  }
  if (API_ROUTES[urlPath]) return handleApi(urlPath, req, res);
  if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; return res.end("Method not allowed"); }
  return serveStatic(req, res);
});

// Only auto-listen when run directly (`node server.js`); stays importable for tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
}
