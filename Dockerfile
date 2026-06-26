# Container image for the Altery eligibility checker.
# Deploy chain: Cloudflare → Nginx → this service.
#
# The app is a no-build static SPA + two Vercel-style serverless functions in
# api/, fronted by server.js. It has ZERO runtime npm dependencies (the api/lib
# code uses only the Node stdlib + global fetch), so there is no `npm install`
# step — the image is just Node + the source files. esbuild is a devDependency
# used only by the test suite and is excluded via .dockerignore.
#
# Nginx terminates TLS, sets the security headers / CSP, serves the static files
# (or proxies them here — server.js serves them too), and reverse-proxies
# /api/* to this container. Nginx MUST forward the real client IP via
# X-Forwarded-For (the handlers read it for rate-limiting).
FROM node:20-alpine

WORKDIR /app

# Source only (.dockerignore excludes node_modules / test / docs / git / etc.).
COPY --chown=node:node . .

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000
USER node

# Health probe for the orchestrator (Node 20 has global fetch).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
