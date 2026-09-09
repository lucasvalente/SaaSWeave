import { z } from "zod";

import {
  assignSubscription,
  cancelSubscription,
  changeSubscription,
  getSubscription,
  listSubscriptionHistory,
  listSubscriptions,
  recordAudit
  ,SubscriptionConcurrencyError,
  SubscriptionOrganizationNotFoundError,
  SubscriptionPlanUnavailableError
} from "@saasweave/db";

import { requirePlatformPermission } from "#@/lib/procedures/factory";

const status = z.enum(["trialing", "active", "past_due", "canceled"]);
const id = z.string().trim().min(1).max(200);

function transport(row: Awaited<ReturnType<typeof getSubscription>>) {
  if (!row) return null;
  return {
    ...row,
    canceledAt: row.canceledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
    startedAt: row.startedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export const adminSubscriptionsRouter = {
  list: requirePlatformPermission("subscriptions.read")
    .route({ description: "List workspace subscriptions", method: "GET" })
    .input(z.object({ cursor: z.object({ createdAt: z.string(), id }).optional(), limit: z.number().int().min(1).max(100).default(50) }))
    .handler(async ({ input }) => {
      const result = await listSubscriptions(input);
      return { ...result, subscriptions: result.subscriptions.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), startedAt: row.startedAt.toISOString(), canceledAt: row.canceledAt?.toISOString() ?? null, currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null, currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null })) };
    }),

  get: requirePlatformPermission("subscriptions.read")
    .route({ description: "Get a workspace subscription", method: "GET" })
    .input(z.object({ id }))
    .errors({ SUBSCRIPTION_NOT_FOUND: { description: "Subscription not found", status: 404 } })
    .handler(async ({ errors, input }) => {
      const row = transport(await getSubscription(input.id));
      if (!row) throw errors.SUBSCRIPTION_NOT_FOUND();
      return row;
    }),

  history: requirePlatformPermission("subscriptions.read")
    .route({ description: "List subscription change history", method: "GET" })
    .input(z.object({ id }))
    .handler(async ({ input }) => (await listSubscriptionHistory(input.id)).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))),

  assign: requirePlatformPermission("subscriptions.manage")
    .route({ description: "Assign a plan subscription to a workspace", method: "POST" })
    .errors({
      ORGANIZATION_NOT_FOUND: { description: "Workspace not found", status: 404 },
      PLAN_UNAVAILABLE: { description: "Plan is unavailable", status: 409 },
      CONCURRENCY_CONFLICT: { description: "Subscription changed concurrently", status: 409 }
    })
    .input(z.object({ organizationId: id, planId: id, seats: z.number().int().min(1).max(1_000_000).default(1), status: status.exclude(["canceled"]).default("active") }))
    .handler(async ({ context, errors, input }) => {
      let row;
      try {
        row = await assignSubscription({ ...input, actorId: context.session.user.id });
      } catch (error) {
        if (error instanceof SubscriptionOrganizationNotFoundError) throw errors.ORGANIZATION_NOT_FOUND();
        if (error instanceof SubscriptionPlanUnavailableError) throw errors.PLAN_UNAVAILABLE();
        if (error instanceof SubscriptionConcurrencyError) throw errors.CONCURRENCY_CONFLICT();
        throw error;
      }
      await recordAudit({ actorId: context.session.user.id, actorName: context.session.user.name, action: "subscription.assigned", organizationId: input.organizationId, targetLabel: row.id, targetType: "subscription", metadata: { planId: input.planId, status: input.status } });
      return transport(await getSubscription(row.id));
    }),

  change: requirePlatformPermission("subscriptions.manage")
    .route({ description: "Change a workspace subscription", method: "POST" })
    .input(z.object({ id, planId: id.optional(), seats: z.number().int().min(1).max(1_000_000).optional(), status: status.optional() }))
    .errors({
      CONCURRENCY_CONFLICT: { description: "Subscription changed concurrently", status: 409 },
      PLAN_UNAVAILABLE: { description: "Plan is unavailable", status: 409 },
      SUBSCRIPTION_NOT_FOUND: { description: "Subscription not found", status: 404 }
    })
    .handler(async ({ context, errors, input }) => {
      let row;
      try {
        row = await changeSubscription({ ...input, actorId: context.session.user.id });
      } catch (error) {
        if (error instanceof SubscriptionPlanUnavailableError) throw errors.PLAN_UNAVAILABLE();
        if (error instanceof SubscriptionConcurrencyError) throw errors.CONCURRENCY_CONFLICT();
        throw error;
      }
      if (!row) throw errors.SUBSCRIPTION_NOT_FOUND();
      await recordAudit({ actorId: context.session.user.id, actorName: context.session.user.name, action: "subscription.changed", targetLabel: row.id, targetType: "subscription", metadata: { planId: input.planId, status: input.status } });
      return transport(await getSubscription(row.id));
    }),

  cancel: requirePlatformPermission("subscriptions.cancel")
    .route({ description: "Cancel a workspace subscription", method: "POST" })
    .input(z.object({ id }))
    .errors({ SUBSCRIPTION_NOT_FOUND: { description: "Subscription not found", status: 404 } })
    .handler(async ({ context, errors, input }) => {
      const row = await cancelSubscription(context.session.user.id, input.id);
      if (!row) throw errors.SUBSCRIPTION_NOT_FOUND();
      await recordAudit({ actorId: context.session.user.id, actorName: context.session.user.name, action: "subscription.canceled", targetLabel: row.id, targetType: "subscription" });
      return transport(await getSubscription(row.id));
    })
};
