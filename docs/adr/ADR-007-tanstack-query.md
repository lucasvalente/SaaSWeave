# ADR-007: TanStack Query como Única Fonte da Verdade para Server State

## Context
A replicação de dados remotos de APIs em stores globais de frontend frequentemente causa estados desincronizados, mutações sem invalidação e código repetitivo de tratamento de loading/error.

## Decision
Adotar **TanStack Query** como a única fonte de verdade para o estado de servidor (Server State), restringindo bibliotecas como Zustand exclusivamente a estados de UI locais quando justificados.

## Alternatives
- Redux / Zustand para tudo: Exige gerenciamento manual de cache, refetching e deduplicação de chamadas de rede.

## Consequences
- Gerenciamento automático de cache, deduplicação de requisições e invalidação declarativa.
- Separação clara entre dados do servidor e estados voláteis de interface.
