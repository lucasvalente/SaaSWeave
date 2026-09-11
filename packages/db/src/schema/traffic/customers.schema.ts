import { index, pgTable, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

export const customers = pgTable(
  "customers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    document: text("document"), // CPF or CNPJ
    documentType: text("document_type").notNull().default("cnpj"), // 'cpf' | 'cnpj'
    email: text("email"),
    phone: text("phone"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    index("idx_customers_tenant_id").on(table.tenantId),
    index("idx_customers_tenant_status").on(table.tenantId, table.status),
    uniqueIndex("uq_customers_tenant_document").on(table.tenantId, table.document),
    unique("uq_customers_tenant_id").on(table.tenantId, table.id)
  ]
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
