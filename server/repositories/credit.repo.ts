import { storage } from "../storage";
import type {
  InsertClient,
  InsertCreditLine,
  InsertCreditReport,
  InsertDispute,
  InsertTradeline,
} from "@shared/schema";

export class CreditRepository {
  getDashboardStats() {
    return storage.getDashboardStats();
  }

  listClients() {
    return storage.getClients();
  }

  getClient(id: string) {
    return storage.getClient(id);
  }

  createClient(data: InsertClient) {
    return storage.createClient(data);
  }

  updateClient(id: string, data: Partial<InsertClient>) {
    return storage.updateClient(id, data);
  }

  deleteClient(id: string) {
    return storage.deleteClient(id);
  }

  listDisputes() {
    return storage.getDisputes();
  }

  listDisputesByClient(clientId: string) {
    return storage.getDisputesByClient(clientId);
  }

  getDispute(id: string) {
    return storage.getDispute(id);
  }

  createDispute(data: InsertDispute) {
    return storage.createDispute(data);
  }

  updateDispute(id: string, data: Partial<InsertDispute>) {
    return storage.updateDispute(id, data);
  }

  deleteDispute(id: string) {
    return storage.deleteDispute(id);
  }

  listReports() {
    return storage.getCreditReports();
  }

  listReportsByClient(clientId: string) {
    return storage.getCreditReportsByClient(clientId);
  }

  createReport(data: InsertCreditReport) {
    return storage.createCreditReport(data);
  }

  updateReport(id: string, data: Partial<InsertCreditReport>) {
    return storage.updateCreditReport(id, data);
  }

  listTradelines() {
    return storage.getTradelines();
  }

  listTradelinesByClient(clientId: string) {
    return storage.getTradelinesByClient(clientId);
  }

  createTradeline(data: InsertTradeline) {
    return storage.createTradeline(data);
  }

  updateTradeline(id: string, data: Partial<InsertTradeline>) {
    return storage.updateTradeline(id, data);
  }

  deleteTradeline(id: string) {
    return storage.deleteTradeline(id);
  }

  listCreditLines() {
    return storage.getCreditLines();
  }

  listCreditLinesByClient(clientId: string) {
    return storage.getCreditLinesByClient(clientId);
  }

  createCreditLine(data: InsertCreditLine) {
    return storage.createCreditLine(data);
  }

  updateCreditLine(id: string, data: Partial<InsertCreditLine>) {
    return storage.updateCreditLine(id, data);
  }

  deleteCreditLine(id: string) {
    return storage.deleteCreditLine(id);
  }
}

export const creditRepository = new CreditRepository();
