CREATE TYPE "public"."equity_bonus_status" AS ENUM('not_offered', 'interested', 'pending_review', 'attorney_review_required', 'board_approval_required', 'approved', 'issued', 'declined', 'voided');

CREATE TABLE "equity_bonus_records" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" varchar,
  "customer_name" text,
  "eligibility_status" "equity_bonus_status" DEFAULT 'not_offered' NOT NULL,
  "agreement_status" text DEFAULT 'not_started' NOT NULL,
  "attorney_review_status" text DEFAULT 'required' NOT NULL,
  "board_approval_status" text DEFAULT 'required' NOT NULL,
  "shares_proposed" integer,
  "shares_approved" integer,
  "issuance_date" timestamp,
  "certificate_status" text DEFAULT 'not_issued' NOT NULL,
  "stock_ledger_reference" text,
  "cap_table_reference" text,
  "disclosure_accepted" boolean DEFAULT false NOT NULL,
  "tax_review_status" text DEFAULT 'required' NOT NULL,
  "transfer_restriction_status" text DEFAULT 'required' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

ALTER TABLE "equity_bonus_records" ADD CONSTRAINT "equity_bonus_records_customer_id_clients_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "equity_bonus_records_status_idx" ON "equity_bonus_records" ("eligibility_status");
