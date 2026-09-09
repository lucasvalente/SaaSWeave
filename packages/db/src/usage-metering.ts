import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "#@/connection";
import { creditAccount, creditLedger, usageAggregate, usageEvent, usageMetric } from "#@/schema/index";
import { resolveOrganizationEntitlements } from "#@/subscriptions";

export class UsageIdempotencyConflictError extends Error {
  constructor() {
    super("idempotency key was already used with a different operation");
    this.name = "UsageIdempotencyConflictError";
  }
}

export type UsageEventInput = {
  organizationId: string; metric: string; quantity: number; idempotencyKey: string;
  feature?: string; projectId?: string; source?: string; inputTokens?: number; outputTokens?: number;
  metadata?: Record<string, unknown>;
};

/** Append one event exactly once and atomically update its daily aggregate. */
export async function recordUsageEvent(input: UsageEventInput) {
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
    throw new Error("usage quantity must be a positive safe integer");
  }
  if (!input.idempotencyKey || input.idempotencyKey.length > 255) {
    throw new Error("usage idempotency key is required and must be at most 255 characters");
  }
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(usageEvent).where(and(eq(usageEvent.organizationId, input.organizationId), eq(usageEvent.idempotencyKey, input.idempotencyKey))).limit(1);
    if (existing[0]) {
      if (existing[0].metric !== input.metric || existing[0].quantity !== input.quantity) {
        throw new UsageIdempotencyConflictError();
      }
      return { event: existing[0], duplicate: true };
    }
    const [event] = await tx
      .insert(usageEvent)
      .values({ ...input, id: randomUUID() })
      .onConflictDoNothing()
      .returning();
    if (!event) {
      const [concurrent] = await tx
        .select()
        .from(usageEvent)
        .where(
          and(
            eq(usageEvent.organizationId, input.organizationId),
            eq(usageEvent.idempotencyKey, input.idempotencyKey)
          )
        )
        .limit(1);
      if (!concurrent) throw new Error("usage event idempotency conflict");
      if (concurrent.metric !== input.metric || concurrent.quantity !== input.quantity) {
        throw new UsageIdempotencyConflictError();
      }
      return { event: concurrent, duplicate: true };
    }
    const start = new Date(event.createdAt); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    await tx.insert(usageAggregate).values({ organizationId: input.organizationId, metric: input.metric, periodStart: start, periodEnd: end, quantity: input.quantity, eventCount: 1 }).onConflictDoUpdate({ target: [usageAggregate.organizationId, usageAggregate.metric, usageAggregate.periodStart], set: { quantity: sql`${usageAggregate.quantity} + ${input.quantity}`, eventCount: sql`${usageAggregate.eventCount} + 1`, updatedAt: new Date() } });
    return { event, duplicate: false };
  });
}

export async function listUsageAggregates(organizationId: string, from: Date, to: Date) {
  return db.select().from(usageAggregate).where(and(eq(usageAggregate.organizationId, organizationId), sql`${usageAggregate.periodStart} >= ${from}`, sql`${usageAggregate.periodStart} < ${to}`)).orderBy(usageAggregate.periodStart, usageAggregate.metric);
}

export async function listUsageMetrics() {
  return db.select().from(usageMetric).where(eq(usageMetric.status, "active")).orderBy(usageMetric.code);
}

/** Usage totals with the plan-derived limit and remaining amount when available. */
export async function getUsageSummary(organizationId: string, from: Date, to: Date) {
  const [aggregates, entitlements] = await Promise.all([
    listUsageAggregates(organizationId, from, to),
    resolveOrganizationEntitlements(organizationId)
  ]);
  return aggregates.map((row) => {
    const limit = entitlements.get(`${row.metric}_limit`) ?? entitlements.get(row.metric);
    const numericLimit = typeof limit === "number" ? limit : Number(limit);
    return { ...row, limit: Number.isFinite(numericLimit) ? numericLimit : null, remaining: Number.isFinite(numericLimit) ? Math.max(numericLimit - row.quantity, 0) : null };
  });
}

export async function getCreditAccount(organizationId: string) {
  const [account] = await db.select().from(creditAccount).where(eq(creditAccount.organizationId, organizationId)).limit(1);
  return account ?? null;
}

export type CreditOperation = "grant" | "consume" | "adjust" | "reverse";
export async function applyCreditOperation(input: { organizationId: string; operation: CreditOperation; amount: number; idempotencyKey: string; referenceId?: string; metadata?: Record<string, unknown> }) {
  if (!Number.isSafeInteger(input.amount) || input.amount === 0) throw new Error("credit amount must be a non-zero safe integer");
  if (!input.idempotencyKey || input.idempotencyKey.length > 255) throw new Error("credit idempotency key is required and must be at most 255 characters");
  const signed = input.operation === "consume" || input.operation === "reverse" ? -Math.abs(input.amount) : Math.abs(input.amount);
  return db.transaction(async (tx) => {
    const [duplicate] = await tx.select().from(creditLedger).where(and(eq(creditLedger.organizationId, input.organizationId), eq(creditLedger.idempotencyKey, input.idempotencyKey))).limit(1);
    if (duplicate) {
      const expectedAmount = input.operation === "consume" || input.operation === "reverse"
        ? -Math.abs(input.amount)
        : Math.abs(input.amount);
      if (duplicate.operation !== input.operation || duplicate.amount !== expectedAmount || duplicate.referenceId !== (input.referenceId ?? null)) {
        throw new UsageIdempotencyConflictError();
      }
      return { ledger: duplicate, duplicate: true };
    }
    let [account] = await tx.select().from(creditAccount).where(eq(creditAccount.organizationId, input.organizationId)).for("update").limit(1);
    if (!account) {
      [account] = await tx
        .insert(creditAccount)
        .values({ id: randomUUID(), organizationId: input.organizationId })
        .onConflictDoNothing({ target: creditAccount.organizationId })
        .returning();
      if (!account) {
        [account] = await tx
          .select()
          .from(creditAccount)
          .where(eq(creditAccount.organizationId, input.organizationId))
          .for("update")
          .limit(1);
      }
    }
    if (!account) throw new Error("credit account unavailable");
    const balance = account.balance + signed;
    if (!Number.isSafeInteger(balance) || balance > 2_147_483_647) throw new Error("credit balance exceeds supported range");
    if (balance < 0) throw new Error("insufficient credits");
    await tx.update(creditAccount).set({ balance, version: account.version + 1, updatedAt: new Date() }).where(eq(creditAccount.id, account.id));
    const [ledger] = await tx.insert(creditLedger).values({ id: randomUUID(), accountId: account.id, organizationId: input.organizationId, operation: input.operation, amount: signed, balanceAfter: balance, idempotencyKey: input.idempotencyKey, referenceId: input.referenceId, metadata: input.metadata }).returning();
    if (!ledger) throw new Error("credit ledger insert returned no row");
    return { ledger, duplicate: false };
  });
}

export async function listCreditLedger(organizationId: string, limit = 50) {
  return db.select().from(creditLedger).where(eq(creditLedger.organizationId, organizationId)).orderBy(desc(creditLedger.createdAt)).limit(Math.min(Math.max(limit, 1), 100));
}
