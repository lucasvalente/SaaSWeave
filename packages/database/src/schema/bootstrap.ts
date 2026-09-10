import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const foundationBootstrap = pgTable("_foundation_bootstrap", {
  id: uuid("id").primaryKey().defaultRandom(),
  phase: text("phase").notNull().default("foundation"),
  status: text("status").notNull().default("operational"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FoundationBootstrap = typeof foundationBootstrap.$inferSelect;
export type NewFoundationBootstrap = typeof foundationBootstrap.$inferInsert;
