import { boolean, foreignKey, index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

import { customers } from "./customers.schema";

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    customerId: text("customer_id").notNull(),
    street: text("street").notNull(),
    number: text("number").notNull(),
    complement: text("complement"),
    neighborhood: text("neighborhood"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    index("idx_customer_addresses_tenant_id").on(table.tenantId),
    index("idx_customer_addresses_customer_id").on(table.customerId),
    unique("uq_customer_addresses_tenant_id").on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.customerId],
      foreignColumns: [customers.tenantId, customers.id],
      name: "fk_customer_addresses_tenant_customer"
    }).onDelete("cascade")
  ]
);

export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type NewCustomerAddress = typeof customerAddresses.$inferInsert;
