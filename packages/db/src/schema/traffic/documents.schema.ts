import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique
} from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";

import { cases } from "./cases.schema";
import { customers } from "./customers.schema";
import { drivers } from "./drivers.schema";
import { trafficFines } from "./traffic-fines.schema";

export const DOCUMENT_TYPES = [
  "cnh",
  "crlv",
  "ait",
  "procuracao",
  "defesa",
  "protocol_receipt",
  "decision",
  "other"
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const documents = pgTable(
  "documents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    caseId: text("case_id"),
    trafficFineId: text("traffic_fine_id"),
    customerId: text("customer_id"),
    driverId: text("driver_id"),
    title: text("title").notNull(),
    documentType: text("document_type").notNull(), // 'cnh' | 'crlv' | 'ait' | 'procuracao' | 'defesa' | 'protocol_receipt' | 'decision' | 'other'
    storageProvider: text("storage_provider").notNull().default("r2"), // 'r2' | 's3' | 'local'
    storageKey: text("storage_key").notNull(),
    sha256: text("sha256").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    status: text("status").notNull().default("pending"), // 'pending' | 'stored' | 'archived' | 'rejected'
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    index("idx_documents_tenant_id").on(table.tenantId),
    index("idx_documents_case_id").on(table.caseId),
    index("idx_documents_fine_id").on(table.trafficFineId),
    index("idx_documents_type").on(table.documentType),
    index("idx_documents_sha256").on(table.sha256),
    unique("uq_documents_tenant_id").on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.caseId],
      foreignColumns: [cases.tenantId, cases.id],
      name: "fk_documents_tenant_case"
    }).onDelete("set null"),
    foreignKey({
      columns: [table.tenantId, table.trafficFineId],
      foreignColumns: [trafficFines.tenantId, trafficFines.id],
      name: "fk_documents_tenant_traffic_fine"
    }).onDelete("set null"),
    foreignKey({
      columns: [table.tenantId, table.customerId],
      foreignColumns: [customers.tenantId, customers.id],
      name: "fk_documents_tenant_customer"
    }).onDelete("set null"),
    foreignKey({
      columns: [table.tenantId, table.driverId],
      foreignColumns: [drivers.tenantId, drivers.id],
      name: "fk_documents_tenant_driver"
    }).onDelete("set null")
  ]
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
