# Security model

## Identity and sessions

Administrative browser authentication uses a secure, HttpOnly, appropriately SameSite cookie carrying an unpredictable session identifier. The authoritative session is server-side, rotated on authentication/privilege changes and immediately revocable. Production cookies are Secure. Privileged accounts require MFA assurance; TOTP and single-use hashed recovery codes are initial methods, with WebAuthn/passkeys planned.

The Better Auth cookie cache is disabled. PostgreSQL is the authoritative session source on each request, so revocation is effective immediately. The account security page supports device listing, individual revocation and global revocation of other sessions.

## Authorization

The flow is `persisted role -> effective permissions -> policy check`, deny by default. `@saasweave/permissions` owns the initial role matrix and reserves `projects.*`, `agent_runs.*`, `sandboxes.*` and `deployments.*` for future trust domains. Privileged roles require enrolled TOTP; Better Auth manages encrypted TOTP material and recovery codes. Every route checks permissions on the server.

## Tenant isolation

Tenant context comes from the authenticated session or verified API-key binding, never from an untrusted workspace ID alone. Service and repository APIs require tenant context, queries combine tenant and resource IDs, and tests must prove cross-tenant reads/mutations fail without disclosing existence.

## Secrets and cryptography

Persistent records contain `provider`, opaque `secret_ref` and non-sensitive metadata. Secret values remain in Vault/cloud secret managers and are never returned to the administrative browser or logs. Platform API keys are high-entropy, shown once and stored using a versioned hash. Cryptography uses reviewed libraries/platform APIs, versioned envelopes and explicit key IDs for rotation; no custom primitives.

## HTTP and telemetry

Use bounded and schema-validated input, strict production CORS, origin/CSRF checks for cookie-authenticated mutation, rate limits, request IDs, CSP, HSTS, clickjacking prevention, content-type/referrer/permissions policies and centralized log redaction. Audit logs are distinct from diagnostic logs and omit secrets. Trace attributes use IDs only when policy permits.

## Privileged mutation contract

Authentication -> MFA assurance when required -> permission/policy -> tenant resolution -> Zod parse/normalize -> service transaction -> append-only audit -> safe response.

Critical administrative role changes additionally require a fresh TOTP step-up. The server validates Better Auth TOTP with `trustDevice: false`, then stores a session-ID-bound Redis proof for five minutes. The proof is not shared between sessions and expires automatically; revoked sessions cannot pass authentication to reach the mutation.
