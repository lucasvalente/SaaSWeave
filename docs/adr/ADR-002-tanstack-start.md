# ADR-002: Adoção do TanStack Start e TanStack Router no Frontend

## Context
O frontend da AUTUAX exige alto desempenho de renderização, streaming, divisão de código baseada em rotas e tipagem de ponta a ponta sem acoplamento a soluções proprietárias de hospedagem.

## Decision
Adotar **TanStack Start** (com React e TanStack Router) como o framework oficial do `apps/web`.

## Alternatives
- Next.js: Alto acoplamento com o ecossistema Vercel e abstrações pesadas de servidor.
- Vite SPA puro: Falta de SSR nativo para carregamento inicial ultra-rápido e SEO.

## Consequences
- Roteamento 100% type-safe com checagem estrita de parâmetros e search params.
- Suporte a SSR e streaming nativo.
