CREATE TABLE "_foundation_bootstrap" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase" text DEFAULT 'foundation' NOT NULL,
	"status" text DEFAULT 'operational' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
