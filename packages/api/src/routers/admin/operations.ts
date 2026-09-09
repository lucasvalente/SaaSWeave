import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, exists, ilike, or, sql, gt, lte } from "drizzle-orm";
import { z } from "zod";

import {
  db,
  getPlatformAuditLog,
  getPlatformRoles,
  listSecurityEvents,
  recordAudit,
  recordSecurityEvent
} from "@saasweave/db";
import {
  auditLog,
  member,
  organization,
  project,
  platformRoleAssignment,
  securityEvent,
  session,
  user
} from "@saasweave/db/schema";
import {
  PLATFORM_ROLES,
  ROLE_PERMISSIONS,
  can,
  isPlatformRole,
  type PlatformRole,
  resolveEffectivePermissions
} from "@saasweave/permissions";

import { hasFreshAdminStepUp, verifyAndRecordAdminStepUp } from "#@/lib/admin-step-up";
import { protectedProcedure, requirePlatformPermission } from "#@/lib/procedures/factory";

const pageInput = z.object({
  cursor: z
    .string()
    .regex(/^(0|[1-9]\d*)$/)
    .refine((value) => Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647)
    .optional(),
  limit: z.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  role: z.enum(PLATFORM_ROLES).optional(),
  mfa: z.boolean().optional(),
  sort: z.enum(["createdAt.desc", "createdAt.asc"]).default("createdAt.desc")
});

function cursorOffset(cursor: string | undefined): number {
  return cursor ? Math.max(0, Number.parseInt(cursor, 10) || 0) : 0;
}
const eventInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(2147483647).default(0),
  actor: z.string().trim().max(200).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional()
});
const validRange = (input: { from?: string; to?: string }) =>
  !input.from || !input.to || input.from <= input.to;
function nextCursor(offset: number, received: number, limit: number): string | null {
  return received > limit ? String(offset + limit) : null;
}

export const adminOperationsRouter = {
  access: protectedProcedure.route({ method: "GET" }).handler(async ({ context }) => {
    const roles = await getPlatformRoles(context.session.user.id, context.session.user.role);
    return { roles, permissions: [...resolveEffectivePermissions(roles)] };
  }),
  search: requirePlatformPermission("platform.dashboard.read")
    .input(z.object({ search: z.string().trim().min(2).max(200) }))
    .route({ method: "GET" })
    .handler(async ({ context, input }) => {
      const roles = await getPlatformRoles(context.session.user.id, context.session.user.role);
      const [users, workspaces] = await Promise.all([
        can(roles, "users.read")
          ? db
              .select({ id: user.id, name: user.name, email: user.email })
              .from(user)
              .where(ilike(user.email, `%${input.search}%`))
              .orderBy(asc(user.email), asc(user.id))
              .limit(10)
          : [],
        can(roles, "workspaces.read")
          ? db
              .select({ id: organization.id, name: organization.name })
              .from(organization)
              .where(ilike(organization.name, `%${input.search}%`))
              .orderBy(asc(organization.name), asc(organization.id))
              .limit(10)
          : []
      ]);
      return { users, workspaces };
    }),
  auth: {
    stepUp: requirePlatformPermission("platform.dashboard.read")
      .input(z.object({ code: z.string().regex(/^\d{6}$/) }))
      .route({ method: "POST" })
      .handler(async ({ context, input }) => {
        const ok = await verifyAndRecordAdminStepUp({
          code: input.code,
          headers: context.headers,
          sessionId: context.session.session.id,
          userId: context.session.user.id,
          ip: context.clientIp
        });
        if (!ok) {
          await recordSecurityEvent({
            type: "mfa.challenge_failed",
            severity: "warning",
            actorUserId: context.session.user.id,
            requestId: context.requestId,
            traceId: context.traceId,
            ipAddress: context.clientIp
          });
          throw new ORPCError("FORBIDDEN", { message: "Step-up verification failed." });
        }
        await recordAudit({
          actorId: context.session.user.id,
          actorName: context.session.user.name,
          action: "admin.step_up.completed",
          targetType: "session",
          targetLabel: context.session.session.id
        });
        return { ok: true, expiresInSeconds: 300 };
      })
  },
  users: {
    list: requirePlatformPermission("users.read")
      .input(pageInput)
      .route({ method: "GET" })
      .handler(async ({ input }) => {
        const offset = cursorOffset(input.cursor);
        const where = and(
          input.search ? ilike(user.email, `%${input.search}%`) : undefined,
          input.status === "active" ? sql`coalesce(${user.banned}, false) = false` : undefined,
          input.status === "suspended" ? eq(user.banned, true) : undefined,
          input.mfa === undefined
            ? undefined
            : input.mfa
              ? eq(user.twoFactorEnabled, true)
              : sql`coalesce(${user.twoFactorEnabled}, false) = false`,
          input.role
            ? exists(
                db
                  .select({ id: platformRoleAssignment.id })
                  .from(platformRoleAssignment)
                  .where(
                    and(
                      eq(platformRoleAssignment.userId, user.id),
                      eq(platformRoleAssignment.role, input.role)
                    )
                  )
              )
            : undefined
        );
        const rows = await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            banned: user.banned,
            role: user.role,
            twoFactorEnabled: user.twoFactorEnabled,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          })
          .from(user)
          .where(where)
          .orderBy(
            input.sort === "createdAt.asc" ? asc(user.createdAt) : desc(user.createdAt),
            asc(user.id)
          )
          .limit(input.limit + 1)
          .offset(offset);
        const visible = rows.slice(0, input.limit);
        const roles = await Promise.all(
          visible.map(async (entry) => {
            return { id: entry.id, roles: await getPlatformRoles(entry.id, entry.role) };
          })
        );
        return {
          data: visible.map((entry) => {
            return { ...entry, roles: roles.find((row) => row.id === entry.id)?.roles ?? [] };
          }),
          meta: { nextCursor: nextCursor(offset, rows.length, input.limit) }
        };
      }),
    detail: requirePlatformPermission("users.read")
      .input(z.object({ id: z.string().min(1) }))
      .route({ method: "GET" })
      .handler(async ({ input }) => {
        const [entry] = await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            banned: user.banned,
            role: user.role,
            twoFactorEnabled: user.twoFactorEnabled,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          })
          .from(user)
          .where(eq(user.id, input.id))
          .limit(1);
        if (!entry) throw new ORPCError("NOT_FOUND");
        const [roles, sessions, workspaces, audit, securityEvents] = await Promise.all([
          getPlatformRoles(entry.id, entry.role),
          db
            .select({
              id: session.id,
              createdAt: session.createdAt,
              updatedAt: session.updatedAt,
              expiresAt: session.expiresAt,
              ipAddress: session.ipAddress,
              userAgent: session.userAgent
            })
            .from(session)
            .where(eq(session.userId, entry.id))
            .orderBy(desc(session.updatedAt))
            .limit(100),
          db
            .select({
              joinedAt: member.createdAt,
              id: organization.id,
              name: organization.name,
              operationalStatus: organization.operationalStatus,
              projectCount: sql<number>`(
                select count(*)::int from ${project}
                where ${project.workspaceId} = ${organization.id}
              )`,
              role: member.role,
              slug: organization.slug
            })
            .from(member)
            .innerJoin(organization, eq(member.organizationId, organization.id))
            .where(eq(member.userId, entry.id))
            .orderBy(desc(member.createdAt)),
          db
            .select({
              action: auditLog.action,
              createdAt: auditLog.createdAt,
              id: auditLog.id,
              targetLabel: auditLog.targetLabel
            })
            .from(auditLog)
            .where(or(eq(auditLog.actorId, entry.id), eq(auditLog.targetLabel, entry.id)))
            .orderBy(desc(auditLog.createdAt))
            .limit(20),
          db
            .select({
              createdAt: securityEvent.createdAt,
              id: securityEvent.id,
              severity: securityEvent.severity,
              type: securityEvent.type
            })
            .from(securityEvent)
            .where(
              or(eq(securityEvent.actorUserId, entry.id), eq(securityEvent.targetId, entry.id))
            )
            .orderBy(desc(securityEvent.createdAt))
            .limit(20)
        ]);
        return { ...entry, audit, roles, securityEvents, sessions, workspaces };
      }),
    suspend: requirePlatformPermission("users.suspend")
      .input(z.object({ id: z.string().min(1), suspended: z.boolean() }))
      .route({ method: "POST" })
      .handler(async ({ context, input }) => {
        if (input.id === context.session.user.id) {
          throw new ORPCError("CONFLICT", { message: "Cannot suspend yourself" });
        }
        const [target] = await db
          .update(user)
          .set({
            banned: input.suspended,
            banReason: input.suspended ? "Suspended by platform operator" : null
          })
          .where(eq(user.id, input.id))
          .returning({ email: user.email });
        if (!target) throw new ORPCError("NOT_FOUND");
        if (input.suspended) await db.delete(session).where(eq(session.userId, input.id));
        await recordAudit({
          actorId: context.session.user.id,
          actorName: context.session.user.name,
          action: input.suspended ? "user.suspended" : "user.reactivated",
          targetType: "user",
          targetLabel: target.email
        });
        await recordSecurityEvent({
          type: input.suspended ? "session.revoked_others" : "permission.denied",
          severity: "warning",
          actorUserId: context.session.user.id,
          targetType: "user",
          targetId: input.id,
          requestId: context.requestId,
          traceId: context.traceId,
          ipAddress: context.clientIp
        });
        return { ok: true };
      }),
    setRoles: requirePlatformPermission("users.roles.manage")
      .input(
        z.object({
          id: z.string().min(1),
          roles: z
            .array(z.enum(PLATFORM_ROLES))
            .min(1)
            .max(3)
            .refine(
              (roles) => new Set(roles).size === roles.length,
              "Duplicate roles are not allowed"
            )
        })
      )
      .route({ method: "POST" })
      .handler(async ({ context, input }) => {
        await db.transaction(async (tx) => {
          // Serialize role policy checks and writes across all API processes.
          await tx.execute(sql`select pg_advisory_xact_lock(847262002)`);
          const [activeSession] = await tx
            .select({ userId: session.userId, expiresAt: session.expiresAt })
            .from(session)
            .where(eq(session.id, context.session.session.id))
            .limit(1);
          if (
            !activeSession ||
            activeSession.userId !== context.session.user.id ||
            activeSession.expiresAt.getTime() <= Date.now()
          ) {
            throw new ORPCError("UNAUTHORIZED");
          }
          const [actor] = await tx
            .select({ role: user.role })
            .from(user)
            .where(eq(user.id, context.session.user.id))
            .limit(1);
          const actorAssignments = await tx
            .select({ role: platformRoleAssignment.role })
            .from(platformRoleAssignment)
            .where(eq(platformRoleAssignment.userId, context.session.user.id));
          const persistedActorRoles = actorAssignments
            .map((row) => row.role)
            .filter(isPlatformRole);
          const actorRoles: PlatformRole[] =
            persistedActorRoles.length > 0
              ? persistedActorRoles
              : actor?.role === "admin"
                ? ["super_admin"]
                : [];
          if (!can(actorRoles, "users.roles.manage")) throw new ORPCError("FORBIDDEN");
          const [target] = await tx
            .select({ role: user.role })
            .from(user)
            .where(eq(user.id, input.id))
            .limit(1);
          if (!target) throw new ORPCError("NOT_FOUND");
          const assignments = await tx
            .select({ role: platformRoleAssignment.role })
            .from(platformRoleAssignment)
            .where(eq(platformRoleAssignment.userId, input.id));
          const current =
            assignments.length > 0
              ? assignments.map((row) => row.role)
              : target.role === "admin"
                ? ["super_admin"]
                : [];
          const privilegedChange = [...current, ...input.roles].some((role) =>
            ["super_admin", "platform_admin", "engineering", "security"].includes(role)
          );
          if (
            privilegedChange &&
            !(await hasFreshAdminStepUp(context.session.session.id, context.session.user.id))
          ) {
            throw new ORPCError("FORBIDDEN", { message: "STEP_UP_REQUIRED" });
          }
          if (input.roles.includes("super_admin") && !actorRoles.includes("super_admin")) {
            throw new ORPCError("FORBIDDEN", { message: "FORBIDDEN_ROLE_GRANT" });
          }
          if (current.includes("super_admin") && !input.roles.includes("super_admin")) {
            const [count] = await tx.select({ count: sql<number>`count(*)::int` }).from(user)
              .where(sql`
              exists (select 1 from ${platformRoleAssignment} where ${platformRoleAssignment.userId} = ${user.id} and ${platformRoleAssignment.role} = 'super_admin')
              or (${user.role} = 'admin' and not exists (select 1 from ${platformRoleAssignment} where ${platformRoleAssignment.userId} = ${user.id}))
            `);
            if (Number(count?.count ?? 0) <= 1) {
              throw new ORPCError("CONFLICT", { message: "LAST_SUPER_ADMIN" });
            }
          }
          await tx
            .delete(platformRoleAssignment)
            .where(eq(platformRoleAssignment.userId, input.id));
          await tx.insert(platformRoleAssignment).values(
            input.roles.map((role) => {
              return {
                id: randomUUID(),
                role,
                userId: input.id,
                createdBy: context.session.user.id
              };
            })
          );
          await tx.delete(session).where(eq(session.userId, input.id));
        });
        await recordAudit({
          actorId: context.session.user.id,
          actorName: context.session.user.name,
          action: "user.roles_changed",
          metadata: { roles: input.roles },
          targetType: "user",
          targetLabel: input.id
        });
        await recordSecurityEvent({
          type: "session.revoked_others",
          severity: "warning",
          actorUserId: context.session.user.id,
          targetType: "user",
          targetId: input.id,
          metadata: { reason: "role_change" },
          requestId: context.requestId,
          traceId: context.traceId,
          ipAddress: context.clientIp
        });
        return { ok: true };
      })
  },
  roles: {
    list: requirePlatformPermission("users.roles.manage")
      .route({ method: "GET" })
      .handler(() =>
        PLATFORM_ROLES.map((role) => {
          return { role, permissions: ROLE_PERMISSIONS[role] };
        })
      )
  },
  sessions: {
    list: requirePlatformPermission("sessions.read")
      .input(
        pageInput
          .pick({ cursor: true, limit: true, search: true, mfa: true })
          .extend({ status: z.enum(["active", "expired"]).optional() })
      )
      .route({ method: "GET" })
      .handler(async ({ input }) => {
        const offset = cursorOffset(input.cursor);
        const where = and(
          input.search ? ilike(user.email, `%${input.search}%`) : undefined,
          input.mfa === undefined
            ? undefined
            : input.mfa
              ? eq(user.twoFactorEnabled, true)
              : sql`coalesce(${user.twoFactorEnabled}, false) = false`,
          input.status === "active"
            ? gt(session.expiresAt, new Date())
            : input.status === "expired"
              ? lte(session.expiresAt, new Date())
              : undefined
        );
        const rows = await db
          .select({
            id: session.id,
            userId: session.userId,
            email: user.email,
            name: user.name,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            expiresAt: session.expiresAt,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            mfaEnabled: user.twoFactorEnabled
          })
          .from(session)
          .innerJoin(user, eq(session.userId, user.id))
          .where(where)
          .orderBy(desc(session.updatedAt), desc(session.id))
          .limit(input.limit + 1)
          .offset(offset);
        return {
          data: rows.slice(0, input.limit),
          meta: { nextCursor: nextCursor(offset, rows.length, input.limit) }
        };
      }),
    revoke: requirePlatformPermission("sessions.revoke")
      .input(z.object({ id: z.string().min(1) }))
      .route({ method: "POST" })
      .handler(async ({ context, input }) => {
        await db.delete(session).where(eq(session.id, input.id));
        await recordAudit({
          actorId: context.session.user.id,
          actorName: context.session.user.name,
          action: "session.revoked",
          targetType: "session",
          targetLabel: input.id
        });
        return { ok: true };
      }),
    revokeAll: requirePlatformPermission("sessions.revoke")
      .input(z.object({ userId: z.string().min(1) }))
      .route({ method: "POST" })
      .handler(async ({ context, input }) => {
        await db.delete(session).where(eq(session.userId, input.userId));
        await recordAudit({
          actorId: context.session.user.id,
          actorName: context.session.user.name,
          action: "sessions.revoked_all",
          targetType: "user",
          targetLabel: input.userId
        });
        await recordSecurityEvent({
          type: "session.revoked_others",
          severity: "warning",
          actorUserId: context.session.user.id,
          targetType: "user",
          targetId: input.userId,
          metadata: { reason: "admin_revoke_all" },
          requestId: context.requestId,
          traceId: context.traceId,
          ipAddress: context.clientIp
        });
        return { ok: true };
      })
  },
  security: {
    events: requirePlatformPermission("security.events.read")
      .input(
        eventInput
          .extend({
            type: z.string().trim().max(200).optional(),
            severity: z.enum(["info", "warning", "critical"]).optional()
          })
          .refine(validRange, "Invalid date range")
      )
      .route({ method: "GET" })
      .handler(({ input }) => listSecurityEvents(input.limit, input)),
    audit: requirePlatformPermission("audit.read")
      .input(
        eventInput
          .extend({
            action: z.string().max(200).optional(),
            resource: z.string().max(200).optional(),
            workspace: z.string().max(200).optional()
          })
          .refine(validRange, "Invalid date range")
      )
      .route({ method: "GET" })
      .handler(({ input }) => getPlatformAuditLog(input))
  }
};
