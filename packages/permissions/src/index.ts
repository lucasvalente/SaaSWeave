export const PLATFORM_PERMISSIONS = [
  "platform.dashboard.read",
  "users.read",
  "users.write",
  "users.suspend",
  "users.roles.manage",
  "workspaces.read",
  "workspaces.create",
  "workspaces.update",
  "workspaces.suspend",
  "workspaces.delete",
  "workspaces.members.read",
  "workspaces.members.manage",
  "memberships.add",
  "memberships.update",
  "memberships.remove",
  "memberships.transfer_owner",
  "projects.read",
  "projects.archive",
  "sessions.read",
  "sessions.revoke",
  "audit.read",
  "security.events.read",
  "security.events.manage",
  "feature_flags.read",
  "feature_flags.write",
  "plans.read",
  "plans.create",
  "plans.update",
  "plans.archive",
  "subscriptions.read",
  "subscriptions.manage",
  "subscriptions.cancel",
  "usage.read",
    "usage.write",
    "billing.read",
    "billing.write",
  "system_settings.read",
  "system_settings.write",
  "infrastructure.read"
  ,"jobs.retry"
] as const;

export const RESERVED_PERMISSION_NAMESPACES = [
  "projects.*",
  "agent_runs.*",
  "sandboxes.*",
  "deployments.*"
] as const;
export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export const PLATFORM_ROLES = [
  "super_admin",
  "platform_admin",
  "engineering",
  "security",
  "support",
  "finance",
  "readonly"
] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

const ALL = new Set<PlatformPermission>(PLATFORM_PERMISSIONS);
const readOnly = [
  "platform.dashboard.read",
  "users.read",
  "workspaces.read",
  "workspaces.members.read",
  "projects.read",
  "sessions.read",
  "audit.read",
  "security.events.read",
  "feature_flags.read",
  "plans.read",
  "subscriptions.read",
    "usage.read",
    "billing.read",
  "system_settings.read",
  "infrastructure.read"
] as const;

export const ROLE_PERMISSIONS: Readonly<Record<PlatformRole, readonly PlatformPermission[]>> = {
  super_admin: PLATFORM_PERMISSIONS,
  platform_admin: PLATFORM_PERMISSIONS.filter((permission) => permission !== "users.roles.manage"),
  engineering: [
    "platform.dashboard.read",
    "workspaces.read",
    "workspaces.update",
    "feature_flags.read",
    "feature_flags.write",
    "infrastructure.read"
    ,"jobs.retry"
  ],
  security: [
    "platform.dashboard.read",
    "users.read",
    "users.suspend",
    "workspaces.suspend",
    "sessions.read",
    "sessions.revoke",
    "audit.read",
    "security.events.read",
    "security.events.manage",
    "infrastructure.read"
  ],
  support: [
    "platform.dashboard.read",
    "users.read",
    "workspaces.read",
    "workspaces.members.read",
    "projects.read",
    "sessions.read",
    "audit.read",
    "plans.read",
    "subscriptions.read",
    "usage.read",
    "billing.read"
  ],
  finance: [
    "platform.dashboard.read",
    "workspaces.read",
    "projects.read",
    "audit.read",
    "system_settings.read",
    "plans.read",
    "subscriptions.read",
    "billing.read",
    "billing.write"
  ],
  readonly: readOnly
};

export function isPlatformRole(value: string): value is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(value);
}

export function isPrivilegedPlatformRole(role: PlatformRole): boolean {
  return (
    role === "super_admin" ||
    role === "platform_admin" ||
    role === "engineering" ||
    role === "security"
  );
}

export function resolveEffectivePermissions(
  roles: readonly PlatformRole[]
): Set<PlatformPermission> {
  const permissions = new Set<PlatformPermission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role]) permissions.add(permission);
  }
  return permissions;
}

export function can(roles: readonly PlatformRole[], permission: PlatformPermission): boolean {
  return ALL.has(permission) && resolveEffectivePermissions(roles).has(permission);
}
