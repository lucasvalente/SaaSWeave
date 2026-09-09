# Foundation audit

Date: 2026-09-06  
Source: `mathias7799/SaaSWeave`, upstream commit `ef4ef4e`  
Scope: first delivery only; no customer code generation or execution features.

## Executive assessment

SaaSWeave is a substantial, tested TypeScript monorepo and is a viable control-plane foundation. It already matches most of the requested stack: TanStack Start/React, Hono, PostgreSQL/Drizzle, Redis/BullMQ, object storage, structured logging, Prometheus metrics, Vitest, Playwright, Docker, and supply-chain gates. Preserve it and migrate incrementally.

It is not ready to be treated as the final administrative security boundary. Platform authorization is still a binary `user.role === "admin"`; sessions are database-backed Better Auth sessions with a five-minute signed cookie cache rather than Redis-only opaque sessions; distributed tracing, security-events storage, secret-provider references, and a dedicated scheduler process are absent. The current UI also includes customer-console, billing, SSO, webhooks, batch jobs, and playground capabilities outside phase-one scope. They should be disabled or isolated through feature flags before public launch, not deleted during foundation work.

## Current architecture and inventory

- `apps/web`: TanStack Start administrative and customer web application, React 19, TanStack Query/Form/Router, Tailwind, Radix/shadcn, SSR via Nitro.
- `apps/server`: Hono HTTP host exposing Better Auth, oRPC/OpenAPI, media, exports, health and protected metrics.
- `apps/worker`: BullMQ workers, scheduled maintenance, webhooks, Stripe, exports, health/metrics.
- `packages/api`: oRPC routers/procedures, Zod inputs, admin/console/public/private boundaries.
- `packages/auth`: Better Auth, TOTP, organizations, SSO, admin impersonation, policy hooks.
- `packages/db`: Drizzle schemas, timestamped SQL migrations, tenant-aware repositories, audit and operational queries.
- `packages/cache`, `jobs`, `logger`, `observability`: Redis/rate limit, BullMQ, redacted JSON events, Prometheus instrumentation.
- `packages/app`, `core`, `env`, `ui`, `mailer`, `i18n`, `seo`: application services and shared contracts.
- CI runs formatting/type checks, unit/coverage/governance gates, integration tests, Playwright, dependency/license/secret scans, CodeQL, Trivy and CycloneDX SBOM generation.
- Docker provides server, web, worker, migration, PostgreSQL, Redis, MinIO and local supporting services. Data services bind to loopback in development; production images run as non-root and include health checks.

## Keep

- pnpm workspace, strict TypeScript base, Vite Plus task graph and existing tests.
- TanStack Start web, Hono API host, oRPC contracts and Zod validation.
- Drizzle/PostgreSQL migrations and database-enforced constraints.
- Redis/BullMQ primitives, but separate scheduler ownership from workers later.
- tenant-aware organization context, API-key hashing/scopes, audit primitives, SSRF defenses, body bounds, restrictive CORS, CSP/security headers, request IDs, redaction and protected metrics.
- Docker build stages, non-root runtime images, CI security gates, Renovate, Gitleaks, CodeQL, Trivy, SBOM, MIT `LICENSE` and `NOTICE`.

## Remove or disable before phase-one launch

No source was deleted in this delivery. Disable by explicit feature policy: public signup, customer console, pricing/complete billing, SSO, webhooks, AI-usage screens, batch-job UI, playground, public API docs, impersonation unless break-glass controlled, and unused mail/storage providers. Remove only after dependency and migration analysis proves data compatibility.

## Adapt

- Rename deployment concepts (`web` to `admin-web`, `server` to `api`, `worker` scheduling to `scheduler`) only in a staged migration; avoid a cosmetic tree rewrite now.
- Replace platform role checks with centralized permission/policy evaluation and persisted role-permission assignments.
- Make privileged-admin MFA mandatory and add recovery-code lifecycle; plan WebAuthn/passkeys.
- Decide and document the opaque session store. Remove or explicitly accept the five-minute cookie cache because it weakens immediate revocation.
- Add `security_events`, secret references/provider abstraction, system settings/flags ownership, and explicit workspace-scoped repository APIs.
- Add OpenTelemetry SDK/exporter and trace propagation; retain request IDs for log correlation.
- Split audit writes from business transactions deliberately and enforce append-only database privileges/triggers.
- Add production deployment manifests with read-only filesystem, capability drops, resource limits, internal-only databases/metrics and egress policy.

## Security risks

| Priority | Finding                                                                             | Impact / action                                                                                  |
| -------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| P0       | Platform admin authorization is a binary role comparison                            | Implement permission registry and backend policy checks before adding admin mutations.           |
| P0       | Control Plane has no enforced future Execution Plane network boundary               | Never add code execution here; define separate identity, network and datastore boundaries first. |
| P0       | Production dependency audit initially reported 12 high findings                     | Patched transitive versions were pinned in this delivery; keep the CI audit blocking.            |
| P1       | Session cookie cache can remain valid for five minutes after server-side revocation | Disable for privileged sessions or formally accept/reduce the revocation window.                 |
| P1       | MFA exists but privileged-admin enforcement is not demonstrated                     | Gate every privileged session on MFA assurance, including recovery and impersonation flows.      |
| P1       | Audit records are application append-only, not database-enforced immutable          | Use a dedicated insert-only role and deny update/delete; define retention/export controls.       |
| P1       | No dedicated security-event model/workflow                                          | Add normalized events, severity, dedupe, safe metadata and alert routing.                        |
| P1       | Secrets are environment values; no provider-reference abstraction                   | Introduce `provider`, `secret_ref`, safe metadata; browser receives status only.                 |
| P1       | OpenTelemetry tracing is not configured                                             | Add SDK/exporters and propagate trace context to jobs without sensitive attributes.              |
| P2       | Dev Compose publishes PostgreSQL/Redis to loopback                                  | Accept only for local use; production Compose/Kubernetes must omit host ports.                   |
| P2       | First-user auto-admin exists outside production                                     | Keep test/local only and add an explicit bootstrap ceremony.                                     |

## Technical risks and dependency posture

- Better Auth and Drizzle are release candidates; their schema/session behavior requires pinned versions, migration rehearsals and security review before production.
- `nitro-nightly` and `@typescript/native-preview` increase churn and supply-chain risk; replace with stable releases when compatible.
- `prom-client` is reported deprecated by the package manager; migration must be evaluated with the OpenTelemetry work.
- Initial `pnpm audit --prod`: 22 advisories (12 high, 9 moderate, 1 low). Targeted overrides reduced the verified result to zero known advisories at audit time.
- The root build requires `VITE_SERVER_URL` and `VITE_WEB_URL`; without an env file it fails clearly. This is safe fail-closed behavior but onboarding documentation must make it explicit.
- On this Windows checkout, `pnpm check` reported formatting changes across 836 files, consistent with repository-wide newline normalization. Do not auto-fix this as part of feature work; enforce `.gitattributes` in a separate, reviewed normalization commit.

## Migration plan

1. Freeze phase-one surface behind flags and establish environment/account isolation.
2. Add permission vocabulary and policy engine; migrate admin routes from role checks with deny-by-default tests.
3. Establish admin session/MFA assurance, rotation, immediate revocation and recovery operations.
4. Add security events, immutable audit controls and secret-provider reference contracts.
5. Make tenant scope mandatory in repository signatures; add cross-tenant IDOR/BOLA integration tests.
6. Add OpenTelemetry traces and production monitoring topology.
7. Rename/split deployables only after contract tests are green: `web -> admin-web`, `server -> api`, schedule ownership -> `scheduler`.
8. Create the future Execution Plane as a separate security domain; never import an executor into Control Plane packages.

## Proposed target tree

```text
platform/
  apps/{admin-web,api,scheduler}/
  packages/{db,auth,permissions,audit,security,config,queue,cache,rate-limit,crypto,logger,observability,ui}/
  infra/{docker,monitoring,terraform}/
  docs/{architecture,security,threat-model,adr}/
  AGENTS.md
```

Existing `core`, `app`, `mailer`, `i18n`, and `seo` remain until ownership is clear. The target is a responsibility map, not authorization for a bulk move.

## Foundation verification

- Dependency install with frozen lockfile: pass, with network retry warnings.
- Build without required public URLs: expected fail; environment validation rejected missing values.
- Build with required URLs: pass. The missing `.env` warning remains informational because explicit validated environment values were provided.
- Lint and TypeScript (`vp check --no-fmt`): pass, 688 files with no warnings/errors.
- Unit tests without Redis: pass; Redis-backed suites were intentionally skipped by the documented switch.
- Docker Compose configuration: pass after escaping container-time health-check variables.
