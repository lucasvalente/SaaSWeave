const startsInFlight = new Map<string, Promise<unknown>>();

export function previewStartKey(workspaceId: string, projectId: string): string {
  return `${workspaceId}:${projectId}`;
}

/**
 * Coalesces concurrent preview requests handled by the same server process.
 *
 * The database advisory lock remains the cross-process authority. This small
 * local barrier avoids duplicate snapshot materialization while the first
 * request is waiting for that lock or provisioning the runtime.
 */
export function coordinatePreviewStart<T>(key: string, start: () => Promise<T>): Promise<T> {
  const current = startsInFlight.get(key);
  if (current) return current as Promise<T>;

  const pending = start();
  startsInFlight.set(key, pending);
  void pending.finally(() => {
    if (startsInFlight.get(key) === pending) startsInFlight.delete(key);
  }).catch(() => undefined);
  return pending;
}
