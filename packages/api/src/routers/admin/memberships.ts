import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db, recordAudit } from "@saasweave/db";
import { member, organization, user } from "@saasweave/db/schema";

import { hasFreshAdminStepUp } from "#@/lib/admin-step-up";
import { requirePlatformPermission } from "#@/lib/procedures/factory";

const workspaceRole = z.enum(["owner", "admin", "member"]);
const membershipInput = z.object({ userId: z.string().min(1), workspaceId: z.string().min(1) });

export const adminMembershipsRouter = {
  list: requirePlatformPermission("workspaces.members.read")
    .input(
      z.object({
        workspaceId: z.string().min(1),
        search: z.string().trim().max(160).optional(),
        limit: z.number().int().min(1).max(100).default(50)
      })
    )
    .handler(async ({ input }) => {
      const data = await db
        .select({
          membershipId: member.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          workspaceRole: member.role,
          joinedAt: member.createdAt
        })
        .from(member)
        .innerJoin(user, eq(user.id, member.userId))
        .where(
          and(
            eq(member.organizationId, input.workspaceId),
            input.search
              ? or(
                  ilike(user.email, `%${input.search}%`),
                  ilike(user.name, `%${input.search}%`),
                  ilike(user.id, `%${input.search}%`)
                )
              : undefined
          )
        )
        .limit(input.limit);
      return { data };
    }),
  add: requirePlatformPermission("memberships.add")
    .input(membershipInput.extend({ role: workspaceRole }))
    .handler(async ({ context, input }) => {
      await db.transaction(async (tx) => {
        const [workspace, target, duplicate] = await Promise.all([
          tx
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.id, input.workspaceId))
            .limit(1),
          tx.select({ id: user.id }).from(user).where(eq(user.id, input.userId)).limit(1),
          tx
            .select({ id: member.id })
            .from(member)
            .where(
              and(eq(member.organizationId, input.workspaceId), eq(member.userId, input.userId))
            )
            .limit(1)
        ]);
        if (!workspace[0] || !target[0]) throw new ORPCError("NOT_FOUND");
        if (duplicate[0]) throw new ORPCError("CONFLICT", { message: "MEMBERSHIP_EXISTS" });
        if (
          input.role === "owner" &&
          !(await hasFreshAdminStepUp(context.session.session.id, context.session.user.id))
        )
          {throw new ORPCError("FORBIDDEN", { message: "STEP_UP_REQUIRED" });}
        await tx.insert(member).values({
          id: randomUUID(),
          organizationId: input.workspaceId,
          userId: input.userId,
          role: input.role
        });
      });
      await recordAudit({
        actorId: context.session.user.id,
        actorName: context.session.user.name,
        action: "workspace.member_added",
        organizationId: input.workspaceId,
        targetType: "user",
        targetLabel: input.userId,
        metadata: { role: input.role }
      });
      return { ok: true };
    }),
  updateRole: requirePlatformPermission("memberships.update")
    .input(membershipInput.extend({ role: workspaceRole }))
    .handler(async ({ context, input }) => {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.workspaceId}))`);
        const [current] = await tx
          .select({ id: member.id, role: member.role })
          .from(member)
          .where(and(eq(member.organizationId, input.workspaceId), eq(member.userId, input.userId)))
          .limit(1);
        if (!current) throw new ORPCError("NOT_FOUND");
        if (current.role === "owner" && input.role !== "owner") {
          const [owners] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(member)
            .where(and(eq(member.organizationId, input.workspaceId), eq(member.role, "owner")));
          if (Number(owners?.count ?? 0) <= 1)
            {throw new ORPCError("CONFLICT", { message: "LAST_OWNER" });}
        }
        if (
          (current.role === "owner" || input.role === "owner") &&
          !(await hasFreshAdminStepUp(context.session.session.id, context.session.user.id))
        )
          {throw new ORPCError("FORBIDDEN", { message: "STEP_UP_REQUIRED" });}
        await tx.update(member).set({ role: input.role }).where(eq(member.id, current.id));
        await recordAudit({
          actorId: context.session.user.id,
          actorName: context.session.user.name,
          action: "workspace.member_role_changed",
          organizationId: input.workspaceId,
          targetType: "user",
          targetLabel: input.userId,
          metadata: { oldRole: current.role, newRole: input.role }
        });
      });
      return { ok: true };
    }),
  remove: requirePlatformPermission("memberships.remove")
    .input(membershipInput)
    .handler(async ({ context, input }) => {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.workspaceId}))`);
        const [current] = await tx
          .select({ id: member.id, role: member.role })
          .from(member)
          .where(and(eq(member.organizationId, input.workspaceId), eq(member.userId, input.userId)))
          .limit(1);
        if (!current) throw new ORPCError("NOT_FOUND");
        if (current.role === "owner") {
          const [owners] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(member)
            .where(and(eq(member.organizationId, input.workspaceId), eq(member.role, "owner")));
          if (Number(owners?.count ?? 0) <= 1)
            {throw new ORPCError("CONFLICT", { message: "LAST_OWNER" });}
          if (!(await hasFreshAdminStepUp(context.session.session.id, context.session.user.id)))
            {throw new ORPCError("FORBIDDEN", { message: "STEP_UP_REQUIRED" });}
        }
        await tx.delete(member).where(eq(member.id, current.id));
        await recordAudit({
          actorId: context.session.user.id,
          actorName: context.session.user.name,
          action: "workspace.member_removed",
          organizationId: input.workspaceId,
          targetType: "user",
          targetLabel: input.userId,
          metadata: { oldRole: current.role }
        });
      });
      return { ok: true };
    })
};
