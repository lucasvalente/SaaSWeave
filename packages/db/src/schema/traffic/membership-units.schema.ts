import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { member } from "#@/schema/auth.schema";

import { units } from "./units.schema";

export const membershipUnits = pgTable(
  "membership_units",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    membershipId: text("membership_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    unitId: text("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("idx_membership_units_membership_id").on(table.membershipId),
    index("idx_membership_units_unit_id").on(table.unitId),
    uniqueIndex("uq_membership_units").on(table.membershipId, table.unitId)
  ]
);

export type MembershipUnit = typeof membershipUnits.$inferSelect;
export type NewMembershipUnit = typeof membershipUnits.$inferInsert;
