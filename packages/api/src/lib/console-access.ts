export const BILLING_MANAGER_ROLES = ["owner", "admin", "billing"] as const;
export const API_KEY_MANAGER_ROLES = ["owner", "admin", "developer"] as const;
export const USAGE_RECORDER_ROLES = ["owner", "admin", "developer"] as const;
export const PROJECT_READER_ROLES = ["owner", "admin", "member", "developer"] as const;
export const PROJECT_WRITER_ROLES = ["owner", "admin", "developer"] as const;

export function canManageBilling(role: string): boolean {
  return BILLING_MANAGER_ROLES.includes(role as (typeof BILLING_MANAGER_ROLES)[number]);
}

export function canManageApiKeys(role: string): boolean {
  return API_KEY_MANAGER_ROLES.includes(role as (typeof API_KEY_MANAGER_ROLES)[number]);
}

export function canRecordUsage(role: string): boolean {
  return USAGE_RECORDER_ROLES.includes(role as (typeof USAGE_RECORDER_ROLES)[number]);
}

export function canReadProjects(role: string): boolean {
  return PROJECT_READER_ROLES.includes(role as (typeof PROJECT_READER_ROLES)[number]);
}

export function canWriteProjects(role: string): boolean {
  return PROJECT_WRITER_ROLES.includes(role as (typeof PROJECT_WRITER_ROLES)[number]);
}
