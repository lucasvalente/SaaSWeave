# ADR 0004: append-only security events and opaque secret references

Security events are recorded separately from audit logs with actor, workspace, target, request/trace IDs, network metadata, severity and sanitized metadata. Readers must not return cross-tenant resource existence. `@saasweave/secrets` exposes only an opaque reference interface; its in-memory development provider is explicitly non-production. Future Vault/KMS adapters implement the same interface and browser routes receive references or status only, never secret values.
