CREATE TYPE "public"."bureau" AS ENUM('equifax', 'experian', 'transunion');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('onboarding', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."credit_line_status" AS ENUM('applied', 'reviewing', 'approved', 'active', 'rejected', 'closed');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('preparing', 'pending', 'sent', 'validated', 'no_response', 'deleted', 'rejected', 'closed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('dispute', 'billing', 'client', 'compliance', 'success', 'warning');--> statement-breakpoint
CREATE TYPE "public"."tradeline_status" AS ENUM('pending', 'placed', 'active', 'removed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "api_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "api_configs_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"plaid_item_id" text,
	"plaid_access_token" text,
	"institution_name" text NOT NULL,
	"institution_id" text,
	"account_name" text NOT NULL,
	"account_type" text NOT NULL,
	"account_subtype" text,
	"mask" text,
	"balance_current" integer,
	"balance_available" integer,
	"balance_limit" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"last_synced" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cardholder_partners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"paypal_email" text,
	"bank_name" text NOT NULL,
	"card_name" text NOT NULL,
	"credit_limit" integer NOT NULL,
	"current_balance" integer DEFAULT 0,
	"history_years" integer NOT NULL,
	"reporting_day" integer,
	"total_slots" integer DEFAULT 3 NOT NULL,
	"used_slots" integer DEFAULT 0 NOT NULL,
	"price_per_slot" integer,
	"payout_per_slot" integer,
	"reporting_bureaus" text[] DEFAULT ARRAY['equifax','experian','transunion']::text[],
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"category" text DEFAULT 'credit_report' NOT NULL,
	"notes" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"suffix" text,
	"email" text NOT NULL,
	"phone" text,
	"ssn" text,
	"dob" text,
	"date_of_birth" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"previous_address" text,
	"id_type" text,
	"id_number" text,
	"status" "client_status" DEFAULT 'onboarding' NOT NULL,
	"onboarding_progress" integer DEFAULT 0 NOT NULL,
	"equifax_score" integer,
	"experian_score" integer,
	"transunion_score" integer,
	"goal_score" integer,
	"stripe_customer_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credit_lines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"product_type" text NOT NULL,
	"product_name" text NOT NULL,
	"provider" text,
	"credit_limit" integer,
	"monthly_payment" integer,
	"term_months" integer,
	"progress_percent" integer DEFAULT 0,
	"status" "credit_line_status" DEFAULT 'applied' NOT NULL,
	"stripe_subscription_id" text,
	"notes" text,
	"start_date" timestamp,
	"next_payment_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credit_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"equifax_score" integer,
	"experian_score" integer,
	"transunion_score" integer,
	"equifax_change" integer,
	"experian_change" integer,
	"transunion_change" integer,
	"negative_items" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_data" text,
	"pull_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crypto_wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"wallet_address" text NOT NULL,
	"wallet_type" text DEFAULT 'metamask' NOT NULL,
	"chain_id" integer DEFAULT 1,
	"label" text,
	"balance_eth" text,
	"balance_usd" text,
	"last_synced" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"bureau" "bureau" NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text,
	"reason" text NOT NULL,
	"item_type" text,
	"dispute_type" text DEFAULT 'general',
	"dispute_method" text DEFAULT 'mail',
	"tracking_number" text,
	"status" "dispute_status" DEFAULT 'preparing' NOT NULL,
	"letter_content" text,
	"eoscar_reference_id" text,
	"eoscar_status" text,
	"sent_at" timestamp,
	"resolved_at" timestamp,
	"bureau_response_date" timestamp,
	"due_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loan_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"loan_type" text NOT NULL,
	"amount" integer NOT NULL,
	"term_months" integer,
	"interest_rate" text,
	"lender" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"prequalified" boolean DEFAULT false,
	"ai_recommendation" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "metro2_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"bureau" text NOT NULL,
	"report_type" text DEFAULT 'M' NOT NULL,
	"account_number" text,
	"portfolio_type" text NOT NULL,
	"account_status" text DEFAULT '11' NOT NULL,
	"credit_limit" integer,
	"current_balance" integer DEFAULT 0,
	"payment_history" text DEFAULT '111111111111111111111111',
	"ecoa_code" text DEFAULT '3' NOT NULL,
	"file_content" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_type" DEFAULT 'client' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"client_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"step" text NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"data" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tradelines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"institution" text NOT NULL,
	"card_holder" text,
	"credit_limit" integer,
	"history_years" integer,
	"reporting_day" integer,
	"status" "tradeline_status" DEFAULT 'pending' NOT NULL,
	"price" integer,
	"notes" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ui_customization" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ui_customization_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text,
	"email" text,
	"phone" text,
	"role" text DEFAULT 'staff' NOT NULL,
	"oauth_provider" text,
	"oauth_provider_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_lines" ADD CONSTRAINT "credit_lines_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_reports" ADD CONSTRAINT "credit_reports_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_wallets" ADD CONSTRAINT "crypto_wallets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metro2_submissions" ADD CONSTRAINT "metro2_submissions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tradelines" ADD CONSTRAINT "tradelines_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;