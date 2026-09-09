const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api.?key|backup.?code/i;
export type SecuritySeverity = "info" | "warning" | "critical";
export type SafeSecurityMetadataValue = string | number | boolean | null;
export type SecurityEventType =
  | "authentication.failure"
  | "mfa.enrollment_required"
  | "mfa.challenge_failed"
  | "session.revoked"
  | "session.revoked_others"
  | "tenant.access_denied"
  | "permission.denied";

export function sanitizeSecurityMetadata(
  value: Record<string, unknown> | undefined
): Record<string, SafeSecurityMetadataValue> | null {
  if (!value) return null;
  const entries: Array<[string, SafeSecurityMetadataValue]> = Object.entries(value).map(
    ([key, item]): [string, SafeSecurityMetadataValue] => {
      if (SENSITIVE_KEY.test(key)) return [key, "[redacted]"];
      if (typeof item === "string") return [key, item.slice(0, 512)];
      if (typeof item === "number" || typeof item === "boolean" || item === null) {
        return [key, item];
      }
      return [key, "[complex value omitted]"];
    }
  );
  return Object.fromEntries(entries);
}

/** Prevents BOLA/IDOR disclosure by returning no resource detail to callers. */
export function assertTenantScope(
  expectedOrganizationId: string,
  resourceOrganizationId: string
): void {
  if (expectedOrganizationId !== resourceOrganizationId) throw new Error("TENANT_SCOPE_VIOLATION");
}
