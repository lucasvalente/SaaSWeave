import { foreignKey, index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

import { analysisRuns } from "./analysis-runs.schema";

export const findingStatusEnum = pgEnum("finding_status", [
  "PASS",
  "WARNING",
  "FAIL",
  "NOT_APPLICABLE",
  "NOT_AVAILABLE",
  "MANUAL_REVIEW"
]);

export const findingSeverityEnum = pgEnum("finding_severity", [
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
]);

// Append-only table: findings are immutable evaluation records of an analysis run.
export const analysisFindings = pgTable(
  "analysis_findings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    analysisRunId: text("analysis_run_id").notNull(),
    ruleId: text("rule_id").notNull(),
    ruleName: text("rule_name").notNull(),
    ruleVersion: text("rule_version").notNull(),
    status: findingStatusEnum("status").notNull(),
    severity: findingSeverityEnum("severity").notNull().default("INFO"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    legalBasis: text("legal_basis"),
    evidence: jsonb("evidence").default({}),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("analysis_findings_tenant_idx").on(table.tenantId),
    index("analysis_findings_analysis_run_idx").on(table.analysisRunId),
    index("analysis_findings_status_idx").on(table.status),
    index("analysis_findings_severity_idx").on(table.severity),
    index("analysis_findings_rule_id_idx").on(table.ruleId),
    index("analysis_findings_created_at_idx").on(table.createdAt),
    foreignKey({
      name: "analysis_findings_tenant_run_fk",
      columns: [table.tenantId, table.analysisRunId],
      foreignColumns: [analysisRuns.tenantId, analysisRuns.id]
    }).onDelete("cascade")
  ]
);

export type AnalysisFinding = typeof analysisFindings.$inferSelect;
export type NewAnalysisFinding = typeof analysisFindings.$inferInsert;
