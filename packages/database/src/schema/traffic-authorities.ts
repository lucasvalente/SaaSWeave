import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const trafficAuthorities = pgTable(
  "traffic_authorities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(), // RENAINF authority code (e.g. '10001', '20001')
    name: text("name").notNull(), // e.g., 'Polícia Rodoviária Federal', 'DETRAN-SP'
    sphere: text("sphere").notNull(), // 'federal' | 'state' | 'municipal'
    state: text("state"), // State jurisdiction code (e.g. 'SP', 'RJ' or null for federal)
    municipality: text("municipality"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_traffic_authorities_code").on(table.code),
    index("idx_traffic_authorities_sphere").on(table.sphere),
    index("idx_traffic_authorities_state").on(table.state),
  ],
);

export type TrafficAuthority = typeof trafficAuthorities.$inferSelect;
export type NewTrafficAuthority = typeof trafficAuthorities.$inferInsert;
