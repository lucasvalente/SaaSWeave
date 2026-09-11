import { index, pgTable, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

export const units = pgTable(
  "units",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    code: text("code"), // Operational branch code
    status: text("status").notNull().default("active"), // 'active' | 'inactive'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    index("idx_units_tenant_id").on(table.tenantId),
    uniqueIndex("uq_units_tenant_slug").on(table.tenantId, table.slug),
    unique("uq_units_tenant_id").on(table.tenantId, table.id)
  ]
);

export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
