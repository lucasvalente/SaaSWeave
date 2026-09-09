# Project Administration V1

## Ownership and scope

A project belongs to a workspace. Workspace membership defines customer access. The workspace owner is the operational owner; `created_by` is only the creator and does not transfer ownership.

Platform administration is explicitly separate from tenant scope. `projects.read` permits platform metadata viewing; `projects.archive` permits the lifecycle mutation. Support and readonly can read; they cannot archive.

## Delivered

- `/admin/projects` server-paginated cross-workspace roster with name/ID/workspace/owner/creator/status/timestamps.
- `/admin/projects/:projectId` identity, membership, and project audit activity.
- Server-side search, filters, keyset pagination, no N+1 member or activity reads.
- Administrative archive audit event (`admin.project.archived`). No hard delete.
- Environment and usage decisions recorded in ADRs; project transfer remains future work.
- Admin browser evidence uses one real Better Auth + MFA login per serial role flow. The runner does not bypass MFA or alter production rate-limit policy; only its exact local Redis rate-limit buckets may be removed between isolated reruns.

## Validation

- Admin projects PostgreSQL integration: **2/2 PASS** (global scope, search, filters, cursor, detail joins, activity, archive, support/readonly denial, and tenant isolation).
- Playwright: **4/4 PASS** (Admin Projects included in the platform-admin flow; customer project lifecycle regression included).
- Production build has no server runtime secrets and prerenders 17 public pages.

## Future work

Project transfer, controlled support impersonation, persistent project environments, project usage ingestion, billing, Supabase, agent execution, sandboxing, generation, preview, and deployment remain out of scope.

## Deferred by design

No Supabase, runtime environment, sandbox, preview, billing, synthetic usage, or impersonation behavior was introduced.
