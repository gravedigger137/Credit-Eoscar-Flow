ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "address2" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "last4_ssn" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "encrypted_full_ssn" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "ip_address" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "correlation_id" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "dwolla_customer_id" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "dwolla_customer_url" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "dwolla_verification_status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "dwolla_verification_raw_status" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "dwolla_verification_updated_at" timestamp;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "dwolla_verification_failure_reason" text;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_clients_dwolla_customer_id" ON "clients" ("dwolla_customer_id") WHERE "dwolla_customer_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_clients_dwolla_correlation_id" ON "clients" ("correlation_id") WHERE "correlation_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "dwolla_customer_documents" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" varchar NOT NULL REFERENCES "clients"("id") ON DELETE cascade,
  "dwolla_customer_id" text NOT NULL,
  "dwolla_document_id" text,
  "dwolla_document_url" text,
  "document_type" text NOT NULL DEFAULT 'identity_verification',
  "status" text NOT NULL DEFAULT 'received',
  "file_name" text NOT NULL,
  "original_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "sha256" text NOT NULL,
  "storage_provider" text NOT NULL DEFAULT 'local_private',
  "storage_path" text NOT NULL,
  "uploaded_by_user_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "failure_reason" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_dwolla_customer_documents_client_id" ON "dwolla_customer_documents" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_dwolla_customer_documents_customer_id" ON "dwolla_customer_documents" ("dwolla_customer_id");

CREATE TABLE IF NOT EXISTS "dwolla_customer_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" text NOT NULL UNIQUE,
  "topic" text NOT NULL,
  "internal_topic" text NOT NULL,
  "resource_url" text,
  "client_id" varchar REFERENCES "clients"("id") ON DELETE set null,
  "dwolla_customer_id" text,
  "raw_status" text,
  "normalized_status" text,
  "occurred_at" timestamp NOT NULL,
  "processed_at" timestamp DEFAULT now(),
  "payload_summary" jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS "idx_dwolla_customer_events_client_id" ON "dwolla_customer_events" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_dwolla_customer_events_customer_id" ON "dwolla_customer_events" ("dwolla_customer_id");
CREATE INDEX IF NOT EXISTS "idx_dwolla_customer_events_occurred_at" ON "dwolla_customer_events" ("occurred_at");
