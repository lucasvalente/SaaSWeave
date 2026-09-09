# Usage / Metering / Credits V1

## Scope

This workstream adds canonical, workspace-scoped usage metering and a non-monetary credit ledger. Billing, checkout, payment providers, invoices, taxes, refunds, and payment webhooks remain out of scope.

## Data model and migration

- `usage_metric` is the canonical catalog of stable metric codes, descriptions, units, aggregation types, and lifecycle status. V1 seeds `ai_tokens` and `api_calls` with SUM aggregation.
- `usage_event` is append-only and records workspace, metric, quantity, occurrence time, idempotency key, source/reference, attribution, and safe metadata.
- `usage_aggregate` stores server-side daily SUM rollups keyed by workspace, metric, and UTC period.
- `credit_account` is unique per workspace; `credit_ledger` is append-only with signed amount, operation, balance-after, idempotency key, reference, and actor metadata.
- Migrations `20260907050000_usage_metering_credits`, `20260907050000_usage_integrity`, `20260907051000_usage_metric_catalog`, and `20260907060000_usage_security_constraints` were applied to local Docker PostgreSQL. Constraints cover metric validity, positive usage, non-negative token values, idempotency, and composite account/workspace ownership.

## Semantics and security

`recordUsageEvent` performs exactly-once insertion and atomic daily aggregation. Reusing an idempotency key with different metric or quantity is rejected. Credit grant, consume, adjust, and reverse operations lock the account, reject negative resulting balances and integer overflow, and reject conflicting idempotency replays. Usage and ledger reads are workspace-scoped; admin procedures require `usage.read` or `usage.write`. Administrative credit mutations are audited, while high-volume usage events remain operational records. Metadata accepted by admin UI is bounded to a required adjustment reason.

Entitlement limits are resolved from the existing subscription/plan entitlement chain. For measurable limits, remaining capacity is calculated as limit minus aggregate usage; boolean entitlements are not treated as usage. UTC is used for storage and daily periods; presentation uses existing locale formatters.

## Admin surface

`/admin/usage` provides workspace, metric, and period filters, usage aggregates with entitlement-derived limits/remaining, credit balance, ledger history, and a confirmed manual adjustment form. New UI text is available in pt-BR, en, and es. Existing admin navigation and permissions are reused. Workspace Detail was not expanded into a second dashboard; shared services are available for future concise integration.

## Validation

- Architecture/data/API/security review: PASS.
- Idempotency, tenant isolation, RBAC, append-only, concurrency, overflow, and non-negative balance review: PASS.
- TypeScript: PASS.
- Full unit/regression suite: PASS (20 package projects; API 21 files/65 tests; web 5 files/17 tests).
- i18n suite: 35/35 PASS; message parity 991/991/991 PASS.
- Build: PASS; 22 public pages prerendered.
- Hardcoded UI audit: PASS with four justified technical/brand exceptions (Promise type, Vercel brand, non-rendered test message, WebP format).
- Dependency audit and diff check: PASS.
- Docker services: healthy; migrations applied locally.

## Future boundary

Plan renewal may grant credits in a future billing workstream. High-volume deployments may later add rollups, partitioning, and retention policies; V1 keeps deterministic keyset-friendly indexes without premature partitioning.
