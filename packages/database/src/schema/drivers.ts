import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { tenants } from "./tenants";

export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
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
  },
  (table) => [
    index("idx_drivers_tenant_id").on(table.tenantId),
    index("idx_drivers_customer_id").on(table.customerId),
    index("idx_drivers_tenant_status").on(table.tenantId, table.status),
    uniqueIndex("uq_drivers_tenant_cpf").on(table.tenantId, table.cpf),
    uniqueIndex("uq_drivers_tenant_cnh").on(table.tenantId, table.cnhNumber),
  ],
);

export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
