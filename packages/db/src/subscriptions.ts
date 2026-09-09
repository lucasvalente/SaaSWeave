import { randomUUID } from "node:crypto";

import { and, desc, eq, ne, sql } from "drizzle-orm";

import { db } from "#@/connection";
import { organization } from "#@/schema/auth.schema";
import { plan, planEntitlement, workspaceSubscription, workspaceSubscriptionHistory } from "#@/schema/platform.schema";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export class SubscriptionConcurrencyError extends Error {}
export class SubscriptionPlanUnavailableError extends Error {}
export class SubscriptionOrganizationNotFoundError extends Error {}

const activeStatuses: SubscriptionStatus[] = ["trialing", "active", "past_due"];

export async function listSubscriptions(input: { limit: number; cursor?: { createdAt: string; id: string } }) {
  const limit = Math.min(Math.max(input.limit, 1), 100);
  const rows = await db
    .select({ subscription: workspaceSubscription, organizationName: organization.name, planName: plan.name })
    .from(workspaceSubscription)
    .innerJoin(organization, eq(workspaceSubscription.organizationId, organization.id))
    .innerJoin(plan, eq(workspaceSubscription.planId, plan.id))
    .where(input.cursor ? sql`(${workspaceSubscription.createdAt}, ${workspaceSubscription.id}) < (${input.cursor.createdAt}::timestamp, ${input.cursor.id})` : undefined)
    .orderBy(desc(workspaceSubscription.createdAt), desc(workspaceSubscription.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const last = rows[limit - 1]?.subscription;
  return { subscriptions: rows.slice(0, limit).map(({ subscription, organizationName, planName }) => ({ ...subscription, organizationName, planName })), nextCursor: hasMore && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null };
}

export async function getSubscription(id: string) {
  const [row] = await db
    .select({ subscription: workspaceSubscription, organizationName: organization.name, planName: plan.name })
    .from(workspaceSubscription)
    .innerJoin(organization, eq(workspaceSubscription.organizationId, organization.id))
    .innerJoin(plan, eq(workspaceSubscription.planId, plan.id))
    .where(eq(workspaceSubscription.id, id));
  return row ? { ...row.subscription, organizationName: row.organizationName, planName: row.planName } : null;
}

export async function listSubscriptionHistory(id: string) {
  return db
    .select()
    .from(workspaceSubscriptionHistory)
    .where(eq(workspaceSubscriptionHistory.subscriptionId, id))
    .orderBy(desc(workspaceSubscriptionHistory.createdAt));
}

async function syncOrganization(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], organizationId: string, planId: string, status: SubscriptionStatus) {
  await tx.update(organization).set({ planId, subscriptionStatus: status }).where(eq(organization.id, organizationId));
}

export async function assignSubscription(input: { actorId: string; organizationId: string; planId: string; seats: number; status: SubscriptionStatus }) {
  return db.transaction(async (tx) => {
    const [org] = await tx.select({ id: organization.id }).from(organization).where(eq(organization.id, input.organizationId)).limit(1);
    const [selectedPlan] = await tx.select({ id: plan.id, status: plan.status }).from(plan).where(eq(plan.id, input.planId)).limit(1);
    if (!org) throw new SubscriptionOrganizationNotFoundError();
    if (!selectedPlan || selectedPlan.status === "archived" || input.status === "canceled") throw new SubscriptionPlanUnavailableError();
    const [existing] = await tx.select().from(workspaceSubscription).where(and(eq(workspaceSubscription.organizationId, input.organizationId), ne(workspaceSubscription.status, "canceled"))).for("update");
    if (existing) {
      const [changed] = await tx.update(workspaceSubscription).set({ planId: input.planId, seats: input.seats, status: input.status, version: existing.version + 1, updatedAt: new Date() }).where(and(eq(workspaceSubscription.id, existing.id), eq(workspaceSubscription.version, existing.version))).returning();
      if (!changed) throw new SubscriptionConcurrencyError();
      await tx.insert(workspaceSubscriptionHistory).values({ action: "assigned", actorId: input.actorId, fromPlanId: existing.planId, fromStatus: existing.status, id: randomUUID(), subscriptionId: existing.id, toPlanId: changed.planId, toStatus: changed.status });
      await syncOrganization(tx, input.organizationId, changed.planId, changed.status as SubscriptionStatus);
      return changed;
    }
    const [created] = await tx.insert(workspaceSubscription).values({ id: randomUUID(), organizationId: input.organizationId, planId: input.planId, seats: input.seats, status: input.status }).returning();
    await tx.insert(workspaceSubscriptionHistory).values({ action: "assigned", actorId: input.actorId, id: randomUUID(), subscriptionId: created.id, toPlanId: created.planId, toStatus: created.status });
    await syncOrganization(tx, input.organizationId, created.planId, created.status as SubscriptionStatus);
    return created;
  });
}

export async function changeSubscription(input: { actorId: string; id: string; planId?: string; seats?: number; status?: SubscriptionStatus }) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(workspaceSubscription).where(eq(workspaceSubscription.id, input.id)).for("update");
    if (!existing) return null;
    if (input.planId) {
      const [selectedPlan] = await tx.select({ id: plan.id, status: plan.status }).from(plan).where(eq(plan.id, input.planId)).limit(1);
      if (!selectedPlan || selectedPlan.status === "archived") throw new SubscriptionPlanUnavailableError();
    }
    const [changed] = await tx.update(workspaceSubscription).set({ ...(input.planId ? { planId: input.planId } : {}), ...(input.seats ? { seats: input.seats } : {}), ...(input.status ? { status: input.status } : {}), version: existing.version + 1, updatedAt: new Date() }).where(and(eq(workspaceSubscription.id, input.id), eq(workspaceSubscription.version, existing.version))).returning();
    if (!changed) throw new SubscriptionConcurrencyError();
    await tx.insert(workspaceSubscriptionHistory).values({ action: "changed", actorId: input.actorId, fromPlanId: existing.planId, fromStatus: existing.status, id: randomUUID(), subscriptionId: changed.id, toPlanId: changed.planId, toStatus: changed.status });
    await syncOrganization(tx, existing.organizationId, changed.planId, changed.status as SubscriptionStatus);
    return changed;
  });
}

export async function cancelSubscription(actorId: string, id: string) {
  return changeSubscription({ actorId, id, status: "canceled" });
}

export async function resolveOrganizationEntitlements(organizationId: string) {
  const [subscription] = await db.select({ planId: workspaceSubscription.planId }).from(workspaceSubscription).where(and(eq(workspaceSubscription.organizationId, organizationId), ne(workspaceSubscription.status, "canceled"))).limit(1);
  if (!subscription) return new Map<string, unknown>();
  const rows = await db.select({ definition: planEntitlement.entitlementCode, booleanValue: planEntitlement.booleanValue, integerValue: planEntitlement.integerValue, decimalValue: planEntitlement.decimalValue, stringValue: planEntitlement.stringValue }).from(planEntitlement).where(eq(planEntitlement.planId, subscription.planId));
  return new Map(rows.map((row) => [row.definition, row.booleanValue ?? row.integerValue ?? row.decimalValue ?? row.stringValue]));
}

export { activeStatuses };
