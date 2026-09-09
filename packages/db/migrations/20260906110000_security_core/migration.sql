CREATE TABLE "platform_role_assignment" (
  "id" text PRIMARY KEY,
  "role" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_role_assignment_user_role" ON "platform_role_assignment" ("user_id", "role");
--> statement-breakpoint
CREATE INDEX "platform_role_assignment_user_idx" ON "platform_role_assignment" ("user_id");
--> statement-breakpoint
INSERT INTO "platform_role_assignment" ("id", "role", "user_id")
SELECT 'legacy-admin:' || "id", 'super_admin', "id" FROM "user" WHERE "role" = 'admin'
ON CONFLICT ("user_id", "role") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "security_event" (
  "id" text PRIMARY KEY, "type" text NOT NULL, "severity" text NOT NULL,
  "actor_user_id" text REFERENCES "user"("id") ON DELETE set null,
  "organization_id" text REFERENCES "organization"("id") ON DELETE set null,
  "target_type" text, "target_id" text, "request_id" text, "trace_id" text,
  "ip_address" text, "user_agent" text, "metadata" jsonb, "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "security_event_created_idx" ON "security_event" ("created_at");
--> statement-breakpoint
CREATE INDEX "security_event_actor_created_idx" ON "security_event" ("actor_user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "security_event_org_created_idx" ON "security_event" ("organization_id", "created_at");
