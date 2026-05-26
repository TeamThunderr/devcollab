# ─────────────────────────────────────────────────────────────────────────────
# DevCollab — Frontend Dockerfile
# Multi-stage build:
#   Stage 1 (deps)    — install npm dependencies
#   Stage 2 (build)   — run `vite build` with VITE_API_URL baked in at build time
#   Stage 3 (runner)  — nginx:alpine serving the static dist/
#
# IMPORTANT: VITE_* variables are baked into the JS bundle at BUILD time.
# Pass them via --build-arg or docker-compose build.args.
# They are NOT available at runtime in the browser.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
# Backend package.json is required because root workspace references it
COPY apps/backend/package.json ./apps/backend/

# Install all frontend dependencies
RUN npm ci --workspace=apps/frontend

# ── Stage 2: Build Vite application ──────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Accept VITE_ env vars as build args (baked into the JS bundle)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_module[s] ./apps/frontend/node_modules/

# Copy source files
COPY apps/frontend/ ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/
COPY package.json ./

WORKDIR /app/apps/frontend

# Vite build — outputs to apps/frontend/dist/
RUN npm run build

# ── Stage 3: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove the default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our production nginx config
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

# nginx healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

# ── Stage 4: Development environment (used by docker-compose) ──────────────────
FROM node:20-alpine AS development

WORKDIR /app

# Copy manifestations
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/

# Copy all installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules

# Expose Vite dev server port
EXPOSE 5173

WORKDIR /app/apps/frontend

CMD ["npm", "run", "dev", "--", "--host"]
