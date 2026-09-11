import { index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

export const outboxStatusEnum = pgEnum("outbox_status", [
  "PENDING",
  "PROCESSING",
  "PUBLISHED",
  "FAILED"
]);

// Transactional Outbox pattern table for guaranteed asynchronous event publishing.
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(), // e.g. 'CASE_CREATED', 'FINE_ANALYZED'
    aggregateType: text("aggregate_type").notNull(), // e.g. 'CASE', 'TRAFFIC_FINE'
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").notNull(),
    status: outboxStatusEnum("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("outbox_events_status_available_idx").on(table.status, table.availableAt),
    index("outbox_events_tenant_idx").on(table.tenantId),
    index("outbox_events_aggregate_idx").on(table.aggregateType, table.aggregateId),
    index("outbox_events_created_at_idx").on(table.createdAt)
  ]
);

export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;
