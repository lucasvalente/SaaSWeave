# Arquitetura da Plataforma AUTUAX

## Visão Geral da Topologia
```
Browser
   ↓
TanStack Start (apps/web)
   ↓
Typed API Client (packages/contracts)
   ↓
Hono API (apps/api - Bun runtime)
   ↓
Application & Domain Services
   ↓
PostgreSQL 16 (packages/database) + Redis 7
   ↑
Worker Process (apps/worker - Bun runtime)
```

## Componentes Principais
- **apps/web:** Frontend React, TanStack Router, TanStack Query, TailwindCSS e Design System.
- **apps/api:** Backend Hono de alta performance rodando sob Bun, tipado via Zod e documentado com OpenAPI 3.1.
- **apps/worker:** Processador em segundo plano de filas assíncronas, integrações externas e OCR.
- **packages/database:** Drizzle ORM sobre PostgreSQL 16.
- **packages/contracts:** Zod schemas e tipos compartilhados entre frontend e backend.
- **packages/ui:** Primitives de UI consistentes e acessíveis.
- **packages/observability:** Métricas Prometheus, traces OpenTelemetry e logs estruturados.
