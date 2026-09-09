import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, project, sandboxSession } from "@saasweave/db";
import { orgProcedure } from "#@/lib/procedures/factory";
import type { SandboxRuntimeAdapter } from "#@/sandbox/runtime-adapter";
import { HttpRuntimeControllerClient } from "#@/sandbox/runtime-controller";
import { startPreview } from "#@/sandbox/start-preview";
import { issuePreviewToken } from "#@/sandbox/preview-gateway";

const input = z.object({ projectId: z.string().min(1) });
/**
 * A preview is always rooted in an immutable, committed snapshot.  Keeping
 * this separate from the list input prevents callers from accidentally
 * bypassing materialization, validation, and the canonical lifecycle.
 */
export const createSandboxPreviewInput = input.extend({ snapshotId: z.string().min(1) });
const lifecycle = input.extend({ sessionId: z.string().min(1) });
const controllerUrl = process.env.SANDBOX_RUNTIME_CONTROLLER_URL ?? "http://sandbox-runtime:8787";
const runtime: SandboxRuntimeAdapter = new HttpRuntimeControllerClient(controllerUrl, (input, init) => fetch(input, { ...init, headers: { ...(init?.headers ?? {}), authorization: `Bearer ${process.env.RUNTIME_CONTROLLER_TOKEN ?? ""}` } })) as unknown as SandboxRuntimeAdapter;
async function assertProject(context: { organization: { id: string } }, projectId: string) {
  const [row] = await db.select({ id: project.id }).from(project).where(and(eq(project.id, projectId), eq(project.workspaceId, context.organization.id))).limit(1);
  if (!row) throw new ORPCError("NOT_FOUND");
}
async function getSession(context: { organization: { id: string } }, sessionId: string) {
  const [row] = await db.select().from(sandboxSession).where(and(eq(sandboxSession.id, sessionId), eq(sandboxSession.workspaceId, context.organization.id))).limit(1);
  if (!row) throw new ORPCError("NOT_FOUND");
  return row;
}
export const sandboxRouter = {
  list: orgProcedure.input(input).handler(async ({ context, input }) => { await assertProject(context, input.projectId); return db.select().from(sandboxSession).where(and(eq(sandboxSession.projectId, input.projectId), eq(sandboxSession.workspaceId, context.organization.id))).orderBy(desc(sandboxSession.updatedAt)); }),
  previewUrl: orgProcedure.input(lifecycle).handler(async ({ context, input }) => {
    const row = await getSession(context, input.sessionId);
    if (row.projectId !== input.projectId || row.status !== "running" || !row.previewReadyAt) throw new ORPCError("CONFLICT");
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) throw new ORPCError("INTERNAL_SERVER_ERROR");
    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const token = issuePreviewToken({ projectId: input.projectId, workspaceId: context.organization.id, subjectId: context.session.user.id, sandboxId: row.id, expiresAt }, secret);
    const base = process.env.VITE_SERVER_URL ?? "http://localhost:5000/server";
    return { url: `${base}/preview/${encodeURIComponent(input.projectId)}/${encodeURIComponent(row.id)}?token=${encodeURIComponent(token)}`, expiresAt };
  }),
  create: orgProcedure.input(createSandboxPreviewInput).handler(({ context, input }) =>
    startPreview({
      workspaceId: context.organization.id,
      projectId: input.projectId,
      snapshotId: input.snapshotId,
      actorId: context.session.user.id,
    }, runtime),
  ),
  inspect: orgProcedure.input(lifecycle).handler(async ({ context, input }) => { const row = await getSession(context, input.sessionId); if (row.projectId !== input.projectId) throw new ORPCError("NOT_FOUND"); if (!row.runtimeId || !runtime.inspect) return row; const state = await runtime.inspect(row.runtimeId); const [updated] = await db.update(sandboxSession).set({ status: state.status, updatedAt: new Date() }).where(eq(sandboxSession.id, row.id)).returning(); return updated; }),
  start: orgProcedure.input(lifecycle).handler(async ({ context, input }) => { const row = await getSession(context, input.sessionId); if (row.projectId !== input.projectId || !row.runtimeId || !runtime.start) throw new ORPCError("CONFLICT"); await runtime.start(row.runtimeId); const [updated] = await db.update(sandboxSession).set({ status: "running", updatedAt: new Date() }).where(eq(sandboxSession.id, row.id)).returning(); return updated; }),
  stop: orgProcedure.input(lifecycle).handler(async ({ context, input }) => { const row = await getSession(context, input.sessionId); if (row.projectId !== input.projectId) throw new ORPCError("NOT_FOUND"); if (row.status === "stopped") return row; if (row.runtimeId) await runtime.stop(row.runtimeId); const [updated] = await db.update(sandboxSession).set({ status: "stopped", previewHostIp: null, previewHostPort: null, previewReadyAt: null, updatedAt: new Date() }).where(eq(sandboxSession.id, row.id)).returning(); return updated; }),
  restart: orgProcedure.input(lifecycle).handler(async ({ context, input }) => {
    const row = await getSession(context, input.sessionId);
    const snapshotId = (row.metadata as { snapshotId?: string } | null)?.snapshotId;
    if (row.projectId !== input.projectId || !row.runtimeId || !snapshotId) throw new ORPCError("NOT_FOUND");
    await runtime.stop(row.runtimeId).catch(() => undefined);
    await db.update(sandboxSession).set({ status: "stopped", previewHostIp: null, previewHostPort: null, previewReadyAt: null, updatedAt: new Date() }).where(eq(sandboxSession.id, row.id));
    return startPreview({ workspaceId: context.organization.id, projectId: input.projectId, snapshotId, actorId: context.session.user.id }, runtime);
  })
};
