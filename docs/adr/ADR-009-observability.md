# ADR-009: Observabilidade Estruturada (OpenTelemetry, Prometheus e Logs com Redaction)

## Context
Em uma plataforma B2B que processa dados sensíveis (CPF, CNH de condutores) e lida com auditorias jurídicas, a rastreabilidade e o monitoramento em tempo de execução são requisitos essenciais.

## Decision
Adotar **OpenTelemetry** para tracing distribuído, **Prometheus** para métricas em tempo real (`http_requests_total`, `database_health`, etc.) e **JSON Structured Logging** com mecanismo obrigatório de redaction de PII e credenciais.

## Alternatives
- Logs com `console.log` livre em texto puro: Dificulta agregação, quebra parsing em ferramentas como Loki e expõe PII em texto aberto.

## Consequences
- Total visibilidade operacional com identificadores de correlação (`requestId` e `correlationId`).
- Conformidade inata com a LGPD através de mascaramento automatizado de documentos.
