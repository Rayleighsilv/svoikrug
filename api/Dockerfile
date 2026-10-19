# ── Production image for the Fastify + Prisma API ─────────────
# Multi-stage build: compile TypeScript and generate Prisma Client
# in `builder`, then ship only production dependencies in `runner`.

# ── Stage 1: build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# OpenSSL is required by Prisma's query engine on Alpine.
RUN apk add --no-cache openssl

# Install all dependencies (including devDependencies for tsc/prisma).
# The client is generated explicitly below, so skip the postinstall hook.
COPY package.json package-lock.json ./
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci

# Prisma schema + config are needed to generate the client.
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./

# `prisma generate` does not connect to the database, but the
# datasource URL must be resolvable while the config is loaded.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN npx prisma generate

# Compile TypeScript → dist/.
COPY src ./src
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apk add --no-cache openssl

# Install production dependencies only. Skip Prisma's postinstall
# generate because the client is copied from the builder stage.
COPY package.json package-lock.json ./
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci --omit=dev \
    && npm cache clean --force

# Generated Prisma Client (schema + platform-specific engine).
# Both paths must match the installed @prisma/client version.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Compiled application code.
COPY --from=builder --chown=node:node /app/dist ./dist

# Uploaded files live here; the directory must be writable by the
# non-root user. In production it is backed by a named volume.
RUN mkdir -p uploads/avatars && chown -R node:node uploads

USER node

EXPOSE 4000

CMD ["node", "dist/server.js"]
