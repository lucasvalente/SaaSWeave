import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db, recordAudit } from "@saasweave/db";
import { member, organization, processedEvent, user } from "@saasweave/db/schema";
import { ENV_SERVER } from "@saasweave/env/server/env";

import { planName } from "#@/billing/plan-catalog";

export type SubscriptionCreatedEmailIntent = {
  manageUrl: string;
  organizationId: string;
  ownerEmail: string;
  ownerName: string;
  planId: string | null;
  planName: string;
};

export type StripeWebhookApplyResult = {
  subscriptionCreatedEmail?: SubscriptionCreatedEmailIntent;
};

type DbExecutor = Pick<typeof db, "insert" | "select" | "update">;

/** Resolve a webhook's organization without allowing metadata to cross tenants. */
async function resolveOrganizationId(
  customerId: string | undefined,
  metadataOrganizationId: string | null | undefined,
  executor: Pick<typeof db, "select">
): Promise<string | null> {
  if (metadataOrganizationId) {
    const [metadataOrg] = await executor
      .select({ id: organization.id, stripeCustomerId: organization.stripeCustomerId })
      .from(organization)
      .where(eq(organization.id, metadataOrganizationId))
      .limit(1);
    if (
      metadataOrg &&
      (!metadataOrg.stripeCustomerId || metadataOrg.stripeCustomerId === customerId)
    ) {
      return metadataOrg.id;
    }
  }
  if (!customerId) return null;
  const [customerOrg] = await executor
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.stripeCustomerId, customerId))
    .limit(1);
  return customerOrg?.id ?? null;
}

export function extractStripeCustomerId(event: Stripe.Event): string | null {
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    return typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null);
  }

  if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
    const invoice = event.data.object;
    return typeof invoice.customer === "string" ? invoice.customer : (invoice.customer?.id ?? null);
  }

  return null;
}

/** Idempotency claim — returns false when this event id was already processed. */
export async function claimStripeWebhookEvent(event: Stripe.Event): Promise<boolean> {
  const eventKey = `stripe:${event.id}`;
  const inserted = await db
    .insert(processedEvent)
    .values({ id: eventKey, source: "stripe" })
    .onConflictDoNothing()
    .returning({ id: processedEvent.id });
  return inserted.length > 0;
}

/** Look up the owner's email + display name for a workspace, if any. */
async function getOrgOwner(
  organizationId: string
): Promise<{ email: string; name: string } | undefined> {
  const rows = await db
    .select({ email: user.email, name: user.name })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(and(eq(member.organizationId, organizationId), eq(member.role, "owner")))
    .limit(1);
  return rows[0];
}

async function applySubscription(
  subscription: Stripe.Subscription,
  executor: DbExecutor = db
): Promise<string | null> {
  const organizationId = subscription.metadata.organizationId;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const planId = subscription.metadata.planId ?? null;
  const periodEnd = subscription.items.data[0]?.current_period_end;

  const values = {
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    planId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status
  };

  const auditOrgId = await resolveOrganizationId(customerId, organizationId, executor);
  if (!auditOrgId) return null;
  await executor
    .update(organization)
    .set(values)
    .where(eq(organization.id, auditOrgId));

  if (auditOrgId) {
    await recordAudit({
      action: "subscription.updated",
      metadata: { planId, status: subscription.status },
      organizationId: auditOrgId,
      targetLabel: planId ?? subscription.status,
      targetType: "subscription"
    });
  }
  return auditOrgId;
}

/** Apply Stripe webhook side effects (after idempotency claim and ordering guard). */
export async function applyStripeWebhookEvent(
  event: Stripe.Event,
  executor: DbExecutor = db,
  input: { manageUrl?: string } = {}
): Promise<StripeWebhookApplyResult> {
  const manageUrl = input.manageUrl ?? `${ENV_SERVER.VITE_WEB_URL}/app/billing`;
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const orgId = await applySubscription(event.data.object, executor);
    const result: StripeWebhookApplyResult = {};

    if (orgId && event.type === "customer.subscription.created") {
      const owner = await getOrgOwner(orgId);
      if (owner) {
        const resolvedPlanId = event.data.object.metadata.planId ?? null;
        result.subscriptionCreatedEmail = {
          manageUrl,
          organizationId: orgId,
          ownerEmail: owner.email,
          ownerName: owner.name.split(" ")[0] || owner.name,
          planId: resolvedPlanId,
          planName: await planName(resolvedPlanId)
        };
      }
    }

    return result;
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    const organizationId = await resolveOrganizationId(
      customerId,
      invoice.metadata?.organizationId,
      executor
    );
    if (organizationId) {
      await recordAudit({
        action: "billing.payment_failed",
        organizationId,
        targetLabel: invoice.id,
        targetType: "invoice"
      });
    }
    return {};
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object;
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (!customerId) return {};
    const row = await executor
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.stripeCustomerId, customerId))
      .limit(1);
    if (!row[0]) return {};
    await recordAudit({
      action: "billing.invoice_paid",
      metadata: { amountPaid: invoice.amount_paid },
      organizationId: row[0].id,
      targetLabel: invoice.id,
      targetType: "invoice"
    });
  }

  return {};
}
