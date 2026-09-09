export const DEFAULT_SANDBOX_TTL_MS = 30 * 60 * 1000;
export function boundSandboxOutput(value: string, maxBytes = 16_384): string {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.byteLength <= maxBytes) return value;
  return `${bytes.subarray(0, maxBytes).toString("utf8")}\n[output truncated]`;
}
export function sandboxExpiry(now = new Date(), ttlMs = DEFAULT_SANDBOX_TTL_MS): Date {
  return new Date(now.getTime() + ttlMs);
}
