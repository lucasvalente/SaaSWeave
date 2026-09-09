-- Bind every credit ledger row to the account belonging to the same tenant.
CREATE UNIQUE INDEX IF NOT EXISTS "credit_account_id_organization_unique"
  ON "credit_account" ("id", "organization_id");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_ledger_account_org_fk') THEN
    ALTER TABLE "credit_ledger"
      ADD CONSTRAINT "credit_ledger_account_org_fk"
      FOREIGN KEY ("account_id", "organization_id")
      REFERENCES "credit_account" ("id", "organization_id");
  END IF;
END $$;
