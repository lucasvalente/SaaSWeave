# ADR-006: Redis 7 para Cache, Travas Distribuídas e Filas

## Context
O sistema necessita de baixa latência para verificação de sessões, controle de taxa de requisições (rate limiting) e enfileiramento desacoplado de jobs pesados (OCR, consultas externas a órgãos de trânsito).

## Decision
Adotar **Redis 7** com namespaces bem definidos: `session:`, `cache:`, `lock:`, `queue:` e `rate-limit:`.

## Alternatives
- Memcached: Não possui estruturas de dados avançadas nem suporte robusto a filas como BullMQ.
- Filas em banco relacional: Causa contenção de locks e degradação do pool de conexões do PostgreSQL.

## Consequences
- Throughput elevado para operações transitórias e isolamento perfeito por namespaces.
- Facilidade de clusterização e alta disponibilidade.
