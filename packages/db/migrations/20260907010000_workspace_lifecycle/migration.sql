ALTER TABLE "organization"
  ADD COLUMN "operational_status" text NOT NULL DEFAULT 'active',
  ADD COLUMN "suspended_at" timestamp,
  ADD COLUMN "suspended_by" text REFERENCES "user"("id"),
  ADD COLUMN "suspension_reason" text;

CREATE INDEX "organization_operational_status_idx" ON "organization" ("operational_status");
