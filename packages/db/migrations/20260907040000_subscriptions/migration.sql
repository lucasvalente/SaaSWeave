CREATE TABLE "workspace_subscription" (
  "id" text PRIMARY KEY,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "plan_id" text NOT NULL REFERENCES "plan"("id"),
  "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('trialing', 'active', 'past_due', 'canceled')),
  "source" text NOT NULL DEFAULT 'admin',
  "seats" integer NOT NULL DEFAULT 1 CHECK ("seats" > 0),
  "started_at" timestamp DEFAULT now() NOT NULL,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "canceled_at" timestamp,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "workspace_subscription_org_idx" ON "workspace_subscription" ("organization_id");
CREATE INDEX "workspace_subscription_status_idx" ON "workspace_subscription" ("status", "updated_at");
CREATE UNIQUE INDEX "workspace_subscription_one_current_org" ON "workspace_subscription" ("organization_id") WHERE "status" <> 'canceled';

CREATE TABLE "workspace_subscription_history" (
  "id" text PRIMARY KEY,
  "subscription_id" text NOT NULL REFERENCES "workspace_subscription"("id") ON DELETE CASCADE,
  "actor_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "from_plan_id" text,
  "to_plan_id" text,
  "from_status" text,
  "to_status" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "workspace_subscription_history_sub_idx" ON "workspace_subscription_history" ("subscription_id", "created_at");
