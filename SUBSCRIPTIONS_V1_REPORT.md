# Subscriptions V1

Subscriptions are workspace-owned commercial state, independent of payment providers. A partial unique index permits one non-canceled current subscription while preserving canceled history. Plan changes and cancellation run in transactions with row locking/version checks and append-only history/audit records.

Admin API: `list`, `get`, `history`, `assign`, `change`, `cancel` under `admin.subscriptions`. Permissions are `subscriptions.read`, `subscriptions.manage`, and `subscriptions.cancel`; all references are validated through foreign keys. Entitlements resolve from the current subscription's plan and existing workspace overrides remain authoritative.

Admin UI: `/admin/subscriptions` and `/admin/subscriptions/:id`, with localized pt-BR/en/es list/detail/history/cancel flows plus real Assign Plan and Change Plan mutations. No Stripe, checkout, invoices, gateway, or usage billing was added.

Validation: migration `20260907040000_subscriptions` applied in Docker PostgreSQL; TypeScript PASS; full unit suite PASS (all package suites, including API 21 files/65 tests); i18n suite PASS (35/35); i18n parity PASS (964/964/964); hardcoded audit PASS with four documented technical/brand exceptions; build PASS (22 prerendered pages); dependency audit PASS; `git diff --check` PASS.

Lifecycle semantics: assign creates or updates the current workspace subscription, change records plan/seats/status transitions, and cancel marks the subscription canceled while retaining history. The partial unique index and transactional row locks/version checks provide one current subscription per workspace and conflict normalization. Entitlements resolve from the subscription plan, with existing workspace overrides taking precedence. Payment-provider integration, invoices, checkout, usage metering, and billing remain intentionally out of scope.
