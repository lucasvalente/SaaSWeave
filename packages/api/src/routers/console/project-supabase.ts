import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db, recordAudit } from "@saasweave/db";
import { project, projectSupabaseIntegration } from "@saasweave/db/schema";

import { canReadProjects, canWriteProjects } from "#@/lib/console-access";
import { operationalOrgProcedure, orgProcedure } from "#@/lib/procedures/factory";

const projectInput = z.object({ projectId: z.string().min(1) });

/**
 * Real deployments must use HTTPS. Local integration tests may target a
 * loopback Supabase gateway, but only when the server itself runs in an
 * explicit non-production environment.
 */
export function isAllowedSupabasePublicUrl(
  value: string,
  nodeEnv = process.env.NODE_ENV,
  allowE2eLoopback = process.env.E2E_ALLOW_LOOPBACK_SUPABASE_URL === "true"
): boolean {
  const url = new URL(value);
  if (url.protocol === "https:") return true;
  if (nodeEnv === "production" && !allowE2eLoopback) return false;
  return url.protocol === "http:" && ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
}

const publicConfig = z.object({
  projectRef: z.string().trim().min(1).max(128).regex(/^[a-z0-9-]+$/),
  publicUrl: z.string().url().max(500).refine(isAllowedSupabasePublicUrl, {
    message: "Supabase public URLs must use HTTPS outside explicit local test environments."
  }),
  publicAnonKey: z.string().trim().min(20).max(4096)
});

async function assertProject(workspaceId: string, projectId: string) {
  const [entry] = await db.select({ id: project.id }).from(project).where(and(eq(project.id, projectId), eq(project.workspaceId, workspaceId))).limit(1);
  if (!entry) throw new ORPCError("NOT_FOUND");
}

export const projectSupabaseRouter = {
  get: orgProcedure.input(projectInput).handler(async ({ context, input }) => {
    if (!canReadProjects(context.organization.role)) throw new ORPCError("FORBIDDEN");
    await assertProject(context.organization.id, input.projectId);
    const [entry] = await db.select({ projectRef: projectSupabaseIntegration.projectRef, publicUrl: projectSupabaseIntegration.publicUrl, publicAnonKey: projectSupabaseIntegration.publicAnonKey, status: projectSupabaseIntegration.status, updatedAt: projectSupabaseIntegration.updatedAt }).from(projectSupabaseIntegration).where(and(eq(projectSupabaseIntegration.projectId, input.projectId), eq(projectSupabaseIntegration.workspaceId, context.organization.id))).limit(1);
    return entry ?? { status: "not_configured" as const, projectRef: null, publicUrl: null, publicAnonKey: null, updatedAt: null };
  }),
  configure: operationalOrgProcedure.input(projectInput.extend(publicConfig.shape)).handler(async ({ context, input }) => {
    if (!canWriteProjects(context.organization.role)) throw new ORPCError("FORBIDDEN");
    await assertProject(context.organization.id, input.projectId);
    const values = { projectRef: input.projectRef, publicUrl: input.publicUrl, publicAnonKey: input.publicAnonKey, status: "configured", updatedAt: new Date() };
    const [entry] = await db.insert(projectSupabaseIntegration).values({ id: randomUUID(), projectId: input.projectId, workspaceId: context.organization.id, ...values }).onConflictDoUpdate({ target: projectSupabaseIntegration.projectId, set: values }).returning({ projectRef: projectSupabaseIntegration.projectRef, publicUrl: projectSupabaseIntegration.publicUrl, publicAnonKey: projectSupabaseIntegration.publicAnonKey, status: projectSupabaseIntegration.status, updatedAt: projectSupabaseIntegration.updatedAt });
    await recordAudit({ actorId: context.session.user.id, actorName: context.session.user.name, action: "project.supabase_configured", organizationId: context.organization.id, targetType: "project", targetLabel: input.projectId, metadata: { projectRef: input.projectRef } });
    return entry;
  })
};
