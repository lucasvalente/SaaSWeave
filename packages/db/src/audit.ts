import { randomUUID } from "node:crypto";

import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "#@/connection";
import { auditLog } from "#@/schema/index";

export type AuditEntry = {
  id: string;
  action: string;
  actorName: string | null;
  targetType: string | null;
  targetLabel: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type RecordAuditInput = {
  organizationId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  targetType?: string | null;
  targetLabel?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Append an entry to the audit trail. Never throws into the caller's flow. */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await db.insert(auditLog).values({
      action: input.action,
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      createdAt: new Date(),
      id: randomUUID(),
      metadata: input.metadata ?? null,
      organizationId: input.organizationId ?? null,
      targetLabel: input.targetLabel ?? null,
      targetType: input.targetType ?? null
    });
  } catch {
    // Auditing must never break the action it records.
  }
}

function mapRow(row: typeof auditLog.$inferSelect): AuditEntry {
  return {
    action: row.action,
    actorName: row.actorName,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    targetLabel: row.targetLabel,
    targetType: row.targetType
  };
}

/** Recent audit entries for one organization (workspace activity feed). */
export async function getOrganizationActivity(
  organizationId: string,
  limit = 12
): Promise<AuditEntry[]> {
  const rows = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.organizationId, organizationId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
  return rows.map(mapRow);
}

/** Platform-wide audit entries, optionally filtered by exact action. */
export async function getPlatformAuditLog(input: {
  limit?: number;
  action?: string;
  actor?: string;
  resource?: string;
  workspace?: string;
  from?: string;
  to?: string;
  offset?: number;
}): Promise<AuditEntry[]> {
  const rows = await db
    .select()
    .from(auditLog)
    .where(
      and(
        input.action ? eq(auditLog.action, input.action) : undefined,
        input.actor ? eq(auditLog.actorId, input.actor) : undefined,
        input.resource ? eq(auditLog.targetType, input.resource) : undefined,
        input.workspace ? eq(auditLog.organizationId, input.workspace) : undefined,
        input.from ? gte(auditLog.createdAt, new Date(input.from)) : undefined,
        input.to ? lte(auditLog.createdAt, new Date(input.to)) : undefined
      )
    )
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(input.limit ?? 50)
    .offset(input.offset ?? 0);
  return rows.map(mapRow);
}
