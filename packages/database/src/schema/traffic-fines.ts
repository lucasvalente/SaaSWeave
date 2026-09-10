import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { drivers } from "./drivers";
import { equipmentVerifications } from "./equipment";
import { tenants } from "./tenants";
import { trafficAuthorities } from "./traffic-authorities";
import { vehicles } from "./vehicles";

export const trafficFines = pgTable(
  "traffic_fines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict" }),
    driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "set null" }),
    trafficAuthorityId: uuid("traffic_authority_id")
      .notNull()
      .references(() => trafficAuthorities.id, { onDelete: "restrict" }),
    equipmentVerificationId: uuid("equipment_verification_id").references(
      () => equipmentVerifications.id,
      { onDelete: "set null" },
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
    status: text("status").notNull().default("detected"), // 'detected' | 'analyzed' | 'drafting' | 'submitted' | 'deferred' | 'indeferred' | 'paid' | 'cancelled'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_traffic_fines_tenant_id").on(table.tenantId),
    index("idx_traffic_fines_tenant_status").on(table.tenantId, table.status),
    index("idx_traffic_fines_vehicle_id").on(table.vehicleId),
    index("idx_traffic_fines_driver_id").on(table.driverId),
    index("idx_traffic_fines_authority_id").on(table.trafficAuthorityId),
    index("idx_traffic_fines_defense_deadline").on(table.defenseDeadline),
    uniqueIndex("uq_traffic_fines_tenant_ait").on(table.tenantId, table.aitNumber),
  ],
);

export type TrafficFine = typeof trafficFines.$inferSelect;
export type NewTrafficFine = typeof trafficFines.$inferInsert;
