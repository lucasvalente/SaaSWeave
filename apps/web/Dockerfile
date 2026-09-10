FROM oven/bun:1-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl

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

# Install workspace dependencies
RUN bun install --frozen-lockfile

# Copy sources required for frontend build and execution
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Build TanStack Start SSR bundle
WORKDIR /app/apps/web
RUN bun run build

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/_health || exit 1

CMD ["bun", "apps/web/server.mjs"]
