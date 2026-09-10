CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"document" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"document" text,
	"document_type" text DEFAULT 'cnpj' NOT NULL,
	"email" text,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid,
	"name" text NOT NULL,
	"cpf" text NOT NULL,
	"cnh_number" text NOT NULL,
	"cnh_category" text NOT NULL,
	"cnh_expiration" date NOT NULL,
	"cnh_first_issue" date,
	"points" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'regular' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traffic_authorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sphere" text NOT NULL,
	"state" text,
	"municipality" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traffic_authorities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "equipment_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_type" text NOT NULL,
	"equipment_identifier" text NOT NULL,
	"inmetro_number" text NOT NULL,
	"verification_date" date NOT NULL,
	"valid_until" date NOT NULL,
	"status" text DEFAULT 'valid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traffic_fines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"driver_id" uuid,
	"traffic_authority_id" uuid NOT NULL,
	"equipment_verification_id" uuid,
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
	"amount" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2),
	"notification_date" date,
	"defense_deadline" date,
	"status" text DEFAULT 'detected' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "administrative_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"traffic_fine_id" uuid NOT NULL,
	"case_number" text NOT NULL,
	"current_instance" text DEFAULT 'preliminary_defense' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"protocol_number" text,
	"protocol_date" timestamp with time zone,
	"deadline_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_fines" ADD CONSTRAINT "traffic_fines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_fines" ADD CONSTRAINT "traffic_fines_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_fines" ADD CONSTRAINT "traffic_fines_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_fines" ADD CONSTRAINT "traffic_fines_traffic_authority_id_traffic_authorities_id_fk" FOREIGN KEY ("traffic_authority_id") REFERENCES "public"."traffic_authorities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_fines" ADD CONSTRAINT "traffic_fines_equipment_verification_id_equipment_verifications_id_fk" FOREIGN KEY ("equipment_verification_id") REFERENCES "public"."equipment_verifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administrative_cases" ADD CONSTRAINT "administrative_cases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administrative_cases" ADD CONSTRAINT "administrative_cases_traffic_fine_id_traffic_fines_id_fk" FOREIGN KEY ("traffic_fine_id") REFERENCES "public"."traffic_fines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_id" ON "customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_status" ON "customers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customers_tenant_document" ON "customers" USING btree ("tenant_id","document");--> statement-breakpoint
CREATE INDEX "idx_drivers_tenant_id" ON "drivers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_drivers_customer_id" ON "drivers" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_drivers_tenant_status" ON "drivers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_drivers_tenant_cpf" ON "drivers" USING btree ("tenant_id","cpf");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_drivers_tenant_cnh" ON "drivers" USING btree ("tenant_id","cnh_number");--> statement-breakpoint
CREATE INDEX "idx_vehicles_tenant_id" ON "vehicles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_customer_id" ON "vehicles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_tenant_status" ON "vehicles" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vehicles_tenant_plate" ON "vehicles" USING btree ("tenant_id","plate");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vehicles_tenant_renavam" ON "vehicles" USING btree ("tenant_id","renavam");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vehicles_tenant_chassi" ON "vehicles" USING btree ("tenant_id","chassi");--> statement-breakpoint
CREATE INDEX "idx_traffic_authorities_code" ON "traffic_authorities" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_traffic_authorities_sphere" ON "traffic_authorities" USING btree ("sphere");--> statement-breakpoint
CREATE INDEX "idx_traffic_authorities_state" ON "traffic_authorities" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_equipment_identifier" ON "equipment_verifications" USING btree ("equipment_identifier");--> statement-breakpoint
CREATE INDEX "idx_equipment_inmetro_number" ON "equipment_verifications" USING btree ("inmetro_number");--> statement-breakpoint
CREATE INDEX "idx_equipment_validity" ON "equipment_verifications" USING btree ("valid_until","status");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_tenant_id" ON "traffic_fines" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_tenant_status" ON "traffic_fines" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_vehicle_id" ON "traffic_fines" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_driver_id" ON "traffic_fines" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_authority_id" ON "traffic_fines" USING btree ("traffic_authority_id");--> statement-breakpoint
CREATE INDEX "idx_traffic_fines_defense_deadline" ON "traffic_fines" USING btree ("defense_deadline");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_traffic_fines_tenant_ait" ON "traffic_fines" USING btree ("tenant_id","ait_number");--> statement-breakpoint
CREATE INDEX "idx_cases_tenant_id" ON "administrative_cases" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_cases_fine_id" ON "administrative_cases" USING btree ("traffic_fine_id");--> statement-breakpoint
CREATE INDEX "idx_cases_tenant_status" ON "administrative_cases" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_cases_deadline_date" ON "administrative_cases" USING btree ("deadline_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_cases_tenant_case_number" ON "administrative_cases" USING btree ("tenant_id","case_number");