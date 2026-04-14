# ──────────────────────────────────────────
# myVote Kenya - USSD Service Dockerfile
# Multi-stage build for Digital Ocean App Platform
# ──────────────────────────────────────────

# ── Stage 1: Install dependencies ─────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@8 --activate

WORKDIR /app

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all package.json files for workspace resolution
COPY apps/ussd/package.json ./apps/ussd/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build the application ────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@8 --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/ussd/node_modules ./apps/ussd/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/ussd/ ./apps/ussd/
COPY packages/database/ ./packages/database/
COPY packages/shared/ ./packages/shared/

# Build with turbo
RUN npx turbo build --filter=@myvote/ussd

# ── Stage 3: Production runner ────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 ussd

# Copy built output and production dependencies
COPY --from=builder /app/apps/ussd/dist ./dist
COPY --from=builder /app/apps/ussd/package.json ./package.json
COPY --from=deps /app/apps/ussd/node_modules ./node_modules
# Copy workspace packages that are needed at runtime
COPY --from=builder /app/packages/database/dist ./node_modules/@myvote/database/dist
COPY --from=builder /app/packages/database/package.json ./node_modules/@myvote/database/package.json
COPY --from=builder /app/packages/shared/dist ./node_modules/@myvote/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@myvote/shared/package.json

USER ussd

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
