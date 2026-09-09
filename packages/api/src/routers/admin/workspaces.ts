import { ORPCError } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db, getOrganizationActivity, getPlatformRoles, recordAudit } from "@saasweave/db";
import { organization, project, user } from "@saasweave/db/schema";
import { can } from "@saasweave/permissions";

import { listFeaturesForOrg } from "#@/lib/features";
import { getPlanCatalog, resolvePlanEntry } from "#@/lib/plans";
import { requirePlatformPermission } from "#@/lib/procedures/factory";
import { getTeam } from "#@/routers/console/team";

export const adminWorkspacesRouter = {
  detail: requirePlatformPermission("workspaces.read")
    .route({
      description:
        "Full detail for a single workspace: plan, team, activity, and feature overrides",
      method: "GET"
    })
    .errors({
      WORKSPACE_NOT_FOUND: { description: "No workspace with this id exists", status: 404 }
    })
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ context, errors, input }) => {
      const [org] = await db
        .select()
        .from(organization)
        .where(eq(organization.id, input.id))
        .limit(1);
      if (!org) throw errors.WORKSPACE_NOT_FOUND();

      const catalog = await getPlanCatalog();
      const plan = resolvePlanEntry(catalog, org.planId);
      const roles = await getPlatformRoles(context.session.user.id, context.session.user.role);

      const [team, activity, features, projectCounts, suspendedBy] = await Promise.all([
        can(roles, "workspaces.members.read")
          ? getTeam(org.id, plan.seats)
          : { members: [], invitations: [] },
        can(roles, "audit.read") ? getOrganizationActivity(org.id, 30) : [],
        can(roles, "feature_flags.read") ? listFeaturesForOrg(org.id, org.planId) : [],
        db
          .select({
            active: sql<number>`count(*) filter (where ${project.status} = 'active')::int`,
            archived: sql<number>`count(*) filter (where ${project.status} = 'archived')::int`,
            total: sql<number>`count(*)::int`
          })
          .from(project)
          .where(eq(project.workspaceId, org.id)),
        org.suspendedBy
          ? db
              .select({ email: user.email, id: user.id, name: user.name })
              .from(user)
              .where(eq(user.id, org.suspendedBy))
              .limit(1)
          : Promise.resolve([])
      ]);
      const owner = team.members.find((entry) => entry.role === "owner");

      return {
        activity,
        createdAt: org.createdAt.toISOString(),
        features,
        id: org.id,
        memberCount: team.members.length,
        name: org.name,
        operationalStatus: org.operationalStatus === "suspended" ? "suspended" : "active",
        owner: owner ? { email: owner.email, name: owner.name } : null,
        plan: {
          id: org.planId ?? "free",
          mrr: plan.price,
          name: plan.name,
          seatsIncluded: plan.seats
        },
        activeProjectCount: Number(projectCounts[0]?.active ?? 0),
        archivedProjectCount: Number(projectCounts[0]?.archived ?? 0),
        projectCount: Number(projectCounts[0]?.total ?? 0),
        slug: org.slug,
        suspendedAt: org.suspendedAt?.toISOString() ?? null,
        suspendedBy: suspendedBy[0] ?? null,
        suspensionReason: org.suspensionReason,
        status: org.subscriptionStatus ?? "active",
        stripeCustomerId: org.stripeCustomerId,
        team: { invitations: team.invitations, members: team.members },
        updatedAt: org.updatedAt.toISOString()
      };
    }),

  updatePlan: requirePlatformPermission("workspaces.update")
    .route({ description: "Manually reassign a workspace's plan", method: "POST" })
    .errors({
      WORKSPACE_NOT_FOUND: { description: "No workspace with this id exists", status: 404 }
    })
    .input(z.object({ id: z.string().min(1), planId: z.string().min(1) }))
    .handler(async ({ context, errors, input }) => {
      const rows = await db
        .update(organization)
        .set({ planId: input.planId, updatedAt: new Date() })
        .where(eq(organization.id, input.id))
        .returning({ id: organization.id, name: organization.name });
      const org = rows[0];
      if (!org) throw errors.WORKSPACE_NOT_FOUND();

      await recordAudit({
        actorId: context.session.user.id,
        actorName: context.session.user.name,
        action: "workspace.plan_changed",
        metadata: { planId: input.planId },
        organizationId: org.id,
        targetLabel: org.name,
        targetType: "organization"
      });
      return { ok: true };
    }),

  suspend: requirePlatformPermission("workspaces.suspend")
    .input(z.object({ id: z.string().min(1), reason: z.string().trim().min(3).max(500) }))
    .handler(async ({ context, input }) => {
      const [workspace] = await db
        .update(organization)
        .set({
          operationalStatus: "suspended",
          suspendedAt: new Date(),
          suspendedBy: context.session.user.id,
          suspensionReason: input.reason,
          updatedAt: new Date()
        })
        .where(and(eq(organization.id, input.id), eq(organization.operationalStatus, "active")))
        .returning({ id: organization.id, name: organization.name });
      if (!workspace)
        {throw new ORPCError("CONFLICT", {
          message: "Workspace is already suspended or unavailable."
        });}
      await recordAudit({
        actorId: context.session.user.id,
        actorName: context.session.user.name,
        action: "workspace.suspended",
        metadata: { reason: input.reason, workspaceId: workspace.id },
        organizationId: workspace.id,
        targetLabel: workspace.name,
        targetType: "organization"
      });
      return { ok: true };
    }),

  reactivate: requirePlatformPermission("workspaces.suspend")
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const [workspace] = await db
        .update(organization)
        .set({
          operationalStatus: "active",
          suspendedAt: null,
          suspendedBy: null,
          suspensionReason: null,
          updatedAt: new Date()
        })
        .where(and(eq(organization.id, input.id), eq(organization.operationalStatus, "suspended")))
        .returning({ id: organization.id, name: organization.name });
      if (!workspace)
        {throw new ORPCError("CONFLICT", { message: "Workspace is already active or unavailable." });}
      await recordAudit({
        actorId: context.session.user.id,
        actorName: context.session.user.name,
        action: "workspace.reactivated",
        metadata: { workspaceId: workspace.id },
        organizationId: workspace.id,
        targetLabel: workspace.name,
        targetType: "organization"
      });
      return { ok: true };
    })
};
