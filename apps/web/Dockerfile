# Multi-stage production build for TanStack Start SSR runtime
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy workspace configuration and dependency lockfile
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

# Install full workspace dependencies
RUN bun install --frozen-lockfile

# Copy required package sources and web source files
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Build TanStack Start SSR bundle (generates dist/client and dist/server)
WORKDIR /app/apps/web
RUN bun run build

# Stage 2: Minimal production runtime using Bun
FROM oven/bun:1-alpine AS production
WORKDIR /app/apps/web

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for reliable container healthchecks
RUN apk add --no-cache curl

# Copy build artifacts and server entrypoint
COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/server.mjs ./server.mjs
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/node_modules /app/node_modules

# Run as non-root user
USER bun

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/_health || exit 1

CMD ["bun", "run", "server.mjs"]
