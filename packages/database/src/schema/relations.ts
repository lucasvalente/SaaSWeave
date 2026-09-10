import { relations } from "drizzle-orm";
import { administrativeCases } from "./cases";
import { customers } from "./customers";
import { drivers } from "./drivers";
import { equipmentVerifications } from "./equipment";
import { tenants } from "./tenants";
import { trafficAuthorities } from "./traffic-authorities";
import { trafficFines } from "./traffic-fines";
import { vehicles } from "./vehicles";

export const tenantsRelations = relations(tenants, ({ many }) => ({
  customers: many(customers),
  drivers: many(drivers),
  vehicles: many(vehicles),
  trafficFines: many(trafficFines),
  administrativeCases: many(administrativeCases),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  drivers: many(drivers),
  vehicles: many(vehicles),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [drivers.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [drivers.customerId],
    references: [customers.id],
  }),
  trafficFines: many(trafficFines),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [vehicles.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [vehicles.customerId],
    references: [customers.id],
  }),
  trafficFines: many(trafficFines),
}));

export const trafficAuthoritiesRelations = relations(trafficAuthorities, ({ many }) => ({
  trafficFines: many(trafficFines),
}));

export const equipmentVerificationsRelations = relations(equipmentVerifications, ({ many }) => ({
  trafficFines: many(trafficFines),
}));

export const trafficFinesRelations = relations(trafficFines, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [trafficFines.tenantId],
    references: [tenants.id],
  }),
  vehicle: one(vehicles, {
    fields: [trafficFines.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [trafficFines.driverId],
    references: [drivers.id],
  }),
  authority: one(trafficAuthorities, {
    fields: [trafficFines.trafficAuthorityId],
    references: [trafficAuthorities.id],
  }),
  equipment: one(equipmentVerifications, {
    fields: [trafficFines.equipmentVerificationId],
    references: [equipmentVerifications.id],
  }),
  cases: many(administrativeCases),
}));

export const administrativeCasesRelations = relations(administrativeCases, ({ one }) => ({
  tenant: one(tenants, {
    fields: [administrativeCases.tenantId],
    references: [tenants.id],
  }),
  trafficFine: one(trafficFines, {
    fields: [administrativeCases.trafficFineId],
    references: [trafficFines.id],
  }),
}));
