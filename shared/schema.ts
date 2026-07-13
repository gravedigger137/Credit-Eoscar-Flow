import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── ENUMS ───────────────────────────────────────────────────────────────────
export const clientStatusEnum = pgEnum("client_status", ["onboarding", "active", "paused", "completed"]);
export const disputeStatusEnum = pgEnum("dispute_status", ["preparing", "pending", "sent", "validated", "no_response", "deleted", "rejected", "verified", "closed"]);
export const bureauEnum = pgEnum("bureau", ["equifax", "experian", "transunion"]);
export const tradelineStatusEnum = pgEnum("tradeline_status", ["pending", "placed", "active", "removed", "expired"]);
export const creditLineStatusEnum = pgEnum("credit_line_status", ["applied", "reviewing", "approved", "active", "rejected", "closed"]);
export const notificationTypeEnum = pgEnum("notification_type", ["dispute", "billing", "client", "compliance", "success", "warning"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed", "refunded"]);
export const documentRoomStatusEnum = pgEnum("document_room_status", ["draft", "active", "superseded", "attorney_review_required", "accountant_review_required", "approved"]);
export const legalInstrumentTypeEnum = pgEnum("legal_instrument_type", ["promissory_note", "security_agreement", "bylaws", "shareholder_agreement", "trust_agreement", "resolution", "msa", "order_form", "privacy_policy", "terms_of_service"]);
export const collateralAssetTypeEnum = pgEnum("collateral_asset_type", ["software", "domain", "database", "copyright", "trade_name", "contract_right", "receivable", "account", "general_intangible", "proceeds", "algorithm", "music_asset", "insurance_policy", "digital_asset"]);
export const collateralValuationStatusEnum = pgEnum("collateral_valuation_status", ["founder_estimate", "book_value", "replacement_cost", "independent_appraisal_required", "appraised", "not_assessed"]);
export const receivableReadinessStatusEnum = pgEnum("receivable_readiness_status", ["prospective", "contracted", "invoiced", "collectible", "paid", "disputed", "ineligible"]);
export const facilityChecklistStatusEnum = pgEnum("facility_checklist_status", ["missing", "draft", "pending_review", "complete"]);
export const equityBonusStatusEnum = pgEnum("equity_bonus_status", ["not_offered", "interested", "pending_review", "attorney_review_required", "board_approval_required", "approved", "issued", "declined", "voided"]);

// ─── USERS (STAFF) ───────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("staff"),
  oauthProvider: text("oauth_provider"),
  oauthProviderId: text("oauth_provider_id"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaTotpSecret: text("mfa_totp_secret"),
  mfaRecoveryCodeHashes: jsonb("mfa_recovery_code_hashes").$type<string[]>().default(sql`'[]'::jsonb`),
  mfaConfirmedAt: timestamp("mfa_confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── CLIENTS ─────────────────────────────────────────────────────────────────
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  suffix: text("suffix"),
  email: text("email").notNull(),
  phone: text("phone"),
  ssn: text("ssn"),
  dob: text("dob"),
  dateOfBirth: text("date_of_birth"),
  address: text("address"),
  address2: text("address2"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  last4Ssn: text("last4_ssn"),
  encryptedFullSsn: text("encrypted_full_ssn"),
  ipAddress: text("ip_address"),
  correlationId: text("correlation_id"),
  dwollaCustomerId: text("dwolla_customer_id"),
  dwollaCustomerUrl: text("dwolla_customer_url"),
  dwollaVerificationStatus: text("dwolla_verification_status").notNull().default("pending"),
  dwollaVerificationRawStatus: text("dwolla_verification_raw_status"),
  dwollaVerificationUpdatedAt: timestamp("dwolla_verification_updated_at"),
  dwollaVerificationFailureReason: text("dwolla_verification_failure_reason"),
  previousAddress: text("previous_address"),
  idType: text("id_type"),
  idNumber: text("id_number"),
  status: clientStatusEnum("status").notNull().default("onboarding"),
  onboardingProgress: integer("onboarding_progress").notNull().default(0),
  equifaxScore: integer("equifax_score"),
  experianScore: integer("experian_score"),
  transunionScore: integer("transunion_score"),
  goalScore: integer("goal_score"),
  stripeCustomerId: text("stripe_customer_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ─── DISPUTES ─────────────────────────────────────────────────────────────────
export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  bureau: bureauEnum("bureau").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number"),
  reason: text("reason").notNull(),
  itemType: text("item_type"),
  disputeType: text("dispute_type").default("general"),
  disputeMethod: text("dispute_method").default("mail"),
  trackingNumber: text("tracking_number"),
  status: disputeStatusEnum("status").notNull().default("preparing"),
  letterContent: text("letter_content"),
  eoscarReferenceId: text("eoscar_reference_id"),
  eoscarStatus: text("eoscar_status"),
  sentAt: timestamp("sent_at"),
  resolvedAt: timestamp("resolved_at"),
  bureauResponseDate: timestamp("bureau_response_date"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({ id: true, createdAt: true });
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

// ─── CREDIT REPORTS ────────────────────────────────────────────────────────
export const creditReports = pgTable("credit_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  equifaxScore: integer("equifax_score"),
  experianScore: integer("experian_score"),
  transunionScore: integer("transunion_score"),
  equifaxChange: integer("equifax_change"),
  experianChange: integer("experian_change"),
  transunionChange: integer("transunion_change"),
  negativeItems: integer("negative_items").default(0),
  status: text("status").notNull().default("pending"),
  rawData: text("raw_data"),
  pullDate: timestamp("pull_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCreditReportSchema = createInsertSchema(creditReports).omit({ id: true, createdAt: true });
export type InsertCreditReport = z.infer<typeof insertCreditReportSchema>;
export type CreditReport = typeof creditReports.$inferSelect;

// ─── TRADELINES ───────────────────────────────────────────────────────────────
export const tradelines = pgTable("tradelines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  cardHolder: text("card_holder"),
  creditLimit: integer("credit_limit"),
  historyYears: integer("history_years"),
  reportingDay: integer("reporting_day"),
  status: tradelineStatusEnum("status").notNull().default("pending"),
  price: integer("price"),
  notes: text("notes"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTradelineSchema = createInsertSchema(tradelines).omit({ id: true, createdAt: true });
export type InsertTradeline = z.infer<typeof insertTradelineSchema>;
export type Tradeline = typeof tradelines.$inferSelect;

// ─── CREDIT LINES (Builder Products) ─────────────────────────────────────────
export const creditLines = pgTable("credit_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  productType: text("product_type").notNull(), // "builder_loan" | "revolving_store" | "magnum_builder"
  productName: text("product_name").notNull(),
  provider: text("provider"),
  creditLimit: integer("credit_limit"),
  monthlyPayment: integer("monthly_payment"),
  termMonths: integer("term_months"),
  progressPercent: integer("progress_percent").default(0),
  status: creditLineStatusEnum("status").notNull().default("applied"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  notes: text("notes"),
  startDate: timestamp("start_date"),
  nextPaymentDate: timestamp("next_payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCreditLineSchema = createInsertSchema(creditLines).omit({ id: true, createdAt: true });
export type InsertCreditLine = z.infer<typeof insertCreditLineSchema>;
export type CreditLine = typeof creditLines.$inferSelect;

// ─── TRANSACTIONS (BILLING) ────────────────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeChargeId: text("stripe_charge_id"),
  type: text("type").notNull(), // "tradeline" | "credit_line" | "retainer" | "report"
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // in cents
  status: transactionStatusEnum("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: notificationTypeEnum("type").notNull().default("client"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ─── CARDHOLDER PARTNERS (AU Tradeline Suppliers) ────────────────────────────
export const cardholderPartners = pgTable("cardholder_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  paypalEmail: text("paypal_email"),
  bankName: text("bank_name").notNull(),
  cardName: text("card_name").notNull(),
  creditLimit: integer("credit_limit").notNull(),
  currentBalance: integer("current_balance").default(0),
  historyYears: integer("history_years").notNull(),
  reportingDay: integer("reporting_day"),
  totalSlots: integer("total_slots").notNull().default(3),
  usedSlots: integer("used_slots").notNull().default(0),
  pricePerSlot: integer("price_per_slot"),
  payoutPerSlot: integer("payout_per_slot"),
  reportingBureaus: text("reporting_bureaus").array().default(sql`ARRAY['equifax','experian','transunion']::text[]`),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCardholderPartnerSchema = createInsertSchema(cardholderPartners).omit({ id: true, createdAt: true });
export type InsertCardholderPartner = z.infer<typeof insertCardholderPartnerSchema>;
export type CardholderPartner = typeof cardholderPartners.$inferSelect;

// ─── METRO 2 SUBMISSION RECORDS ──────────────────────────────────────────────
export const metro2Submissions = pgTable("metro2_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  bureau: text("bureau").notNull(),
  reportType: text("report_type").notNull().default("M"),
  accountNumber: text("account_number"),
  portfolioType: text("portfolio_type").notNull(),
  accountStatus: text("account_status").notNull().default("11"),
  creditLimit: integer("credit_limit"),
  currentBalance: integer("current_balance").default(0),
  paymentHistory: text("payment_history").default("111111111111111111111111"),
  ecoaCode: text("ecoa_code").notNull().default("3"),
  fileContent: text("file_content"),
  status: text("status").notNull().default("draft"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMetro2SubmissionSchema = createInsertSchema(metro2Submissions).omit({ id: true, createdAt: true });
export type InsertMetro2Submission = z.infer<typeof insertMetro2SubmissionSchema>;
export type Metro2Submission = typeof metro2Submissions.$inferSelect;

// ─── CLIENT DOCUMENTS ────────────────────────────────────────────────────
export const clientDocuments = pgTable("client_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  category: text("category").notNull().default("credit_report"),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const insertClientDocumentSchema = createInsertSchema(clientDocuments).omit({ id: true, uploadedAt: true });
export type InsertClientDocument = z.infer<typeof insertClientDocumentSchema>;
export type ClientDocument = typeof clientDocuments.$inferSelect;

// ─── DWOLLA VERIFIED CUSTOMER DOCUMENTS ─────────────────────────────────
export const dwollaCustomerDocuments = pgTable("dwolla_customer_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  dwollaCustomerId: text("dwolla_customer_id").notNull(),
  dwollaDocumentId: text("dwolla_document_id"),
  dwollaDocumentUrl: text("dwolla_document_url"),
  documentType: text("document_type").notNull().default("identity_verification"),
  status: text("status").notNull().default("received"),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  sha256: text("sha256").notNull(),
  storageProvider: text("storage_provider").notNull().default("local_private"),
  storagePath: text("storage_path").notNull(),
  uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDwollaCustomerDocumentSchema = createInsertSchema(dwollaCustomerDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDwollaCustomerDocument = z.infer<typeof insertDwollaCustomerDocumentSchema>;
export type DwollaCustomerDocument = typeof dwollaCustomerDocuments.$inferSelect;

// ─── DWOLLA CUSTOMER WEBHOOK EVENTS ─────────────────────────────────────
export const dwollaCustomerEvents = pgTable("dwolla_customer_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().unique(),
  topic: text("topic").notNull(),
  internalTopic: text("internal_topic").notNull(),
  resourceUrl: text("resource_url"),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  dwollaCustomerId: text("dwolla_customer_id"),
  rawStatus: text("raw_status"),
  normalizedStatus: text("normalized_status"),
  occurredAt: timestamp("occurred_at").notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
  payloadSummary: jsonb("payload_summary").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
});

export const insertDwollaCustomerEventSchema = createInsertSchema(dwollaCustomerEvents).omit({ id: true, processedAt: true });
export type InsertDwollaCustomerEvent = z.infer<typeof insertDwollaCustomerEventSchema>;
export type DwollaCustomerEvent = typeof dwollaCustomerEvents.$inferSelect;

// ─── ONBOARDING STEPS ─────────────────────────────────────────────────────
export const onboardingSteps = pgTable("onboarding_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  step: text("step").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull().default("pending"),
  data: text("data"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOnboardingStepSchema = createInsertSchema(onboardingSteps).omit({ id: true, createdAt: true });
export type InsertOnboardingStep = z.infer<typeof insertOnboardingStepSchema>;
export type OnboardingStep = typeof onboardingSteps.$inferSelect;

// ─── PLAID BANK ACCOUNTS ─────────────────────────────────────────────────
export const bankAccounts = pgTable("bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  plaidItemId: text("plaid_item_id"),
  plaidAccountId: text("plaid_account_id"),
  plaidAccessToken: text("plaid_access_token"),
  dwollaCustomerUrl: text("dwolla_customer_url"),
  dwollaExchangeUrl: text("dwolla_exchange_url"),
  dwollaFundingSourceUrl: text("dwolla_funding_source_url"),
  institutionName: text("institution_name").notNull(),
  institutionId: text("institution_id"),
  accountName: text("account_name").notNull(),
  accountType: text("account_type").notNull(),
  accountSubtype: text("account_subtype"),
  mask: text("mask"),
  balanceCurrent: integer("balance_current"),
  balanceAvailable: integer("balance_available"),
  balanceLimit: integer("balance_limit"),
  status: text("status").notNull().default("active"),
  lastSynced: timestamp("last_synced"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true, createdAt: true });
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;

// ─── CRYPTO WALLETS ──────────────────────────────────────────────────────
export const cryptoWallets = pgTable("crypto_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }),
  walletAddress: text("wallet_address").notNull(),
  walletType: text("wallet_type").notNull().default("metamask"),
  chainId: integer("chain_id").default(1),
  label: text("label"),
  balanceEth: text("balance_eth"),
  balanceUsd: text("balance_usd"),
  lastSynced: timestamp("last_synced"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCryptoWalletSchema = createInsertSchema(cryptoWallets).omit({ id: true, createdAt: true });
export type InsertCryptoWallet = z.infer<typeof insertCryptoWalletSchema>;
export type CryptoWallet = typeof cryptoWallets.$inferSelect;

// ─── DUE DILIGENCE DOCUMENT ROOM ────────────────────────────────────────────
export const documentRoomItems = pgTable("document_room_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  documentType: text("document_type").notNull(),
  sourceFileName: text("source_file_name"),
  storageUrlOrPath: text("storage_url_or_path"),
  status: documentRoomStatusEnum("status").notNull().default("draft"),
  version: text("version").notNull().default("v0.1"),
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"),
  ownerUserId: varchar("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: varchar("related_entity_id"),
  confidentialityLevel: text("confidentiality_level").notNull().default("internal"),
  lenderVisible: boolean("lender_visible_boolean").notNull().default(false),
  attorneyReviewRequired: boolean("attorney_review_required").notNull().default(true),
  accountantReviewRequired: boolean("accountant_review_required").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const legalInstruments = pgTable("legal_instruments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instrumentType: legalInstrumentTypeEnum("instrument_type").notNull(),
  partiesJson: jsonb("parties_json").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  principalAmount: integer("principal_amount"),
  interestRate: text("interest_rate"),
  startDate: timestamp("start_date"),
  maturityDate: timestamp("maturity_date"),
  governingLaw: text("governing_law"),
  collateralSummary: text("collateral_summary"),
  status: text("status").notNull().default("draft"),
  documentRoomItemId: varchar("document_room_item_id").references(() => documentRoomItems.id, { onDelete: "set null" }),
  attorneyReviewRequired: boolean("attorney_review_required").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const collateralAssets = pgTable("collateral_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetType: collateralAssetTypeEnum("asset_type").notNull(),
  assetName: text("asset_name").notNull(),
  ownerEntity: text("owner_entity"),
  assignedToEntity: text("assigned_to_entity"),
  securedParty: text("secured_party"),
  estimatedValue: integer("estimated_value"),
  valuationMethod: text("valuation_method"),
  valuationStatus: collateralValuationStatusEnum("valuation_status").notNull().default("not_assessed"),
  supportingDocumentId: varchar("supporting_document_id").references(() => documentRoomItems.id, { onDelete: "set null" }),
  notes: text("notes"),
  lenderVisible: boolean("lender_visible_boolean").notNull().default(false),
  attorneyReviewRequired: boolean("attorney_review_required").notNull().default(true),
  accountantReviewRequired: boolean("accountant_review_required").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const receivableReadinessRecords = pgTable("receivable_readiness_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => clients.id, { onDelete: "set null" }),
  agreementId: varchar("agreement_id").references(() => documentRoomItems.id, { onDelete: "set null" }),
  invoiceId: varchar("invoice_id"),
  serviceStatus: text("service_status").notNull().default("not_started"),
  serviceCompletionEvidenceId: varchar("service_completion_evidence_id").references(() => documentRoomItems.id, { onDelete: "set null" }),
  paymentDueDate: timestamp("payment_due_date"),
  amountDue: integer("amount_due"),
  status: receivableReadinessStatusEnum("status").notNull().default("prospective"),
  lenderEligible: boolean("lender_eligible_boolean").notNull().default(false),
  ineligibilityReason: text("ineligibility_reason"),
  manualReviewCompleted: boolean("manual_review_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const facilityReadinessChecklist = pgTable("facility_readiness_checklist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checklistItem: text("checklist_item").notNull(),
  category: text("category").notNull(),
  status: facilityChecklistStatusEnum("status").notNull().default("missing"),
  responsibleParty: text("responsible_party"),
  documentRoomItemId: varchar("document_room_item_id").references(() => documentRoomItems.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const equityBonusRecords = pgTable("equity_bonus_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => clients.id, { onDelete: "set null" }),
  customerName: text("customer_name"),
  eligibilityStatus: equityBonusStatusEnum("eligibility_status").notNull().default("not_offered"),
  agreementStatus: text("agreement_status").notNull().default("not_started"),
  attorneyReviewStatus: text("attorney_review_status").notNull().default("required"),
  boardApprovalStatus: text("board_approval_status").notNull().default("required"),
  sharesProposed: integer("shares_proposed"),
  sharesApproved: integer("shares_approved"),
  issuanceDate: timestamp("issuance_date"),
  certificateStatus: text("certificate_status").notNull().default("not_issued"),
  stockLedgerReference: text("stock_ledger_reference"),
  capTableReference: text("cap_table_reference"),
  disclosureAccepted: boolean("disclosure_accepted").notNull().default(false),
  taxReviewStatus: text("tax_review_status").notNull().default("required"),
  transferRestrictionStatus: text("transfer_restriction_status").notNull().default("required"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  beforeValue: jsonb("before_value").$type<Record<string, unknown> | null>(),
  afterValue: jsonb("after_value").$type<Record<string, unknown> | null>(),
  relatedDocumentId: varchar("related_document_id").references(() => documentRoomItems.id, { onDelete: "set null" }),
  reason: text("reason"),
  highRisk: boolean("high_risk").notNull().default(false),
  confirmationText: text("confirmation_text"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentRoomItemSchema = createInsertSchema(documentRoomItems).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocumentRoomItem = z.infer<typeof insertDocumentRoomItemSchema>;
export type DocumentRoomItem = typeof documentRoomItems.$inferSelect;

export const insertLegalInstrumentSchema = createInsertSchema(legalInstruments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLegalInstrument = z.infer<typeof insertLegalInstrumentSchema>;
export type LegalInstrument = typeof legalInstruments.$inferSelect;

export const insertCollateralAssetSchema = createInsertSchema(collateralAssets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCollateralAsset = z.infer<typeof insertCollateralAssetSchema>;
export type CollateralAsset = typeof collateralAssets.$inferSelect;

export const insertReceivableReadinessRecordSchema = createInsertSchema(receivableReadinessRecords).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReceivableReadinessRecord = z.infer<typeof insertReceivableReadinessRecordSchema>;
export type ReceivableReadinessRecord = typeof receivableReadinessRecords.$inferSelect;

export const insertFacilityReadinessChecklistSchema = createInsertSchema(facilityReadinessChecklist).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFacilityReadinessChecklist = z.infer<typeof insertFacilityReadinessChecklistSchema>;
export type FacilityReadinessChecklist = typeof facilityReadinessChecklist.$inferSelect;

export const insertEquityBonusRecordSchema = createInsertSchema(equityBonusRecords).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEquityBonusRecord = z.infer<typeof insertEquityBonusRecordSchema>;
export type EquityBonusRecord = typeof equityBonusRecords.$inferSelect;

export const insertAuditEventSchema = createInsertSchema(auditEvents).omit({ id: true, createdAt: true });
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEvents.$inferSelect;

// ─── LOAN APPLICATIONS ──────────────────────────────────────────────────
export const loanApplications = pgTable("loan_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  loanType: text("loan_type").notNull(),
  amount: integer("amount").notNull(),
  termMonths: integer("term_months"),
  interestRate: text("interest_rate"),
  lender: text("lender"),
  status: text("status").notNull().default("draft"),
  prequalified: boolean("prequalified").default(false),
  aiRecommendation: text("ai_recommendation"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoanApplicationSchema = createInsertSchema(loanApplications).omit({ id: true, createdAt: true });
export type InsertLoanApplication = z.infer<typeof insertLoanApplicationSchema>;
export type LoanApplication = typeof loanApplications.$inferSelect;

// ─── UI CUSTOMIZATION ────────────────────────────────────────────────────
export const uiCustomization = pgTable("ui_customization", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── API CONFIGS ──────────────────────────────────────────────────────────
export const apiConfigs = pgTable("api_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── INSTITUTIONAL EXCHANGE NETWORK ───────────────────────────────────────
export const financialNetworks = pgTable("financial_networks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  status: text("status").notNull().default("inactive"),
  environment: text("environment").notNull().default("sandbox"),
  requiresEnrollment: boolean("requires_enrollment").notNull().default(true),
  supportsDocuments: boolean("supports_documents").notNull().default(false),
  supportsSettlement: boolean("supports_settlement").notNull().default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const institutionRegistry = pgTable("institution_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  institutionType: text("institution_type").notNull().default("financial_institution"),
  status: text("status").notNull().default("active"),
  jurisdiction: text("jurisdiction"),
  website: text("website"),
  contactEmail: text("contact_email"),
  riskRating: text("risk_rating").notNull().default("standard"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const institutionCredentials = pgTable("institution_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionId: varchar("institution_id").notNull().references(() => institutionRegistry.id, { onDelete: "cascade" }),
  networkId: varchar("network_id").references(() => financialNetworks.id, { onDelete: "set null" }),
  credentialType: text("credential_type").notNull(),
  keyName: text("key_name").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  environment: text("environment").notNull().default("sandbox"),
  status: text("status").notNull().default("active"),
  lastRotatedAt: timestamp("last_rotated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentRails = pgTable("payment_rails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  settlementTiming: text("settlement_timing").notNull().default("configured_by_network"),
  status: text("status").notNull().default("inactive"),
  requiresEnrollment: boolean("requires_enrollment").notNull().default(true),
  supportsRefunds: boolean("supports_refunds").notNull().default(false),
  supportsCancellation: boolean("supports_cancellation").notNull().default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const instrumentTypes = pgTable("instrument_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  requiresCollateral: boolean("requires_collateral").notNull().default(false),
  requiresDocuments: boolean("requires_documents").notNull().default(true),
  complianceProfile: text("compliance_profile").notNull().default("standard_review"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const institutionCapabilities = pgTable("institution_capabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionId: varchar("institution_id").notNull().references(() => institutionRegistry.id, { onDelete: "cascade" }),
  networkId: varchar("network_id").references(() => financialNetworks.id, { onDelete: "set null" }),
  paymentRailId: varchar("payment_rail_id").references(() => paymentRails.id, { onDelete: "set null" }),
  instrumentTypeId: varchar("instrument_type_id").references(() => instrumentTypes.id, { onDelete: "set null" }),
  capabilityType: text("capability_type").notNull(),
  capabilityCode: text("capability_code").notNull(),
  status: text("status").notNull().default("inactive"),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  config: jsonb("config").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const instruments = pgTable("instruments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instrumentTypeId: varchar("instrument_type_id").notNull().references(() => instrumentTypes.id, { onDelete: "restrict" }),
  ownerClientId: varchar("owner_client_id").references(() => clients.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  referenceNumber: text("reference_number"),
  amount: integer("amount"),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("draft"),
  jurisdiction: text("jurisdiction"),
  maturityDate: timestamp("maturity_date"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const instrumentDocuments = pgTable("instrument_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instrumentId: varchar("instrument_id").notNull().references(() => instruments.id, { onDelete: "cascade" }),
  documentRoomItemId: varchar("document_room_item_id").references(() => documentRoomItems.id, { onDelete: "set null" }),
  clientDocumentId: varchar("client_document_id").references(() => clientDocuments.id, { onDelete: "set null" }),
  documentType: text("document_type").notNull(),
  storageUri: text("storage_uri"),
  sha256: text("sha256"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const instrumentCollateral = pgTable("instrument_collateral", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instrumentId: varchar("instrument_id").notNull().references(() => instruments.id, { onDelete: "cascade" }),
  collateralAssetId: varchar("collateral_asset_id").references(() => collateralAssets.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  estimatedValue: integer("estimated_value"),
  lienPosition: text("lien_position"),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const instrumentParties = pgTable("instrument_parties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instrumentId: varchar("instrument_id").notNull().references(() => instruments.id, { onDelete: "cascade" }),
  partyType: text("party_type").notNull(),
  partyName: text("party_name").notNull(),
  partyEmail: text("party_email"),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  institutionId: varchar("institution_id").references(() => institutionRegistry.id, { onDelete: "set null" }),
  role: text("role").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const instrumentAssignments = pgTable("instrument_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instrumentId: varchar("instrument_id").notNull().references(() => instruments.id, { onDelete: "cascade" }),
  assignorPartyId: varchar("assignor_party_id").references(() => instrumentParties.id, { onDelete: "set null" }),
  assigneePartyId: varchar("assignee_party_id").references(() => instrumentParties.id, { onDelete: "set null" }),
  assignmentType: text("assignment_type").notNull(),
  status: text("status").notNull().default("draft"),
  effectiveAt: timestamp("effective_at"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exchangeRequests = pgTable("exchange_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestType: text("request_type").notNull(),
  instrumentId: varchar("instrument_id").references(() => instruments.id, { onDelete: "set null" }),
  institutionId: varchar("institution_id").references(() => institutionRegistry.id, { onDelete: "set null" }),
  networkId: varchar("network_id").references(() => financialNetworks.id, { onDelete: "set null" }),
  paymentRailId: varchar("payment_rail_id").references(() => paymentRails.id, { onDelete: "set null" }),
  amount: integer("amount"),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("approved"),
  priority: integer("priority").notNull().default(100),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  requestedByUserId: varchar("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
  approvalReference: text("approval_reference"),
  complianceStatus: text("compliance_status").notNull().default("pending"),
  validationErrors: jsonb("validation_errors").$type<string[]>().default(sql`'[]'::jsonb`),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const exchangeRoutes = pgTable("exchange_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exchangeRequestId: varchar("exchange_request_id").notNull().references(() => exchangeRequests.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull().default(1),
  connectorCode: text("connector_code").notNull(),
  networkId: varchar("network_id").references(() => financialNetworks.id, { onDelete: "set null" }),
  institutionId: varchar("institution_id").references(() => institutionRegistry.id, { onDelete: "set null" }),
  paymentRailId: varchar("payment_rail_id").references(() => paymentRails.id, { onDelete: "set null" }),
  decisionStatus: text("decision_status").notNull().default("selected"),
  decisionReason: text("decision_reason").notNull(),
  score: integer("score").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exchangeAttempts = pgTable("exchange_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exchangeRequestId: varchar("exchange_request_id").notNull().references(() => exchangeRequests.id, { onDelete: "cascade" }),
  exchangeRouteId: varchar("exchange_route_id").references(() => exchangeRoutes.id, { onDelete: "set null" }),
  attemptNumber: integer("attempt_number").notNull().default(1),
  status: text("status").notNull().default("queued"),
  connectorCode: text("connector_code").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestPayloadHash: text("request_payload_hash"),
  responseSummary: jsonb("response_summary").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const exchangeResults = pgTable("exchange_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exchangeRequestId: varchar("exchange_request_id").notNull().references(() => exchangeRequests.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  externalReferenceId: text("external_reference_id"),
  resultCode: text("result_code"),
  resultSummary: text("result_summary"),
  settledAmount: integer("settled_amount"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settlementEvents = pgTable("settlement_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exchangeRequestId: varchar("exchange_request_id").references(() => exchangeRequests.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  status: text("status").notNull(),
  amount: integer("amount"),
  currency: text("currency").notNull().default("USD"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  externalReferenceId: text("external_reference_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routingRules = pgTable("routing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  priority: integer("priority").notNull().default(100),
  enabled: boolean("enabled").notNull().default(true),
  conditions: jsonb("conditions").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  actions: jsonb("actions").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const connectorHealth = pgTable("connector_health", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectorCode: text("connector_code").notNull().unique(),
  networkId: varchar("network_id").references(() => financialNetworks.id, { onDelete: "set null" }),
  institutionId: varchar("institution_id").references(() => institutionRegistry.id, { onDelete: "set null" }),
  status: text("status").notNull().default("not_configured"),
  configured: boolean("configured").notNull().default(false),
  lastCheckedAt: timestamp("last_checked_at"),
  latencyMs: integer("latency_ms"),
  message: text("message"),
  capabilities: jsonb("capabilities").$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFinancialNetworkSchema = createInsertSchema(financialNetworks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinancialNetwork = z.infer<typeof insertFinancialNetworkSchema>;
export type FinancialNetwork = typeof financialNetworks.$inferSelect;

export const insertInstitutionRegistrySchema = createInsertSchema(institutionRegistry).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInstitutionRegistry = z.infer<typeof insertInstitutionRegistrySchema>;
export type InstitutionRegistry = typeof institutionRegistry.$inferSelect;

export const insertInstitutionCredentialSchema = createInsertSchema(institutionCredentials).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInstitutionCredential = z.infer<typeof insertInstitutionCredentialSchema>;
export type InstitutionCredential = typeof institutionCredentials.$inferSelect;

export const insertInstitutionCapabilitySchema = createInsertSchema(institutionCapabilities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInstitutionCapability = z.infer<typeof insertInstitutionCapabilitySchema>;
export type InstitutionCapability = typeof institutionCapabilities.$inferSelect;

export const insertPaymentRailSchema = createInsertSchema(paymentRails).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentRail = z.infer<typeof insertPaymentRailSchema>;
export type PaymentRail = typeof paymentRails.$inferSelect;

export const insertInstrumentTypeSchema = createInsertSchema(instrumentTypes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInstrumentType = z.infer<typeof insertInstrumentTypeSchema>;
export type InstrumentType = typeof instrumentTypes.$inferSelect;

export const insertInstrumentSchema = createInsertSchema(instruments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInstrument = z.infer<typeof insertInstrumentSchema>;
export type Instrument = typeof instruments.$inferSelect;

export const insertExchangeRequestSchema = createInsertSchema(exchangeRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExchangeRequest = z.infer<typeof insertExchangeRequestSchema>;
export type ExchangeRequest = typeof exchangeRequests.$inferSelect;

export const insertRoutingRuleSchema = createInsertSchema(routingRules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRoutingRule = z.infer<typeof insertRoutingRuleSchema>;
export type RoutingRule = typeof routingRules.$inferSelect;
