ALTER TABLE "usage_event" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "usage_event" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
ALTER TABLE "usage_event" ADD COLUMN IF NOT EXISTS "project_id" text;
ALTER TABLE "usage_event" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'system';
CREATE TABLE IF NOT EXISTS "usage_metric" (
  "code" text PRIMARY KEY,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "aggregation_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
INSERT INTO "usage_metric" ("code", "name", "description", "unit", "aggregation_type") VALUES
  ('ai_tokens', 'AI tokens', 'AI model tokens processed', 'tokens', 'sum'),
  ('api_calls', 'API calls', 'Requests processed by the API', 'calls', 'sum')
ON CONFLICT ("code") DO NOTHING;
CREATE UNIQUE INDEX IF NOT EXISTS "usage_event_org_idempotency_key" ON "usage_event" ("organization_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;
CREATE TABLE IF NOT EXISTS "usage_aggregate" (
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "metric" text NOT NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "quantity" integer NOT NULL DEFAULT 0,
  "event_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "usage_aggregate_org_metric_period" UNIQUE ("organization_id", "metric", "period_start")
);
CREATE INDEX IF NOT EXISTS "usage_aggregate_org_period_idx" ON "usage_aggregate" ("organization_id", "period_start");
CREATE TABLE IF NOT EXISTS "credit_account" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL UNIQUE REFERENCES "organization"("id") ON DELETE CASCADE,
  "balance" integer NOT NULL DEFAULT 0 CHECK ("balance" >= 0),
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "credit_account_id_organization_unique" ON "credit_account" ("id", "organization_id");
CREATE TABLE IF NOT EXISTS "credit_ledger" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL REFERENCES "credit_account"("id") ON DELETE CASCADE,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "operation" text NOT NULL CHECK ("operation" IN ('grant','consume','adjust','reverse')),
  "amount" integer NOT NULL CHECK ("amount" <> 0),
  "balance_after" integer NOT NULL CHECK ("balance_after" >= 0),
  "idempotency_key" text,
  "reference_id" text,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "credit_ledger_org_idempotency_key" ON "credit_ledger" ("organization_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "credit_ledger_org_created_idx" ON "credit_ledger" ("organization_id", "created_at");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_ledger_account_org_fk') THEN
    ALTER TABLE "credit_ledger"
      ADD CONSTRAINT "credit_ledger_account_org_fk"
      FOREIGN KEY ("account_id", "organization_id")
      REFERENCES "credit_account" ("id", "organization_id");
  END IF;
END $$;
