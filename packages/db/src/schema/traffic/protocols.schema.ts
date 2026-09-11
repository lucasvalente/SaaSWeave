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

import { caseInstances } from "./case-instances.schema";
import { cases } from "./cases.schema";
import { documents } from "./documents.schema";
import { trafficAuthorities } from "./traffic-authorities.schema";

export const protocolChannelEnum = pgEnum("protocol_channel", [
  "ONLINE",
  "POSTAL",
  "IN_PERSON",
  "EMAIL",
  "API",
  "OTHER"
]);

export const protocolStatusEnum = pgEnum("protocol_status", [
  "SUBMITTED",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED"
]);

export const protocols = pgTable(
  "protocols",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    caseId: text("case_id").notNull(),
    caseInstanceId: text("case_instance_id"),
    authorityId: text("authority_id")
      .notNull()
      .references(() => trafficAuthorities.id, { onDelete: "restrict" }),
    protocolNumber: text("protocol_number").notNull(),
    channel: protocolChannelEnum("channel").notNull().default("ONLINE"),
    status: protocolStatusEnum("status").notNull().default("SUBMITTED"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    receiptDocumentId: text("receipt_document_id"),
    notes: text("notes"),
    metadata: jsonb("metadata").default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    unique("protocols_tenant_id_id_idx").on(table.tenantId, table.id),
    index("protocols_tenant_idx").on(table.tenantId),
    index("protocols_case_idx").on(table.caseId),
    index("protocols_case_instance_idx").on(table.caseInstanceId),
    index("protocols_authority_idx").on(table.authorityId),
    index("protocols_protocol_number_idx").on(table.protocolNumber),
    index("protocols_status_idx").on(table.status),
    index("protocols_submitted_at_idx").on(table.submittedAt),
    foreignKey({
      name: "protocols_tenant_case_fk",
      columns: [table.tenantId, table.caseId],
      foreignColumns: [cases.tenantId, cases.id]
    }).onDelete("restrict"),
    foreignKey({
      name: "protocols_tenant_case_instance_fk",
      columns: [table.tenantId, table.caseInstanceId],
      foreignColumns: [caseInstances.tenantId, caseInstances.id]
    }).onDelete("set null"),
    foreignKey({
      name: "protocols_tenant_receipt_document_fk",
      columns: [table.tenantId, table.receiptDocumentId],
      foreignColumns: [documents.tenantId, documents.id]
    }).onDelete("set null")
  ]
);

export type Protocol = typeof protocols.$inferSelect;
export type NewProtocol = typeof protocols.$inferInsert;
