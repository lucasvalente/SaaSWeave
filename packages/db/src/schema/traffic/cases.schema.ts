import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { organization, user } from "#@/schema/auth.schema";

import { customers } from "./customers.schema";
import { trafficFines } from "./traffic-fines.schema";
import { units } from "./units.schema";

export const CASE_STATUSES = [
  "NEW",
  "WAITING_DOCUMENTS",
  "DOCUMENTS_READY",
  "ANALYSIS_PENDING",
  "ANALYSIS_RUNNING",
  "ANALYSIS_REVIEW",
  "PROPOSAL_PENDING",
  "WAITING_CUSTOMER",
  "CONTRACTED",
  "DEFENSE_DRAFTING",
  "DEFENSE_REVIEW",
  "WAITING_SIGNATURE",
  "READY_TO_PROTOCOL",
  "PROTOCOLLED",
  "FOLLOW_UP",
  "DECISION_RECEIVED",
  "COMPLETED",
  "CANCELLED"
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const cases = pgTable(
  "cases",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    unitId: text("unit_id").references(() => units.id, { onDelete: "set null" }),
    customerId: text("customer_id").notNull(),
    trafficFineId: text("traffic_fine_id").notNull(),
    caseNumber: text("case_number").notNull(),
    currentStatus: text("current_status").notNull().default("NEW"),
    priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
    assignedUserId: text("assigned_user_id").references(() => user.id, { onDelete: "set null" }),
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    index("idx_cases_tenant_id").on(table.tenantId),
    index("idx_cases_unit_id").on(table.unitId),
    index("idx_cases_customer_id").on(table.customerId),
    index("idx_cases_fine_id").on(table.trafficFineId),
    index("idx_cases_tenant_status").on(table.tenantId, table.currentStatus),
    index("idx_cases_assigned_user").on(table.assignedUserId),
    uniqueIndex("uq_cases_tenant_case_number").on(table.tenantId, table.caseNumber),
    unique("uq_cases_tenant_id").on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.customerId],
      foreignColumns: [customers.tenantId, customers.id],
      name: "fk_cases_tenant_customer"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.tenantId, table.trafficFineId],
      foreignColumns: [trafficFines.tenantId, trafficFines.id],
      name: "fk_cases_tenant_traffic_fine"
    }).onDelete("restrict")
  ]
);

export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
