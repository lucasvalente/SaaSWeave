# M3 Release Hardening

Status: COMPLETE (local customer experience and release gates)

## Evidence

- Customer journey: `m1-customer-journey.spec.ts` 1/1 PASS (signup, onboarding, project creation, Builder, generation, snapshots A/B, previews and persistence).
- Supabase preview isolation: `supabase-preview-ab.spec.ts` 1/1 PASS (two real previews, per-project public configuration, browser probes and isolation).
- Feature gates: `console-feature-gates.spec.ts` 1/1 PASS (disabled controls hidden and direct links denied).
- i18n: 35/35 tests PASS; pt-BR/en/es parity remains green.
- TypeScript: `pnpm typecheck` PASS.
- Build: `pnpm build` PASS; web image rebuilt with `VITE_WEB_URL=http://localhost:13000`.
- Runtime health: web, server, sandbox-runtime, PostgreSQL and Redis healthy.

## Customer routes

`/app/projects`, `/app/team`, `/app/ai-usage`, `/app/billing`, `/app/notifications`, and `/app/settings` are served by the authenticated console shell. Unauthenticated requests receive the canonical sign-in redirect. `/app/usage` is not a registered route; `/app/ai-usage` is the canonical usage surface.

## Exceptions

The only browser console failures observed are CSP blocks for the existing external GitHub avatar brand image. They are documented, non-critical, and do not affect product functionality.
