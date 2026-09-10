import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    document: text("document"), // CNPJ or CPF
    documentType: text("document_type").notNull().default("cnpj"), // 'cnpj' | 'cpf'
    email: text("email"),
    phone: text("phone"),
    status: text("status").notNull().default("active"), // 'active' | 'inactive'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_customers_tenant_id").on(table.tenantId),
    index("idx_customers_tenant_status").on(table.tenantId, table.status),
    uniqueIndex("uq_customers_tenant_document").on(table.tenantId, table.document),
  ],
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
