ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "plaid_account_id" text;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "dwolla_customer_url" text;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "dwolla_exchange_url" text;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "dwolla_funding_source_url" text;

CREATE INDEX IF NOT EXISTS "idx_bank_accounts_plaid_account" ON "bank_accounts" ("plaid_account_id");
CREATE INDEX IF NOT EXISTS "idx_bank_accounts_dwolla_funding_source" ON "bank_accounts" ("dwolla_funding_source_url");
