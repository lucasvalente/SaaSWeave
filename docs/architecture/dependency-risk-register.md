# Dependency risk register

| Dependency     | Use                             | Risk                              | Control                                                                | Owner    |
| -------------- | ------------------------------- | --------------------------------- | ---------------------------------------------------------------------- | -------- |
| Better Auth RC | identity, TOTP, sessions        | release-candidate API changes     | pin catalog version, test login/MFA/session revocation on each upgrade | Identity |
| Drizzle ORM RC | persistence/migrations          | migration compatibility           | immutable migration folders, integration migration test                | Data     |
| Redis/ioredis  | distributed rate limiting/cache | availability and fail-open misuse | security paths select explicit fail mode; monitor Redis errors         | Platform |
| BullMQ         | control-plane work queues       | delayed/replayed jobs             | idempotent handlers and tenant-bound payloads                          | Platform |
| prom-client    | internal metrics                | sensitive labels/cardinality      | authenticated endpoint; IDs only, no secrets or email labels           | SRE      |

`prom-client` is retained: it is process-local instrumentation, exposes no external control-plane capability, and the existing `/metrics` endpoint is bearer-token protected. The review action is to add scrape/error/cardinality alerts before multi-replica production, not to replace it in this phase.
