CREATE TABLE IF NOT EXISTS "sandbox_session" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "workspace_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "created_by" text NOT NULL REFERENCES "user"("id"),
  "status" text DEFAULT 'created' NOT NULL,
  "runtime_id" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "sandbox_session_project_idx" ON "sandbox_session" ("project_id");
CREATE INDEX IF NOT EXISTS "sandbox_session_workspace_idx" ON "sandbox_session" ("workspace_id");
CREATE TABLE IF NOT EXISTS "sandbox_preview" (
  "id" text PRIMARY KEY NOT NULL,
  "session_id" text NOT NULL REFERENCES "sandbox_session"("id") ON DELETE CASCADE,
  "port" integer,
  "url" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "sandbox_preview_session_idx" ON "sandbox_preview" ("session_id");
