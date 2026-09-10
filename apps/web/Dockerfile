# Stage 1: Build static bundle
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy workspace manifests
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/database/package.json ./packages/database/
COPY packages/observability/package.json ./packages/observability/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy sources required for frontend build
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Build production bundle
WORKDIR /app/apps/web
RUN bun run build

# Stage 2: Serve via high-performance Nginx Alpine
FROM nginx:alpine AS production

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
