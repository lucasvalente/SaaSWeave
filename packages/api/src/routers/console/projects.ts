import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
import { and, desc, eq, ilike, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { db, recordAudit } from "@saasweave/db";
import { organization, project, user } from "@saasweave/db/schema";

import { canReadProjects, canWriteProjects } from "#@/lib/console-access";
import { operationalOrgProcedure, orgProcedure } from "#@/lib/procedures/factory";

const projectStatus = z.enum(["draft", "active", "archived"]);
const name = z.string().trim().min(1).max(120);
const description = z.string().trim().max(4000).optional();
const cursor = z
  .string()
  .max(500)
  .refine((value) => {
    try {
      return z
        .object({ id: z.string().min(1), updatedAt: z.iso.datetime() })
        .safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8"))).success;
    } catch {
      return false;
    }
  }, "Invalid project cursor")
  .optional();
function decodeCursor(value: string | undefined): { id: string; updatedAt: string } | undefined {
  return value ? JSON.parse(Buffer.from(value, "base64url").toString("utf8")) : undefined;
}
function encodeCursor(value: { id: string; updatedAt: Date } | undefined): string | null {
  return value
    ? Buffer.from(
        JSON.stringify({ id: value.id, updatedAt: value.updatedAt.toISOString() }),
        "utf8"
      ).toString("base64url")
    : null;
}

function assertProjectRead(role: string): void {
  if (!canReadProjects(role)) throw new ORPCError("FORBIDDEN");
}
function assertProjectWrite(role: string): void {
  if (!canWriteProjects(role)) throw new ORPCError("FORBIDDEN");
}
function isUniqueViolation(error: unknown): boolean {
  const candidate = error as { cause?: { code?: string }; code?: string };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}
async function createSlug(workspaceId: string, projectName: string): Promise<string> {
  const base =
    projectName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project";
  const matches = await db
    .select({ slug: project.slug })
    .from(project)
    .where(and(eq(project.workspaceId, workspaceId), ilike(project.slug, `${base}%`)));
  const used = new Set(matches.map((entry) => entry.slug));
  if (!used.has(base)) return base;
  for (let index = 2; index < 10_000; index += 1)
    {if (!used.has(`${base}-${index}`)) return `${base}-${index}`;}
  throw new ORPCError("CONFLICT");
}

export const projectsRouter = {
  list: orgProcedure
    .input(
      z.object({
        cursor,
        limit: z.number().int().min(1).max(100).default(25),
        search: z.string().trim().max(120).optional(),
        status: projectStatus.optional()
      })
    )
    .handler(async ({ context, input }) => {
      assertProjectRead(context.organization.role);
      const decoded = decodeCursor(input.cursor);
      const rows = await db
        .select()
        .from(project)
        .where(
          and(
            eq(project.workspaceId, context.organization.id),
            decoded
              ? sql`(${project.updatedAt}, ${project.id}) < (${decoded.updatedAt}::timestamp, ${decoded.id})`
              : undefined,
            input.status ? eq(project.status, input.status) : ne(project.status, "archived"),
            input.search ? ilike(project.name, `%${input.search}%`) : undefined
          )
        )
        .orderBy(desc(project.updatedAt), desc(project.id))
        .limit(input.limit + 1);
      const visible = rows.slice(0, input.limit);
      return {
        data: visible,
        meta: { nextCursor: rows.length > input.limit ? encodeCursor(visible.at(-1)) : null }
      };
    }),
  get: orgProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      assertProjectRead(context.organization.role);
      const [entry] = await db
        .select({
          id: project.id,
          workspaceId: project.workspaceId,
          workspaceName: organization.name,
          createdBy: project.createdBy,
          createdByName: user.name,
          name: project.name,
          description: project.description,
          slug: project.slug,
          status: project.status,
          archivedAt: project.archivedAt,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        })
        .from(project)
        .innerJoin(organization, eq(organization.id, project.workspaceId))
        .innerJoin(user, eq(user.id, project.createdBy))
        .where(
          and(eq(project.id, input.projectId), eq(project.workspaceId, context.organization.id))
        )
        .limit(1);
      if (!entry) throw new ORPCError("NOT_FOUND");
      return entry;
    }),
  create: operationalOrgProcedure
    .input(z.object({ name, description }))
    .handler(async ({ context, input }) => {
      assertProjectWrite(context.organization.role);
      let entry: {
        createdBy: string;
        description: string | undefined;
        id: string;
        name: string;
        slug: string;
        status: "draft";
        workspaceId: string;
      } | null = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = {
          id: randomUUID(),
          workspaceId: context.organization.id,
          createdBy: context.session.user.id,
          name: input.name,
          description: input.description,
          slug: await createSlug(context.organization.id, input.name),
          status: "draft" as const
        };
        try {
          await db.insert(project).values(candidate);
          entry = candidate;
          break;
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
      }
      if (!entry) throw new ORPCError("CONFLICT");
      await recordAudit({
        actorId: context.session.user.id,
        actorName: context.session.user.name,
        action: "project.created",
        organizationId: context.organization.id,
        targetLabel: entry.id,
        targetType: "project",
        metadata: { projectId: entry.id, workspaceId: context.organization.id }
      });
      return entry;
    }),
  update: operationalOrgProcedure
    .input(z.object({ projectId: z.string().min(1), name: name.optional(), description }))
    .handler(async ({ context, input }) => {
      assertProjectWrite(context.organization.role);
      const [entry] = await db
        .update(project)
        .set({ name: input.name, description: input.description, updatedAt: new Date() })
        .where(
          and(
            eq(project.id, input.projectId),
            eq(project.workspaceId, context.organization.id),
            ne(project.status, "archived")
          )
        )
        .returning();
      if (!entry) throw new ORPCError("NOT_FOUND");
      await recordAudit({
        actorId: context.session.user.id,
        actorName: context.session.user.name,
        action: "project.updated",
        organizationId: context.organization.id,
        targetLabel: entry.id,
        targetType: "project",
        metadata: { projectId: entry.id, workspaceId: context.organization.id }
      });
      return entry;
    }),
  archive: operationalOrgProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      assertProjectWrite(context.organization.role);
      const [entry] = await db
        .update(project)
        .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
        .where(
          and(eq(project.id, input.projectId), eq(project.workspaceId, context.organization.id))
        )
        .returning();
      if (!entry) throw new ORPCError("NOT_FOUND");
      await recordAudit({
        actorId: context.session.user.id,
        actorName: context.session.user.name,
        action: "project.archived",
        organizationId: context.organization.id,
        targetLabel: entry.id,
        targetType: "project",
        metadata: { projectId: entry.id, workspaceId: context.organization.id }
      });
      return entry;
    })
};
