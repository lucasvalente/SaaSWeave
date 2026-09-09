# Initial threat model

## Assets and adversaries

Assets include admin identities/sessions, tenant metadata, API-key hashes, secret references, audit/security evidence, database/Redis credentials and future execution artifacts. Adversaries include unauthenticated Internet users, compromised tenant/admin accounts, malicious insiders, supply-chain compromise and hostile customer-generated code in the future Execution Plane.

## Trust boundaries and controls

| Boundary                     | Principal threats                                   | Required controls                                                                                 |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Internet -> Admin Web        | phishing, XSS, clickjacking, credential stuffing    | CSP, security headers, MFA, rate limits, no raw secrets                                           |
| Admin Web -> API             | CSRF, broken authorization, mass assignment, replay | origin/CSRF validation, backend permission checks, Zod, idempotency where needed                  |
| API -> PostgreSQL            | injection, cross-tenant access, audit tampering     | parameterized Drizzle queries, tenant scope, constraints, least privilege, insert-only audit role |
| API -> Redis                 | session theft, key collision, unbounded cardinality | TLS/auth in production, namespaced keys, TTLs, bounded values, private network                    |
| API -> Object Storage        | SSRF, object overwrite, public disclosure           | allowlisted endpoints, scoped signed operations, random object keys, private defaults             |
| API -> telemetry             | secret/PII leakage                                  | centralized redaction, attribute allowlist, authenticated transport                               |
| API -> future Agent Worker   | forged jobs, privilege confused deputy              | signed/versioned contracts, separate identity/network, policy profile, replay protection          |
| Agent -> Sandbox             | escape, host compromise                             | one-job ephemeral isolation, syscall/capability limits, resource/time quotas                      |
| Application -> Runtime Controller | confused Docker authority, mount/image abuse      | private bearer-authenticated controller; fixed intents/image/policy; managed-label verification   |
| Sandbox -> Internet          | exfiltration, scanning, malware download            | deny-by-default egress, DNS/HTTP proxy policy, destination logging                                |
| Sandbox -> customer Supabase | overbroad tenant credentials                        | per-run scoped ephemeral credentials, customer-bound policy and revocation                        |

## Non-negotiable sandbox denies

Sandboxes cannot reach Control Plane APIs except a narrowly authenticated result-ingest endpoint, internal PostgreSQL, internal Redis, Kubernetes/container APIs, cloud metadata services or internal secret stores. They never mount Docker sockets or control-plane service-account tokens. The control-plane application server likewise has no Docker socket or Docker CLI; only the isolated Runtime Controller has narrowly scoped Docker authority.

## Abuse cases to test

- Cross-workspace resource ID on every read and mutation returns a nondisclosing denial.
- Revoked session/API key cannot be reused; privileged role changes rotate or revoke sessions.
- Admin mutation without MFA assurance, permission, origin proof or valid schema fails before side effects.
- Audit/security metadata redacts credentials, cookies, authorization headers and secret-shaped values.
- Queue replay is idempotent and cannot change workspace ownership.
- Storage URLs cannot target internal hosts and cannot overwrite another tenant's object.
- Preview capabilities reject missing, forged, expired, cross-project and cross-workspace tokens; the gateway never accepts a client-selected upstream.
- Runtime Controller requests cannot address a non-managed container, choose a raw executable, image, network, host mount or Docker flags.

## Residual risks

The current code has role-based platform admin checks, a five-minute session cookie cache, no complete security-event subsystem, no secret-provider abstraction and no distributed tracing. These are tracked in `FOUNDATION_AUDIT.md` and block production administrative launch.
