import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "#@/connection";
import { invoice, invoiceLineItem, manualPayment, planPrice, refund, workspaceBillingProfile } from "#@/schema/billing.schema";

export class BillingNotFoundError extends Error {}
export class BillingConflictError extends Error {}
const SUPPORTED_CURRENCIES = new Set(["BRL", "USD", "EUR"]);
function currency(value: string | undefined) {
  const normalized = (value ?? "BRL").trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(normalized)) throw new BillingConflictError("unsupported currency");
  return normalized;
}

export async function listPlanPrices(planId: string) {
  return db.select().from(planPrice).where(eq(planPrice.planId, planId)).orderBy(desc(planPrice.effectiveFrom));
}

export async function createPlanPrice(input: { planId: string; currency?: string; interval: "month" | "year" | "one_time"; amountMinor: number }) {
  const [row] = await db.insert(planPrice).values({ id: randomUUID(), ...input, currency: currency(input.currency) }).returning();
  return row;
}

export async function upsertBillingProfile(input: { organizationId: string; legalName?: string | null; taxId?: string | null; billingEmail?: string | null; address?: unknown }) {
  const [row] = await db.insert(workspaceBillingProfile).values({ ...input, updatedAt: new Date() }).onConflictDoUpdate({ target: workspaceBillingProfile.organizationId, set: { legalName: input.legalName, taxId: input.taxId, billingEmail: input.billingEmail, address: input.address, updatedAt: new Date() } }).returning();
  return row;
}

export async function getBillingProfile(organizationId: string) {
  const [row] = await db.select().from(workspaceBillingProfile).where(eq(workspaceBillingProfile.organizationId, organizationId)).limit(1);
  return row ?? null;
}

export async function createInvoice(input: { organizationId: string; subscriptionId?: string; currency?: string; dueAt?: Date | null; lines: Array<{ description: string; quantity: number; unitAmountMinor: number; snapshot?: unknown }> }) {
  if (input.lines.length === 0) throw new BillingConflictError("invoice requires at least one line");
  return db.transaction(async (tx) => {
    const lines = input.lines.map((line) => ({ ...line, totalMinor: line.quantity * line.unitAmountMinor }));
    const totalMinor = lines.reduce((sum, line) => sum + line.totalMinor, 0);
    if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) throw new BillingConflictError("invoice total is invalid");
    const [created] = await tx.insert(invoice).values({ id: randomUUID(), organizationId: input.organizationId, subscriptionId: input.subscriptionId, currency: currency(input.currency), number: sql`concat('INV-', lpad(nextval('invoice_number_seq')::text, 10, '0'))`, subtotalMinor: totalMinor, totalMinor, amountDueMinor: totalMinor, dueAt: input.dueAt ?? null }).returning();
    await tx.insert(invoiceLineItem).values(lines.map((line) => ({ id: randomUUID(), invoiceId: created.id, ...line })));
    return created;
  });
}

export async function getInvoice(organizationId: string, id: string) {
  const [row] = await db.select().from(invoice).where(and(eq(invoice.id, id), eq(invoice.organizationId, organizationId))).limit(1);
  if (!row) return null;
  const lines = await db.select().from(invoiceLineItem).where(eq(invoiceLineItem.invoiceId, id));
  return { ...row, lines };
}

export async function issueInvoice(organizationId: string, id: string) {
  const [row] = await db.update(invoice).set({ status: "open", issuedAt: new Date(), updatedAt: new Date() }).where(and(eq(invoice.id, id), eq(invoice.organizationId, organizationId), eq(invoice.status, "draft"))).returning();
  if (!row) throw new BillingConflictError("invoice cannot be issued");
  return row;
}

export async function voidInvoice(organizationId: string, id: string) {
  const [row] = await db.update(invoice).set({ status: "void", voidedAt: new Date(), updatedAt: new Date() }).where(and(eq(invoice.id, id), eq(invoice.organizationId, organizationId), sql`${invoice.status} IN ('draft','open')`)).returning();
  if (!row) throw new BillingConflictError("invoice cannot be voided");
  return row;
}

export async function recordManualPayment(input: { organizationId: string; invoiceId: string; amountMinor: number; currency?: string; method?: string; provider?: string; reference?: string; idempotencyKey: string }) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(manualPayment).where(and(eq(manualPayment.organizationId, input.organizationId), eq(manualPayment.idempotencyKey, input.idempotencyKey))).limit(1);
    if (existing) {
      if (existing.invoiceId !== input.invoiceId || existing.amountMinor !== input.amountMinor || existing.currency !== currency(input.currency)) throw new BillingConflictError("idempotency key payload mismatch");
      return { payment: existing, duplicate: true };
    }
    const [inv] = await tx.select().from(invoice).where(and(eq(invoice.id, input.invoiceId), eq(invoice.organizationId, input.organizationId))).for("update");
    if (!inv) throw new BillingNotFoundError("invoice not found");
    if (inv.status !== "open" && inv.status !== "paid") throw new BillingConflictError("invoice is not payable");
    const paymentCurrency = currency(input.currency);
    if (paymentCurrency !== inv.currency) throw new BillingConflictError("currency mismatch");
    const [{ total: alreadyPaid }] = await tx.select({ total: sql<number>`coalesce(sum(${manualPayment.amountMinor}), 0)` }).from(manualPayment).where(eq(manualPayment.invoiceId, input.invoiceId));
    if (Number(alreadyPaid) + input.amountMinor > inv.totalMinor) throw new BillingConflictError("payment exceeds invoice total");
    const [payment] = await tx.insert(manualPayment).values({ id: randomUUID(), ...input, currency: input.currency ?? inv.currency, method: input.method ?? "manual" }).returning();
    const amountPaidMinor = Number(alreadyPaid) + input.amountMinor;
    await tx.update(invoice).set({ amountPaidMinor, amountDueMinor: inv.totalMinor - amountPaidMinor, ...(amountPaidMinor >= inv.totalMinor ? { status: "paid" as const, paidAt: new Date() } : {}), updatedAt: new Date() }).where(eq(invoice.id, inv.id));
    return { payment, duplicate: false };
  });
}

export async function recordRefund(input: { organizationId: string; paymentId: string; amountMinor: number; method?: string; provider?: string; reason?: string; idempotencyKey: string }) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(refund).where(and(eq(refund.organizationId, input.organizationId), eq(refund.idempotencyKey, input.idempotencyKey))).limit(1);
    if (existing) {
      if (existing.paymentId !== input.paymentId || existing.amountMinor !== input.amountMinor) throw new BillingConflictError("idempotency key payload mismatch");
      return { refund: existing, duplicate: true };
    }
    const [payment] = await tx.select().from(manualPayment).where(and(eq(manualPayment.id, input.paymentId), eq(manualPayment.organizationId, input.organizationId))).limit(1).for("update");
    if (!payment) throw new BillingNotFoundError("payment not found");
    const [{ total }] = await tx.select({ total: sql<number>`coalesce(sum(${refund.amountMinor}), 0)` }).from(refund).where(eq(refund.paymentId, input.paymentId));
    if (Number(total) + input.amountMinor > payment.amountMinor) throw new BillingConflictError("refund exceeds payment");
    const [created] = await tx.insert(refund).values({ id: randomUUID(), ...input }).returning();
    return { refund: created, duplicate: false };
  });
}

export async function listInvoices(organizationId: string, limit = 50) {
  return db.select().from(invoice).where(eq(invoice.organizationId, organizationId)).orderBy(desc(invoice.createdAt)).limit(Math.min(limit, 100));
}
