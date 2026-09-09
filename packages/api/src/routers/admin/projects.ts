import { ORPCError } from "@orpc/server";
import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db, recordAudit } from "@saasweave/db";
import { auditLog, member, organization, project, user } from "@saasweave/db/schema";

import { requirePlatformPermission } from "#@/lib/procedures/factory";

const status = z.enum(["draft", "active", "archived"]);
const cursorSchema = z.string().max(500).optional();

function decodeCursor(cursor: string | undefined): { createdAt: string; id: string } | undefined {
  if (!cursor) return undefined;
  try {
    const parsed = z
      .object({ createdAt: z.iso.datetime(), id: z.string().min(1) })
      .parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
    return parsed;
  } catch {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid project cursor" });
  }
}

function encodeCursor(row: { createdAt: Date; id: string } | undefined): string | null {
  return row
    ? Buffer.from(JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id })).toString(
        "base64url"
      )
    : null;
}

const listInput = z.object({
  archived: z.boolean().optional(),
  createdBy: z.string().min(1).optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  cursor: cursorSchema,
  limit: z.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(160).optional(),
  status: status.optional(),
  updatedFrom: z.coerce.date().optional(),
  updatedTo: z.coerce.date().optional(),
  workspaceId: z.string().min(1).optional()
});

const ownerName = sql<string | null>`(
  select ${user.name} from ${member}
  inner join ${user} on ${user.id} = ${member.userId}
  where ${member.organizationId} = ${project.workspaceId} and ${member.role} = 'owner'
  order by ${member.createdAt} asc limit 1
)`;

const projectSelect = {
  archivedAt: project.archivedAt,
  createdAt: project.createdAt,
  createdBy: project.createdBy,
  creatorEmail: user.email,
  creatorName: user.name,
  description: project.description,
  id: project.id,
  name: project.name,
  slug: project.slug,
  status: project.status,
  updatedAt: project.updatedAt,
  workspaceId: project.workspaceId,
  workspaceName: organization.name,
  workspaceOwner: ownerName
};

export const adminProjectsRouter = {
  list: requirePlatformPermission("projects.read")
    .route({ description: "Platform-wide, cursor-paginated project roster", method: "GET" })
    .input(listInput)
    .handler(async ({ input }) => {
      const cursor = decodeCursor(input.cursor);
      const rows = await db
        .select(projectSelect)
        .from(project)
        .innerJoin(organization, eq(organization.id, project.workspaceId))
        .innerJoin(user, eq(user.id, project.createdBy))
        .where(
          and(
            input.workspaceId ? eq(project.workspaceId, input.workspaceId) : undefined,
            input.createdBy ? eq(project.createdBy, input.createdBy) : undefined,
            input.status ? eq(project.status, input.status) : undefined,
            input.archived === true ? eq(project.status, "archived") : undefined,
            input.archived === false ? isNull(project.archivedAt) : undefined,
            input.createdFrom ? gte(project.createdAt, input.createdFrom) : undefined,
            input.createdTo ? lte(project.createdAt, input.createdTo) : undefined,
            input.updatedFrom ? gte(project.updatedAt, input.updatedFrom) : undefined,
            input.updatedTo ? lte(project.updatedAt, input.updatedTo) : undefined,
            input.search
              ? or(
                  ilike(project.name, `%${input.search}%`),
                  ilike(project.id, `%${input.search}%`),
                  ilike(organization.name, `%${input.search}%`)
                )
              : undefined,
            cursor
              ? sql`(${project.createdAt}, ${project.id}) < (${cursor.createdAt}::timestamp, ${cursor.id})`
              : undefined
          )
        )
        .orderBy(desc(project.createdAt), desc(project.id))
        .limit(input.limit + 1);
      const data = rows.slice(0, input.limit);
      return {
        data,
        meta: { nextCursor: rows.length > input.limit ? encodeCursor(data.at(-1)) : null }
      };
    }),

  get: requirePlatformPermission("projects.read")
    .route({ description: "Platform administration detail for a project", method: "GET" })
    .input(z.object({ projectId: z.string().min(1) }))
    .handler(async ({ input }) => {
      const [entry] = await db
        .select(projectSelect)
        .from(project)
        .innerJoin(organization, eq(organization.id, project.workspaceId))
        .innerJoin(user, eq(user.id, project.createdBy))
        .where(eq(project.id, input.projectId))
        .limit(1);
      if (!entry) throw new ORPCError("NOT_FOUND");
      const [members, activity] = await Promise.all([
        db
          .select({
            email: user.email,
            joinedAt: member.createdAt,
            name: user.name,
            role: member.role
          })
          .from(member)
          .innerJoin(user, eq(user.id, member.userId))
          .where(eq(member.organizationId, entry.workspaceId))
          .orderBy(member.createdAt),
        db
          .select({
            action: auditLog.action,
            actorName: auditLog.actorName,
            createdAt: auditLog.createdAt,
            metadata: auditLog.metadata
          })
          .from(auditLog)
          .where(
            and(
              eq(auditLog.organizationId, entry.workspaceId),
              eq(auditLog.targetType, "project"),
              eq(auditLog.targetLabel, entry.id)
            )
          )
          .orderBy(desc(auditLog.createdAt))
          .limit(30)
      ]);
      return { ...entry, activity, members };
    }),

  archive: requirePlatformPermission("projects.archive")
    .route({ description: "Archive a project from platform administration", method: "POST" })
    .input(
      z.object({ projectId: z.string().min(1), reason: z.string().trim().max(500).optional() })
    )
    .handler(async ({ context, input }) => {
      const [entry] = await db
        .update(project)
        .set({ archivedAt: new Date(), status: "archived", updatedAt: new Date() })
        .where(and(eq(project.id, input.projectId), isNull(project.archivedAt)))
        .returning({ id: project.id, workspaceId: project.workspaceId });
      if (!entry) throw new ORPCError("NOT_FOUND");
      await recordAudit({
        action: "admin.project.archived",
        actorId: context.session.user.id,
        actorName: context.session.user.name,
        metadata: { projectId: entry.id, reason: input.reason, workspaceId: entry.workspaceId },
        organizationId: entry.workspaceId,
        targetLabel: entry.id,
        targetType: "project"
      });
      return { ok: true };
    })
};
