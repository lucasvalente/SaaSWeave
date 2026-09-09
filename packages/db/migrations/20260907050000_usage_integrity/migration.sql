-- Usage events are append-only facts. Keep the database as the final guard
-- against invalid metrics, negative quantities, and negative token counts even
-- when an internal caller bypasses the API validator.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_event_metric_check'
  ) THEN
    ALTER TABLE "usage_event"
      ADD CONSTRAINT "usage_event_metric_check"
      CHECK ("metric" IN ('ai_tokens', 'api_calls'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_event_quantity_positive_check'
  ) THEN
    ALTER TABLE "usage_event"
      ADD CONSTRAINT "usage_event_quantity_positive_check"
      CHECK ("quantity" > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_event_input_tokens_nonnegative_check'
  ) THEN
    ALTER TABLE "usage_event"
      ADD CONSTRAINT "usage_event_input_tokens_nonnegative_check"
      CHECK ("input_tokens" IS NULL OR "input_tokens" >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_event_output_tokens_nonnegative_check'
  ) THEN
    ALTER TABLE "usage_event"
      ADD CONSTRAINT "usage_event_output_tokens_nonnegative_check"
      CHECK ("output_tokens" IS NULL OR "output_tokens" >= 0);
  END IF;
END $$;
