import { check, index, integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { organization } from "#@/schema/auth.schema";
import { plan, workspaceSubscription } from "#@/schema/platform.schema";

/** Provider-agnostic price snapshots. Prices are immutable: close a row and insert a new one. */
export const planPrice = pgTable("plan_price", {
  id: text("id").primaryKey(), planId: text("plan_id").notNull().references(() => plan.id),
  currency: text("currency").notNull().default("BRL"), interval: text("interval").notNull(),
  amountMinor: integer("amount_minor").notNull(), effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveTo: timestamp("effective_to"), createdAt: timestamp("created_at").defaultNow().notNull()
}, (t) => [check("plan_price_amount_positive", sql`${t.amountMinor} >= 0`), index("plan_price_plan_effective_idx").on(t.planId, t.effectiveFrom)]);

export const workspaceBillingProfile = pgTable("workspace_billing_profile", {
  organizationId: text("organization_id").primaryKey().references(() => organization.id, { onDelete: "cascade" }),
  legalName: text("legal_name"), taxId: text("tax_id"), billingEmail: text("billing_email"), address: jsonb("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const invoice = pgTable("invoice", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }), subscriptionId: text("subscription_id").references(() => workspaceSubscription.id, { onDelete: "set null" }),
  number: text("number").notNull().unique(), status: text("status").notNull().default("draft"), currency: text("currency").notNull().default("BRL"),
  subtotalMinor: integer("subtotal_minor").notNull().default(0), totalMinor: integer("total_minor").notNull().default(0), amountPaidMinor: integer("amount_paid_minor").notNull().default(0), amountDueMinor: integer("amount_due_minor").notNull().default(0),
  issuedAt: timestamp("issued_at"), dueAt: timestamp("due_at"), paidAt: timestamp("paid_at"), voidedAt: timestamp("voided_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (t) => [check("invoice_amounts_nonnegative", sql`${t.subtotalMinor} >= 0 AND ${t.totalMinor} >= 0`), index("invoice_org_created_idx").on(t.organizationId, t.createdAt), index("invoice_status_idx").on(t.status, t.createdAt)]);

export const invoiceLineItem = pgTable("invoice_line_item", {
  id: text("id").primaryKey(), invoiceId: text("invoice_id").notNull().references(() => invoice.id, { onDelete: "cascade" }),
  description: text("description").notNull(), quantity: integer("quantity").notNull(), unitAmountMinor: integer("unit_amount_minor").notNull(), totalMinor: integer("total_minor").notNull(), snapshot: jsonb("snapshot"), createdAt: timestamp("created_at").defaultNow().notNull()
}, (t) => [check("invoice_line_quantity_positive", sql`${t.quantity} > 0`), check("invoice_line_amounts_nonnegative", sql`${t.unitAmountMinor} >= 0 AND ${t.totalMinor} >= 0`), index("invoice_line_invoice_idx").on(t.invoiceId)]);

export const manualPayment = pgTable("manual_payment", {
  id: text("id").primaryKey(), invoiceId: text("invoice_id").notNull().references(() => invoice.id), organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull().default("BRL"), status: text("status").notNull().default("recorded"), method: text("method").notNull().default("manual"), provider: text("provider"), reference: text("reference"), idempotencyKey: text("idempotency_key").notNull(), createdAt: timestamp("created_at").defaultNow().notNull()
}, (t) => [check("manual_payment_amount_positive", sql`${t.amountMinor} > 0`), unique("manual_payment_idempotency_unique").on(t.organizationId, t.idempotencyKey), index("manual_payment_invoice_idx").on(t.invoiceId)]);

export const refund = pgTable("refund", {
  id: text("id").primaryKey(), paymentId: text("payment_id").notNull().references(() => manualPayment.id), organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }), amountMinor: integer("amount_minor").notNull(), status: text("status").notNull().default("recorded"), method: text("method").notNull().default("manual"), provider: text("provider"), reason: text("reason"), idempotencyKey: text("idempotency_key").notNull(), createdAt: timestamp("created_at").defaultNow().notNull()
}, (t) => [check("refund_amount_positive", sql`${t.amountMinor} > 0`), unique("refund_idempotency_unique").on(t.organizationId, t.idempotencyKey), index("refund_payment_idx").on(t.paymentId)]);
