CREATE TYPE "public"."document_room_status" AS ENUM('draft', 'active', 'superseded', 'attorney_review_required', 'accountant_review_required', 'approved');
CREATE TYPE "public"."legal_instrument_type" AS ENUM('promissory_note', 'security_agreement', 'bylaws', 'shareholder_agreement', 'trust_agreement', 'resolution', 'msa', 'order_form', 'privacy_policy', 'terms_of_service');
CREATE TYPE "public"."collateral_asset_type" AS ENUM('software', 'domain', 'database', 'copyright', 'trade_name', 'contract_right', 'receivable', 'account', 'general_intangible', 'proceeds', 'algorithm', 'music_asset', 'insurance_policy', 'digital_asset');
CREATE TYPE "public"."collateral_valuation_status" AS ENUM('founder_estimate', 'book_value', 'replacement_cost', 'independent_appraisal_required', 'appraised', 'not_assessed');
CREATE TYPE "public"."receivable_readiness_status" AS ENUM('prospective', 'contracted', 'invoiced', 'collectible', 'paid', 'disputed', 'ineligible');
CREATE TYPE "public"."facility_checklist_status" AS ENUM('missing', 'draft', 'pending_review', 'complete');

CREATE TABLE "document_room_items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "document_type" text NOT NULL,
  "source_file_name" text,
  "storage_url_or_path" text,
  "status" "document_room_status" DEFAULT 'draft' NOT NULL,
  "version" text DEFAULT 'v0.1' NOT NULL,
  "effective_date" timestamp,
  "expiration_date" timestamp,
  "owner_user_id" varchar,
  "related_entity_type" text,
  "related_entity_id" varchar,
  "confidentiality_level" text DEFAULT 'internal' NOT NULL,
  "lender_visible_boolean" boolean DEFAULT false NOT NULL,
  "attorney_review_required" boolean DEFAULT true NOT NULL,
  "accountant_review_required" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "legal_instruments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instrument_type" "legal_instrument_type" NOT NULL,
  "parties_json" jsonb DEFAULT '{}'::jsonb,
  "principal_amount" integer,
  "interest_rate" text,
  "start_date" timestamp,
  "maturity_date" timestamp,
  "governing_law" text,
  "collateral_summary" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "document_room_item_id" varchar,
  "attorney_review_required" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "collateral_assets" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asset_type" "collateral_asset_type" NOT NULL,
  "asset_name" text NOT NULL,
  "owner_entity" text,
  "assigned_to_entity" text,
  "secured_party" text,
  "estimated_value" integer,
  "valuation_method" text,
  "valuation_status" "collateral_valuation_status" DEFAULT 'not_assessed' NOT NULL,
  "supporting_document_id" varchar,
  "notes" text,
  "lender_visible_boolean" boolean DEFAULT false NOT NULL,
  "attorney_review_required" boolean DEFAULT true NOT NULL,
  "accountant_review_required" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "receivable_readiness_records" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" varchar,
  "agreement_id" varchar,
  "invoice_id" varchar,
  "service_status" text DEFAULT 'not_started' NOT NULL,
  "service_completion_evidence_id" varchar,
  "payment_due_date" timestamp,
  "amount_due" integer,
  "status" "receivable_readiness_status" DEFAULT 'prospective' NOT NULL,
  "lender_eligible_boolean" boolean DEFAULT false NOT NULL,
  "ineligibility_reason" text,
  "manual_review_completed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "facility_readiness_checklist" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "checklist_item" text NOT NULL,
  "category" text NOT NULL,
  "status" "facility_checklist_status" DEFAULT 'missing' NOT NULL,
  "responsible_party" text,
  "document_room_item_id" varchar,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "audit_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" varchar,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" varchar,
  "before_value" jsonb,
  "after_value" jsonb,
  "related_document_id" varchar,
  "reason" text,
  "high_risk" boolean DEFAULT false NOT NULL,
  "confirmation_text" text,
  "created_at" timestamp DEFAULT now()
);

ALTER TABLE "document_room_items" ADD CONSTRAINT "document_room_items_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "legal_instruments" ADD CONSTRAINT "legal_instruments_document_room_item_id_document_room_items_id_fk" FOREIGN KEY ("document_room_item_id") REFERENCES "public"."document_room_items"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "collateral_assets" ADD CONSTRAINT "collateral_assets_supporting_document_id_document_room_items_id_fk" FOREIGN KEY ("supporting_document_id") REFERENCES "public"."document_room_items"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "receivable_readiness_records" ADD CONSTRAINT "receivable_readiness_records_customer_id_clients_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "receivable_readiness_records" ADD CONSTRAINT "receivable_readiness_records_agreement_id_document_room_items_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."document_room_items"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "receivable_readiness_records" ADD CONSTRAINT "receivable_readiness_records_service_completion_evidence_id_document_room_items_id_fk" FOREIGN KEY ("service_completion_evidence_id") REFERENCES "public"."document_room_items"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "facility_readiness_checklist" ADD CONSTRAINT "facility_readiness_checklist_document_room_item_id_document_room_items_id_fk" FOREIGN KEY ("document_room_item_id") REFERENCES "public"."document_room_items"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_related_document_id_document_room_items_id_fk" FOREIGN KEY ("related_document_id") REFERENCES "public"."document_room_items"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "document_room_items_category_idx" ON "document_room_items" ("category");
CREATE INDEX "document_room_items_status_idx" ON "document_room_items" ("status");
CREATE INDEX "document_room_items_lender_visible_idx" ON "document_room_items" ("lender_visible_boolean");
CREATE INDEX "collateral_assets_asset_type_idx" ON "collateral_assets" ("asset_type");
CREATE INDEX "receivable_readiness_records_status_idx" ON "receivable_readiness_records" ("status");
CREATE INDEX "audit_events_entity_idx" ON "audit_events" ("entity_type", "entity_id");
