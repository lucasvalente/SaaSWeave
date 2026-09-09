import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, project, sandboxSession } from "@saasweave/db";
import { builderSnapshot, projectSupabaseIntegration } from "@saasweave/db/schema";
import { materializeBuilderSnapshot } from "./snapshot-materializer";
import type { SandboxRuntimeAdapter } from "./runtime-adapter";
import { probeSandboxHealth } from "./health-supervisor";
import { sandboxExpiry } from "./lifecycle";
import { coordinatePreviewStart, previewStartKey } from "./preview-start-coordinator";

export type StartPreviewInput = { workspaceId: string; projectId: string; snapshotId: string; actorId: string };

/** Canonical application service for the preview lifecycle. */
export async function startPreview(input: StartPreviewInput, runtime: SandboxRuntimeAdapter) {
  return coordinatePreviewStart(previewStartKey(input.workspaceId, input.projectId), () => startPreviewOnce(input, runtime));
}

async function startPreviewOnce(input: StartPreviewInput, runtime: SandboxRuntimeAdapter) {
  const [snapshot] = await db.select().from(builderSnapshot).innerJoin(project, eq(builderSnapshot.projectId, project.id)).where(and(eq(builderSnapshot.id, input.snapshotId), eq(builderSnapshot.projectId, input.projectId), eq(project.workspaceId, input.workspaceId))).limit(1);
  if (!snapshot || snapshot.builder_snapshot.source === "draft") throw new Error("SNAPSHOT_NOT_COMMITTED");
  const sandboxId = randomUUID();
  const workspaceParent = await mkdtemp(join(tmpdir(), "saasweave-preview-"));
  const workspace = join(workspaceParent, "workspace");
  let runtimeId: string | undefined;
  try {
    await materializeBuilderSnapshot({ id: snapshot.builder_snapshot.id, source: snapshot.builder_snapshot.source, manifest: snapshot.builder_snapshot.manifest as Record<string, unknown> }, workspace);
    const [supabase] = await db.select({ publicUrl: projectSupabaseIntegration.publicUrl, publicAnonKey: projectSupabaseIntegration.publicAnonKey }).from(projectSupabaseIntegration).where(and(eq(projectSupabaseIntegration.projectId, input.projectId), eq(projectSupabaseIntegration.workspaceId, input.workspaceId))).limit(1);
    const ready = await db.transaction(async (tx) => {
      // Hold the distributed lock until runtime creation and readiness are
      // committed, so concurrent replicas cannot create duplicate runtimes.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${previewStartKey(input.workspaceId, input.projectId)}))`);
      const [active] = await tx.select().from(sandboxSession).where(and(eq(sandboxSession.projectId, input.projectId), eq(sandboxSession.workspaceId, input.workspaceId), eq(sandboxSession.status, "running"))).limit(1);
      if (active?.runtimeId) {
        const state = await runtime.inspect?.(active.runtimeId).catch(() => undefined);
        const activeMapping = state?.status === "running" ? await runtime.inspectPublishedPort?.(active.runtimeId, 4173).catch(() => null) : null;
        if (state?.status === "running" && activeMapping?.hostIp === "127.0.0.1" && activeMapping.containerPort === 4173) return active;
        await tx.update(sandboxSession).set({ status: "failed", previewHostIp: null, previewHostPort: null, previewReadyAt: null, updatedAt: new Date() }).where(eq(sandboxSession.id, active.id));
      }

      const created = await runtime.create({ image: "saasweave-sandbox:1.0.3", workspacePath: workspace, network: "none", preview: true, internalPort: 4173, memoryMb: 512, cpuCount: 1, publicEnv: supabase ? { VITE_SUPABASE_URL: supabase.publicUrl, VITE_SUPABASE_ANON_KEY: supabase.publicAnonKey } : undefined });
      runtimeId = created.id;
      const mapping = await runtime.inspectPublishedPort?.(runtimeId, 4173);
      if (!mapping || mapping.hostIp !== "127.0.0.1" || mapping.containerPort !== 4173) throw new Error("INVALID_PREVIEW_MAPPING");
      await tx.insert(sandboxSession).values({ id: sandboxId, projectId: input.projectId, workspaceId: input.workspaceId, createdBy: input.actorId, status: "created", runtimeId, previewContainerPort: 4173, previewHostIp: mapping.hostIp, previewHostPort: mapping.hostPort, expiresAt: sandboxExpiry(), lastActivityAt: new Date(), metadata: { snapshotId: input.snapshotId } });
      const install = await runtime.exec?.(runtimeId, "install");
      if (!install || install.exitCode !== 0) throw new Error(`INSTALL_FAILED:${(`${install?.stdout ?? ""}\n${install?.stderr ?? ""}`).slice(-500)}`);
      const build = await runtime.exec?.(runtimeId, "build");
      if (!build || build.exitCode !== 0) throw new Error(`BUILD_FAILED:${(`${build?.stdout ?? ""}\n${build?.stderr ?? ""}`).slice(-500)}`);
      const dev = await runtime.startProcess?.(runtimeId, "dev");
      if (!dev || !dev.alive()) throw new Error(`DEV_START_FAILED:${dev?.stderr() ?? ""}`);
      // Published preview ports are loopback-only on the Docker host. The
      // application server reaches that host boundary through Docker's
      // canonical internal hostname while persisting the verified loopback
      // mapping itself.
      const healthHost = process.env.SANDBOX_PREVIEW_HOST ?? "host.docker.internal";
      const health = await probeSandboxHealth(`http://${healthHost}:${mapping.hostPort}`, 30_000);
      if (!health.healthy) {
        const diagnostics = await runtime.diagnose?.(runtimeId).catch(() => undefined);
        throw new Error(`HEALTH_FAILED:${JSON.stringify({ alive: dev.alive(), exitCode: dev.exitCode(), stderr: dev.stderr().slice(-240), diagnostics })}`);
      }
      const [persisted] = await tx.update(sandboxSession).set({ status: "running", previewReadyAt: new Date(), updatedAt: new Date() }).where(eq(sandboxSession.id, sandboxId)).returning();
      if (!persisted) throw new Error("PREVIEW_PERSIST_FAILED");
      return persisted;
    });
    if (ready.id !== sandboxId) await rm(workspaceParent, { recursive: true, force: true }).catch(() => undefined);
    return ready;
  } catch (error) {
    if (runtimeId) await runtime.stop(runtimeId).catch(() => undefined);
    await db.delete(sandboxSession).where(eq(sandboxSession.id, sandboxId)).catch(() => undefined);
    await rm(workspaceParent, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}
