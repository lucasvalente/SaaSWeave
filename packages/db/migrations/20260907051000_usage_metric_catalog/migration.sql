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
