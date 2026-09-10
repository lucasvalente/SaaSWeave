# ADR-003: Adoção do Framework Hono sob Bun na API

## Context
A API do AUTUAX precisa atender operações transacionais rápidas, validação rigorosa de payloads de infrações de trânsito e documentação automática OpenAPI 3.1.

## Decision
Utilizar **Hono** rodando sob o runtime **Bun** para o `apps/api`.

## Alternatives
- Express: Sobrecarga de legados e falta de suporte nativo a tipos modernos e web standards.
- Fastify: Boa performance, porém maior verbosidade e acoplamento a plugins de ecossistema Node.

## Consequences
- Baixíssima latência e inicialização em milissegundos.
- Middleware limpo e portabilidade para edge runtimes se necessário.
- Tipagem nativa com Zod e OpenAPI 3.1.
