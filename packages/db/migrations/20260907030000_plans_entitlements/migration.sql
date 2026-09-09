ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;
ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT true;
ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
UPDATE "plan" SET "code" = "id" WHERE "code" IS NULL;
ALTER TABLE "plan" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "plan_code_unique" ON "plan" ("code");
ALTER TABLE "plan" ADD CONSTRAINT "plan_status_check" CHECK ("status" IN ('draft', 'active', 'archived'));

CREATE TABLE "entitlement_definition" (
  "code" text PRIMARY KEY,
  "name" text NOT NULL,
  "description" text,
  "value_type" text NOT NULL CHECK ("value_type" IN ('boolean', 'integer', 'decimal', 'string')),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "plan_entitlement" (
  "plan_id" text NOT NULL REFERENCES "plan"("id") ON DELETE CASCADE,
  "entitlement_code" text NOT NULL REFERENCES "entitlement_definition"("code") ON DELETE CASCADE,
  "boolean_value" boolean,
  "integer_value" integer,
  "decimal_value" text,
  "string_value" text,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "plan_entitlement_plan_code" PRIMARY KEY ("plan_id", "entitlement_code"),
  CONSTRAINT "plan_entitlement_one_value" CHECK (
    (CASE WHEN "boolean_value" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "integer_value" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "decimal_value" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "string_value" IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);
CREATE INDEX "plan_entitlement_code_idx" ON "plan_entitlement" ("entitlement_code");

INSERT INTO "entitlement_definition" ("code", "name", "description", "value_type") VALUES
  ('max_projects', 'Maximum projects', 'Maximum number of projects in a workspace', 'integer'),
  ('max_workspace_members', 'Maximum workspace members', 'Maximum members allowed in a workspace', 'integer'),
  ('ai_monthly_credits', 'Monthly AI credits', 'Monthly AI credit allowance', 'integer'),
  ('storage_gb', 'Storage (GB)', 'Included storage capacity in gigabytes', 'decimal'),
  ('builder_access', 'Builder access', 'Whether the builder is available', 'boolean'),
  ('deployments_access', 'Deployments access', 'Whether deployments are available', 'boolean'),
  ('custom_branding', 'Custom branding', 'Whether custom branding is available', 'boolean'),
  ('priority_support', 'Priority support', 'Whether priority support is available', 'boolean')
ON CONFLICT ("code") DO NOTHING;
