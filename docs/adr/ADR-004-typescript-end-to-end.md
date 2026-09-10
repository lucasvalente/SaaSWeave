# ADR-004: TypeScript Estrito de Ponta a Ponta

## Context
Erros de digitação, incompatibilidade de parâmetros e casts forçados são fontes recorrentes de falhas em sistemas complexos de regras e dados de trânsito.

## Decision
Adotar **TypeScript strict** em todos os apps e packages compartilhados, com regras estritas: `noUncheckedIndexedAccess`, `noImplicitOverride`, sem `any` ou `@ts-ignore`.

## Alternatives
- TypeScript permissivo: Facilita prototipagem rápida, mas degrada a confiabilidade do sistema.

## Consequences
- O compilador atua como guardião imediato de consistência contratual.
- Redução drástica de erros de runtime em produção.
