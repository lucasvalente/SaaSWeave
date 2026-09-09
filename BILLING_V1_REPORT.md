# Billing V1 Report

Status: complete (provider-agnostic/manual operations only; no gateway or checkout was added).

## Delivered

- Money model: integer minor units (`amountMinor`, `subtotalMinor`, `totalMinor`, `amountPaidMinor`, `amountDueMinor`); currency is an ISO-4217-style three-letter code, default `BRL`.
- Pricing: immutable `plan_price` rows with plan, interval (`month`, `year`, `one_time`), effective dates, and cents amount.
- Billing profiles: one profile per workspace with legal name, tax identifier, billing email, and address JSON snapshot.
- Invoices: workspace/subscription scoped records, deterministic `INV-0000000001` sequence, draft → open → paid/void lifecycle, due/issue/paid/void timestamps.
- Line items: quantity, unit/total minor amounts, description, and snapshot JSON; totals are calculated server-side.
- Manual payments: idempotency key, method/provider/reference, partial payments, transactional balance updates, and overpayment rejection.
- Refunds: manual, idempotent, tenant-scoped, and bounded by the captured payment amount.
- Concurrency/integrity: invoice row locks, transactional payment/refund updates, database checks/indexes, and applied migrations `20260907070000_billing` and `20260907071000_billing_lifecycle`.
- API/UI: admin billing dashboard, invoice list/detail, pricing read surface, and workspace billing-profile read surface at `/admin/billing`, `/admin/billing/invoices`, `/admin/billing/invoices/:id`, and `/admin/billing/profile`.
- RBAC: `billing.read` and `billing.write` platform permissions with tenant-scoped reads and audit events for billing mutations.
- Security: provider webhook tenant checks and concurrent customer lock regressions remain green; no card/PIX/boleto data is stored.
- Step-up: all `billing.write` mutations use the canonical `requirePlatformPermission` guard, which enforces `hasFreshAdminStepUp(sessionId, userId)` server-side with Redis TTL 300s after RBAC.
- Integrity hardening: supported currencies are normalized/validated, payment currency must match the invoice, idempotency payload mismatches are rejected, and refunds lock the payment row to prevent concurrent over-refunds.
- i18n/accessibility: UI reuses Paraglide catalogs and shared console components; invoice statuses are localized through the existing `pt-BR`/`en`/`es` catalogs (996-key parity).

## Verification

- Unit/integration suite: PASS — all workspace suites, including API (21 files/65 tests), DB (4 files/51 tests), and web (5 files/17 tests).
- i18n suite: PASS — 35/35.
- TypeScript: PASS (`pnpm typecheck`).
- Build: PASS (`pnpm build`); 22 public pages prerendered.
- Dependency audit: PASS (`pnpm audit --prod`).
- Diff check: PASS (`git diff --check`).
- Hardcoded UI audit: PASS with four pre-existing justified technical/brand exceptions (`Promise`, `Vercel`, non-rendered technical route text, `WebP`).
- Docker database migration: PASS against local PostgreSQL; Docker services healthy.

## Step-up validation

The existing MFA/step-up integration suite validates fresh proof TTL, session binding, revocation and invalid-code behavior. Billing integration covers 7/7 console billing scenarios against local PostgreSQL/Redis after correcting the annual-feature fixture and preserving the production validation rule.

## Explicit scope exclusions

No Stripe/PayPal/Adyen integration, card/PIX/boleto collection, checkout, automatic collection, or payment gateway was implemented in Billing V1.
