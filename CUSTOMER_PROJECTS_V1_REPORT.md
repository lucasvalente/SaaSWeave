# Customer Projects V1

Status: COMPLETE (local functional scope)

## Delivered

- Workspace-scoped project create, search, status filtering, cursor pagination, update and archive.
- Customer sidebar entry for Projects and a direct Builder entry from a project detail.
- Localized status, pagination and mutation recovery in `pt-BR`, `en` and `es`.
- Settings mutations invalidate project and project-list state; archive returns to the list and failures are visible.
- Preview creation requires an immutable snapshot and always uses the canonical remote lifecycle.

## Evidence

- `projects.integration.test.ts`: 4/4 PASS (CRUD, pagination/search, tenant isolation/RBAC, concurrent slugs).
- `sandbox-input.test.ts`: 1/1 PASS (a preview cannot start without `snapshotId`).
- i18n suite: 35/35 PASS; all three catalogs have 1,053 keys.
- TypeScript and production build: PASS.
- Existing `projects.spec.ts` covers customer create/edit/archive/filter and real Snapshot A/B preview lifecycle.
