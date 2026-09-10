FROM oven/bun:1-alpine AS base
WORKDIR /app

RUN apk add --no-cache curl

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

# Install dependencies with frozen lockfile
RUN bun install --frozen-lockfile

# Copy sources required for backend execution
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

EXPOSE 3333

ENV NODE_ENV=production
ENV API_PORT=3333

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:3333/health/live || exit 1

CMD ["bun", "apps/api/src/index.ts"]
