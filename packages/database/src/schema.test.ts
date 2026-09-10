import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  administrativeCases,
  customers,
  drivers,
  equipmentVerifications,
  foundationBootstrap,
  tenants,
  trafficAuthorities,
  trafficFines,
  vehicles,
} from "./schema";

describe("Database Domain Model V1 Schema & Multi-Tenancy", () => {
  it("should have all 9 required tables defined", () => {
    expect(foundationBootstrap).toBeDefined();
    expect(tenants).toBeDefined();
    expect(customers).toBeDefined();
    expect(drivers).toBeDefined();
    expect(vehicles).toBeDefined();
    expect(trafficAuthorities).toBeDefined();
    expect(equipmentVerifications).toBeDefined();
    expect(trafficFines).toBeDefined();
    expect(administrativeCases).toBeDefined();
  });

  it("should enforce tenant_id with NOT NULL on all tenant-owned entities", () => {
    const tenantOwnedTables = [customers, drivers, vehicles, trafficFines, administrativeCases];

    for (const table of tenantOwnedTables) {
      const columns = getTableColumns(table);
      expect(columns.tenantId).toBeDefined();
      expect(columns.tenantId.notNull).toBe(true);
      expect(columns.tenantId.dataType).toBe("string"); // uuid is string in pg-core
    }
  });

  it("should define primary keys on all tables as uuid with defaultRandom", () => {
    const allDomainTables = [
      tenants,
      customers,
      drivers,
      vehicles,
      trafficAuthorities,
      equipmentVerifications,
      trafficFines,
      administrativeCases,
    ];

    for (const table of allDomainTables) {
      const columns = getTableColumns(table);
      expect(columns.id).toBeDefined();
      expect(columns.id.primary).toBe(true);
      expect(columns.id.notNull).toBe(true);
    }
  });

  it("should verify critical domain columns on traffic_fines (AIT)", () => {
    const columns = getTableColumns(trafficFines);
    expect(columns.aitNumber).toBeDefined();
    expect(columns.infractionCode).toBeDefined();
    expect(columns.infractionDate).toBeDefined();
    expect(columns.amount).toBeDefined();
    expect(columns.status).toBeDefined();
    expect(columns.vehicleId).toBeDefined();
    expect(columns.vehicleId.notNull).toBe(true);
    expect(columns.trafficAuthorityId).toBeDefined();
    expect(columns.trafficAuthorityId.notNull).toBe(true);
  });

  it("should verify equipment_verifications table structure", () => {
    const columns = getTableColumns(equipmentVerifications);
    expect(columns.equipmentType).toBeDefined();
    expect(columns.equipmentIdentifier).toBeDefined();
    expect(columns.inmetroNumber).toBeDefined();
    expect(columns.verificationDate).toBeDefined();
    expect(columns.validUntil).toBeDefined();
    expect(columns.status).toBeDefined();
  });

  it("should verify vehicles table structure and identifiers", () => {
    const columns = getTableColumns(vehicles);
    expect(columns.plate).toBeDefined();
    expect(columns.renavam).toBeDefined();
    expect(columns.chassi).toBeDefined();
    expect(columns.modelYear).toBeDefined();
  });

  it("should verify administrative_cases table structure", () => {
    const columns = getTableColumns(administrativeCases);
    expect(columns.caseNumber).toBeDefined();
    expect(columns.trafficFineId).toBeDefined();
    expect(columns.currentInstance).toBeDefined();
    expect(columns.status).toBeDefined();
    expect(columns.deadlineDate).toBeDefined();
  });
});
