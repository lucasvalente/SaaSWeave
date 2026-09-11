import { foreignKey, index, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

import { cases } from "./cases.schema";
import { trafficFines } from "./traffic-fines.schema";

export const DEADLINE_TYPES = [
  "preliminary_defense",
  "jari_appeal",
  "cetran_appeal",
  "fine_payment",
  "driver_nomination",
  "other"
] as const;

export type DeadlineType = (typeof DEADLINE_TYPES)[number];

export const deadlines = pgTable(
  "deadlines",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    caseId: text("case_id"),
    caseInstanceId: text("case_instance_id"),
    trafficFineId: text("traffic_fine_id"),
    type: text("type").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    source: text("source").notNull().default("statutory"), // 'statutory' | 'judicial' | 'authority_notice' | 'custom'
    calculationVersion: text("calculation_version").notNull().default("v1"),
    status: text("status").notNull().default("pending"), // 'pending' | 'completed' | 'cancelled' | 'missed'
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("idx_deadlines_tenant_id").on(table.tenantId),
    index("idx_deadlines_case_id").on(table.caseId),
    index("idx_deadlines_fine_id").on(table.trafficFineId),
    index("idx_deadlines_due_at").on(table.dueAt),
    index("idx_deadlines_status").on(table.status),
    unique("uq_deadlines_tenant_id").on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.caseId],
      foreignColumns: [cases.tenantId, cases.id],
      name: "fk_deadlines_tenant_case"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.tenantId, table.trafficFineId],
      foreignColumns: [trafficFines.tenantId, trafficFines.id],
      name: "fk_deadlines_tenant_traffic_fine"
    }).onDelete("cascade")
  ]
);

export type Deadline = typeof deadlines.$inferSelect;
export type NewDeadline = typeof deadlines.$inferInsert;
