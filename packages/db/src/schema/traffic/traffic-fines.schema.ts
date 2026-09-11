import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

import { drivers } from "./drivers.schema";
import { equipmentVerifications } from "./equipment.schema";
import { trafficAuthorities } from "./traffic-authorities.schema";
import { vehicles } from "./vehicles.schema";

export const trafficFines = pgTable(
  "traffic_fines",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    vehicleId: text("vehicle_id").notNull(),
    driverId: text("driver_id"),
    trafficAuthorityId: text("traffic_authority_id")
      .notNull()
      .references(() => trafficAuthorities.id, { onDelete: "restrict" }),
    equipmentVerificationId: text("equipment_verification_id").references(
      () => equipmentVerifications.id,
      { onDelete: "set null" }
    ),
    aitNumber: text("ait_number").notNull(), // AIT unique registration code from the authority
    infractionCode: text("infraction_code").notNull(), // e.g., '7455-0', '5002-0'
    infractionDescription: text("infraction_description").notNull(),
    infractionDate: timestamp("infraction_date", { withTimezone: true }).notNull(),
    location: text("location").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    speedLimit: integer("speed_limit"),
    measuredSpeed: integer("measured_speed"),
    consideredSpeed: integer("considered_speed"),
    points: integer("points").notNull().default(0),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }),
    notificationDate: date("notification_date"),
    defenseDeadline: date("defense_deadline"),
    status: text("status").notNull().default("REGISTERED"), // 'REGISTERED' | 'UNDER_ANALYSIS' | 'ACTIVE' | 'PAID' | 'CANCELLED' | 'ARCHIVED'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    index("idx_traffic_fines_tenant_id").on(table.tenantId),
    index("idx_traffic_fines_tenant_status").on(table.tenantId, table.status),
    index("idx_traffic_fines_vehicle_id").on(table.vehicleId),
    index("idx_traffic_fines_driver_id").on(table.driverId),
    index("idx_traffic_fines_authority_id").on(table.trafficAuthorityId),
    index("idx_traffic_fines_defense_deadline").on(table.defenseDeadline),
    uniqueIndex("uq_traffic_fines_tenant_ait").on(table.tenantId, table.aitNumber),
    unique("uq_traffic_fines_tenant_id").on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.vehicleId],
      foreignColumns: [vehicles.tenantId, vehicles.id],
      name: "fk_traffic_fines_tenant_vehicle"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.tenantId, table.driverId],
      foreignColumns: [drivers.tenantId, drivers.id],
      name: "fk_traffic_fines_tenant_driver"
    }).onDelete("set null"),
    check("chk_traffic_fines_amount_positive", sql`${table.amount} >= 0`)
  ]
);

export type TrafficFine = typeof trafficFines.$inferSelect;
export type NewTrafficFine = typeof trafficFines.$inferInsert;
