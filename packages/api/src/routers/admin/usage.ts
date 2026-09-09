import { z } from "zod";
import { applyCreditOperation, getCreditAccount, getUsageSummary, listCreditLedger, listUsageMetrics, recordAudit, recordUsageEvent, UsageIdempotencyConflictError } from "@saasweave/db";
import { ORPCError } from "@orpc/server";
import { requirePlatformPermission } from "#@/lib/procedures/factory";

const id = z.string().trim().min(1).max(200);
const organizationId = z.object({ organizationId: id });

export const adminUsageRouter = {
  metrics: requirePlatformPermission("usage.read").route({ description: "List active usage metrics", method: "GET" }).handler(() => listUsageMetrics()),
  aggregates: requirePlatformPermission("usage.read").route({ description: "List workspace usage aggregates and entitlement limits", method: "GET" }).input(organizationId.extend({ from: z.coerce.date(), to: z.coerce.date() })).handler(({ input }) => getUsageSummary(input.organizationId, input.from, input.to)),
  credits: requirePlatformPermission("usage.read").route({ description: "Get workspace credit balance and ledger", method: "GET" }).input(organizationId).handler(async ({ input }) => ({ account: await getCreditAccount(input.organizationId), ledger: await listCreditLedger(input.organizationId) })),
  record: requirePlatformPermission("usage.write").route({ description: "Record an idempotent usage event", method: "POST" }).input(z.object({ organizationId: id, metric: z.enum(["ai_tokens", "api_calls"]), quantity: z.number().int().positive().max(2_147_483_647), idempotencyKey: z.string().trim().min(1).max(255), feature: z.string().trim().max(200).optional(), projectId: id.optional(), source: z.string().trim().max(100).optional() })).handler(async ({ context, input }) => {
    let result;
    try { result = await recordUsageEvent(input); } catch (error) {
      if (error instanceof UsageIdempotencyConflictError) throw new ORPCError("CONFLICT", { message: "IDEMPOTENCY_CONFLICT" });
      throw error;
    }
    await recordAudit({ actorId: context.session.user.id, actorName: context.session.user.name, action: "usage.recorded", organizationId: input.organizationId, targetType: "usage_event", targetLabel: result.event.id, metadata: { duplicate: result.duplicate, metric: input.metric, quantity: input.quantity } });
    return { ...result, event: { ...result.event, createdAt: result.event.createdAt.toISOString() } };
  }),
  credit: requirePlatformPermission("usage.write").route({ description: "Apply an idempotent credit operation", method: "POST" }).input(z.object({ organizationId: id, operation: z.enum(["grant", "consume", "adjust", "reverse"]), amount: z.number().int().refine((value) => value !== 0).refine((value) => Math.abs(value) <= 2_147_483_647), idempotencyKey: z.string().trim().min(1).max(255), referenceId: id.optional(), reason: z.string().trim().min(1).max(500).optional() }).superRefine((value, ctx) => { if (value.operation === "adjust" && !value.reason) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: "reason is required for adjustments" }); })).handler(async ({ context, input }) => {
    let result;
    try { result = await applyCreditOperation({ ...input, metadata: input.reason ? { reason: input.reason } : undefined }); } catch (error) {
      if (error instanceof UsageIdempotencyConflictError) throw new ORPCError("CONFLICT", { message: "IDEMPOTENCY_CONFLICT" });
      throw error;
    }
    await recordAudit({ actorId: context.session.user.id, actorName: context.session.user.name, action: `credit.${input.operation}`, organizationId: input.organizationId, targetType: "credit_account", targetLabel: result.ledger.accountId, metadata: { duplicate: result.duplicate, amount: result.ledger.amount } });
    return { ...result, ledger: { ...result.ledger, createdAt: result.ledger.createdAt.toISOString() } };
  })
};
