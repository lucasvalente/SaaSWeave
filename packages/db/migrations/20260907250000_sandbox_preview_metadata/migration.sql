ALTER TABLE "sandbox_session"
  ADD COLUMN IF NOT EXISTS "preview_container_port" integer,
  ADD COLUMN IF NOT EXISTS "preview_host_ip" text,
  ADD COLUMN IF NOT EXISTS "preview_host_port" integer,
  ADD COLUMN IF NOT EXISTS "preview_ready_at" timestamp;

ALTER TABLE "sandbox_session"
  ADD CONSTRAINT "sandbox_preview_host_ip_loopback_chk"
  CHECK ("preview_host_ip" IS NULL OR "preview_host_ip" = '127.0.0.1');
