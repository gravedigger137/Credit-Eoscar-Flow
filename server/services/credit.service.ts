import {
  insertClientSchema,
  insertCreditLineSchema,
  insertCreditReportSchema,
  insertDisputeSchema,
  insertTradelineSchema,
  type InsertClient,
  type InsertCreditLine,
  type InsertCreditReport,
  type InsertDispute,
  type InsertTradeline,
} from "@shared/schema";
import { creditRepository, type CreditRepository } from "../repositories/credit.repo";
import { generateFCRADisputeLetter, type DisputeType } from "../dispute-letters";

export class CreditService {
  constructor(private readonly repo: CreditRepository = creditRepository) {}

  getDashboardStats() {
    return this.repo.getDashboardStats();
  }

  listClients() {
    return this.repo.listClients();
  }

  getClient(id: string) {
    return this.repo.getClient(id);
  }

  createClient(data: unknown) {
    return this.repo.createClient(insertClientSchema.parse(data));
  }

  updateClient(id: string, data: Partial<InsertClient>) {
    return this.repo.updateClient(id, data);
  }

  deleteClient(id: string) {
    return this.repo.deleteClient(id);
  }

  listDisputes(clientId?: string) {
    return clientId ? this.repo.listDisputesByClient(clientId) : this.repo.listDisputes();
  }

  createDispute(data: unknown) {
    return this.repo.createDispute(insertDisputeSchema.parse(data));
  }

  updateDispute(id: string, data: Partial<InsertDispute>) {
    return this.repo.updateDispute(id, data);
  }

  deleteDispute(id: string) {
    return this.repo.deleteDispute(id);
  }

  listReports(clientId?: string) {
    return clientId ? this.repo.listReportsByClient(clientId) : this.repo.listReports();
  }

  createReport(data: unknown) {
    return this.repo.createReport(insertCreditReportSchema.parse(data));
  }

  updateReport(id: string, data: Partial<InsertCreditReport>) {
    return this.repo.updateReport(id, data);
  }

  listTradelines(clientId?: string) {
    return clientId ? this.repo.listTradelinesByClient(clientId) : this.repo.listTradelines();
  }

  createTradeline(data: unknown) {
    return this.repo.createTradeline(insertTradelineSchema.parse(data));
  }

  updateTradeline(id: string, data: Partial<InsertTradeline>) {
    return this.repo.updateTradeline(id, data);
  }

  deleteTradeline(id: string) {
    return this.repo.deleteTradeline(id);
  }

  listCreditLines(clientId?: string) {
    return clientId ? this.repo.listCreditLinesByClient(clientId) : this.repo.listCreditLines();
  }

  createCreditLine(data: unknown) {
    return this.repo.createCreditLine(insertCreditLineSchema.parse(data));
  }

  updateCreditLine(id: string, data: Partial<InsertCreditLine>) {
    return this.repo.updateCreditLine(id, data);
  }

  deleteCreditLine(id: string) {
    return this.repo.deleteCreditLine(id);
  }

  async generateDisputeLetter(disputeId: string, disputeType: DisputeType = "general") {
    const dispute = await this.repo.getDispute(disputeId);
    if (!dispute) return null;

    const client = await this.repo.getClient(dispute.clientId);
    if (!client) return null;

    const letter = generateFCRADisputeLetter({
      clientName: `${client.firstName}${client.middleName ? " " + client.middleName : ""} ${client.lastName}${client.suffix ? " " + client.suffix : ""}`,
      clientAddress: [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || undefined,
      clientSSNLast4: client.ssn ? client.ssn.slice(-4) : undefined,
      clientDOB: client.dob || undefined,
      bureau: dispute.bureau,
      accountName: dispute.accountName,
      accountNumber: dispute.accountNumber || undefined,
      reason: dispute.reason,
      disputeType,
    });

    await this.repo.updateDispute(disputeId, { letterContent: letter, disputeType });
    return { letter, disputeId };
  }
}

export const creditService = new CreditService();
