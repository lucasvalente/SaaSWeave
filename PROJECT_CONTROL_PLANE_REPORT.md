# Project Control Plane V1

## Delivered

- Tenant-scoped `project` schema and reversible migration, with a unique `(workspace_id, slug)` constraint.
- Server-derived workspace and creator identity; client input cannot choose either field or the slug.
- Scoped list, get, create, update, and archive procedures; cross-workspace IDs return `NOT_FOUND`.
- Project read/write role checks in the console access policy.
- Keyset pagination uses `(updated_at, id)`, server-side search and Draft/Active/Archived filters. Archived projects are excluded by default and cannot be updated.
- Slugs are immutable after rename. Allocation is per workspace and retries unique-constraint contention at most five times.
- Audit rows are recorded for create, update, and archive with project and workspace metadata.
- Console routes: list/create at `/app/projects`, detail at `/app/projects/:projectId`, and settings at `/app/projects/:projectId/settings`.
- Detail exposes name, status, description, workspace, creator, and timestamps. Creation redirects to detail; settings support rename, description change, and confirmed archive.

## Validation

- Project PostgreSQL integration suite: **4/4 PASS**. Covers create, list, get, update, archive, archive policy, tenant IDOR, malformed/tampered cursor rejection, permission denial, slug sequence, and bounded concurrent slug allocation.
- Project Playwright Chromium suite: **1/1 PASS**. It exercises real MFA login, create, redirect to detail, settings, rename, description update, archive confirmation, default-list exclusion, and the Archived filter against Docker.
- TypeScript checks passed for the modified API and web workspaces.
- Root production build passed with `DATABASE_URL` and `BETTER_AUTH_SECRET` unset, producing the configured 17 public prerendered pages. Private `/app/*` routes were not prerendered.
- `pnpm audit --prod`: PASS. `git diff --check`: PASS (only pre-existing CRLF conversion warnings).
- Docker services server, web, PostgreSQL, and Redis were healthy.

## Extension points

Future product work may add project membership, lifecycle transitions, and project resources without changing the existing workspace isolation boundary.
