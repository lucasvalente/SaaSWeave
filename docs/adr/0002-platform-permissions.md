# ADR 0002: persisted roles with centralized permission resolution

Platform roles are persisted in `platform_role_assignment`; grants are static, reviewed code in `@saasweave/permissions`. Requests resolve roles then permissions, deny by default, and no API route performs a direct platform-role string comparison. The existing Better Auth `admin` field remains only as a documented migration bridge and is converted to `super_admin` by the resolver/migration.
