import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

import { cases } from "./cases.schema";
import { trafficAuthorities } from "./traffic-authorities.schema";

export const CASE_INSTANCE_TYPES = ["DEFESA_PREVIA", "JARI", "CETRAN", "OTHER"] as const;

export type CaseInstanceType = (typeof CASE_INSTANCE_TYPES)[number];

export const caseInstances = pgTable(
  "case_instances",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    caseId: text("case_id").notNull(),
    type: text("type").notNull(), // 'DEFESA_PREVIA' | 'JARI' | 'CETRAN' | 'OTHER'
    sequence: integer("sequence").notNull().default(1),
    authorityId: text("authority_id").references(() => trafficAuthorities.id, {
      onDelete: "restrict"
    }),
    status: text("status").notNull().default("draft"), // 'draft' | 'ready_for_review' | 'approved' | 'submitted' | 'in_judgment' | 'granted' | 'denied' | 'cancelled'
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    decisionAt: timestamp("decision_at", { withTimezone: true }),
    decision: text("decision"), // 'deferred' | 'indeferred' | 'partial' | 'cancelled'
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("idx_case_instances_tenant_id").on(table.tenantId),
    index("idx_case_instances_case_id").on(table.caseId),
    index("idx_case_instances_authority_id").on(table.authorityId),
    index("idx_case_instances_status").on(table.status),
    index("idx_case_instances_deadline").on(table.deadlineAt),
    unique("uq_case_instances_tenant_id").on(table.tenantId, table.id),
    uniqueIndex("uq_case_instances_seq").on(
      table.tenantId,
      table.caseId,
      table.type,
      table.sequence
    ),
    foreignKey({
      columns: [table.tenantId, table.caseId],
      foreignColumns: [cases.tenantId, cases.id],
      name: "fk_case_instances_tenant_case"
    }).onDelete("cascade")
  ]
);

export type CaseInstance = typeof caseInstances.$inferSelect;
export type NewCaseInstance = typeof caseInstances.$inferInsert;
