# Plans & Entitlements V1

## Delivered

- Canonical `plan` metadata: immutable logical `code`, description, lifecycle status, visibility and default marker.
- Typed entitlement catalog (`boolean`, `integer`, `decimal`, `string`) and plan associations with foreign keys, uniqueness and exactly-one-value constraint.
- Admin procedures: get, definitions, entitlements, create, update, archive, set entitlement and remove association.
- Granular permissions: `plans.read`, `plans.create`, `plans.update`, `plans.archive`; mutations remain server-side RBAC protected.
- Audit events for plan and entitlement mutations.
- Admin routes `/admin/plans` and `/admin/plans/:id` with localized UI and archive flow.

## Verification

- Migration `20260907030000_plans_entitlements` applied in Docker PostgreSQL.
- TypeScript: PASS.
- Unit suites: PASS (including API and DB packages).
- Integration suite: PASS against local Docker PostgreSQL (`VITEST_INTEGRATION=1`).
- i18n parity: PASS (934 keys in pt-BR/en/es).
- Hardcoded UI audit: PASS with four documented technical/brand exceptions.
- Build: PASS (22 prerendered pages).
- Dependency audit: PASS.

Billing, subscriptions, usage metering and credits remain separate future workstreams.
