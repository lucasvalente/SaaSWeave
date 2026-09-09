# Security Core report — Phase 2

## Delivered

- Central `@saasweave/permissions` registry: seven initial roles, exact platform permissions, default denial and reserved future namespaces.
- Persisted `platform_role_assignment` plus legacy-admin bootstrap migration; direct API role comparison was removed from the shared admin procedure.
- Privileged API access requires TOTP enrollment. Existing Better Auth TOTP/recovery-code flows remain the enrollment UI.
- Browser session caching is disabled, so server-side session deletion/revocation takes effect on the next request. Existing account security supports list, single revocation and revoke-other-sessions.
- `security_event` migration and typed, metadata-sanitizing event writer, with request/trace and network fields.
- `@saasweave/secrets` provider interface with an ephemeral development implementation and opaque `secret://` references only.
- Rate limits cover login, signup, password reset, magic-link, MFA verification/recovery and organization invitations.
- Dependency-risk register, ADRs, safe `.gitattributes`, and pure unit coverage for permission resolution and metadata/tenant primitives.

## Validation performed

- `pnpm install --lockfile-only`
- `pnpm --filter @saasweave/permissions test:unit`
- `pnpm --filter @saasweave/security test:unit`
- local PostgreSQL migration using the running Docker stack (`database_migration_completed`)

## Known follow-ups

- The current privileged check proves MFA enrollment. A separate fresh-MFA/step-up timestamp must be added before high-impact actions such as role assignment or secret rotation.
- Existing admin routers still use the compatibility `adminProcedure`; subsequent vertical work should replace each endpoint with its exact `requirePlatformPermission` grant.
- Cross-tenant mutation tests must be expanded per resource as tenant-scoped repository APIs are introduced; no resource existence should be disclosed.
- Production needs a managed Vault/KMS adapter; `DevelopmentSecretProvider` is deliberately ephemeral and unsuitable for production.
