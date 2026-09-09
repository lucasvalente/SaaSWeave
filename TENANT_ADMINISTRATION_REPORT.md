# Tenant / Workspace Administration V1

## Delivered

Workspace is the canonical tenant. Organizations carry an operational lifecycle (`active` or `suspended`) with the suspension timestamp, actor, and reason. The PostgreSQL migrations include the lifecycle columns and the organization update timestamp.

The platform workspace list is cursor-paginated (maximum 100), searches workspace name, ID, and owner email in the database, filters operational status in the database, and returns tenant-scoped owner, member, and project aggregates without per-row queries. Detail includes lifecycle data, owner, members, project totals, recent audit activity, and feature overrides.

Platform admins can suspend a workspace with a required reason and reactivate it. The central operational organization procedure keeps reads available while blocking project create, update, and archive mutations for suspended tenants. Lifecycle actions are audited. Support and readonly roles retain workspace read access but cannot suspend or reactivate.

No hard deletion is introduced. The closure and retention position is recorded in `docs/adr/workspace-closure-data-retention.md`.

## Validation

- Integration: 12 tests passed across workspace list, lifecycle, permissions, and project regressions.
- Browser E2E: 4 Chromium scenarios passed, including workspace search, detail, suspend with reason, reactivate, support restrictions, tenant isolation, and customer project operations.
- Docker: PostgreSQL, Redis, API, and Web were healthy before E2E.
- TypeScript: API and Web package checks passed before the final validation run.

The browser suite uses authenticated fixtures and does not record credentials, cookies, tokens, TOTP material, or connection strings.
