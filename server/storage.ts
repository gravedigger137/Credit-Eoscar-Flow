import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  users, clients, disputes, creditReports, tradelines,
  creditLines, transactions, notifications, apiConfigs,
  cardholderPartners, metro2Submissions, clientDocuments,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Dispute, type InsertDispute,
  type CreditReport, type InsertCreditReport,
  type Tradeline, type InsertTradeline,
  type CreditLine, type InsertCreditLine,
  type Transaction, type InsertTransaction,
  type Notification, type InsertNotification,
  type CardholderPartner, type InsertCardholderPartner,
  type Metro2Submission, type InsertMetro2Submission,
  type ClientDocument, type InsertClientDocument,
} from "@shared/schema";
import { decryptIfEncrypted, encryptIfSensitive } from "./secret-store";

function decryptClient<T extends { ssn?: string | null }>(client: T): T {
  if (!client?.ssn) return client;
  return { ...client, ssn: decryptIfEncrypted(client.ssn) || null };
}

function encryptClientInput<T extends { ssn?: string | null }>(client: T): T {
  if (!client?.ssn) return client;
  return { ...client, ssn: encryptIfSensitive("client_ssn", client.ssn) };
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Disputes
  getDisputes(): Promise<Dispute[]>;
  getDisputesByClient(clientId: string): Promise<Dispute[]>;
  getDispute(id: string): Promise<Dispute | undefined>;
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  updateDispute(id: string, data: Partial<InsertDispute>): Promise<Dispute>;
  deleteDispute(id: string): Promise<void>;

  // Credit Reports
  getCreditReports(): Promise<CreditReport[]>;
  getCreditReportsByClient(clientId: string): Promise<CreditReport[]>;
  getReportsByClient(clientId: string): Promise<CreditReport[]>;
  createCreditReport(report: InsertCreditReport): Promise<CreditReport>;
  createReport(report: InsertCreditReport): Promise<CreditReport>;
  updateCreditReport(id: string, data: Partial<InsertCreditReport>): Promise<CreditReport>;

  // Tradelines
  getTradelines(): Promise<Tradeline[]>;
  getTradelinesByClient(clientId: string): Promise<Tradeline[]>;
  createTradeline(tradeline: InsertTradeline): Promise<Tradeline>;
  updateTradeline(id: string, data: Partial<InsertTradeline>): Promise<Tradeline>;
  deleteTradeline(id: string): Promise<void>;

  // Credit Lines
  getCreditLines(): Promise<CreditLine[]>;
  getCreditLinesByClient(clientId: string): Promise<CreditLine[]>;
  createCreditLine(line: InsertCreditLine): Promise<CreditLine>;
  updateCreditLine(id: string, data: Partial<InsertCreditLine>): Promise<CreditLine>;
  deleteCreditLine(id: string): Promise<void>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransactionsByClient(clientId: string): Promise<Transaction[]>;
  createTransaction(txn: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, data: Partial<InsertTransaction>): Promise<Transaction>;

  // Notifications
  getNotifications(): Promise<Notification[]>;
  getUnreadCount(): Promise<number>;
  createNotification(n: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;

  // Cardholder Partners
  getCardholderPartners(): Promise<CardholderPartner[]>;
  getCardholderPartner(id: string): Promise<CardholderPartner | undefined>;
  createCardholderPartner(p: InsertCardholderPartner): Promise<CardholderPartner>;
  updateCardholderPartner(id: string, data: Partial<InsertCardholderPartner>): Promise<CardholderPartner>;
  deleteCardholderPartner(id: string): Promise<void>;

  // Metro 2 Submissions
  getMetro2Submissions(): Promise<Metro2Submission[]>;
  getMetro2SubmissionsByClient(clientId: string): Promise<Metro2Submission[]>;
  createMetro2Submission(s: InsertMetro2Submission): Promise<Metro2Submission>;
  updateMetro2Submission(id: string, data: Partial<InsertMetro2Submission>): Promise<Metro2Submission>;

  // Client Documents
  getDocumentsByClient(clientId: string): Promise<ClientDocument[]>;
  getDocument(id: string): Promise<ClientDocument | undefined>;
  createDocument(doc: InsertClientDocument): Promise<ClientDocument>;
  deleteDocument(id: string): Promise<void>;

  // API Config
  getApiConfig(key: string): Promise<string | undefined>;
  setApiConfig(key: string, value: string): Promise<void>;

  // Dashboard stats
  getDashboardStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string) {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }
  async getUsers() {
    return db.select().from(users);
  }
  async getUserByUsername(username: string) {
    const [u] = await db.select().from(users).where(eq(users.username, username));
    return u;
  }
  async createUser(user: InsertUser) {
    const [u] = await db.insert(users).values(user).returning();
    return u;
  }

  // Clients
  async getClients() {
    const rows = await db.select().from(clients).orderBy(desc(clients.createdAt));
    return rows.map(decryptClient);
  }
  async getClient(id: string) {
    const [c] = await db.select().from(clients).where(eq(clients.id, id));
    return c ? decryptClient(c) : c;
  }
  async createClient(client: InsertClient) {
    const [c] = await db.insert(clients).values(encryptClientInput(client)).returning();
    return decryptClient(c);
  }
  async updateClient(id: string, data: Partial<InsertClient>) {
    const [c] = await db.update(clients).set(encryptClientInput(data)).where(eq(clients.id, id)).returning();
    return decryptClient(c);
  }
  async deleteClient(id: string) {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Disputes
  async getDisputes() {
    return db.select().from(disputes).orderBy(desc(disputes.createdAt));
  }
  async getDisputesByClient(clientId: string) {
    return db.select().from(disputes).where(eq(disputes.clientId, clientId)).orderBy(desc(disputes.createdAt));
  }
  async getDispute(id: string) {
    const [d] = await db.select().from(disputes).where(eq(disputes.id, id));
    return d;
  }
  async createDispute(dispute: InsertDispute) {
    const [d] = await db.insert(disputes).values(dispute).returning();
    return d;
  }
  async updateDispute(id: string, data: Partial<InsertDispute>) {
    const [d] = await db.update(disputes).set(data).where(eq(disputes.id, id)).returning();
    return d;
  }
  async deleteDispute(id: string) {
    await db.delete(disputes).where(eq(disputes.id, id));
  }

  // Credit Reports
  async getCreditReports() {
    return db.select().from(creditReports).orderBy(desc(creditReports.pullDate));
  }
  async getCreditReportsByClient(clientId: string) {
    return db.select().from(creditReports).where(eq(creditReports.clientId, clientId)).orderBy(desc(creditReports.pullDate));
  }
  async getReportsByClient(clientId: string) {
    return this.getCreditReportsByClient(clientId);
  }
  async createCreditReport(report: InsertCreditReport) {
    const [r] = await db.insert(creditReports).values(report).returning();
    return r;
  }
  async createReport(report: InsertCreditReport) {
    return this.createCreditReport(report);
  }
  async updateCreditReport(id: string, data: Partial<InsertCreditReport>) {
    const [r] = await db.update(creditReports).set(data).where(eq(creditReports.id, id)).returning();
    return r;
  }

  // Tradelines
  async getTradelines() {
    return db.select().from(tradelines).orderBy(desc(tradelines.createdAt));
  }
  async getTradelinesByClient(clientId: string) {
    return db.select().from(tradelines).where(eq(tradelines.clientId, clientId));
  }
  async createTradeline(t: InsertTradeline) {
    const [tl] = await db.insert(tradelines).values(t).returning();
    return tl;
  }
  async updateTradeline(id: string, data: Partial<InsertTradeline>) {
    const [tl] = await db.update(tradelines).set(data).where(eq(tradelines.id, id)).returning();
    return tl;
  }
  async deleteTradeline(id: string) {
    await db.delete(tradelines).where(eq(tradelines.id, id));
  }

  // Credit Lines
  async getCreditLines() {
    return db.select().from(creditLines).orderBy(desc(creditLines.createdAt));
  }
  async getCreditLinesByClient(clientId: string) {
    return db.select().from(creditLines).where(eq(creditLines.clientId, clientId));
  }
  async createCreditLine(line: InsertCreditLine) {
    const [cl] = await db.insert(creditLines).values(line).returning();
    return cl;
  }
  async updateCreditLine(id: string, data: Partial<InsertCreditLine>) {
    const [cl] = await db.update(creditLines).set(data).where(eq(creditLines.id, id)).returning();
    return cl;
  }
  async deleteCreditLine(id: string) {
    await db.delete(creditLines).where(eq(creditLines.id, id));
  }

  // Transactions
  async getTransactions() {
    return db.select().from(transactions).orderBy(desc(transactions.createdAt));
  }
  async getTransactionsByClient(clientId: string) {
    return db.select().from(transactions).where(eq(transactions.clientId, clientId)).orderBy(desc(transactions.createdAt));
  }
  async createTransaction(txn: InsertTransaction) {
    const [t] = await db.insert(transactions).values(txn).returning();
    return t;
  }
  async updateTransaction(id: string, data: Partial<InsertTransaction>) {
    const [t] = await db.update(transactions).set(data).where(eq(transactions.id, id)).returning();
    return t;
  }

  // Notifications
  async getNotifications() {
    return db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }
  async getUnreadCount() {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(eq(notifications.read, false));
    return Number(r.count);
  }
  async createNotification(n: InsertNotification) {
    const [notif] = await db.insert(notifications).values(n).returning();
    return notif;
  }
  async markNotificationRead(id: string) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }
  async markAllNotificationsRead() {
    await db.update(notifications).set({ read: true });
  }

  // Cardholder Partners
  async getCardholderPartners() {
    return db.select().from(cardholderPartners).orderBy(desc(cardholderPartners.createdAt));
  }
  async getCardholderPartner(id: string) {
    const [p] = await db.select().from(cardholderPartners).where(eq(cardholderPartners.id, id));
    return p;
  }
  async createCardholderPartner(p: InsertCardholderPartner) {
    const [cp] = await db.insert(cardholderPartners).values(p).returning();
    return cp;
  }
  async updateCardholderPartner(id: string, data: Partial<InsertCardholderPartner>) {
    const [cp] = await db.update(cardholderPartners).set(data).where(eq(cardholderPartners.id, id)).returning();
    return cp;
  }
  async deleteCardholderPartner(id: string) {
    await db.delete(cardholderPartners).where(eq(cardholderPartners.id, id));
  }

  // Metro 2 Submissions
  async getMetro2Submissions() {
    return db.select().from(metro2Submissions).orderBy(desc(metro2Submissions.createdAt));
  }
  async getMetro2SubmissionsByClient(clientId: string) {
    return db.select().from(metro2Submissions).where(eq(metro2Submissions.clientId, clientId));
  }
  async createMetro2Submission(s: InsertMetro2Submission) {
    const [sub] = await db.insert(metro2Submissions).values(s).returning();
    return sub;
  }
  async updateMetro2Submission(id: string, data: Partial<InsertMetro2Submission>) {
    const [sub] = await db.update(metro2Submissions).set(data).where(eq(metro2Submissions.id, id)).returning();
    return sub;
  }

  // API Config
  async getApiConfig(key: string) {
    const [c] = await db.select().from(apiConfigs).where(eq(apiConfigs.key, key));
    return decryptIfEncrypted(c?.value);
  }
  async setApiConfig(key: string, value: string) {
    const storedValue = encryptIfSensitive(key, value);
    await db.insert(apiConfigs).values({ key, value: storedValue }).onConflictDoUpdate({ target: apiConfigs.key, set: { value: storedValue, updatedAt: new Date() } });
  }

  // Client Documents
  async getDocumentsByClient(clientId: string) {
    return db.select().from(clientDocuments).where(eq(clientDocuments.clientId, clientId)).orderBy(desc(clientDocuments.uploadedAt));
  }
  async getDocument(id: string) {
    const [d] = await db.select().from(clientDocuments).where(eq(clientDocuments.id, id));
    return d;
  }
  async createDocument(doc: InsertClientDocument) {
    const [d] = await db.insert(clientDocuments).values(doc).returning();
    return d;
  }
  async deleteDocument(id: string) {
    await db.delete(clientDocuments).where(eq(clientDocuments.id, id));
  }

  // Dashboard stats
  async getDashboardStats() {
    const [activeClients] = await db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.status, "active"));
    const [pendingDisputes] = await db.select({ count: sql<number>`count(*)` }).from(disputes).where(eq(disputes.status, "sent"));
    const [deletedItems] = await db.select({ count: sql<number>`count(*)` }).from(disputes).where(eq(disputes.status, "deleted"));
    const [activeTradelines] = await db.select({ count: sql<number>`count(*)` }).from(tradelines).where(eq(tradelines.status, "active"));
    const [activeCreditLines] = await db.select({ count: sql<number>`count(*)` }).from(creditLines).where(eq(creditLines.status, "active"));
    const [unreadNotifications] = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(eq(notifications.read, false));
    const [revenue] = await db.select({ total: sql<number>`coalesce(sum(amount),0)` }).from(transactions).where(eq(transactions.status, "completed"));

    return {
      activeClients: Number(activeClients.count),
      pendingDisputes: Number(pendingDisputes.count),
      deletedItems: Number(deletedItems.count),
      activeTradelines: Number(activeTradelines.count),
      activeCreditLines: Number(activeCreditLines.count),
      unreadNotifications: Number(unreadNotifications.count),
      totalRevenue: Number(revenue.total),
    };
  }
}

export const storage = new DatabaseStorage();
