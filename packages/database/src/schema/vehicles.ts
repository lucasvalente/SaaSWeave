import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { tenants } from "./tenants";

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    plate: text("plate").notNull(), // Brazilian standard / Mercosul plate (uppercase)
    renavam: text("renavam").notNull(), // RENAVAM code (11 digits)
    chassi: text("chassi").notNull(), // VIN / Chassi (17 characters)
    brand: text("brand").notNull(), // e.g., 'Volkswagen', 'Volvo'
    model: text("model").notNull(), // e.g., 'Gol 1.0', 'FH 540'
    modelYear: integer("model_year").notNull(),
    manufactureYear: integer("manufacture_year").notNull(),
    color: text("color"),
    fuelType: text("fuel_type"), // 'diesel' | 'flex' | 'gasolina' | 'eletrico' | 'hibrido'
    status: text("status").notNull().default("active"), // 'active' | 'inactive' | 'sold'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_vehicles_tenant_id").on(table.tenantId),
    index("idx_vehicles_customer_id").on(table.customerId),
    index("idx_vehicles_tenant_status").on(table.tenantId, table.status),
    uniqueIndex("uq_vehicles_tenant_plate").on(table.tenantId, table.plate),
    uniqueIndex("uq_vehicles_tenant_renavam").on(table.tenantId, table.renavam),
    uniqueIndex("uq_vehicles_tenant_chassi").on(table.tenantId, table.chassi),
  ],
);

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
