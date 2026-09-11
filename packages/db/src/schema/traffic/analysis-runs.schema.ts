import {
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique
} from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

import { cases } from "./cases.schema";
import { trafficFines } from "./traffic-fines.schema";

export const analysisRunStatusEnum = pgEnum("analysis_run_status", [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    trafficFineId: text("traffic_fine_id").notNull(),
    caseId: text("case_id"),
    ruleVersion: text("rule_version").notNull(),
    status: analysisRunStatusEnum("status").notNull().default("PENDING"),
    summary: text("summary"),
    metrics: jsonb("metrics").default({}),
    metadata: jsonb("metadata").default({}),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    unique("analysis_runs_tenant_id_id_idx").on(table.tenantId, table.id),
    index("analysis_runs_tenant_idx").on(table.tenantId),
    index("analysis_runs_traffic_fine_idx").on(table.trafficFineId),
    index("analysis_runs_case_idx").on(table.caseId),
    index("analysis_runs_status_idx").on(table.status),
    index("analysis_runs_created_at_idx").on(table.createdAt),
    foreignKey({
      name: "analysis_runs_tenant_traffic_fine_fk",
      columns: [table.tenantId, table.trafficFineId],
      foreignColumns: [trafficFines.tenantId, trafficFines.id]
    }).onDelete("restrict"),
    foreignKey({
      name: "analysis_runs_tenant_case_fk",
      columns: [table.tenantId, table.caseId],
      foreignColumns: [cases.tenantId, cases.id]
    }).onDelete("set null")
  ]
);

export type AnalysisRun = typeof analysisRuns.$inferSelect;
export type NewAnalysisRun = typeof analysisRuns.$inferInsert;
