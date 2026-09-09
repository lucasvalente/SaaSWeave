import { and, eq, lt, or, isNotNull } from "drizzle-orm";
import { db, sandboxSession } from "@saasweave/db";
import type { SandboxRuntimeAdapter } from "./runtime-adapter";
import { probeSandboxHealth, type HealthResult } from "./health-supervisor";
export { boundSandboxOutput, sandboxExpiry, DEFAULT_SANDBOX_TTL_MS } from "./safety";

export async function cleanupExpiredSandboxes(runtime: SandboxRuntimeAdapter, now = new Date()): Promise<number> {
  const rows = await db.select().from(sandboxSession).where(and(isNotNull(sandboxSession.expiresAt), lt(sandboxSession.expiresAt, now), or(eq(sandboxSession.status, "created"), eq(sandboxSession.status, "running"))));
  for (const row of rows) {
    if (row.runtimeId) await runtime.stop(row.runtimeId).catch(() => undefined);
    await db.update(sandboxSession).set({
      status: "stopped",
      previewHostIp: null,
      previewHostPort: null,
      previewReadyAt: null,
      updatedAt: now,
      lastActivityAt: now
    }).where(eq(sandboxSession.id, row.id));
  }
  return rows.length;
}

/** Reconciles persisted running sessions whose runtime no longer exists. */
export async function reconcileSandboxSessions(runtime: SandboxRuntimeAdapter): Promise<number> {
  if (!runtime.inspect) return 0;
  // Read every persisted session so controller-managed runtimes left behind by
  // an interrupted stop/failure path can be identified as orphans as well.
  const rows = await db.select().from(sandboxSession).where(isNotNull(sandboxSession.id));
  let changed = 0;
  for (const row of rows) {
    if (row.status !== "running") continue;
    // A running database row without a controller runtime cannot serve a
    // preview.  Treat it exactly like a runtime lost during an interruption.
    if (!row.runtimeId) {
      await db.update(sandboxSession).set({ status: "failed", previewHostIp: null, previewHostPort: null, previewReadyAt: null, updatedAt: new Date() }).where(eq(sandboxSession.id, row.id));
      changed++;
      continue;
    }
    try {
      const state = await runtime.inspect(row.runtimeId);
      if (state.status !== row.status) {
        await db.update(sandboxSession).set({ status: state.status, previewHostIp: null, previewHostPort: null, previewReadyAt: null, updatedAt: new Date() }).where(eq(sandboxSession.id, row.id));
        changed++;
        continue;
      }
      // A runtime can outlive its published port (for example after a
      // controller restart). Do not keep issuing a Ready preview URL based on
      // a stale DB mapping. The next explicit start/restart revalidates it.
      if (runtime.inspectPublishedPort) {
        const mapping = await runtime.inspectPublishedPort(row.runtimeId, row.previewContainerPort ?? 4173);
        if (!mapping || mapping.hostIp !== "127.0.0.1" || mapping.containerPort !== (row.previewContainerPort ?? 4173)) {
          await db.update(sandboxSession).set({ previewHostIp: null, previewHostPort: null, previewReadyAt: null, updatedAt: new Date() }).where(eq(sandboxSession.id, row.id));
          changed++;
        }
      }
    } catch {
      await db.update(sandboxSession).set({ status: "failed", previewHostIp: null, previewHostPort: null, previewReadyAt: null, updatedAt: new Date() }).where(eq(sandboxSession.id, row.id));
      changed++;
    }
  }
  if (runtime.listManaged) {
    const liveSessionRuntimeIds = new Set(rows.filter((row) => row.status === "created" || row.status === "running").map((row) => row.runtimeId).filter((id): id is string => Boolean(id)));
    const managed = await runtime.listManaged().catch(() => []);
    for (const orphan of managed) {
      if (!liveSessionRuntimeIds.has(orphan.id)) {
        await runtime.stop(orphan.id).then(() => { changed++; }).catch(() => undefined);
      }
    }
  }
  return changed;
}

/** Marks a sandbox running only after its dev endpoint answers healthy. */
export async function superviseSandboxStartup(healthUrl: string, timeoutMs = 30_000): Promise<HealthResult> {
  return probeSandboxHealth(healthUrl, timeoutMs);
}

/** A runtime is RUNNING only after its controlled HTTP endpoint is healthy. */
export async function startSandboxWithHealth(runtime: SandboxRuntimeAdapter, runtimeId: string, healthUrl: string, persist: (status: "running" | "failed") => Promise<void>, timeoutMs = 30_000): Promise<HealthResult> {
  try {
    await runtime.start?.(runtimeId);
    const health = await superviseSandboxStartup(healthUrl, timeoutMs);
    await persist(health.healthy ? "running" : "failed");
    return health;
  } catch {
    await persist("failed");
    return { healthy: false, elapsedMs: 0, error: "UNREACHABLE" };
  }
}
