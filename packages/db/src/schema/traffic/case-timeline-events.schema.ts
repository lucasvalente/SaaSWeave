import { foreignKey, index, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { organization, user } from "#@/schema/auth.schema";

import { cases } from "./cases.schema";

export const caseTimelineEvents = pgTable(
  "case_timeline_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    caseId: text("case_id").notNull(),
    caseInstanceId: text("case_instance_id"),
    eventType: text("event_type").notNull(), // e.g., 'STATUS_CHANGED', 'DOCUMENT_UPLOADED', 'ANALYSIS_COMPLETED', 'PROTOCOL_REGISTERED'
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    source: text("source").notNull().default("system"), // 'system' | 'user' | 'ai' | 'integration' | 'authority'
    payload: jsonb("payload"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("idx_timeline_tenant_id").on(table.tenantId),
    index("idx_timeline_case_id").on(table.caseId),
    index("idx_timeline_instance_id").on(table.caseInstanceId),
    index("idx_timeline_occurred_at").on(table.occurredAt),
    unique("uq_case_timeline_events_tenant_id").on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.caseId],
      foreignColumns: [cases.tenantId, cases.id],
      name: "fk_timeline_tenant_case"
    }).onDelete("cascade")
  ]
);

export type CaseTimelineEvent = typeof caseTimelineEvents.$inferSelect;
export type NewCaseTimelineEvent = typeof caseTimelineEvents.$inferInsert;
