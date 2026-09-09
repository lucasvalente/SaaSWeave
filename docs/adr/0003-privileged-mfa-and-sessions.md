# ADR 0003: MFA enrollment and authoritative sessions

Privileged platform roles require enrolled TOTP before platform API access. Better Auth provides TOTP verification and recovery codes; codes are never included in audit/security metadata. Browser session cache is disabled, making PostgreSQL the authoritative source on every API request and making revocation effective immediately. Session metadata (IP, user agent, created/updated/expiry) is visible in account security and users can revoke a session or all other sessions.

Step-up remains an explicit contract: highly sensitive future actions must require a fresh MFA challenge, not merely MFA enrollment. WebAuthn/passkeys are intentionally deferred.
