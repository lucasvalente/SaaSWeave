# System Operations V1

Status: complete

## Existing capability

- `/admin/system/health` exists and is protected by `infrastructure.read`.
- `adminHealth()` probes API, PostgreSQL, Redis, queues and storage with bounded timeouts and real probe results.
- Super Admin overview already includes real health and operational counters.
- BullMQ queue readiness is reused through `checkQueueReady`; no parallel queue system was introduced.
- Queue operational APIs now expose bounded real counts through `admin.system.queues` and safe job metadata through `admin.system.jobs`, protected by `infrastructure.read`.
- Job detail and failed-job APIs expose redacted metadata; retry is limited to explicitly safe queues, requires `jobs.retry` and a reason, and emits an audit event.
- Admin surfaces are available at `/admin/system/jobs`, `/admin/system/jobs/:jobId`, `/admin/system/workers`, and `/admin/system/incidents`.
- Incidents are derived from real failed jobs; observability links are safe internal links and omit unconfigured external credentials.
- Existing structured security/audit and i18n infrastructure remains the source of truth.

## Current gates

- TypeScript: PASS
- Build: PASS
- Health integration coverage: existing `platform-health.integration.test.ts`
- RBAC coverage: existing `admin-permissions.integration.test.ts`

## Final validation

- Job detail, failed jobs, workers, incidents and observability surfaces: PASS.
- Dogfood routes and refresh behavior: PASS; unauthenticated access uses canonical sign-in redirect.
- Independent spec, quality and security review: PASS; sensitive failure reasons are redacted.
- Evidence ledger updated; no external blocker exists.
