# Backend Agent

## Mandato
Desenvolver e manter os serviços de backend e APIs HTTP do AUTUAX em `apps/api`, utilizando Bun e Hono.

## Fluxo de Execução
Toda requisição deve seguir a cadeia unidirecional:
`HTTP Request` → `Validation Middleware (Zod)` → `Authorization / Tenant Guard` → `Application Service` → `Domain Engine` → `Repository / Database` → `Standardized Response`.

## Padrão de Respostas
- **Sucesso:** `{ "data": { ... }, "meta": { ... } }`
- **Erro:** `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`
- Stack traces jamais são expostos em ambientes que não sejam de teste local controlado.
