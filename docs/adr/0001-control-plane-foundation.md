# ADR 0001: Control Plane foundation

Status: accepted for foundation; implementation gaps remain.

## Decisions

- TanStack Start hosts the administrative React application because the base already has typed routing, SSR and tested Query integration.
- Hono hosts the HTTP API because the base already composes security middleware and oRPC contracts around it.
- PostgreSQL with Drizzle and versioned SQL migrations is the source of truth; tenant scope and constraints are mandatory.
- Redis supports authoritative opaque sessions, bounded cache and BullMQ coordination; it is never public in production.
- Administrative authorization evolves from roles to centralized permissions and policies. Frontend checks are presentation only.
- Secrets are represented by provider references; raw values never enter browser-readable records.
- The Control Plane never executes customer code. The future Execution Plane is a separate trust domain connected through a versioned dispatch contract.

## Consequences

The existing repository is evolved incrementally rather than renamed wholesale. Binary admin-role checks and session caching are temporary blockers documented by the audit. Execution features cannot be added to this monorepo path without a new ADR proving isolation.
