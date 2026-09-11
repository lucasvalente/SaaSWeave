import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

export const idempotencyStatusEnum = pgEnum("idempotency_status", [
  "PROCESSING",
  "COMPLETED",
  "FAILED"
]);

// Idempotency key tracking table to guarantee exactly-once processing of mutating requests and jobs.
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    keyHash: text("key_hash").notNull(), // SHA256 of original idempotency token
    scope: text("scope").notNull().default("API_MUTATION"), // e.g. 'API_MUTATION', 'WORKER_JOB'
    status: idempotencyStatusEnum("status").notNull().default("PROCESSING"),
    responseCode: integer("response_code"),
    responseBody: jsonb("response_body"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("idempotency_keys_tenant_key_scope_idx").on(
      table.tenantId,
      table.keyHash,
      table.scope
    ),
    index("idempotency_keys_tenant_idx").on(table.tenantId),
    index("idempotency_keys_expires_at_idx").on(table.expiresAt)
  ]
);

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKey = typeof idempotencyKeys.$inferInsert;
