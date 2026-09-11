import { date, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const equipmentVerifications = pgTable(
  "equipment_verifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    equipmentType: text("equipment_type").notNull(), // 'radar' | 'breathalyzer' | 'tachograph' | 'scale'
    equipmentIdentifier: text("equipment_identifier").notNull(), // Device serial or INMETRO ID
    inmetroNumber: text("inmetro_number").notNull(), // Official verification report number
    verificationDate: date("verification_date").notNull(),
    validUntil: date("valid_until").notNull(), // As stated in official calibration certificate
    ruleVersion: text("rule_version"), // Reference legal rule/resolution code (e.g. 'INMETRO_PORTARIA_544_2014')
    status: text("status").notNull().default("valid"), // 'valid' | 'expired' | 'irregular'
    sourceMetadata: jsonb("source_metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("idx_equipment_identifier").on(table.equipmentIdentifier),
    index("idx_equipment_inmetro_number").on(table.inmetroNumber),
    index("idx_equipment_validity").on(table.validUntil, table.status)
  ]
);

export type EquipmentVerification = typeof equipmentVerifications.$inferSelect;
export type NewEquipmentVerification = typeof equipmentVerifications.$inferInsert;
