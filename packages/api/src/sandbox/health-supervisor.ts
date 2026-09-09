export type HealthResult = { healthy: boolean; status?: number; elapsedMs: number; error?: "TIMEOUT" | "UNREACHABLE" };

export async function probeSandboxHealth(url: string, timeoutMs = 5000, fetchImpl: typeof fetch = fetch): Promise<HealthResult> {
  const started = Date.now();
  let lastStatus: number | undefined;
  do {
    const remaining = timeoutMs - (Date.now() - started);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1, Math.min(2_000, remaining)));
    try {
      const response = await fetchImpl(url, { signal: controller.signal, redirect: "error" });
      lastStatus = response.status;
      if (response.ok) return { healthy: true, status: response.status, elapsedMs: Date.now() - started };
    } catch { /* The dev server may still be binding; retry until the deadline. */ }
    finally { clearTimeout(timer); }
    if (Date.now() - started < timeoutMs) await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() - started < timeoutMs);
  return { healthy: false, status: lastStatus, elapsedMs: Date.now() - started, error: "TIMEOUT" };
}
