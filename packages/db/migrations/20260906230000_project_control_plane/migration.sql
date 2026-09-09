CREATE TABLE "project" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'draft',
  "created_by" text NOT NULL REFERENCES "user"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "archived_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "project_workspace_slug_unique" ON "project" ("workspace_id", "slug");
--> statement-breakpoint
CREATE INDEX "project_workspace_id_idx" ON "project" ("workspace_id");
--> statement-breakpoint
CREATE INDEX "project_workspace_created_at_idx" ON "project" ("workspace_id", "created_at");
--> statement-breakpoint
CREATE INDEX "project_workspace_status_idx" ON "project" ("workspace_id", "status");
