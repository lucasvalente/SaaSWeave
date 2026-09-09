ALTER TABLE "sandbox_session" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
ALTER TABLE "sandbox_session" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp DEFAULT now() NOT NULL;
CREATE INDEX IF NOT EXISTS "sandbox_session_expires_idx" ON "sandbox_session" ("expires_at");
