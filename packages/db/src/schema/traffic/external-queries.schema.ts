import { index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

export const externalQueryStatusEnum = pgEnum("external_query_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "TIMEOUT",
  "RATE_LIMITED"
]);

// Append-only integration hub query log.
// CRITICAL: NEVER store credentials, secrets, tokens, or raw unredacted auth headers in this table.
export const externalQueries = pgTable(
  "external_queries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(), // e.g., 'INMETRO', 'SENATRAN', 'DETRAN_SP', 'DNIT'
    operation: text("operation").notNull(), // e.g., 'VERIFY_EQUIPMENT', 'FETCH_INFRACTION'
    entityType: text("entity_type").notNull(), // e.g., 'TRAFFIC_FINE', 'VEHICLE', 'EQUIPMENT'
    entityId: text("entity_id"),
    inputHash: text("input_hash").notNull(), // SHA256 of normalized input payload
    responseHash: text("response_hash"), // SHA256 of response payload
    status: externalQueryStatusEnum("status").notNull().default("PENDING"),
    httpStatus: integer("http_status"),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    safeMetadata: jsonb("safe_metadata").default({}), // Sanitized, strictly redacting any PII or secrets
    executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("external_queries_tenant_idx").on(table.tenantId),
    index("external_queries_provider_idx").on(table.provider),
    index("external_queries_status_idx").on(table.status),
    index("external_queries_entity_idx").on(table.entityType, table.entityId),
    index("external_queries_input_hash_idx").on(table.inputHash),
    index("external_queries_executed_at_idx").on(table.executedAt)
  ]
);

export type ExternalQuery = typeof externalQueries.$inferSelect;
export type NewExternalQuery = typeof externalQueries.$inferInsert;
