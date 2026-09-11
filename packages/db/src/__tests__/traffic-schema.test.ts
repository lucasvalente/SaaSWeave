import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vite-plus/test";

import {
  analysisFindings,
  analysisRuns,
  caseInstances,
  caseTimelineEvents,
  cases,
  customerAddresses,
  customers,
  deadlines,
  documents,
  drivers,
  equipmentVerifications,
  externalQueries,
  idempotencyKeys,
  membershipUnits,
  outboxEvents,
  protocols,
  trafficAuthorities,
  trafficFines,
  units,
  vehicles
} from "#@/schema/index";

describe("AUTUAX Traffic Domain Schema", () => {
  it("exports all 20 traffic domain tables", () => {
    const tables = [
      customers,
      customerAddresses,
      drivers,
      vehicles,
      trafficAuthorities,
      equipmentVerifications,
      trafficFines,
      units,
      membershipUnits,
      cases,
      caseInstances,
      caseTimelineEvents,
      analysisRuns,
      analysisFindings,
      deadlines,
      documents,
      protocols,
      outboxEvents,
      idempotencyKeys,
      externalQueries
    ];

    expect(tables).toHaveLength(20);
    for (const table of tables) {
      expect(table).toBeDefined();
    }
  });

  it("enforces tenant_id on all multi-tenant tables", () => {
    const multiTenantTables = [
      customers,
      customerAddresses,
      drivers,
      vehicles,
      trafficFines,
      units,
      cases,
      caseInstances,
      caseTimelineEvents,
      analysisRuns,
      analysisFindings,
      deadlines,
      documents,
      protocols,
      outboxEvents,
      idempotencyKeys,
      externalQueries
    ];

    for (const table of multiTenantTables) {
      const cols = getTableColumns(table);
      expect(cols).toHaveProperty("tenantId");
      expect(cols.tenantId.name).toBe("tenant_id");
      expect(cols.tenantId.notNull).toBe(true);
    }
  });

  it("defines primary key on all traffic tables", () => {
    const allTables = [
      customers,
      customerAddresses,
      drivers,
      vehicles,
      trafficAuthorities,
      equipmentVerifications,
      trafficFines,
      units,
      membershipUnits,
      cases,
      caseInstances,
      caseTimelineEvents,
      analysisRuns,
      analysisFindings,
      deadlines,
      documents,
      protocols,
      outboxEvents,
      idempotencyKeys,
      externalQueries
    ];

    for (const table of allTables) {
      const cols = getTableColumns(table);
      expect(cols).toHaveProperty("id");
      expect(cols.id.primary).toBe(true);
    }
  });

  it("validates trafficFines relational fields", () => {
    const cols = getTableColumns(trafficFines);
    expect(cols).toHaveProperty("aitNumber");
    expect(cols).toHaveProperty("infractionCode");
    expect(cols).toHaveProperty("vehicleId");
    expect(cols).toHaveProperty("trafficAuthorityId");
    expect(cols).toHaveProperty("amount");
    expect(cols).toHaveProperty("status");
  });

  it("validates cases relational fields", () => {
    const cols = getTableColumns(cases);
    expect(cols).toHaveProperty("customerId");
    expect(cols).toHaveProperty("trafficFineId");
    expect(cols).toHaveProperty("caseNumber");
    expect(cols).toHaveProperty("currentStatus");
    expect(cols).toHaveProperty("priority");
  });
});
