CREATE TABLE IF NOT EXISTS "financial_networks" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'inactive',
  "environment" text NOT NULL DEFAULT 'sandbox',
  "requires_enrollment" boolean NOT NULL DEFAULT true,
  "supports_documents" boolean NOT NULL DEFAULT false,
  "supports_settlement" boolean NOT NULL DEFAULT false,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "institution_registry" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "legal_name" text,
  "institution_type" text NOT NULL DEFAULT 'financial_institution',
  "status" text NOT NULL DEFAULT 'active',
  "jurisdiction" text,
  "website" text,
  "contact_email" text,
  "risk_rating" text NOT NULL DEFAULT 'standard',
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "institution_credentials" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "institution_id" varchar NOT NULL REFERENCES "institution_registry"("id") ON DELETE cascade,
  "network_id" varchar REFERENCES "financial_networks"("id") ON DELETE set null,
  "credential_type" text NOT NULL,
  "key_name" text NOT NULL,
  "encrypted_value" text NOT NULL,
  "environment" text NOT NULL DEFAULT 'sandbox',
  "status" text NOT NULL DEFAULT 'active',
  "last_rotated_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payment_rails" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "settlement_timing" text NOT NULL DEFAULT 'configured_by_network',
  "status" text NOT NULL DEFAULT 'inactive',
  "requires_enrollment" boolean NOT NULL DEFAULT true,
  "supports_refunds" boolean NOT NULL DEFAULT false,
  "supports_cancellation" boolean NOT NULL DEFAULT false,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "instrument_types" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "requires_collateral" boolean NOT NULL DEFAULT false,
  "requires_documents" boolean NOT NULL DEFAULT true,
  "compliance_profile" text NOT NULL DEFAULT 'standard_review',
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "institution_capabilities" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "institution_id" varchar NOT NULL REFERENCES "institution_registry"("id") ON DELETE cascade,
  "network_id" varchar REFERENCES "financial_networks"("id") ON DELETE set null,
  "payment_rail_id" varchar REFERENCES "payment_rails"("id") ON DELETE set null,
  "instrument_type_id" varchar REFERENCES "instrument_types"("id") ON DELETE set null,
  "capability_type" text NOT NULL,
  "capability_code" text NOT NULL,
  "status" text NOT NULL DEFAULT 'inactive',
  "requires_approval" boolean NOT NULL DEFAULT true,
  "config" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "instruments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instrument_type_id" varchar NOT NULL REFERENCES "instrument_types"("id") ON DELETE restrict,
  "owner_client_id" varchar REFERENCES "clients"("id") ON DELETE set null,
  "title" text NOT NULL,
  "reference_number" text,
  "amount" integer,
  "currency" text NOT NULL DEFAULT 'USD',
  "status" text NOT NULL DEFAULT 'draft',
  "jurisdiction" text,
  "maturity_date" timestamp,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "instrument_documents" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instrument_id" varchar NOT NULL REFERENCES "instruments"("id") ON DELETE cascade,
  "document_room_item_id" varchar REFERENCES "document_room_items"("id") ON DELETE set null,
  "client_document_id" varchar REFERENCES "client_documents"("id") ON DELETE set null,
  "document_type" text NOT NULL,
  "storage_uri" text,
  "sha256" text,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "instrument_collateral" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instrument_id" varchar NOT NULL REFERENCES "instruments"("id") ON DELETE cascade,
  "collateral_asset_id" varchar REFERENCES "collateral_assets"("id") ON DELETE set null,
  "description" text NOT NULL,
  "estimated_value" integer,
  "lien_position" text,
  "status" text NOT NULL DEFAULT 'active',
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "instrument_parties" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instrument_id" varchar NOT NULL REFERENCES "instruments"("id") ON DELETE cascade,
  "party_type" text NOT NULL,
  "party_name" text NOT NULL,
  "party_email" text,
  "client_id" varchar REFERENCES "clients"("id") ON DELETE set null,
  "institution_id" varchar REFERENCES "institution_registry"("id") ON DELETE set null,
  "role" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "instrument_assignments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "instrument_id" varchar NOT NULL REFERENCES "instruments"("id") ON DELETE cascade,
  "assignor_party_id" varchar REFERENCES "instrument_parties"("id") ON DELETE set null,
  "assignee_party_id" varchar REFERENCES "instrument_parties"("id") ON DELETE set null,
  "assignment_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "effective_at" timestamp,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "exchange_requests" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_type" text NOT NULL,
  "instrument_id" varchar REFERENCES "instruments"("id") ON DELETE set null,
  "institution_id" varchar REFERENCES "institution_registry"("id") ON DELETE set null,
  "network_id" varchar REFERENCES "financial_networks"("id") ON DELETE set null,
  "payment_rail_id" varchar REFERENCES "payment_rails"("id") ON DELETE set null,
  "amount" integer,
  "currency" text NOT NULL DEFAULT 'USD',
  "status" text NOT NULL DEFAULT 'approved',
  "priority" integer NOT NULL DEFAULT 100,
  "idempotency_key" text NOT NULL UNIQUE,
  "requested_by_user_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "approval_reference" text,
  "compliance_status" text NOT NULL DEFAULT 'pending',
  "validation_errors" jsonb DEFAULT '[]'::jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "exchange_routes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "exchange_request_id" varchar NOT NULL REFERENCES "exchange_requests"("id") ON DELETE cascade,
  "sequence" integer NOT NULL DEFAULT 1,
  "connector_code" text NOT NULL,
  "network_id" varchar REFERENCES "financial_networks"("id") ON DELETE set null,
  "institution_id" varchar REFERENCES "institution_registry"("id") ON DELETE set null,
  "payment_rail_id" varchar REFERENCES "payment_rails"("id") ON DELETE set null,
  "decision_status" text NOT NULL DEFAULT 'selected',
  "decision_reason" text NOT NULL,
  "score" integer NOT NULL DEFAULT 0,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "exchange_attempts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "exchange_request_id" varchar NOT NULL REFERENCES "exchange_requests"("id") ON DELETE cascade,
  "exchange_route_id" varchar REFERENCES "exchange_routes"("id") ON DELETE set null,
  "attempt_number" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'queued',
  "connector_code" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_payload_hash" text,
  "response_summary" jsonb DEFAULT '{}'::jsonb,
  "error_code" text,
  "error_message" text,
  "next_retry_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "completed_at" timestamp
);

CREATE TABLE IF NOT EXISTS "exchange_results" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "exchange_request_id" varchar NOT NULL REFERENCES "exchange_requests"("id") ON DELETE cascade,
  "status" text NOT NULL,
  "external_reference_id" text,
  "result_code" text,
  "result_summary" text,
  "settled_amount" integer,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "settlement_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "exchange_request_id" varchar REFERENCES "exchange_requests"("id") ON DELETE set null,
  "event_type" text NOT NULL,
  "status" text NOT NULL,
  "amount" integer,
  "currency" text NOT NULL DEFAULT 'USD',
  "occurred_at" timestamp NOT NULL DEFAULT now(),
  "external_reference_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "routing_rules" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "priority" integer NOT NULL DEFAULT 100,
  "enabled" boolean NOT NULL DEFAULT true,
  "conditions" jsonb DEFAULT '{}'::jsonb,
  "actions" jsonb DEFAULT '{}'::jsonb,
  "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "connector_health" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "connector_code" text NOT NULL UNIQUE,
  "network_id" varchar REFERENCES "financial_networks"("id") ON DELETE set null,
  "institution_id" varchar REFERENCES "institution_registry"("id") ON DELETE set null,
  "status" text NOT NULL DEFAULT 'not_configured',
  "configured" boolean NOT NULL DEFAULT false,
  "last_checked_at" timestamp,
  "latency_ms" integer,
  "message" text,
  "capabilities" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_institution_credentials_institution" ON "institution_credentials" ("institution_id");
CREATE INDEX IF NOT EXISTS "idx_institution_capabilities_institution" ON "institution_capabilities" ("institution_id");
CREATE INDEX IF NOT EXISTS "idx_instruments_type" ON "instruments" ("instrument_type_id");
CREATE INDEX IF NOT EXISTS "idx_instruments_owner_client" ON "instruments" ("owner_client_id");
CREATE INDEX IF NOT EXISTS "idx_exchange_requests_status" ON "exchange_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_exchange_requests_idempotency" ON "exchange_requests" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "idx_exchange_routes_request" ON "exchange_routes" ("exchange_request_id");
CREATE INDEX IF NOT EXISTS "idx_exchange_attempts_request" ON "exchange_attempts" ("exchange_request_id");
CREATE INDEX IF NOT EXISTS "idx_exchange_attempts_retry" ON "exchange_attempts" ("status", "next_retry_at");
CREATE INDEX IF NOT EXISTS "idx_settlement_events_request" ON "settlement_events" ("exchange_request_id");
CREATE INDEX IF NOT EXISTS "idx_routing_rules_priority" ON "routing_rules" ("enabled", "priority");

INSERT INTO "financial_networks" ("code", "name", "category", "description", "status", "environment", "requires_enrollment", "supports_documents", "supports_settlement", "metadata")
VALUES
  ('stripe', 'Stripe', 'payment_processor', 'Existing Stripe payment processor integration boundary.', 'active', 'configured_by_environment', false, false, true, '{"approvalRequired": false}'::jsonb),
  ('dwolla', 'Dwolla', 'ach_provider', 'Dwolla adapter architecture for approved ACH transfer programs.', 'active', 'configured_by_partner', true, false, true, '{"approvalRequired": true}'::jsonb),
  ('ach', 'ACH', 'payment_network', 'ACH adapter architecture for approved ODFI/RDFI or provider-mediated access.', 'active', 'configured_by_partner', true, false, true, '{"approvalRequired": true}'::jsonb),
  ('wire', 'Wire Transfer', 'payment_network', 'Wire transfer adapter architecture for approved banking partners.', 'active', 'configured_by_partner', true, true, true, '{"approvalRequired": true}'::jsonb),
  ('fedwire', 'Fedwire', 'federal_reserve_service', 'Fedwire adapter architecture. Direct access requires Federal Reserve service eligibility and approval.', 'active', 'configured_by_partner', true, false, true, '{"approvalRequired": true}'::jsonb),
  ('fednow', 'FedNow', 'federal_reserve_service', 'FedNow adapter architecture. Direct access requires Federal Reserve service eligibility and approval.', 'active', 'configured_by_partner', true, false, true, '{"approvalRequired": true}'::jsonb),
  ('rtp', 'RTP', 'real_time_payment_network', 'RTP adapter architecture for approved network participant/provider access.', 'active', 'configured_by_partner', true, false, true, '{"approvalRequired": true}'::jsonb),
  ('swift', 'SWIFT', 'financial_messaging', 'SWIFT messaging adapter architecture for approved BIC/service bureau access.', 'active', 'configured_by_partner', true, true, false, '{"approvalRequired": true}'::jsonb),
  ('sepa', 'SEPA', 'payment_network', 'SEPA adapter architecture for supported European payment providers.', 'active', 'configured_by_partner', true, false, true, '{"approvalRequired": true}'::jsonb),
  ('card_networks', 'Card Networks', 'card_network', 'Card network abstraction for approved processors and network programs.', 'active', 'configured_by_partner', true, false, true, '{"approvalRequired": true}'::jsonb),
  ('treasury_direct', 'TreasuryDirect', 'government', 'TreasuryDirect integration module limited to technically supported published interfaces.', 'active', 'configured_by_partner', true, true, false, '{"approvalRequired": true}'::jsonb),
  ('baas', 'Banking-as-a-Service Providers', 'future_provider', 'Future BaaS provider adapter framework.', 'active', 'configured_by_partner', true, true, true, '{"approvalRequired": true}'::jsonb),
  ('federal_reserve_services', 'Federal Reserve Services', 'future_federal_reserve_adapter', 'Future Federal Reserve service adapter framework for approved access only.', 'active', 'configured_by_partner', true, false, true, '{"approvalRequired": true}'::jsonb)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "payment_rails" ("code", "name", "category", "settlement_timing", "status", "requires_enrollment", "supports_refunds", "supports_cancellation", "metadata")
VALUES
  ('stripe', 'Stripe', 'payment_processor', 'processor_defined', 'active', false, true, true, '{"existingRuntime": true}'::jsonb),
  ('dwolla', 'Dwolla', 'ach_provider', 'provider_defined', 'active', true, true, true, '{"approvalRequired": true}'::jsonb),
  ('ach', 'ACH', 'bank_transfer', 'next_day_or_standard', 'active', true, true, true, '{"approvalRequired": true}'::jsonb),
  ('wire', 'Wire Transfer', 'bank_transfer', 'same_day_or_bank_defined', 'active', true, false, false, '{"approvalRequired": true}'::jsonb),
  ('fedwire', 'Fedwire', 'federal_reserve_service', 'same_day', 'active', true, false, false, '{"approvalRequired": true}'::jsonb),
  ('fednow', 'FedNow', 'instant_payment', 'instant', 'active', true, false, false, '{"approvalRequired": true}'::jsonb),
  ('rtp', 'RTP', 'instant_payment', 'instant', 'active', true, false, false, '{"approvalRequired": true}'::jsonb),
  ('swift', 'SWIFT Messaging', 'financial_messaging', 'bank_defined', 'active', true, false, false, '{"approvalRequired": true}'::jsonb),
  ('sepa', 'SEPA', 'european_payment', 'scheme_defined', 'active', true, true, true, '{"approvalRequired": true}'::jsonb),
  ('card_networks', 'Card Networks', 'card_network', 'network_defined', 'active', true, true, true, '{"approvalRequired": true}'::jsonb),
  ('treasury_direct', 'TreasuryDirect', 'government', 'published_interface_defined', 'active', true, false, false, '{"approvalRequired": true}'::jsonb),
  ('baas', 'Banking-as-a-Service Providers', 'future_provider', 'provider_defined', 'active', true, true, true, '{"approvalRequired": true}'::jsonb),
  ('federal_reserve_services', 'Federal Reserve Services', 'future_federal_reserve_adapter', 'service_defined', 'active', true, false, false, '{"approvalRequired": true}'::jsonb)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "instrument_types" ("code", "name", "category", "requires_collateral", "requires_documents", "compliance_profile", "metadata")
VALUES
  ('promissory_note', 'Promissory Note', 'debt_instrument', false, true, 'legal_review_required', '{}'::jsonb),
  ('receivable', 'Receivable', 'working_capital', false, true, 'receivable_review', '{}'::jsonb),
  ('invoice', 'Invoice', 'working_capital', false, true, 'invoice_review', '{}'::jsonb),
  ('purchase_order', 'Purchase Order', 'commerce_document', false, true, 'commercial_review', '{}'::jsonb),
  ('assignment', 'Assignment', 'transfer_document', false, true, 'legal_review_required', '{}'::jsonb),
  ('contract', 'Contract', 'legal_document', false, true, 'legal_review_required', '{}'::jsonb),
  ('security_agreement', 'Security Agreement', 'secured_transaction', true, true, 'legal_review_required', '{}'::jsonb),
  ('lease_agreement', 'Lease Agreement', 'lease_document', false, true, 'legal_review_required', '{}'::jsonb),
  ('vehicle_paper', 'Vehicle Paper', 'secured_asset', true, true, 'asset_review', '{}'::jsonb),
  ('commercial_paper', 'Commercial Paper', 'capital_markets', false, true, 'securities_review_required', '{}'::jsonb),
  ('collateral_package', 'Collateral Package', 'secured_transaction', true, true, 'collateral_review', '{}'::jsonb),
  ('investment_certificate', 'Investment Certificate', 'capital_markets', false, true, 'securities_review_required', '{}'::jsonb),
  ('trust_asset_package', 'Trust Asset Package', 'trust_administration', true, true, 'trust_review_required', '{}'::jsonb),
  ('ucc_documentation', 'UCC Documentation', 'secured_transaction', true, true, 'ucc_review', '{}'::jsonb),
  ('supporting_document', 'Supporting Document', 'supporting_evidence', false, true, 'standard_review', '{}'::jsonb)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "connector_health" ("connector_code", "status", "configured", "message", "capabilities")
VALUES
  ('stripe', 'not_configured', false, 'Stripe institutional exchange adapter requires explicit exchange enablement and credentials before use.', '["payments","refunds","webhooks"]'::jsonb),
  ('dwolla', 'requires_enrollment', false, 'Dwolla requires partner enrollment and approved credentials before exchange submission.', '["ach","transfers"]'::jsonb),
  ('ach', 'requires_enrollment', false, 'ACH requires approved bank/provider access before exchange submission.', '["ach_credit","ach_debit","returns"]'::jsonb),
  ('wire', 'requires_enrollment', false, 'Wire transfer submission requires approved banking partner access.', '["domestic_wire"]'::jsonb),
  ('fedwire', 'requires_enrollment', false, 'Fedwire requires Federal Reserve service eligibility and approval.', '["fedwire_transfer"]'::jsonb),
  ('fednow', 'requires_enrollment', false, 'FedNow requires Federal Reserve service eligibility and approval.', '["instant_payment"]'::jsonb),
  ('rtp', 'requires_enrollment', false, 'RTP requires network participant or approved provider access.', '["real_time_payment"]'::jsonb),
  ('swift', 'requires_enrollment', false, 'SWIFT requires approved BIC/service bureau access.', '["swift_message"]'::jsonb),
  ('sepa', 'requires_enrollment', false, 'SEPA requires supported provider and jurisdictional configuration.', '["sepa_credit_transfer"]'::jsonb),
  ('card_networks', 'requires_enrollment', false, 'Card network exchange requires approved processor/network programs.', '["card_authorization","settlement"]'::jsonb),
  ('treasury_direct', 'requires_enrollment', false, 'TreasuryDirect use is limited to supported published interfaces and approved credentials.', '["published_interface_review"]'::jsonb),
  ('baas', 'requires_enrollment', false, 'BaaS adapters require selected provider approval and configuration.', '["future_provider_adapter"]'::jsonb),
  ('federal_reserve_services', 'requires_enrollment', false, 'Federal Reserve service adapters require applicable eligibility and approval.', '["future_federal_reserve_adapter"]'::jsonb)
ON CONFLICT ("connector_code") DO NOTHING;
