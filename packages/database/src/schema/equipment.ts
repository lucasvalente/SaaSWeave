import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const equipmentVerifications = pgTable(
  "equipment_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    equipmentType: text("equipment_type").notNull(), // 'radar' | 'breathalyzer' | 'tachograph' | 'scale'
    equipmentIdentifier: text("equipment_identifier").notNull(), // Device serial or INMETRO ID
    inmetroNumber: text("inmetro_number").notNull(), // Official verification report number
    verificationDate: date("verification_date").notNull(),
    validUntil: date("valid_until").notNull(), // Statutory expiration date (typically 12 months max)
    status: text("status").notNull().default("valid"), // 'valid' | 'expired' | 'irregular'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_equipment_identifier").on(table.equipmentIdentifier),
    index("idx_equipment_inmetro_number").on(table.inmetroNumber),
    index("idx_equipment_validity").on(table.validUntil, table.status),
  ],
);

export type EquipmentVerification = typeof equipmentVerifications.$inferSelect;
export type NewEquipmentVerification = typeof equipmentVerifications.$inferInsert;
