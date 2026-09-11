CREATE TYPE "analysis_run_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "finding_severity" AS ENUM('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "finding_status" AS ENUM('PASS', 'WARNING', 'FAIL', 'NOT_APPLICABLE', 'NOT_AVAILABLE', 'MANUAL_REVIEW');--> statement-breakpoint
CREATE TYPE "protocol_channel" AS ENUM('ONLINE', 'POSTAL', 'IN_PERSON', 'EMAIL', 'API', 'OTHER');--> statement-breakpoint
CREATE TYPE "protocol_status" AS ENUM('SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "outbox_status" AS ENUM('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');--> statement-breakpoint
CREATE TYPE "idempotency_status" AS ENUM('PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "external_query_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'RATE_LIMITED');--> statement-breakpoint
CREATE TABLE "builder_message" (
	"id" text PRIMARY KEY,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_operation" (
	"id" text PRIMARY KEY,
	"session_id" text NOT NULL,
	"type" text NOT NULL,
	"path" text NOT NULL,
	"content" text,
	"order" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_plan" (
	"id" text PRIMARY KEY,
	"session_id" text NOT NULL,
	"intent" text NOT NULL,
	"summary" text NOT NULL,
	"steps" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_session" (
	"id" text PRIMARY KEY,
	"project_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_snapshot" (
	"id" text PRIMARY KEY,
	"project_id" text NOT NULL,
	"parent_id" text,
	"created_by" text NOT NULL,
	"source" text NOT NULL,
	"summary" text,
	"manifest" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_account" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL CONSTRAINT "credit_account_organization_unique" UNIQUE,
	"balance" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_account_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"operation" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"idempotency_key" text,
	"reference_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_org_idempotency_key" UNIQUE("organization_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "entitlement_definition" (
	"code" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"name" text NOT NULL,
	"value_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"subscription_id" text,
	"number" text NOT NULL UNIQUE,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"subtotal_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer DEFAULT 0 NOT NULL,
	"amount_paid_minor" integer DEFAULT 0 NOT NULL,
	"amount_due_minor" integer DEFAULT 0 NOT NULL,
	"issued_at" timestamp,
	"due_at" timestamp,
	"paid_at" timestamp,
	"voided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_amounts_nonnegative" CHECK ("subtotal_minor" >= 0 AND "total_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoice_line_item" (
	"id" text PRIMARY KEY,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_amount_minor" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_line_quantity_positive" CHECK ("quantity" > 0),
	CONSTRAINT "invoice_line_amounts_nonnegative" CHECK ("unit_amount_minor" >= 0 AND "total_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "manual_payment" (
	"id" text PRIMARY KEY,
	"invoice_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"status" text DEFAULT 'recorded' NOT NULL,
	"method" text DEFAULT 'manual' NOT NULL,
	"provider" text,
	"reference" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "manual_payment_idempotency_unique" UNIQUE("organization_id","idempotency_key"),
	CONSTRAINT "manual_payment_amount_positive" CHECK ("amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "plan_entitlement" (
	"boolean_value" boolean,
	"decimal_value" text,
	"entitlement_code" text NOT NULL,
	"integer_value" integer,
	"plan_id" text NOT NULL,
	"string_value" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plan_entitlement_plan_code" UNIQUE("plan_id","entitlement_code")
);
--> statement-breakpoint
CREATE TABLE "plan_price" (
	"id" text PRIMARY KEY,
	"plan_id" text NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"interval" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plan_price_amount_positive" CHECK ("amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "platform_role_assignment" (
	"id" text PRIMARY KEY,
	"role" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "platform_role_assignment_user_role" UNIQUE("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"description" text,
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workspace_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_supabase_integration" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY,
	"project_id" text NOT NULL,
	"provider" text DEFAULT 'supabase' NOT NULL,
	"public_anon_key" text NOT NULL,
	"public_url" text NOT NULL,
	"project_ref" text NOT NULL,
	"encrypted_secret_reference" text,
	"status" text DEFAULT 'configured' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workspace_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund" (
	"id" text PRIMARY KEY,
	"payment_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"status" text DEFAULT 'recorded' NOT NULL,
	"method" text DEFAULT 'manual' NOT NULL,
	"provider" text,
	"reason" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refund_idempotency_unique" UNIQUE("organization_id","idempotency_key"),
	CONSTRAINT "refund_amount_positive" CHECK ("amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "sandbox_preview" (
	"id" text PRIMARY KEY,
	"session_id" text NOT NULL,
	"port" integer,
	"url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_session" (
	"id" text PRIMARY KEY,
	"project_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"runtime_id" text,
	"metadata" jsonb,
	"expires_at" timestamp,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"preview_container_port" integer,
	"preview_host_ip" text,
	"preview_host_port" integer,
	"preview_ready_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_event" (
	"id" text PRIMARY KEY,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"actor_user_id" text,
	"organization_id" text,
	"target_type" text,
	"target_id" text,
	"request_id" text,
	"trace_id" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_aggregate" (
	"organization_id" text NOT NULL,
	"metric" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usage_aggregate_org_metric_period" UNIQUE("organization_id","metric","period_start")
);
--> statement-breakpoint
CREATE TABLE "usage_metric" (
	"code" text PRIMARY KEY,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"aggregation_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_billing_profile" (
	"organization_id" text PRIMARY KEY,
	"legal_name" text,
	"tax_id" text,
	"billing_email" text,
	"address" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_subscription" (
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"current_period_end" timestamp,
	"current_period_start" timestamp,
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"source" text DEFAULT 'admin' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_subscription_history" (
	"action" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"from_plan_id" text,
	"from_status" text,
	"id" text PRIMARY KEY,
	"subscription_id" text NOT NULL,
	"to_plan_id" text,
	"to_status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"document" text,
	"document_type" text DEFAULT 'cnpj' NOT NULL,
	"email" text,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_customers_tenant_id" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"street" text NOT NULL,
	"number" text NOT NULL,
	"complement" text,
	"neighborhood" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_customer_addresses_tenant_id" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"customer_id" text,
	"name" text NOT NULL,
	"cpf" text NOT NULL,
	"cnh_number" text NOT NULL,
	"cnh_category" text NOT NULL,
	"cnh_expiration" date NOT NULL,
	"cnh_first_issue" date,
	"points" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'regular' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_drivers_tenant_id" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"customer_id" text,
	"plate" text NOT NULL,
	"renavam" text NOT NULL,
	"chassi" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"model_year" integer NOT NULL,
	"manufacture_year" integer NOT NULL,
	"color" text,
	"fuel_type" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_vehicles_tenant_id" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "traffic_authorities" (
	"id" text PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"sphere" text NOT NULL,
	"state" text,
	"municipality" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_verifications" (
	"id" text PRIMARY KEY,
	"equipment_type" text NOT NULL,
	"equipment_identifier" text NOT NULL,
	"inmetro_number" text NOT NULL,
	"verification_date" date NOT NULL,
	"valid_until" date NOT NULL,
	"rule_version" text,
	"status" text DEFAULT 'valid' NOT NULL,
	"source_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traffic_fines" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"vehicle_id" text NOT NULL,
	"driver_id" text,
	"traffic_authority_id" text NOT NULL,
	"equipment_verification_id" text,
	"ait_number" text NOT NULL,
	"infraction_code" text NOT NULL,
	"infraction_description" text NOT NULL,
	"infraction_date" timestamp with time zone NOT NULL,
	"location" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"speed_limit" integer,
	"measured_speed" integer,
	"considered_speed" integer,
	"points" integer DEFAULT 0 NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"discount_amount" numeric(10,2),
	"notification_date" date,
	"defense_deadline" date,
	"status" text DEFAULT 'REGISTERED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_traffic_fines_tenant_id" UNIQUE("tenant_id","id"),
	CONSTRAINT "chk_traffic_fines_amount_positive" CHECK ("amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"code" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_units_tenant_id" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "membership_units" (
	"id" text PRIMARY KEY,
	"membership_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"unit_id" text,
	"customer_id" text NOT NULL,
	"traffic_fine_id" text NOT NULL,
	"case_number" text NOT NULL,
	"current_status" text DEFAULT 'NEW' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigned_user_id" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_cases_tenant_id" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "case_instances" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"case_id" text NOT NULL,
	"type" text NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL,
	"authority_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"decision_at" timestamp with time zone,
	"decision" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_case_instances_tenant_id" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "case_timeline_events" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"case_id" text NOT NULL,
	"case_instance_id" text,
	"event_type" text NOT NULL,
	"actor_user_id" text,
	"source" text DEFAULT 'system' NOT NULL,
	"payload" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_case_timeline_events_tenant_id" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "analysis_runs" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"traffic_fine_id" text NOT NULL,
	"case_id" text,
	"rule_version" text NOT NULL,
	"status" "analysis_run_status" DEFAULT 'PENDING'::"analysis_run_status" NOT NULL,
	"summary" text,
	"metrics" jsonb DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}',
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_runs_tenant_id_id_idx" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "analysis_findings" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"analysis_run_id" text NOT NULL,
	"rule_id" text NOT NULL,
	"rule_name" text NOT NULL,
	"rule_version" text NOT NULL,
	"status" "finding_status" NOT NULL,
	"severity" "finding_severity" DEFAULT 'INFO'::"finding_severity" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"legal_basis" text,
	"evidence" jsonb DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"case_id" text,
	"case_instance_id" text,
	"traffic_fine_id" text,
	"type" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"source" text DEFAULT 'statutory' NOT NULL,
	"calculation_version" text DEFAULT 'v1' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_deadlines_tenant_id" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"case_id" text,
	"traffic_fine_id" text,
	"customer_id" text,
	"driver_id" text,
	"title" text NOT NULL,
	"document_type" text NOT NULL,
	"storage_provider" text DEFAULT 'r2' NOT NULL,
	"storage_key" text NOT NULL,
	"sha256" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_documents_tenant_id" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "protocols" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"case_id" text NOT NULL,
	"case_instance_id" text,
	"authority_id" text NOT NULL,
	"protocol_number" text NOT NULL,
	"channel" "protocol_channel" DEFAULT 'ONLINE'::"protocol_channel" NOT NULL,
	"status" "protocol_status" DEFAULT 'SUBMITTED'::"protocol_status" NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"receipt_document_id" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}',
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocols_tenant_id_id_idx" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING'::"outbox_status" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"scope" text DEFAULT 'API_MUTATION' NOT NULL,
	"status" "idempotency_status" DEFAULT 'PROCESSING'::"idempotency_status" NOT NULL,
	"response_code" integer,
	"response_body" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_queries" (
	"id" text PRIMARY KEY,
	"tenant_id" text NOT NULL,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"input_hash" text NOT NULL,
	"response_hash" text,
	"status" "external_query_status" DEFAULT 'PENDING'::"external_query_status" NOT NULL,
	"http_status" integer,
	"duration_ms" integer,
	"error_message" text,
	"safe_metadata" jsonb DEFAULT '{}',
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "operational_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspended_by" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspension_reason" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "failed_verification_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "source" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_org_idempotency_key" UNIQUE("organization_id","idempotency_key");--> statement-breakpoint
ALTER TABLE "plan" ADD CONSTRAINT "plan_code_key" UNIQUE("code");--> statement-breakpoint
CREATE INDEX "builder_message_session_idx" ON "builder_message" ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "builder_session_project_idx" ON "builder_session" ("project_id");--> statement-breakpoint
CREATE INDEX "builder_session_workspace_idx" ON "builder_session" ("workspace_id");--> statement-breakpoint
CREATE INDEX "builder_snapshot_project_idx" ON "builder_snapshot" ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_org_created_idx" ON "credit_ledger" ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "invoice_org_created_idx" ON "invoice" ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "invoice_status_idx" ON "invoice" ("status","created_at");--> statement-breakpoint
CREATE INDEX "invoice_line_invoice_idx" ON "invoice_line_item" ("invoice_id");--> statement-breakpoint
CREATE INDEX "manual_payment_invoice_idx" ON "manual_payment" ("invoice_id");--> statement-breakpoint
CREATE INDEX "plan_entitlement_code_idx" ON "plan_entitlement" ("entitlement_code");--> statement-breakpoint
CREATE INDEX "plan_price_plan_effective_idx" ON "plan_price" ("plan_id","effective_from");--> statement-breakpoint
CREATE INDEX "platform_role_assignment_user_idx" ON "platform_role_assignment" ("user_id");--> statement-breakpoint
CREATE INDEX "project_workspace_id_idx" ON "project" ("workspace_id");--> statement-breakpoint
CREATE INDEX "project_workspace_created_at_idx" ON "project" ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "project_workspace_status_idx" ON "project" ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "project_workspace_slug_unique" ON "project" ("workspace_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "project_supabase_integration_project_unique" ON "project_supabase_integration" ("project_id");--> statement-breakpoint
CREATE INDEX "project_supabase_integration_workspace_idx" ON "project_supabase_integration" ("workspace_id");--> statement-breakpoint
CREATE INDEX "refund_payment_idx" ON "refund" ("payment_id");--> statement-breakpoint
CREATE INDEX "sandbox_preview_session_idx" ON "sandbox_preview" ("session_id");--> statement-breakpoint
CREATE INDEX "sandbox_session_project_idx" ON "sandbox_session" ("project_id");--> statement-breakpoint
CREATE INDEX "sandbox_session_workspace_idx" ON "sandbox_session" ("workspace_id");--> statement-breakpoint
CREATE INDEX "security_event_created_idx" ON "security_event" ("created_at");--> statement-breakpoint
CREATE INDEX "security_event_actor_created_idx" ON "security_event" ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "security_event_org_created_idx" ON "security_event" ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_aggregate_org_period_idx" ON "usage_aggregate" ("organization_id","period_start");--> statement-breakpoint
CREATE INDEX "workspace_subscription_org_idx" ON "workspace_subscription" ("organization_id");--> statement-breakpoint
CREATE INDEX "workspace_subscription_status_idx" ON "workspace_subscription" ("status","updated_at");--> statement-breakpoint
CREATE INDEX "workspace_subscription_history_sub_idx" ON "workspace_subscription_history" ("subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_id" ON "customers" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_status" ON "customers" ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customers_tenant_document" ON "customers" ("tenant_id","document");--> statement-breakpoint
CREATE INDEX "idx_customer_addresses_tenant_id" ON "customer_addresses" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_customer_addresses_customer_id" ON "customer_addresses" ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_drivers_tenant_id" ON "drivers" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_drivers_customer_id" ON "drivers" ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_drivers_tenant_status" ON "drivers" ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_drivers_tenant_cpf" ON "drivers" ("tenant_id","cpf");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_drivers_tenant_cnh" ON "drivers" ("tenant_id","cnh_number");--> statement-breakpoint
CREATE INDEX "idx_vehicles_tenant_id" ON "vehicles" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_customer_id" ON "vehicles" ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_tenant_status" ON "vehicles" ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vehicles_tenant_plate" ON "vehicles" ("tenant_id","plate");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vehicles_tenant_renavam" ON "vehicles" ("tenant_id","renavam");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vehicles_tenant_chassi" ON "vehicles" ("tenant_id","chassi");--> statement-breakpoint
CREATE INDEX "idx_traffic_authorities_code" ON "traffic_authorities" ("code");--> statement-breakpoint
CREATE INDEX "idx_traffic_authorities_sphere" ON "traffic_authorities" ("sphere");--> statement-breakpoint
CREATE INDEX "idx_traffic_authorities_state" ON "traffic_authorities" ("state");--> statement-breakpoint
CREATE INDEX "idx_equipment_identifier" ON "equipment_verifications" ("equipment_identifier");--> statement-breakpoint
CREATE INDEX "idx_equipment_inmetro_number" ON "equipment_verifications" ("inmetro_number");--> statement-breakpoint
CREATE INDEX "idx_equipment_validity" ON "equipment_verifications" ("valid_until","status");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_tenant_id" ON "traffic_fines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_tenant_status" ON "traffic_fines" ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_vehicle_id" ON "traffic_fines" ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_driver_id" ON "traffic_fines" ("driver_id");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_authority_id" ON "traffic_fines" ("traffic_authority_id");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_defense_deadline" ON "traffic_fines" ("defense_deadline");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_traffic_fines_tenant_ait" ON "traffic_fines" ("tenant_id","ait_number");--> statement-breakpoint
CREATE INDEX "idx_units_tenant_id" ON "units" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_units_tenant_slug" ON "units" ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_membership_units_membership_id" ON "membership_units" ("membership_id");--> statement-breakpoint
CREATE INDEX "idx_membership_units_unit_id" ON "membership_units" ("unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_membership_units" ON "membership_units" ("membership_id","unit_id");--> statement-breakpoint
CREATE INDEX "idx_cases_tenant_id" ON "cases" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_cases_unit_id" ON "cases" ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_cases_customer_id" ON "cases" ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_cases_fine_id" ON "cases" ("traffic_fine_id");--> statement-breakpoint
CREATE INDEX "idx_cases_tenant_status" ON "cases" ("tenant_id","current_status");--> statement-breakpoint
CREATE INDEX "idx_cases_assigned_user" ON "cases" ("assigned_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_cases_tenant_case_number" ON "cases" ("tenant_id","case_number");--> statement-breakpoint
CREATE INDEX "idx_case_instances_tenant_id" ON "case_instances" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_case_instances_case_id" ON "case_instances" ("case_id");--> statement-breakpoint
CREATE INDEX "idx_case_instances_authority_id" ON "case_instances" ("authority_id");--> statement-breakpoint
CREATE INDEX "idx_case_instances_status" ON "case_instances" ("status");--> statement-breakpoint
CREATE INDEX "idx_case_instances_deadline" ON "case_instances" ("deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_case_instances_seq" ON "case_instances" ("tenant_id","case_id","type","sequence");--> statement-breakpoint
CREATE INDEX "idx_timeline_tenant_id" ON "case_timeline_events" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_case_id" ON "case_timeline_events" ("case_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_instance_id" ON "case_timeline_events" ("case_instance_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_occurred_at" ON "case_timeline_events" ("occurred_at");--> statement-breakpoint
CREATE INDEX "analysis_runs_tenant_idx" ON "analysis_runs" ("tenant_id");--> statement-breakpoint
CREATE INDEX "analysis_runs_traffic_fine_idx" ON "analysis_runs" ("traffic_fine_id");--> statement-breakpoint
CREATE INDEX "analysis_runs_case_idx" ON "analysis_runs" ("case_id");--> statement-breakpoint
CREATE INDEX "analysis_runs_status_idx" ON "analysis_runs" ("status");--> statement-breakpoint
CREATE INDEX "analysis_runs_created_at_idx" ON "analysis_runs" ("created_at");--> statement-breakpoint
CREATE INDEX "analysis_findings_tenant_idx" ON "analysis_findings" ("tenant_id");--> statement-breakpoint
CREATE INDEX "analysis_findings_analysis_run_idx" ON "analysis_findings" ("analysis_run_id");--> statement-breakpoint
CREATE INDEX "analysis_findings_status_idx" ON "analysis_findings" ("status");--> statement-breakpoint
CREATE INDEX "analysis_findings_severity_idx" ON "analysis_findings" ("severity");--> statement-breakpoint
CREATE INDEX "analysis_findings_rule_id_idx" ON "analysis_findings" ("rule_id");--> statement-breakpoint
CREATE INDEX "analysis_findings_created_at_idx" ON "analysis_findings" ("created_at");--> statement-breakpoint
CREATE INDEX "idx_deadlines_tenant_id" ON "deadlines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_deadlines_case_id" ON "deadlines" ("case_id");--> statement-breakpoint
CREATE INDEX "idx_deadlines_fine_id" ON "deadlines" ("traffic_fine_id");--> statement-breakpoint
CREATE INDEX "idx_deadlines_due_at" ON "deadlines" ("due_at");--> statement-breakpoint
CREATE INDEX "idx_deadlines_status" ON "deadlines" ("status");--> statement-breakpoint
CREATE INDEX "idx_documents_tenant_id" ON "documents" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_documents_case_id" ON "documents" ("case_id");--> statement-breakpoint
CREATE INDEX "idx_documents_fine_id" ON "documents" ("traffic_fine_id");--> statement-breakpoint
CREATE INDEX "idx_documents_type" ON "documents" ("document_type");--> statement-breakpoint
CREATE INDEX "idx_documents_sha256" ON "documents" ("sha256");--> statement-breakpoint
CREATE INDEX "protocols_tenant_idx" ON "protocols" ("tenant_id");--> statement-breakpoint
CREATE INDEX "protocols_case_idx" ON "protocols" ("case_id");--> statement-breakpoint
CREATE INDEX "protocols_case_instance_idx" ON "protocols" ("case_instance_id");--> statement-breakpoint
CREATE INDEX "protocols_authority_idx" ON "protocols" ("authority_id");--> statement-breakpoint
CREATE INDEX "protocols_protocol_number_idx" ON "protocols" ("protocol_number");--> statement-breakpoint
CREATE INDEX "protocols_status_idx" ON "protocols" ("status");--> statement-breakpoint
CREATE INDEX "protocols_submitted_at_idx" ON "protocols" ("submitted_at");--> statement-breakpoint
CREATE INDEX "outbox_events_status_available_idx" ON "outbox_events" ("status","available_at");--> statement-breakpoint
CREATE INDEX "outbox_events_tenant_idx" ON "outbox_events" ("tenant_id");--> statement-breakpoint
CREATE INDEX "outbox_events_aggregate_idx" ON "outbox_events" ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "outbox_events_created_at_idx" ON "outbox_events" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_tenant_key_scope_idx" ON "idempotency_keys" ("tenant_id","key_hash","scope");--> statement-breakpoint
CREATE INDEX "idempotency_keys_tenant_idx" ON "idempotency_keys" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" ("expires_at");--> statement-breakpoint
CREATE INDEX "external_queries_tenant_idx" ON "external_queries" ("tenant_id");--> statement-breakpoint
CREATE INDEX "external_queries_provider_idx" ON "external_queries" ("provider");--> statement-breakpoint
CREATE INDEX "external_queries_status_idx" ON "external_queries" ("status");--> statement-breakpoint
CREATE INDEX "external_queries_entity_idx" ON "external_queries" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "external_queries_input_hash_idx" ON "external_queries" ("input_hash");--> statement-breakpoint
CREATE INDEX "external_queries_executed_at_idx" ON "external_queries" ("executed_at");--> statement-breakpoint
ALTER TABLE "builder_message" ADD CONSTRAINT "builder_message_session_id_builder_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "builder_session"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "builder_operation" ADD CONSTRAINT "builder_operation_session_id_builder_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "builder_session"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "builder_plan" ADD CONSTRAINT "builder_plan_session_id_builder_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "builder_session"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "builder_session" ADD CONSTRAINT "builder_session_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "builder_session" ADD CONSTRAINT "builder_session_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "builder_session" ADD CONSTRAINT "builder_session_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "builder_snapshot" ADD CONSTRAINT "builder_snapshot_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "builder_snapshot" ADD CONSTRAINT "builder_snapshot_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "credit_account" ADD CONSTRAINT "credit_account_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_account_id_credit_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "credit_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_account_org_fk" FOREIGN KEY ("account_id","organization_id") REFERENCES "credit_account"("id","organization_id");--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_subscription_id_workspace_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "workspace_subscription"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "invoice_line_item" ADD CONSTRAINT "invoice_line_item_invoice_id_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "manual_payment" ADD CONSTRAINT "manual_payment_invoice_id_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id");--> statement-breakpoint
ALTER TABLE "manual_payment" ADD CONSTRAINT "manual_payment_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_suspended_by_user_id_fkey" FOREIGN KEY ("suspended_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "plan_entitlement" ADD CONSTRAINT "plan_entitlement_GdRnCa1IWbJv_fkey" FOREIGN KEY ("entitlement_code") REFERENCES "entitlement_definition"("code") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plan_entitlement" ADD CONSTRAINT "plan_entitlement_plan_id_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plan_price" ADD CONSTRAINT "plan_price_plan_id_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id");--> statement-breakpoint
ALTER TABLE "platform_role_assignment" ADD CONSTRAINT "platform_role_assignment_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_supabase_integration" ADD CONSTRAINT "project_supabase_integration_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_supabase_integration" ADD CONSTRAINT "project_supabase_integration_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_payment_id_manual_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "manual_payment"("id");--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sandbox_preview" ADD CONSTRAINT "sandbox_preview_session_id_sandbox_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sandbox_session"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sandbox_session" ADD CONSTRAINT "sandbox_session_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sandbox_session" ADD CONSTRAINT "sandbox_session_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sandbox_session" ADD CONSTRAINT "sandbox_session_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "security_event" ADD CONSTRAINT "security_event_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "security_event" ADD CONSTRAINT "security_event_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "usage_aggregate" ADD CONSTRAINT "usage_aggregate_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_billing_profile" ADD CONSTRAINT "workspace_billing_profile_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_subscription" ADD CONSTRAINT "workspace_subscription_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_subscription" ADD CONSTRAINT "workspace_subscription_plan_id_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id");--> statement-breakpoint
ALTER TABLE "workspace_subscription_history" ADD CONSTRAINT "workspace_subscription_history_actor_id_user_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "workspace_subscription_history" ADD CONSTRAINT "workspace_subscription_history_nDCJU6iy988s_fkey" FOREIGN KEY ("subscription_id") REFERENCES "workspace_subscription"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "fk_customer_addresses_tenant_customer" FOREIGN KEY ("tenant_id","customer_id") REFERENCES "customers"("tenant_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "fk_drivers_tenant_customer" FOREIGN KEY ("tenant_id","customer_id") REFERENCES "customers"("tenant_id","id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "fk_vehicles_tenant_customer" FOREIGN KEY ("tenant_id","customer_id") REFERENCES "customers"("tenant_id","id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "traffic_fines" ADD CONSTRAINT "traffic_fines_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "traffic_fines" ADD CONSTRAINT "traffic_fines_traffic_authority_id_traffic_authorities_id_fkey" FOREIGN KEY ("traffic_authority_id") REFERENCES "traffic_authorities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "traffic_fines" ADD CONSTRAINT "traffic_fines_oIonwbfqWLMK_fkey" FOREIGN KEY ("equipment_verification_id") REFERENCES "equipment_verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "traffic_fines" ADD CONSTRAINT "fk_traffic_fines_tenant_vehicle" FOREIGN KEY ("tenant_id","vehicle_id") REFERENCES "vehicles"("tenant_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "traffic_fines" ADD CONSTRAINT "fk_traffic_fines_tenant_driver" FOREIGN KEY ("tenant_id","driver_id") REFERENCES "drivers"("tenant_id","id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "membership_units" ADD CONSTRAINT "membership_units_membership_id_member_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "member"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "membership_units" ADD CONSTRAINT "membership_units_unit_id_units_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_unit_id_units_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_user_id_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "fk_cases_tenant_customer" FOREIGN KEY ("tenant_id","customer_id") REFERENCES "customers"("tenant_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "fk_cases_tenant_traffic_fine" FOREIGN KEY ("tenant_id","traffic_fine_id") REFERENCES "traffic_fines"("tenant_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "case_instances" ADD CONSTRAINT "case_instances_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "case_instances" ADD CONSTRAINT "case_instances_authority_id_traffic_authorities_id_fkey" FOREIGN KEY ("authority_id") REFERENCES "traffic_authorities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "case_instances" ADD CONSTRAINT "fk_case_instances_tenant_case" FOREIGN KEY ("tenant_id","case_id") REFERENCES "cases"("tenant_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "case_timeline_events" ADD CONSTRAINT "case_timeline_events_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "case_timeline_events" ADD CONSTRAINT "case_timeline_events_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "case_timeline_events" ADD CONSTRAINT "fk_timeline_tenant_case" FOREIGN KEY ("tenant_id","case_id") REFERENCES "cases"("tenant_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_tenant_traffic_fine_fk" FOREIGN KEY ("tenant_id","traffic_fine_id") REFERENCES "traffic_fines"("tenant_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_tenant_case_fk" FOREIGN KEY ("tenant_id","case_id") REFERENCES "cases"("tenant_id","id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_tenant_run_fk" FOREIGN KEY ("tenant_id","analysis_run_id") REFERENCES "analysis_runs"("tenant_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "fk_deadlines_tenant_case" FOREIGN KEY ("tenant_id","case_id") REFERENCES "cases"("tenant_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "fk_deadlines_tenant_traffic_fine" FOREIGN KEY ("tenant_id","traffic_fine_id") REFERENCES "traffic_fines"("tenant_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "fk_documents_tenant_case" FOREIGN KEY ("tenant_id","case_id") REFERENCES "cases"("tenant_id","id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "fk_documents_tenant_traffic_fine" FOREIGN KEY ("tenant_id","traffic_fine_id") REFERENCES "traffic_fines"("tenant_id","id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "fk_documents_tenant_customer" FOREIGN KEY ("tenant_id","customer_id") REFERENCES "customers"("tenant_id","id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "fk_documents_tenant_driver" FOREIGN KEY ("tenant_id","driver_id") REFERENCES "drivers"("tenant_id","id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_authority_id_traffic_authorities_id_fkey" FOREIGN KEY ("authority_id") REFERENCES "traffic_authorities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_tenant_case_fk" FOREIGN KEY ("tenant_id","case_id") REFERENCES "cases"("tenant_id","id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_tenant_case_instance_fk" FOREIGN KEY ("tenant_id","case_instance_id") REFERENCES "case_instances"("tenant_id","id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_tenant_receipt_document_fk" FOREIGN KEY ("tenant_id","receipt_document_id") REFERENCES "documents"("tenant_id","id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "external_queries" ADD CONSTRAINT "external_queries_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organization"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_metric_check" CHECK ("metric" IN ('ai_tokens', 'api_calls'));--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_quantity_positive_check" CHECK ("quantity" > 0);--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_input_tokens_nonnegative_check" CHECK ("input_tokens" IS NULL OR "input_tokens" >= 0);--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_output_tokens_nonnegative_check" CHECK ("output_tokens" IS NULL OR "output_tokens" >= 0);