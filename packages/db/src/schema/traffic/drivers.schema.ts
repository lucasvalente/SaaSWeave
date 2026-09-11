import {
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

import { customers } from "./customers.schema";

export const drivers = pgTable(
  "drivers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    customerId: text("customer_id"),
    name: text("name").notNull(),
    cpf: text("cpf").notNull(), // Brazilian CPF (11 digits, normalized)
    cnhNumber: text("cnh_number").notNull(), // CNH registration number
    cnhCategory: text("cnh_category").notNull(), // 'A' | 'B' | 'AB' | 'C' | 'D' | 'E'
    cnhExpiration: date("cnh_expiration").notNull(),
    cnhFirstIssue: date("cnh_first_issue"),
    points: integer("points").notNull().default(0),
    status: text("status").notNull().default("regular"), // 'regular' | 'suspended' | 'cassated'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    index("idx_drivers_tenant_id").on(table.tenantId),
    index("idx_drivers_customer_id").on(table.customerId),
    index("idx_drivers_tenant_status").on(table.tenantId, table.status),
    uniqueIndex("uq_drivers_tenant_cpf").on(table.tenantId, table.cpf),
    uniqueIndex("uq_drivers_tenant_cnh").on(table.tenantId, table.cnhNumber),
    unique("uq_drivers_tenant_id").on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.customerId],
      foreignColumns: [customers.tenantId, customers.id],
      name: "fk_drivers_tenant_customer"
    }).onDelete("set null")
  ]
);

export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
