CREATE TABLE IF NOT EXISTS "project_supabase_integration" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "workspace_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "provider" text NOT NULL DEFAULT 'supabase',
  "project_ref" text NOT NULL,
  "encrypted_secret_reference" text,
  "public_url" text NOT NULL,
  "public_anon_key" text NOT NULL,
  "status" text NOT NULL DEFAULT 'configured',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "project_supabase_integration_project_unique" ON "project_supabase_integration" ("project_id");
CREATE INDEX IF NOT EXISTS "project_supabase_integration_workspace_idx" ON "project_supabase_integration" ("workspace_id");
