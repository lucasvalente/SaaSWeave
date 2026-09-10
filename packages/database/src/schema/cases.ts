import { date, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { trafficFines } from "./traffic-fines";

export const administrativeCases = pgTable(
  "administrative_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    trafficFineId: uuid("traffic_fine_id")
      .notNull()
      .references(() => trafficFines.id, { onDelete: "cascade" }),
    caseNumber: text("case_number").notNull(), // Unique case identifier within tenant
    currentInstance: text("current_instance").notNull().default("preliminary_defense"), // 'preliminary_defense' | 'jari_first_instance' | 'cetran_second_instance'
    status: text("status").notNull().default("draft"), // 'draft' | 'ready_for_review' | 'approved' | 'submitted' | 'in_judgment' | 'granted' | 'denied'
    protocolNumber: text("protocol_number"), // Official protocol registration number from authority
    protocolDate: timestamp("protocol_date", { withTimezone: true }),
    deadlineDate: date("deadline_date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_cases_tenant_id").on(table.tenantId),
    index("idx_cases_fine_id").on(table.trafficFineId),
    index("idx_cases_tenant_status").on(table.tenantId, table.status),
    index("idx_cases_deadline_date").on(table.deadlineDate),
    uniqueIndex("uq_cases_tenant_case_number").on(table.tenantId, table.caseNumber),
  ],
);

export type AdministrativeCase = typeof administrativeCases.$inferSelect;
export type NewAdministrativeCase = typeof administrativeCases.$inferInsert;
