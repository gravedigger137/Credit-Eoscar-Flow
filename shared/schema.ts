import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── ENUMS ───────────────────────────────────────────────────────────────────
export const clientStatusEnum = pgEnum("client_status", ["onboarding", "active", "paused", "completed"]);
export const disputeStatusEnum = pgEnum("dispute_status", ["preparing", "sent", "validated", "deleted", "rejected", "closed"]);
export const bureauEnum = pgEnum("bureau", ["equifax", "experian", "transunion"]);
export const tradelineStatusEnum = pgEnum("tradeline_status", ["pending", "active", "removed", "expired"]);
export const creditLineStatusEnum = pgEnum("credit_line_status", ["applied", "reviewing", "approved", "active", "rejected", "closed"]);
export const notificationTypeEnum = pgEnum("notification_type", ["dispute", "billing", "client", "compliance", "success", "warning"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed", "refunded"]);

// ─── USERS (STAFF) ───────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("staff"),
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
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  previousAddress: text("previous_address"),
  idType: text("id_type"),
  idNumber: text("id_number"),
  status: clientStatusEnum("status").notNull().default("onboarding"),
  onboardingProgress: integer("onboarding_progress").notNull().default(0),
  equifaxScore: integer("equifax_score"),
  experianScore: integer("experian_score"),
  transunionScore: integer("transunion_score"),
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

// ─── API CONFIGS ──────────────────────────────────────────────────────────
export const apiConfigs = pgTable("api_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
