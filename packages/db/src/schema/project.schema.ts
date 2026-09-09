import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { organization, user } from "#@/schema/auth.schema";

export const project = pgTable(
  "project",
  {
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    description: text("description"),
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("draft"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" })
  },
  (table) => [
    index("project_workspace_id_idx").on(table.workspaceId),
    index("project_workspace_created_at_idx").on(table.workspaceId, table.createdAt),
    index("project_workspace_status_idx").on(table.workspaceId, table.status),
    uniqueIndex("project_workspace_slug_unique").on(table.workspaceId, table.slug)
  ]
);

/** Public, project-scoped configuration for generated Supabase clients.
 * Privileged Supabase credentials are deliberately not accepted or persisted.
 */
export const projectSupabaseIntegration = pgTable(
  "project_supabase_integration",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("supabase"),
    publicAnonKey: text("public_anon_key").notNull(),
    publicUrl: text("public_url").notNull(),
    projectRef: text("project_ref").notNull(),
    /** Reference only; secret material belongs in an external vault/provider. */
    encryptedSecretReference: text("encrypted_secret_reference"),
    status: text("status").notNull().default("configured"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" })
  },
  (table) => [
    uniqueIndex("project_supabase_integration_project_unique").on(table.projectId),
    index("project_supabase_integration_workspace_idx").on(table.workspaceId)
  ]
);
