import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { organization } from "#@/schema/auth.schema";

export const usageMetric = pgTable("usage_metric", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  aggregationType: text("aggregation_type").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const usageEvent = pgTable("usage_event", {
  createdAt: timestamp("created_at").defaultNow().notNull(), feature: text("feature"), id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key"), inputTokens: integer("input_tokens"), metric: text("metric").notNull(),
  metadata: jsonb("metadata"), model: text("model"), organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  outputTokens: integer("output_tokens"), projectId: text("project_id"), provider: text("provider"), quantity: integer("quantity").notNull(), source: text("source").default("system").notNull()
}, (table) => [
  check("usage_event_metric_check", sql`${table.metric} IN ('ai_tokens', 'api_calls')`), check("usage_event_quantity_positive_check", sql`${table.quantity} > 0`),
  check("usage_event_input_tokens_nonnegative_check", sql`${table.inputTokens} IS NULL OR ${table.inputTokens} >= 0`), check("usage_event_output_tokens_nonnegative_check", sql`${table.outputTokens} IS NULL OR ${table.outputTokens} >= 0`),
  unique("usage_event_org_idempotency_key").on(table.organizationId, table.idempotencyKey), index("usage_event_org_metric_idx").on(table.organizationId, table.metric),
  index("usage_event_org_model_idx").on(table.organizationId, table.model), index("usage_event_createdAt_idx").on(table.createdAt), index("usage_event_org_metric_created_idx").on(table.organizationId, table.metric, table.createdAt)
]);

export const usageAggregate = pgTable("usage_aggregate", {
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }), metric: text("metric").notNull(), periodStart: timestamp("period_start").notNull(), periodEnd: timestamp("period_end").notNull(), quantity: integer("quantity").notNull().default(0), eventCount: integer("event_count").notNull().default(0), updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [unique("usage_aggregate_org_metric_period").on(table.organizationId, table.metric, table.periodStart), index("usage_aggregate_org_period_idx").on(table.organizationId, table.periodStart)]);

export const creditAccount = pgTable("credit_account", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }), balance: integer("balance").notNull().default(0), version: integer("version").notNull().default(1), createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [unique("credit_account_organization_unique").on(table.organizationId), unique("credit_account_id_organization_unique").on(table.id, table.organizationId)]);

export const creditLedger = pgTable("credit_ledger", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull().references(() => creditAccount.id, { onDelete: "cascade" }), organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }), operation: text("operation").notNull(), amount: integer("amount").notNull(), balanceAfter: integer("balance_after").notNull(), idempotencyKey: text("idempotency_key"), referenceId: text("reference_id"), metadata: jsonb("metadata"), createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [unique("credit_ledger_org_idempotency_key").on(table.organizationId, table.idempotencyKey), index("credit_ledger_org_created_idx").on(table.organizationId, table.createdAt), foreignKey({ columns: [table.accountId, table.organizationId], foreignColumns: [creditAccount.id, creditAccount.organizationId], name: "credit_ledger_account_org_fk" })]);
