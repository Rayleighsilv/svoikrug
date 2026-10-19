# ── Production image for Next.js (standalone output) ──────────
# Multi-stage build: install dependencies, build the app, then
# ship only the minimal standalone server and static assets.

# ── Stage 1: dependencies ─────────────────────────────────────
FROM node:20-alpine AS deps

# Next.js SWC binaries expect glibc compatibility on Alpine.
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `public` is optional in this project; Next's Docker flow expects
# it to exist so the runner stage can copy it unconditionally.
RUN mkdir -p public

# NEXT_PUBLIC_* values are inlined into the client bundle at build
# time, so the public API URL must be passed as a build argument.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Stage 3: runtime ──────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone server, its node_modules and package.json.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets are not part of the standalone output.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Standard entrypoint for `output: 'standalone'`.
CMD ["node", "server.js"]
