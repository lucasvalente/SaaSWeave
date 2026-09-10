FROM oven/bun:1-alpine AS base
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

# Install dependencies with frozen lockfile
RUN bun install --frozen-lockfile

# Copy sources required for worker daemon
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

ENV NODE_ENV=production

CMD ["bun", "apps/worker/src/index.ts"]
