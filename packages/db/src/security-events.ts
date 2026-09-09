import { randomUUID } from "node:crypto";

import { and, desc, eq, gte, lte } from "drizzle-orm";

import { type PlatformRole, isPlatformRole } from "@saasweave/permissions";
import {
  sanitizeSecurityMetadata,
  type SecurityEventType,
  type SecuritySeverity
} from "@saasweave/security";

import { db } from "#@/connection";
import { platformRoleAssignment, securityEvent } from "#@/schema/index";

export async function getPlatformRoles(
  userId: string,
  legacyRole?: string | null
): Promise<PlatformRole[]> {
  const rows = await db
    .select({ role: platformRoleAssignment.role })
    .from(platformRoleAssignment)
    .where(eq(platformRoleAssignment.userId, userId));
  const persisted = rows.map((row) => row.role).filter(isPlatformRole);
  // Compatibility bridge for existing Better Auth admin users; all callers consume the resolver.
  return persisted.length > 0
    ? [...new Set(persisted)]
    : legacyRole === "admin"
      ? ["super_admin"]
      : [];
}

export async function recordSecurityEvent(input: {
  type: SecurityEventType;
  severity: SecuritySeverity;
  actorUserId?: string | null;
  organizationId?: string | null;
  targetType?: string;
  targetId?: string;
  requestId?: string;
  traceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(securityEvent).values({
    id: randomUUID(),
    type: input.type,
    severity: input.severity,
    actorUserId: input.actorUserId ?? null,
    organizationId: input.organizationId ?? null,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    requestId: input.requestId ?? null,
    traceId: input.traceId ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: sanitizeSecurityMetadata(input.metadata),
    createdAt: new Date()
  });
}

export async function listSecurityEvents(
  limit = 100,
  input: {
    offset?: number;
    type?: string;
    severity?: string;
    actor?: string;
    from?: string;
    to?: string;
  } = {}
) {
  return db
    .select()
    .from(securityEvent)
    .where(
      and(
        input.type ? eq(securityEvent.type, input.type) : undefined,
        input.severity ? eq(securityEvent.severity, input.severity) : undefined,
        input.actor ? eq(securityEvent.actorUserId, input.actor) : undefined,
        input.from ? gte(securityEvent.createdAt, new Date(input.from)) : undefined,
        input.to ? lte(securityEvent.createdAt, new Date(input.to)) : undefined
      )
    )
    .orderBy(desc(securityEvent.createdAt), desc(securityEvent.id))
    .limit(limit)
    .offset(input.offset ?? 0);
}
