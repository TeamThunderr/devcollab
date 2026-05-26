# ─────────────────────────────────────────────────────────────────────────────
# DevCollab — Backend Dockerfile
# Multi-stage build optimized for production.
#
# Stage 1 (deps)   — install ALL dependencies for TypeScript compilation
# Stage 2 (build)  — compile TypeScript → JavaScript
# Stage 3 (runner) — lean runtime image, production-only node_modules
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Install deps (including devDeps for tsc) ─────────────────────────
FROM node:20-alpine AS deps

# python3/make/g++ needed only for native addons (bcrypt, pg)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace manifests first — maximises layer cache hits
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/

# Install full workspace (including devDependencies for tsc)
RUN npm ci --workspace=apps/backend --include=workspace-root

# ── Stage 2: Build TypeScript → JavaScript ────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copy installed modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy source
COPY apps/backend/ ./apps/backend/
COPY package.json ./

# Compile — outputs to apps/backend/dist/
RUN npm run build --workspace=apps/backend

# ── Stage 3: Lean production runtime ─────────────────────────────────────────
FROM node:20-alpine AS runner

# Adds: python3/make/g++ for native modules at runtime; curl for healthcheck
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001 -G nodejs

# Copy root workspace manifest (needed for npm workspaces path resolution)
COPY package.json ./

# Copy backend production manifest and install ONLY production deps
COPY apps/backend/package.json ./apps/backend/
RUN npm ci --workspace=apps/backend --omit=dev

# Copy the compiled JavaScript output from the build stage
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

# Switch to non-root user
USER nodeapp

EXPOSE 3000

# Healthcheck — hits the /api/health endpoint we already have
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Run compiled JS directly with node (no ts-node, no nodemon)
CMD ["node", "apps/backend/dist/index.js"]
