import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, user } from "#@/schema/auth.schema";
import { project } from "#@/schema/project.schema";

export const sandboxSession = pgTable("sandbox_session", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id),
  status: text("status").notNull().default("created"),
  runtimeId: text("runtime_id"),
  metadata: jsonb("metadata"),
  expiresAt: timestamp("expires_at"),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  previewContainerPort: integer("preview_container_port"),
  previewHostIp: text("preview_host_ip"),
  previewHostPort: integer("preview_host_port"),
  previewReadyAt: timestamp("preview_ready_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (t) => [index("sandbox_session_project_idx").on(t.projectId), index("sandbox_session_workspace_idx").on(t.workspaceId)]);

export const sandboxPreview = pgTable("sandbox_preview", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sandboxSession.id, { onDelete: "cascade" }),
  port: integer("port"),
  url: text("url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (t) => [index("sandbox_preview_session_idx").on(t.sessionId)]);
