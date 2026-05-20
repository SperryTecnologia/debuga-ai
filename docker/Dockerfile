# ============================================================
# debuga.ai homolog - Multi-stage Dockerfile
# Node 22 LTS + pnpm + Vite build + Express production server
# ============================================================

# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY app/package.json app/pnpm-lock.yaml* ./
COPY app/patches ./patches
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# ── Stage 2: Build client + bundle server ──
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=deps /app/node_modules ./node_modules
COPY app/ .

# Build args become VITE_ env vars at build time
ARG VITE_APP_ID=debuga-ai
ARG VITE_APP_TITLE=debuga.ai
ARG VITE_APP_LOGO=
ARG VITE_STRIPE_PUBLISHABLE_KEY=
ARG VITE_FRONTEND_FORGE_API_KEY=
ARG VITE_FRONTEND_FORGE_API_URL=
ARG VITE_ANALYTICS_ENDPOINT=
ARG VITE_ANALYTICS_WEBSITE_ID=
ARG VITE_OAUTH_PORTAL_URL=

ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_FRONTEND_FORGE_API_KEY=$VITE_FRONTEND_FORGE_API_KEY
ENV VITE_FRONTEND_FORGE_API_URL=$VITE_FRONTEND_FORGE_API_URL
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL

# Build: vite builds frontend to dist/public, esbuild bundles server to dist/index.js
RUN pnpm build

# ── Stage 3: Production runtime ──
FROM node:22-alpine AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install only production dependencies
COPY app/package.json app/pnpm-lock.yaml* ./
COPY app/patches ./patches
RUN pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod

# Copy built assets from builder
# dist/index.js    = bundled Express server (esbuild output)
# dist/public/     = Vite-built frontend assets
COPY --from=builder /app/dist ./dist

# Copy runtime server dependencies not bundled by esbuild
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle ./drizzle

# Security: non-root user
RUN addgroup -g 1001 -S debuga && \
    adduser -S debuga -u 1001 -G debuga && \
    chown -R debuga:debuga /app
USER debuga

# Health check — uses a simple GET that doesn't require auth
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/ || exit 1

EXPOSE ${PORT:-3000}

# Correct entrypoint: dist/index.js (NOT dist/server/index.js)
CMD ["node", "dist/index.js"]
