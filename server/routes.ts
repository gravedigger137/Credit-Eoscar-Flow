import type { Router, Request, Response } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { storage } from "./storage";
import {
  insertClientSchema, insertDisputeSchema, insertCreditReportSchema,
  insertTradelineSchema, insertCreditLineSchema, insertTransactionSchema,
  insertNotificationSchema, insertCardholderPartnerSchema, insertMetro2SubmissionSchema,
  insertDocumentRoomItemSchema, insertLegalInstrumentSchema, insertCollateralAssetSchema,
  insertReceivableReadinessRecordSchema, insertFacilityReadinessChecklistSchema, insertEquityBonusRecordSchema,
} from "@shared/schema";
import {
  buildMetro2File, ACCOUNT_TYPES, ACCOUNT_STATUSES, ECOA_CODES, SPECIAL_COMMENT_CODES,
  validateMetro2BaseRecord, parseMetro2File, convertCsvToJson, convertJsonToMetro2,
  detectFormat, jsonToMetro2Record, metro2RecordToJson,
  type Metro2JsonRecord,
} from "./metro2";
import { generateDisputeLetter, analyzeClientCredit, chatWithAI, validateMetro2Record, analyzeReportForDisputes } from "./ai";
import { parseCreditReportPDF, parseCreditReportText } from "./credit-report-parser";
import { pullAllBureauReports, getBureauClient } from "./bureau-clients";
import { simulateScoreChanges, generateRecommendations, type ScoreFactors, type SimulationAction } from "./score-simulator";
import { analyzeCreditFactors, predictDefault, type CreditFactorInput, type DefaultPredictionInput } from "./credit-predictor";
import {
  getSalesReport, getClientFinancialSummary, getRevenueForecasting,
  createCreditSale, getCreditSales, recordCreditSalePayment,
  saveCreditFactorSnapshot, getCreditFactorHistory, ensureCreditSalesTable
} from "./financial-reports";
import {
  detectScoreChanges, createAlertsAsNotifications, getClientScoreHistory,
  getMonitoringConfig, setMonitoringConfig, parseXMLCreditReport
} from "./credit-monitor";
import {
  calculateLoanPayment, calculateDebtPayoff, calculateCreditRepairROI,
  calculateCompoundInterest, calculateDebtToIncomeRatio
} from "./financial-calculator";
import {
  ensureLedgerTables, recordTrustDeposit, recordTrustWithdrawal, recordLedgerEntry,
  getClientTrustAccount, getAllTrustAccounts, getLedgerEntries, getAccountSummary,
  reconcileTrustAccounts, getTrustBalance
} from "./trust-accounting";
import {
  recordUsageEvent, getUsageSummary, getUsageReport,
  getClientUsage, getRecentEvents, getPricing
} from "./usage-metering";
import { generateFCRADisputeLetter, DISPUTE_REASONS, type DisputeType } from "./dispute-letters";
import {
  optimizeTradelinesForClient, batchOptimizeAll, analyzeClientBehavior, aiTradelineStrategy,
} from "./tradeline-processor";
import {
  getAutomationRules, getAutomationRule, createAutomationRule, updateAutomationRule,
  deleteAutomationRule, toggleAutomationRule, getAutomationRuns, getRunsForRule,
  executeAutomationRule, getAutomationStats, getWorkflowTypes, seedDefaultRules, startScheduler,
  dispatchEvent
} from "./automation-engine";
import { ZodError } from "zod";
import { initializeOnboarding, advanceOnboarding, autoOnboardFromBooking, ONBOARDING_STEPS } from "./onboarding-engine";
import { createLinkToken, exchangePublicToken, getAccounts, getTransactions, getLiabilities, isPlaidConfigured } from "./plaid-client";
import {
  createCollateralAsset,
  createDocumentRoomItem,
  createEquityBonusRecord,
  createFacilityChecklistItem,
  createLegalInstrument,
  createReceivableReadinessRecord,
  getDocumentRoomSummary,
  highRiskConfirmationText,
  listAuditEvents,
  listCollateralAssets,
  listDocumentRoomItems,
  listEquityBonusRecords,
  listFacilityChecklist,
  listLegalInstruments,
  listReceivableReadinessRecords,
  updateCollateralAsset,
  updateDocumentRoomItem,
  updateEquityBonusRecord,
  updateReceivableReadinessRecord,
} from "./document-room-service";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { onboardingSteps, bankAccounts, cryptoWallets, loanApplications, uiCustomization } from "@shared/schema";
import { getPublicAppUrl } from "./config";
import { decryptIfEncrypted, encryptIfSensitive, isSensitiveConfigKey, maskSecret } from "./secret-store";
import { rateLimit } from "./rate-limit";
import { maskLast4, safeErrorMessage } from "./security-utils";
import {
  getPlaidConfigStatus,
  ProviderConfigValidationError,
  savePlaidConfig,
  testPlaidConfigReadiness,
} from "./provider-config";
import {
  BureauApiConfigValidationError,
  getAllBureauConfigStatuses,
  saveBureauApiConfig,
} from "./bureau-api-config";

const execFileAsync = promisify(execFile);

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const uploadMaxBytes = Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024);
const allowArchiveUploads = process.env.ALLOW_ARCHIVE_UPLOADS === "true";
const allowedMimeTypesByExtension = new Map<string, Set<string>>([
  [".pdf", new Set(["application/pdf"])],
  [".png", new Set(["image/png"])],
  [".jpg", new Set(["image/jpeg"])],
  [".jpeg", new Set(["image/jpeg"])],
  [".gif", new Set(["image/gif"])],
  [".webp", new Set(["image/webp"])],
  [".doc", new Set(["application/msword"])],
  [".docx", new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"])],
  [".txt", new Set(["text/plain"])],
  [".xml", new Set(["application/xml", "text/xml"])],
  [".csv", new Set(["text/csv", "application/csv", "application/vnd.ms-excel"])],
  [".json", new Set(["application/json"])],
  [".dat", new Set(["text/plain", "application/octet-stream"])],
  [".metro2", new Set(["text/plain", "application/octet-stream"])],
  [".xlsx", new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])],
  [".xls", new Set(["application/vnd.ms-excel"])],
]);
if (allowArchiveUploads) {
  allowedMimeTypesByExtension.set(".zip", new Set(["application/zip", "application/x-zip-compressed"]));
}
const allowedUploadExtensions = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".doc", ".docx", ".txt",
  ".xml", ".csv", ".json", ".dat", ".metro2", ".xlsx", ".xls", ...(allowArchiveUploads ? [".zip"] : []),
]);

const magicBytesByExtension: Record<string, number[][]> = {
  ".pdf": [[0x25, 0x50, 0x44, 0x46]],
  ".png": [[0x89, 0x50, 0x4e, 0x47]],
  ".jpg": [[0xff, 0xd8, 0xff]],
  ".jpeg": [[0xff, 0xd8, 0xff]],
  ".gif": [[0x47, 0x49, 0x46, 0x38]],
  ".webp": [[0x52, 0x49, 0x46, 0x46]],
  ".zip": [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06], [0x50, 0x4b, 0x07, 0x08]],
  ".docx": [[0x50, 0x4b, 0x03, 0x04]],
  ".xlsx": [[0x50, 0x4b, 0x03, 0x04]],
};

function safeDownloadName(name: string): string {
  return path.basename(name).replace(/[\r\n"]/g, "_");
}

function getStoredUploadPath(fileName: string) {
  const resolvedPath = path.resolve(uploadsDir, fileName);
  if (!resolvedPath.startsWith(`${uploadsDir}${path.sep}`)) {
    throw new Error("Invalid stored file path");
  }
  return resolvedPath;
}

function hasAllowedMagicBytes(filePath: string, extension: string) {
  const signatures = magicBytesByExtension[extension];
  if (!signatures) return true;
  const header = fs.readFileSync(filePath).subarray(0, 16);
  return signatures.some((signature) => signature.every((byte, index) => header[index] === byte));
}

async function scanUploadedFile(filePath: string) {
  const scannerCommand = process.env.MALWARE_SCAN_COMMAND;
  if (!scannerCommand) {
    return { scanned: false, clean: true, provider: process.env.MALWARE_SCAN_PROVIDER || "disabled" };
  }
  try {
    await execFileAsync(scannerCommand, [filePath], { timeout: Number(process.env.MALWARE_SCAN_TIMEOUT_MS || 30000) });
    return { scanned: true, clean: true, provider: scannerCommand };
  } catch {
    return { scanned: true, clean: false, provider: scannerCommand };
  }
}

async function validateUploadedFile(file: Express.Multer.File) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!hasAllowedMagicBytes(file.path, extension)) {
    try { fs.unlinkSync(file.path); } catch {}
    throw Object.assign(new Error("File signature does not match the declared file type."), { status: 400 });
  }
  const scan = await scanUploadedFile(file.path);
  if (!scan.clean) {
    try { fs.unlinkSync(file.path); } catch {}
    throw Object.assign(new Error("File failed malware scanning."), { status: 400 });
  }
  return scan;
}

async function auditDocumentAction(action: string, message: string) {
  try {
    await storage.createNotification({ type: "compliance", title: action, message, read: false });
  } catch {}
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname).toLowerCase());
    },
  }),
  limits: { fileSize: uploadMaxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = allowedMimeTypesByExtension.get(ext);
    if (allowedUploadExtensions.has(ext) && allowedMimeTypes?.has(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed. Accepted: PDF, images, Word docs, text, XML, CSV, JSON, and Excel files."));
  },
});

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

function handleError(res: Response, err: unknown) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Validation error", errors: err.errors });
  }
  const e = err as any;
  if (e?.code === "insufficient_quota") {
    return res.status(402).json({ message: "OpenAI quota exceeded — add credits at platform.openai.com/settings/billing", code: "quota_exceeded" });
  }
  if (e?.code === "invalid_api_key") {
    return res.status(401).json({ message: "Invalid OpenAI API key — check your key in Secrets", code: "invalid_key" });
  }
  if (typeof e?.status === "number" && e.status >= 400 && e.status < 500) {
    return res.status(e.status).json({ message: e.message });
  }
  console.error(safeErrorMessage(err));
  return res.status(500).json({ message: "Internal server error" });
}

function getRouteParam(param: string | string[] | undefined): string {
  return Array.isArray(param) ? param[0] : param || "";
}

function sanitizeClient(client: any) {
  if (!client) return client;
  return { ...client, ssn: maskLast4(client.ssn), idNumber: maskSecret(client.idNumber) };
}

function sanitizeBankAccount(account: any) {
  if (!account) return account;
  const { plaidAccessToken: _plaidAccessToken, ...safe } = account;
  return safe;
}

function getActor(req: Request) {
  return { userId: req.session?.userId || null };
}

function getConfirmable(req: Request) {
  return {
    reason: typeof req.body?.reason === "string" ? req.body.reason : undefined,
    confirmationText: typeof req.body?.confirmationText === "string" ? req.body.confirmationText : undefined,
  };
}

export async function registerRoutes(httpServer: Server, app: Router): Promise<Server> {

  await ensureCreditSalesTable();

  // ─── BOOK CONSULTATION (PUBLIC — NO AUTH) + AUTO-ONBOARDING ──────────────
  app.post("/book-consultation", rateLimit("api", (req) => [req.ip || "unknown", "book-consultation"]), async (req, res) => {
    try {
      const { name, phone, email } = req.body;
      if (!name || !phone) return res.status(400).json({ message: "Name and phone are required" });
      console.log("[Consultation] New booking:", { name, phone, email });
      const { client, steps } = await autoOnboardFromBooking(name, phone, email);
      res.json({
        success: true,
        message: "Consultation booked & onboarding started!",
        consultation: {
          id: client.id,
          name,
          phone,
          email: email || null,
          clientId: client.id,
          onboardingSteps: steps.length,
          createdAt: client.createdAt,
          status: "onboarding",
        },
      });
    } catch (err) { handleError(res, err); }
  });

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  app.get("/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) { handleError(res, err); }
  });

  // ─── DUE DILIGENCE DOCUMENT ROOM ──────────────────────────────────────────
  app.get("/document-room/summary", async (_req, res) => {
    try {
      res.json(await getDocumentRoomSummary());
    } catch (err) { handleError(res, err); }
  });

  app.get("/document-room/items", async (_req, res) => {
    try {
      res.json(await listDocumentRoomItems());
    } catch (err) { handleError(res, err); }
  });

  app.post("/document-room/items", async (req, res) => {
    try {
      const parsed = insertDocumentRoomItemSchema.parse(req.body);
      const item = await createDocumentRoomItem(parsed, getActor(req), getConfirmable(req));
      res.status(201).json(item);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/document-room/items/:id", async (req, res) => {
    try {
      const parsed = insertDocumentRoomItemSchema.partial().parse(req.body);
      const item = await updateDocumentRoomItem(req.params.id, parsed, getActor(req), getConfirmable(req));
      res.json(item);
    } catch (err) { handleError(res, err); }
  });

  app.get("/document-room/legal-instruments", async (_req, res) => {
    try {
      res.json(await listLegalInstruments());
    } catch (err) { handleError(res, err); }
  });

  app.post("/document-room/legal-instruments", async (req, res) => {
    try {
      const parsed = insertLegalInstrumentSchema.parse(req.body);
      const instrument = await createLegalInstrument(parsed, getActor(req), getConfirmable(req));
      res.status(201).json(instrument);
    } catch (err) { handleError(res, err); }
  });

  app.get("/document-room/collateral-assets", async (_req, res) => {
    try {
      res.json(await listCollateralAssets());
    } catch (err) { handleError(res, err); }
  });

  app.post("/document-room/collateral-assets", async (req, res) => {
    try {
      const parsed = insertCollateralAssetSchema.parse(req.body);
      const asset = await createCollateralAsset(parsed, getActor(req), getConfirmable(req));
      res.status(201).json(asset);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/document-room/collateral-assets/:id", async (req, res) => {
    try {
      const parsed = insertCollateralAssetSchema.partial().parse(req.body);
      const asset = await updateCollateralAsset(req.params.id, parsed, getActor(req), getConfirmable(req));
      res.json(asset);
    } catch (err) { handleError(res, err); }
  });

  app.get("/document-room/receivables", async (_req, res) => {
    try {
      res.json(await listReceivableReadinessRecords());
    } catch (err) { handleError(res, err); }
  });

  app.post("/document-room/receivables", async (req, res) => {
    try {
      const parsed = insertReceivableReadinessRecordSchema.parse(req.body);
      const record = await createReceivableReadinessRecord(parsed, getActor(req), getConfirmable(req));
      res.status(201).json(record);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/document-room/receivables/:id", async (req, res) => {
    try {
      const parsed = insertReceivableReadinessRecordSchema.partial().parse(req.body);
      const record = await updateReceivableReadinessRecord(req.params.id, parsed, getActor(req), getConfirmable(req));
      res.json(record);
    } catch (err) { handleError(res, err); }
  });

  app.get("/document-room/facility-checklist", async (_req, res) => {
    try {
      res.json(await listFacilityChecklist());
    } catch (err) { handleError(res, err); }
  });

  app.post("/document-room/facility-checklist", async (req, res) => {
    try {
      const parsed = insertFacilityReadinessChecklistSchema.parse(req.body);
      const item = await createFacilityChecklistItem(parsed, getActor(req), getConfirmable(req));
      res.status(201).json(item);
    } catch (err) { handleError(res, err); }
  });

  app.get("/document-room/audit-events", async (_req, res) => {
    try {
      res.json(await listAuditEvents());
    } catch (err) { handleError(res, err); }
  });

  app.get("/document-room/equity-bonus", async (_req, res) => {
    try {
      res.json(await listEquityBonusRecords());
    } catch (err) { handleError(res, err); }
  });

  app.post("/document-room/equity-bonus", async (req, res) => {
    try {
      const parsed = insertEquityBonusRecordSchema.parse(req.body);
      const record = await createEquityBonusRecord(parsed, getActor(req), getConfirmable(req));
      res.status(201).json(record);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/document-room/equity-bonus/:id", async (req, res) => {
    try {
      const parsed = insertEquityBonusRecordSchema.partial().parse(req.body);
      const record = await updateEquityBonusRecord(req.params.id, parsed, getActor(req), getConfirmable(req));
      res.json(record);
    } catch (err) { handleError(res, err); }
  });

  app.get("/document-room/controls", (_req, res) => {
    res.json({
      requiredConfirmationText: highRiskConfirmationText,
      highRiskActions: [
        "marking lender visible",
        "marking receivable eligible",
        "changing collateral value",
        "approving legal document",
        "superseding legal document",
        "deleting uploaded evidence",
      ],
      professionalReviewRequired: ["attorney", "accountant", "compliance", "lender", "insurance", "tax"],
    });
  });

  // ─── CLIENTS ───────────────────────────────────────────────────────────────
  app.get("/clients", async (_req, res) => {
    try {
      const data = await storage.getClients();
      res.json(data.map(sanitizeClient));
    } catch (err) { handleError(res, err); }
  });

  app.get("/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      res.json(sanitizeClient(client));
    } catch (err) { handleError(res, err); }
  });

  app.post("/clients", async (req, res) => {
    try {
      const parsed = insertClientSchema.parse(req.body);
      const client = await storage.createClient(parsed);
      // Create a welcome notification
      await storage.createNotification({
        type: "client",
        title: "New Client Added",
        message: `${client.firstName} ${client.lastName} has been added and is ready for onboarding.`,
        clientId: client.id,
        read: false,
      });
      dispatchEvent("client_created", { clientId: client.id }).catch(() => {});
      res.status(201).json(sanitizeClient(client));
    } catch (err) { handleError(res, err); }
  });

  app.patch("/clients/:id", async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      res.json(sanitizeClient(client));
    } catch (err) { handleError(res, err); }
  });

  app.delete("/clients/:id", async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── DISPUTES ──────────────────────────────────────────────────────────────
  app.get("/disputes", async (_req, res) => {
    try {
      res.json(await storage.getDisputes());
    } catch (err) { handleError(res, err); }
  });

  app.get("/disputes/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getDisputesByClient(req.params.clientId));
    } catch (err) { handleError(res, err); }
  });

  app.post("/disputes", async (req, res) => {
    try {
      const parsed = insertDisputeSchema.parse(req.body);
      const dispute = await storage.createDispute(parsed);
      await storage.createNotification({
        type: "dispute",
        title: "New Dispute Created",
        message: `Dispute filed with ${dispute.bureau} for account ${dispute.accountName}.`,
        clientId: dispute.clientId,
        read: false,
      });
      recordUsageEvent({ eventType: "dispute_filed", clientId: dispute.clientId, metadata: { bureau: dispute.bureau }, quantity: 1 }).catch(() => {});
      if (dispute.disputeType === "collection") {
        dispatchEvent("collection_dispute_created", { disputeId: dispute.id }).catch(() => {});
      }
      res.status(201).json(dispute);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/disputes/:id", async (req, res) => {
    try {
      const updated = await storage.updateDispute(req.params.id, req.body);
      if (req.body.status === "deleted") {
        await storage.createNotification({
          type: "success",
          title: "Item Successfully Deleted",
          message: `The disputed account "${updated.accountName}" has been removed from ${updated.bureau}.`,
          clientId: updated.clientId,
          read: false,
        });
      }
      res.json(updated);
    } catch (err) { handleError(res, err); }
  });

  app.delete("/disputes/:id", async (req, res) => {
    try {
      await storage.deleteDispute(req.params.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  app.get("/dispute-reasons", (_req, res) => {
    res.json(DISPUTE_REASONS);
  });

  app.post("/disputes/:id/generate-letter", async (req, res) => {
    try {
      const dispute = await storage.getDispute(req.params.id);
      if (!dispute) return res.status(404).json({ message: "Dispute not found" });

      const client = await storage.getClient(dispute.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const disputeType = (req.body.disputeType || "general") as DisputeType;

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

      await storage.updateDispute(req.params.id, {
        letterContent: letter,
        disputeType,
      });

      recordUsageEvent({ eventType: "dispute_letter_generated", clientId: dispute.clientId, metadata: { disputeId: dispute.id }, quantity: 1 }).catch(() => {});
      res.json({ letter, disputeId: dispute.id });
    } catch (err) { handleError(res, err); }
  });

  app.post("/disputes/generate-letter-preview", async (req, res) => {
    try {
      const { clientId, bureau, accountName, accountNumber, reason, disputeType } = req.body;
      if (!clientId || !bureau || !accountName || !reason) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const letter = generateFCRADisputeLetter({
        clientName: `${client.firstName}${client.middleName ? " " + client.middleName : ""} ${client.lastName}${client.suffix ? " " + client.suffix : ""}`,
        clientAddress: [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || undefined,
        clientSSNLast4: client.ssn ? client.ssn.slice(-4) : undefined,
        clientDOB: client.dob || undefined,
        bureau,
        accountName,
        accountNumber: accountNumber || undefined,
        reason,
        disputeType: disputeType || "general",
      });

      res.json({ letter });
    } catch (err) { handleError(res, err); }
  });

  // ─── CREDIT REPORTS ────────────────────────────────────────────────────────
  app.get("/reports", async (_req, res) => {
    try {
      res.json(await storage.getCreditReports());
    } catch (err) { handleError(res, err); }
  });

  app.get("/reports/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getCreditReportsByClient(req.params.clientId));
    } catch (err) { handleError(res, err); }
  });

  app.post("/reports", async (req, res) => {
    try {
      const parsed = insertCreditReportSchema.parse(req.body);
      const report = await storage.createCreditReport(parsed);
      res.status(201).json(report);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/reports/:id", async (req, res) => {
    try {
      res.json(await storage.updateCreditReport(req.params.id, req.body));
    } catch (err) { handleError(res, err); }
  });

  app.post("/reports/pull", async (req, res) => {
    try {
      const { clientId, equifaxScore, experianScore, transunionScore, negativeItems, negativeItemsList, runAnalysis } = req.body;
      if (!clientId) return res.status(400).json({ message: "Client ID required" });

      const clients = await storage.getClients();
      const client = clients.find((c: any) => c.id === clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const eqChange = equifaxScore && client.equifaxScore ? equifaxScore - client.equifaxScore : undefined;
      const exChange = experianScore && client.experianScore ? experianScore - client.experianScore : undefined;
      const tuChange = transunionScore && client.transunionScore ? transunionScore - client.transunionScore : undefined;

      const report = await storage.createCreditReport({
        clientId,
        equifaxScore: equifaxScore || undefined,
        experianScore: experianScore || undefined,
        transunionScore: transunionScore || undefined,
        equifaxChange: eqChange,
        experianChange: exChange,
        transunionChange: tuChange,
        negativeItems: negativeItems || 0,
        status: "pending",
      });

      const updateData: any = {};
      if (equifaxScore) updateData.equifaxScore = equifaxScore;
      if (experianScore) updateData.experianScore = experianScore;
      if (transunionScore) updateData.transunionScore = transunionScore;
      if (Object.keys(updateData).length > 0) {
        await storage.updateClient(clientId, updateData);
      }

      let analysis = null;
      if (runAnalysis) {
        try {
          analysis = await analyzeClientCredit({
            clientName: `${client.firstName} ${client.lastName}`,
            scores: { equifax: equifaxScore, experian: experianScore, transunion: transunionScore },
            negativeItems: negativeItemsList || [],
            goal: "Maximize score improvement",
          });
          await storage.updateCreditReport(report.id, { status: "analyzed", rawData: analysis });
        } catch (aiErr) {
          console.error("AI analysis failed:", aiErr);
        }
      }

      await storage.createNotification({
        type: "client",
        title: "Credit Report Pulled",
        message: `Report pulled for ${client.firstName} ${client.lastName} — EQ: ${equifaxScore || "N/A"}, EX: ${experianScore || "N/A"}, TU: ${transunionScore || "N/A"}`,
        clientId,
      });

      res.status(201).json({ report, analysis });
    } catch (err) { handleError(res, err); }
  });

  app.post("/reports/:id/analyze", async (req, res) => {
    try {
      const reports = await storage.getCreditReports();
      const report = reports.find((r: any) => r.id === req.params.id);
      if (!report) return res.status(404).json({ message: "Report not found" });

      const clients = await storage.getClients();
      const client = clients.find((c: any) => c.id === report.clientId);
      const clientName = client ? `${client.firstName} ${client.lastName}` : "Unknown Client";

      const analysis = await analyzeClientCredit({
        clientName,
        scores: {
          equifax: report.equifaxScore ?? undefined,
          experian: report.experianScore ?? undefined,
          transunion: report.transunionScore ?? undefined,
        },
        negativeItems: req.body.negativeItems || [],
        goal: req.body.goal || "Maximize score improvement",
      });

      await storage.updateCreditReport(req.params.id, { status: "analyzed", rawData: analysis });
      res.json({ analysis });
    } catch (err) { handleError(res, err); }
  });

  // ─── TRADELINES ────────────────────────────────────────────────────────────
  app.get("/tradelines", async (_req, res) => {
    try {
      res.json(await storage.getTradelines());
    } catch (err) { handleError(res, err); }
  });

  app.get("/tradelines/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getTradelinesByClient(req.params.clientId));
    } catch (err) { handleError(res, err); }
  });

  app.post("/tradelines", async (req, res) => {
    try {
      const parsed = insertTradelineSchema.parse(req.body);
      const tl = await storage.createTradeline(parsed);
      await storage.createNotification({
        type: "billing",
        title: "Tradeline Order Created",
        message: `Tradeline from ${tl.institution} placed for client.`,
        clientId: tl.clientId,
        read: false,
      });
      dispatchEvent("tradeline_created", { clientId: tl.clientId, tradelineId: tl.id }).catch(() => {});
      res.status(201).json(tl);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/tradelines/:id", async (req, res) => {
    try {
      res.json(await storage.updateTradeline(req.params.id, req.body));
    } catch (err) { handleError(res, err); }
  });

  app.delete("/tradelines/:id", async (req, res) => {
    try {
      await storage.deleteTradeline(req.params.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── TRADELINE AI PROCESSOR ──────────────────────────────────────────────
  app.get("/tradelines/optimize/:clientId", async (req, res) => {
    try {
      const plan = await optimizeTradelinesForClient(req.params.clientId);
      if (!plan) return res.status(404).json({ message: "Client not found" });
      res.json(plan);
    } catch (err) { handleError(res, err); }
  });

  app.post("/tradelines/batch-optimize", async (_req, res) => {
    try {
      const result = await batchOptimizeAll();
      res.json(result);
    } catch (err) { handleError(res, err); }
  });

  app.get("/tradelines/behavior/:clientId", async (req, res) => {
    try {
      const profile = await analyzeClientBehavior(req.params.clientId);
      if (!profile) return res.status(404).json({ message: "Client not found" });
      res.json(profile);
    } catch (err) { handleError(res, err); }
  });

  app.post("/tradelines/ai-strategy/:clientId", async (req, res) => {
    try {
      const clientId = String(req.params.clientId);
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      const strategy = await aiTradelineStrategy(req.params.clientId);
      res.json(strategy);
    } catch (err) { handleError(res, err); }
  });

  // ─── CREDIT LINES ──────────────────────────────────────────────────────────
  app.get("/credit-lines", async (_req, res) => {
    try {
      res.json(await storage.getCreditLines());
    } catch (err) { handleError(res, err); }
  });

  app.get("/credit-lines/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getCreditLinesByClient(req.params.clientId));
    } catch (err) { handleError(res, err); }
  });

  app.post("/credit-lines", async (req, res) => {
    try {
      const parsed = insertCreditLineSchema.parse(req.body);
      const cl = await storage.createCreditLine(parsed);
      res.status(201).json(cl);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/credit-lines/:id", async (req, res) => {
    try {
      res.json(await storage.updateCreditLine(req.params.id, req.body));
    } catch (err) { handleError(res, err); }
  });

  app.delete("/credit-lines/:id", async (req, res) => {
    try {
      await storage.deleteCreditLine(req.params.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── TRANSACTIONS / BILLING ─────────────────────────────────────────────────
  app.get("/transactions", async (_req, res) => {
    try {
      res.json(await storage.getTransactions());
    } catch (err) { handleError(res, err); }
  });

  app.get("/transactions/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getTransactionsByClient(req.params.clientId));
    } catch (err) { handleError(res, err); }
  });

  app.post("/transactions", async (req, res) => {
    try {
      const parsed = insertTransactionSchema.parse(req.body);
      const txn = await storage.createTransaction(parsed);
      res.status(201).json(txn);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/transactions/:id", async (req, res) => {
    try {
      res.json(await storage.updateTransaction(req.params.id, req.body));
    } catch (err) { handleError(res, err); }
  });

  // ─── STRIPE WEBHOOK ────────────────────────────────────────────────────────
  app.post("/stripe/webhook", async (req, res) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !webhookSecret) {
      return res.status(400).json({ message: "Stripe webhook not configured" });
    }
    try {
      const sig = req.headers["stripe-signature"] as string;
      const event = stripe.webhooks.constructEvent(req.rawBody as string | Buffer, sig, webhookSecret);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const piId = session.payment_intent as string;
        const clientId = session.metadata?.clientId || undefined;
        await storage.createTransaction({
          clientId: clientId || null,
          stripePaymentIntentId: piId || null,
          type: session.metadata?.type || "payment",
          description: session.metadata?.description || `Stripe checkout ${session.id}`,
          amount: session.amount_total || 0,
          status: "completed",
          paidAt: new Date(),
        });
        await storage.createNotification({
          type: "billing",
          title: "Payment Received",
          message: `Payment of $${((session.amount_total || 0) / 100).toFixed(2)} received via Stripe checkout.`,
          read: false,
        });
      } else if (event.type === "payment_intent.payment_failed") {
        const pi = event.data.object as Stripe.PaymentIntent;
        await storage.createNotification({
          type: "warning",
          title: "Payment Failed",
          message: `A Stripe payment of $${(pi.amount / 100).toFixed(2)} failed. Please follow up with client.`,
          read: false,
        });
      }
      res.json({ received: true });
    } catch (err: any) {
      console.error("Stripe webhook error:", err.message);
      res.status(400).json({ message: `Webhook error: ${err.message}` });
    }
  });

  // ─── STRIPE CHECKOUT SESSION ────────────────────────────────────────────────
  app.post("/stripe/create-checkout", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(400).json({ message: "Add STRIPE_SECRET_KEY to your environment secrets to enable payments." });
    }
    try {
      const { amount, description, clientId, type } = req.body;
      if (!amount || typeof amount !== "number" || amount < 50) {
        return res.status(400).json({ message: "Amount must be at least $0.50 (50 cents) as an integer." });
      }
      const baseUrl = getPublicAppUrl(req);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: description || "CreditRepair Pro Service" },
            unit_amount: Math.round(amount),
          },
          quantity: 1,
        }],
        metadata: { clientId: clientId || "", type: type || "payment", description: description || "" },
        success_url: `${baseUrl}/billing?payment=success`,
        cancel_url: `${baseUrl}/billing?payment=cancelled`,
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (err) { handleError(res, err); }
  });

  // ─── STRIPE PAYMENT LINK (backward compat) ─────────────────────────────────
  app.post("/stripe/create-payment-link", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(400).json({ message: "Add STRIPE_SECRET_KEY to your environment secrets to enable payments." });
    }
    try {
      const { amount, description, clientId, type } = req.body;
      const baseUrl = getPublicAppUrl(req);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: description || "CreditRepair Pro Service" },
            unit_amount: Math.round(amount || 9900),
          },
          quantity: 1,
        }],
        metadata: { clientId: clientId || "", type: type || "payment", description: description || "" },
        success_url: `${baseUrl}/billing?payment=success`,
        cancel_url: `${baseUrl}/billing?payment=cancelled`,
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (err) { handleError(res, err); }
  });

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  app.get("/notifications", async (_req, res) => {
    try {
      res.json(await storage.getNotifications());
    } catch (err) { handleError(res, err); }
  });

  app.get("/notifications/unread-count", async (_req, res) => {
    try {
      const count = await storage.getUnreadCount();
      res.json({ count });
    } catch (err) { handleError(res, err); }
  });

  app.post("/notifications", async (req, res) => {
    try {
      const parsed = insertNotificationSchema.parse(req.body);
      res.status(201).json(await storage.createNotification(parsed));
    } catch (err) { handleError(res, err); }
  });

  app.patch("/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  app.post("/notifications/mark-all-read", async (_req, res) => {
    try {
      await storage.markAllNotificationsRead();
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── API CONFIGS (admin only) ───────────────────────────────────────────────
  app.get("/admin-overrides", async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const keys = [
        "admin_bypass_partner_access", "admin_bypass_dispute_approval",
        "admin_bypass_tradeline_limits", "admin_bypass_billing_holds",
        "admin_bypass_credit_builder_enrollment", "admin_bypass_compliance_checks",
        "admin_bypass_metro2_validation", "admin_bypass_staff_restrictions",
        "admin_auto_import_reports", "admin_auto_assign_tradelines",
      ];
      const results: Record<string, boolean> = {};
      for (const k of keys) {
        const val = await storage.getApiConfig(k);
        results[k] = val === "true";
      }
      res.json(results);
    } catch (err) { handleError(res, err); }
  });

  app.get("/config/:key", async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const val = await storage.getApiConfig(req.params.key);
      if (isSensitiveConfigKey(req.params.key)) {
        return res.json({ key: req.params.key, configured: !!val, value: maskSecret(val) });
      }
      res.json({ key: req.params.key, value: val ?? null });
    } catch (err) { handleError(res, err); }
  });

  app.post("/config", async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { key, value } = req.body;
      if (!key || !value) return res.status(400).json({ message: "key and value required" });
      await storage.setApiConfig(key, value);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── BUREAU CONTACTS (Static) ─────────────────────────────────────────────
  app.get("/bureaus", (_req, res) => {
    res.json([
      {
        id: "equifax",
        name: "Equifax Information Services LLC",
        address: "P.O. Box 740256, Atlanta, GA 30374-0256",
        disputeAddress: "P.O. Box 740256, Atlanta, GA 30374-0256",
        phone: "1-800-685-1111",
        website: "https://www.equifax.com/personal/credit-report-services/",
        eoscarSupported: true,
      },
      {
        id: "experian",
        name: "Experian",
        address: "P.O. Box 4500, Allen, TX 75013",
        disputeAddress: "P.O. Box 4500, Allen, TX 75013",
        phone: "1-888-397-3742",
        website: "https://www.experian.com/disputes/main.html",
        eoscarSupported: true,
      },
      {
        id: "transunion",
        name: "TransUnion LLC",
        address: "Consumer Dispute Center, P.O. Box 2000, Chester, PA 19016",
        disputeAddress: "P.O. Box 2000, Chester, PA 19016",
        phone: "1-800-916-8800",
        website: "https://www.transunion.com/credit-disputes/dispute-your-credit",
        eoscarSupported: true,
      },
      {
        id: "innovis",
        name: "Innovis Data Solutions",
        address: "P.O. Box 26, Pittsburgh, PA 15230-0026",
        disputeAddress: "P.O. Box 26, Pittsburgh, PA 15230-0026",
        phone: "1-800-540-2505",
        website: "https://www.innovis.com/personal/creditReport",
        eoscarSupported: false,
      },
      {
        id: "chexsystems",
        name: "ChexSystems",
        address: "Attn: Consumer Relations, 7805 Hudson Rd., Suite 100, Woodbury, MN 55125",
        disputeAddress: "Attn: Consumer Relations, 7805 Hudson Rd., Suite 100, Woodbury, MN 55125",
        phone: "1-800-428-9623",
        website: "https://www.chexsystems.com/",
        eoscarSupported: false,
      },
      {
        id: "lexisnexis",
        name: "LexisNexis Risk Solutions",
        address: "P.O. Box 105108, Atlanta, GA 30348-5108",
        disputeAddress: "P.O. Box 105108, Atlanta, GA 30348-5108",
        phone: "1-888-497-0011",
        website: "https://consumer.risk.lexisnexis.com/",
        eoscarSupported: false,
      },
    ]);
  });

  // ── CARDHOLDER PARTNERS ──────────────────────────────────────────────────
  app.get("/partners", async (_req, res) => {
    try {
      res.json(await storage.getCardholderPartners());
    } catch (e) { handleError(res, e); }
  });

  app.post("/partners", async (req, res) => {
    try {
      const data = insertCardholderPartnerSchema.parse(req.body);
      res.status(201).json(await storage.createCardholderPartner(data));
    } catch (e) { handleError(res, e); }
  });

  app.put("/partners/:id", async (req, res) => {
    try {
      const data = insertCardholderPartnerSchema.partial().parse(req.body);
      res.json(await storage.updateCardholderPartner(req.params.id, data));
    } catch (e) { handleError(res, e); }
  });

  app.delete("/partners/:id", async (req, res) => {
    try {
      await storage.deleteCardholderPartner(req.params.id);
      res.json({ success: true });
    } catch (e) { handleError(res, e); }
  });

  // ── METRO 2 SUBMISSIONS ─────────────────────────────────────────────────
  app.get("/metro2", async (_req, res) => {
    try {
      res.json(await storage.getMetro2Submissions());
    } catch (e) { handleError(res, e); }
  });

  app.get("/metro2/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getMetro2SubmissionsByClient(req.params.clientId));
    } catch (e) { handleError(res, e); }
  });

  // Generate Metro 2 file from client data and record the submission
  app.post("/metro2/generate", async (req, res) => {
    try {
      const {
        clientId, bureau, portfolioType, accountType, accountStatus,
        ecoaCode, creditLimit, currentBalance, accountNumber, companyId,
        companyName, dateOpened, reportType
      } = req.body;

      if (!clientId || !bureau) {
        return res.status(400).json({ message: "clientId and bureau are required" });
      }

      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const record = {
        client,
        accountNumber: accountNumber || `AU-${clientId.slice(0, 8)}`,
        portfolioType: (portfolioType || "R") as "I" | "M" | "O" | "R",
        accountType: accountType || "18",
        dateOpened: dateOpened || new Date().toISOString().slice(0, 10),
        dateOfAccountInfo: new Date().toISOString().slice(0, 10),
        creditLimit: creditLimit || 0,
        currentBalance: currentBalance || 0,
        accountStatus: accountStatus || "11",
        paymentHistory: "111111111111111111111111",
        ecoaCode: ecoaCode || "3",
        companyId: companyId || "CRP001",
        reportType: (reportType || "M") as "M" | "C" | "D",
      };

      const fileContent = buildMetro2File(
        [record],
        companyId || "CRP001",
        companyName || "CreditRepair Pro LLC"
      );

      // Record the submission
      const submission = await storage.createMetro2Submission({
        clientId,
        bureau,
        accountNumber: accountNumber || `AU-${clientId.slice(0, 8)}`,
        portfolioType: portfolioType || "R",
        accountStatus: accountStatus || "11",
        ecoaCode: ecoaCode || "3",
        creditLimit: creditLimit || 0,
        currentBalance: currentBalance || 0,
        status: "generated",
        fileContent,
        reportType: reportType || "M",
        submittedAt: null,
      });

      res.json({ submission, fileContent });
    } catch (e) { handleError(res, e); }
  });

  // Log a manual file upload (user uploads to bureau portal themselves)
  app.post("/metro2/upload", async (req, res) => {
    try {
      const { bureau, fileName, fileContent } = req.body;
      if (!bureau) return res.status(400).json({ message: "bureau is required" });

      const submission = await storage.createMetro2Submission({
        clientId: null,
        bureau,
        accountNumber: fileName || "Manual Upload",
        portfolioType: "R",
        accountStatus: "11",
        ecoaCode: "3",
        creditLimit: 0,
        currentBalance: 0,
        status: "submitted",
        fileContent: fileContent || "",
        reportType: "M",
        submittedAt: new Date(),
      });

      res.status(201).json(submission);
    } catch (e) { handleError(res, e); }
  });

  app.put("/metro2/:id", async (req, res) => {
    try {
      res.json(await storage.updateMetro2Submission(req.params.id, req.body));
    } catch (e) { handleError(res, e); }
  });

  // ── AI ENDPOINTS ────────────────────────────────────────────────────────────

  // AI Dispute Letter Generator
  app.post("/ai/dispute-letter", async (req, res) => {
    try {
      const { clientName, bureau, accountName, accountNumber, reason, type } = req.body;
      if (!clientName || !bureau || !accountName || !reason || !type) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const letter = await generateDisputeLetter({ clientName, bureau, accountName, accountNumber, reason, type });
      recordUsageEvent({ eventType: "ai_letter", metadata: { bureau }, quantity: 1 }).catch(() => {});
      res.json({ letter });
    } catch (e) { handleError(res, e); }
  });

  // AI Client Credit Analysis
  app.post("/ai/analyze-client", async (req, res) => {
    try {
      const { clientName, scores, negativeItems, goal } = req.body;
      if (!clientName) return res.status(400).json({ message: "clientName is required" });
      const analysis = await analyzeClientCredit({ clientName, scores: scores ?? {}, negativeItems: negativeItems ?? [], goal });
      recordUsageEvent({ eventType: "ai_analysis", metadata: { clientName }, quantity: 1 }).catch(() => {});
      res.json({ analysis });
    } catch (e) { handleError(res, e); }
  });

  // AI Chat Assistant
  app.post("/ai/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) return res.status(400).json({ message: "messages array required" });
      const reply = await chatWithAI(messages);
      recordUsageEvent({ eventType: "ai_chat", quantity: 1 }).catch(() => {});
      res.json({ reply });
    } catch (e) { handleError(res, e); }
  });

  // AI Metro 2 Validator
  app.post("/ai/validate-metro2", async (req, res) => {
    try {
      const { record } = req.body;
      if (!record) return res.status(400).json({ message: "record is required" });
      const result = await validateMetro2Record(record);
      res.json({ result });
    } catch (e) { handleError(res, e); }
  });

  // ─── METRO 2 FORMAT CONVERSION ──────────────────────────────────────────
  app.post("/metro2/validate", async (req, res) => {
    try {
      const { record } = req.body;
      if (!record) return res.status(400).json({ message: "record is required" });
      const client = record.clientId ? await storage.getClient(record.clientId) : null;
      const metro2Rec = {
        client: client || { firstName: "TEST", lastName: "USER", ssn: "000000000" } as any,
        accountNumber: record.accountNumber || "TEST-001",
        portfolioType: record.portfolioType || "R",
        accountType: record.accountType || "18",
        accountStatus: record.accountStatus || "11",
        ecoaCode: record.ecoaCode || "1",
        creditLimit: record.creditLimit || 0,
        currentBalance: record.currentBalance || 0,
        dateOpened: record.dateOpened || new Date().toISOString().slice(0, 10),
        dateOfAccountInfo: record.dateOfAccountInfo || new Date().toISOString().slice(0, 10),
        dateClosed: record.dateClosed,
        amountPastDue: record.amountPastDue || 0,
        companyId: record.companyId || "CRP001",
        paymentHistory: record.paymentHistory,
        specialComment: record.specialComment,
      };
      const errors = validateMetro2BaseRecord(metro2Rec);
      res.json({ valid: errors.filter(e => e.severity === "error").length === 0, errors });
    } catch (e) { handleError(res, e); }
  });

  app.post("/metro2/convert", rateLimit("upload", (req) => [req.session?.userId || req.ip || "unknown", "metro2-convert"]), upload.single("file"), async (req, res) => {
    try {
      let content = "";
      let sourceFormat = req.body.sourceFormat as string || "";

      if (req.file) {
        await validateUploadedFile(req.file);
        content = fs.readFileSync(req.file.path, "utf-8");
        fs.unlinkSync(req.file.path);
      } else if (req.body.content) {
        content = req.body.content;
      } else {
        return res.status(400).json({ message: "Provide a file upload or content in request body" });
      }

      if (!sourceFormat) sourceFormat = detectFormat(content);
      const targetFormat = (req.body.targetFormat as string) || (sourceFormat === "metro2" ? "json" : "metro2");
      const companyId = (req.body.companyId as string) || "CRP001";
      const companyName = (req.body.companyName as string) || "CreditRepair Pro LLC";

      if (sourceFormat === "metro2" && targetFormat === "json") {
        const parsed = parseMetro2File(content);
        res.json({ format: "json", records: parsed.records, recordCount: parsed.records.length, errors: parsed.errors });
      } else if (sourceFormat === "json" && targetFormat === "metro2") {
        const jsonRecords = JSON.parse(content) as Metro2JsonRecord[];
        const metro2Content = convertJsonToMetro2(Array.isArray(jsonRecords) ? jsonRecords : [jsonRecords], companyId, companyName);
        res.json({ format: "metro2", content: metro2Content, recordCount: Array.isArray(jsonRecords) ? jsonRecords.length : 1 });
      } else if (sourceFormat === "csv" && targetFormat === "json") {
        const result = convertCsvToJson(content);
        res.json({ format: "json", records: result.records, recordCount: result.records.length, errors: result.errors });
      } else if (sourceFormat === "csv" && targetFormat === "metro2") {
        const csvResult = convertCsvToJson(content);
        if (csvResult.records.length === 0) return res.status(400).json({ message: "No valid records found in CSV", errors: csvResult.errors });
        const metro2Content = convertJsonToMetro2(csvResult.records as Metro2JsonRecord[], companyId, companyName);
        res.json({ format: "metro2", content: metro2Content, recordCount: csvResult.records.length, errors: csvResult.errors });
      } else {
        res.status(400).json({ message: `Unsupported conversion: ${sourceFormat} → ${targetFormat}. Supported: metro2↔json, csv→json, csv→metro2` });
      }
    } catch (e) { handleError(res, e); }
  });

  app.get("/metro2/reference-codes", (_req, res) => {
    res.json({
      accountTypes: ACCOUNT_TYPES,
      accountStatuses: ACCOUNT_STATUSES,
      ecoaCodes: ECOA_CODES,
      specialComments: SPECIAL_COMMENT_CODES,
    });
  });

  // ─── CLIENT DOCUMENT UPLOAD ─────────────────────────────────────────────
  app.get("/clients/:clientId/documents", async (req, res) => {
    try {
      const clientId = getRouteParam(req.params.clientId);
      const docs = await storage.getDocumentsByClient(clientId);
      res.json(docs);
    } catch (e) { handleError(res, e); }
  });

  app.post("/clients/:clientId/documents", rateLimit("upload", (req) => [req.session?.userId || req.ip || "unknown", "client-documents"]), upload.single("file"), async (req, res) => {
    const file = req.file;
    try {
      if (!file) return res.status(400).json({ message: "No file uploaded" });
      await validateUploadedFile(file);
      const clientId = getRouteParam(req.params.clientId);
      const client = await storage.getClient(clientId);
      if (!client) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ message: "Client not found" });
      }
      const validCategories = ["credit_report", "id_document", "proof_of_address", "dispute_letter", "bureau_response", "other"];
      const category = validCategories.includes(req.body.category) ? req.body.category : "credit_report";
      const notes = typeof req.body.notes === "string" ? req.body.notes.slice(0, 500) : null;
      const doc = await storage.createDocument({
        clientId,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        category,
        notes,
      });
      try {
        await storage.createNotification({
          type: "client",
          title: "Document Uploaded",
          message: `${file.originalname} uploaded for ${client.firstName} ${client.lastName}`,
          read: false,
        });
      } catch (_) {}
      await auditDocumentAction("Document Upload Audited", `Document ${file.originalname} uploaded for client ${clientId}`);

      if (category === "credit_report" && /\.(pdf|xml|txt)$/i.test(file.originalname)) {
        autoAnalyzeAndDispute(clientId, file.path, file.originalname).catch((err) => {
          console.error("[Auto-Analyze] Background pipeline error:", err.message);
        });
      }

      res.json(doc);
    } catch (e) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      handleError(res, e);
    }
  });

  app.get("/documents/:id/download", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      const filePath = getStoredUploadPath(doc.fileName);
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found on disk" });
      res.setHeader("Content-Disposition", `attachment; filename="${safeDownloadName(doc.originalName)}"`);
      res.setHeader("Content-Type", doc.mimeType);
      await auditDocumentAction("Document Download Audited", `Document ${doc.id} downloaded`);
      fs.createReadStream(filePath).pipe(res);
    } catch (e) { handleError(res, e); }
  });

  app.delete("/documents/:id", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      const filePath = getStoredUploadPath(doc.fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await storage.deleteDocument(req.params.id);
      await auditDocumentAction("Document Delete Audited", `Document ${doc.id} deleted`);
      res.json({ success: true });
    } catch (e) { handleError(res, e); }
  });


  // ─── CREDIT REPORT PARSER ROUTES ──────────────────────────────────────────

  app.post("/credit-report/parse", rateLimit("upload", (req) => [req.session?.userId || req.ip || "unknown", "credit-report-parse"]), upload.single("file"), async (req: any, res) => {
    const filePath = req.file?.path;
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      await validateUploadedFile(req.file);
      const report = await parseCreditReportPDF(filePath!);
      recordUsageEvent({ eventType: "report_parsed", metadata: { format: "pdf" }, quantity: 1 }).catch(() => {});
      res.json(report);
    } catch (e) { handleError(res, e); }
    finally { if (filePath && fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch {} }
  });

  app.post("/credit-report/parse-text", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ message: "No text provided" });
      const report = parseCreditReportText(text);
      recordUsageEvent({ eventType: "report_parsed", metadata: { format: "text" }, quantity: 1 }).catch(() => {});
      res.json(report);
    } catch (e) { handleError(res, e); }
  });

  // ─── BUREAU API ROUTES ──────────────────────────────────────────────────────

  app.post("/bureau/pull-report", async (req, res) => {
    try {
      const { bureau, firstName, lastName, ssn, dob, address, city, state, zip } = req.body;
      if (!firstName || !lastName || !ssn) {
        return res.status(400).json({ message: "First name, last name, and SSN are required" });
      }

      if (bureau && ["equifax", "experian", "transunion"].includes(bureau)) {
        const client = await getBureauClient(bureau);
        if (!client) return res.status(400).json({ message: `${bureau} API not configured. Add credentials in Settings > Bureau APIs.` });
        const report = await client.pullReport({ firstName, lastName, ssn, dob, address, city, state, zip });
        recordUsageEvent({ eventType: "bureau_pull", metadata: { bureau }, quantity: 1 }).catch(() => {});
        return res.json(report);
      }

      const reports = await pullAllBureauReports({ firstName, lastName, ssn, dob, address, city, state, zip });
      recordUsageEvent({ eventType: "bureau_pull", metadata: { bureau: "all" }, quantity: 3 }).catch(() => {});
      res.json(reports);
    } catch (e) { handleError(res, e); }
  });

  app.get("/bureau/status", async (_req, res) => {
    try {
      const statuses = await getAllBureauConfigStatuses(storage);
      res.json({
        equifax: statuses.equifax,
        experian: statuses.experian,
        transunion: statuses.transunion,
      });
    } catch (e) { handleError(res, e); }
  });

  app.post("/bureau/configure", async (req, res) => {
    try {
      res.json(await saveBureauApiConfig(req.body, storage));
    } catch (e) {
      if (e instanceof BureauApiConfigValidationError) {
        return res.status(400).json({ message: e.message, errors: e.fields });
      }
      handleError(res, e);
    }
  });

  // ─── SCORE SIMULATOR ROUTES ─────────────────────────────────────────────────

  app.post("/score-simulator/simulate", async (req, res) => {
    try {
      const { factors, actions } = req.body as { factors: ScoreFactors; actions: SimulationAction[] };
      if (!factors || !factors.currentScore) return res.status(400).json({ message: "Score factors required" });
      if (!actions || !Array.isArray(actions)) return res.status(400).json({ message: "Actions array required" });
      const result = simulateScoreChanges(factors, actions);
      recordUsageEvent({ eventType: "score_simulation", quantity: 1 }).catch(() => {});
      res.json(result);
    } catch (e) { handleError(res, e); }
  });

  app.post("/score-simulator/recommend", async (req, res) => {
    try {
      const factors = req.body as ScoreFactors;
      if (!factors || !factors.currentScore) return res.status(400).json({ message: "Score factors required" });
      const actions = generateRecommendations(factors);
      const simulation = simulateScoreChanges(factors, actions);
      recordUsageEvent({ eventType: "score_simulation", quantity: 1 }).catch(() => {});
      res.json({ recommendations: actions, simulation });
    } catch (e) { handleError(res, e); }
  });

  // ─── CLIENT REPORT PARSE & AUTO-IMPORT ──────────────────────────────────────

  app.post("/clients/:id/parse-report", rateLimit("upload", (req) => [req.session?.userId || req.ip || "unknown", "client-report-parse"]), upload.single("file"), async (req: any, res) => {
    const filePath = req.file?.path;
    try {
      const clientId = req.params.id;
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      await validateUploadedFile(req.file);

      const report = await parseCreditReportPDF(filePath!);

      if (report.scores.equifax || report.scores.experian || report.scores.transunion) {
        const updates: any = {};
        if (report.scores.equifax) updates.creditScoreEq = report.scores.equifax;
        if (report.scores.experian) updates.creditScoreEx = report.scores.experian;
        if (report.scores.transunion) updates.creditScoreTu = report.scores.transunion;
        await storage.updateClient(clientId, updates);
      }

      res.json({
        success: true,
        report,
        message: `Parsed ${report.accounts.length} accounts, ${report.negativeItems.length} negative items from ${report.bureau} report`,
      });
    } catch (e) { handleError(res, e); }
    finally { if (filePath && fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch {} }
  });


  // ─── AUTO-ANALYZE & DISPUTE PIPELINE ─────────────────────────────────────

  async function autoAnalyzeAndDispute(clientId: string, filePath: string, fileName: string) {
    const client = await storage.getClient(clientId);
    if (!client) return;

    let report;
    try {
      if (/\.xml$/i.test(fileName)) {
        const xml = fs.readFileSync(filePath, "utf-8");
        const { parseXMLCreditReport } = await import("./credit-monitor");
        const xmlData = parseXMLCreditReport(xml);
        report = {
          scores: { equifax: xmlData.score, experian: null, transunion: null },
          negativeItems: (xmlData.accounts || []).filter((a: any) => a.isNegative).map((a: any) => ({
            creditorName: a.creditorName || "Unknown",
            accountNumber: a.accountNumber || "",
            accountType: a.type || "Other",
            negativeReason: "Derogatory",
            currentBalance: a.balance || 0,
            bureau: "unknown",
            paymentStatus: a.status || "Unknown",
            dateOpened: a.dateOpened || null,
            lastReported: null,
            remarks: [] as string[],
          })),
          inquiries: (xmlData.inquiries || []).map((i: any) => ({ creditor: i.creditor, date: i.date, bureau: i.type || "unknown" })),
          publicRecords: [] as { type: string; date: string; amount: number | null; status: string }[],
          summary: {
            totalAccounts: xmlData.totalAccounts || 0,
            negativeAccounts: xmlData.negativeAccounts || 0,
            utilizationPercent: xmlData.totalCreditLimit > 0 ? Math.round((xmlData.totalBalance / xmlData.totalCreditLimit) * 100) : 0,
            inquiryCount: xmlData.totalInquiries || 0,
          },
        };
      } else if (/\.txt$/i.test(fileName)) {
        const text = fs.readFileSync(filePath, "utf-8");
        report = parseCreditReportText(text);
      } else {
        report = await parseCreditReportPDF(filePath);
      }
    } catch (err: any) {
      await storage.createNotification({
        type: "warning",
        title: `Report Parse Failed: ${client.firstName} ${client.lastName}`,
        message: `Could not parse "${fileName}": ${err.message}. Upload a clearer PDF or try the text parser.`,
        clientId,
      });
      return;
    }

    recordUsageEvent({ eventType: "report_parsed", clientId, metadata: { format: fileName.split(".").pop(), automated: true }, quantity: 1 }).catch(() => {});

    if (report.scores) {
      const updates: any = {};
      if (report.scores.equifax) updates.equifaxScore = report.scores.equifax;
      if (report.scores.experian) updates.experianScore = report.scores.experian;
      if (report.scores.transunion) updates.transunionScore = report.scores.transunion;
      if (Object.keys(updates).length > 0) await storage.updateClient(clientId, updates);
    }

    const reportData = {
      scores: report.scores,
      negativeItems: (report.negativeItems || []).map((item: any) => ({
        creditorName: item.creditorName || "Unknown",
        accountNumber: item.accountNumber || "",
        accountType: item.accountType || "Other",
        negativeReason: item.negativeReason || item.negativeReason || null,
        currentBalance: item.currentBalance || item.balance || null,
        bureau: item.bureau || "unknown",
        paymentStatus: item.paymentStatus || item.status || "Unknown",
        dateOpened: item.dateOpened || null,
        lastReported: item.lastReported || null,
        remarks: item.remarks || [],
      })),
      inquiries: report.inquiries || [],
      publicRecords: report.publicRecords || [],
      summary: report.summary || { totalAccounts: 0, negativeAccounts: 0, utilizationPercent: 0, inquiryCount: 0 },
    };

    if (reportData.negativeItems.length === 0 && reportData.inquiries.length === 0) {
      await storage.createNotification({
        type: "success",
        title: `Clean Report: ${client.firstName} ${client.lastName}`,
        message: `Credit report "${fileName}" has no negative items. No disputes needed.`,
        clientId,
      });
      return;
    }

    let specialistReport;
    try {
      specialistReport = await analyzeReportForDisputes({
        clientName: `${client.firstName} ${client.lastName}`,
        reportData,
      });
      recordUsageEvent({ eventType: "ai_analysis", clientId, metadata: { type: "credit_specialist", automated: true }, quantity: 1 }).catch(() => {});
    } catch (err: any) {
      await storage.createNotification({
        type: "warning",
        title: `AI Analysis Failed: ${client.firstName} ${client.lastName}`,
        message: `Credit specialist AI could not analyze the report: ${err.message}`,
        clientId,
      });
      return;
    }

    const existingDisputes = await storage.getDisputesByClient(clientId);
    const disputedKeys = new Set(existingDisputes.map((d: any) => `${d.accountName?.toLowerCase()}::${d.bureau}`));

    let disputesCreated = 0;
    let disputesFailed = 0;
    const sortedItems = [...specialistReport.negativeItemAnalysis].sort((a, b) => b.priorityScore - a.priorityScore);

    const bureaus = ["equifax", "experian", "transunion"] as const;

    for (const item of sortedItems) {
      for (const bureau of bureaus) {
        const dedupeKey = `${item.creditorName.toLowerCase()}::${bureau}`;
        if (disputedKeys.has(dedupeKey)) continue;

        try {
          const letter = generateFCRADisputeLetter({
            clientName: `${client.firstName}${(client as any).middleName ? " " + (client as any).middleName : ""} ${client.lastName}${(client as any).suffix ? " " + (client as any).suffix : ""}`,
            clientAddress: [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || undefined,
            clientSSNLast4: (client as any).ssn ? (client as any).ssn.slice(-4) : undefined,
            clientDOB: (client as any).dob || undefined,
            bureau: bureau as "equifax" | "experian" | "transunion",
            accountName: item.creditorName,
            accountNumber: item.accountNumber || undefined,
            reason: `${item.disputeReason} [${item.legalBasis}]`,
            disputeType: item.disputeType,
          });

          await storage.createDispute({
            clientId,
            bureau: bureau as "equifax" | "experian" | "transunion",
            accountName: item.creditorName,
            accountNumber: item.accountNumber || undefined,
            reason: `${item.disputeReason} [${item.legalBasis}]`,
            status: "preparing",
            disputeType: item.disputeType,
            letterContent: letter,
          });

          recordUsageEvent({ eventType: "dispute_filed", clientId, metadata: { bureau, creditor: item.creditorName, automated: true }, quantity: 1 }).catch(() => {});
          recordUsageEvent({ eventType: "dispute_letter_generated", clientId, metadata: { bureau, automated: true }, quantity: 1 }).catch(() => {});
          disputesCreated++;
          disputedKeys.add(dedupeKey);
        } catch (err: any) {
          disputesFailed++;
          console.error(`[Auto-Dispute] Failed to create dispute for ${item.creditorName} (${bureau}):`, err.message);
        }
      }
    }

    const highItems = sortedItems.filter(i => i.removalProbability === "high").length;
    const medItems = sortedItems.filter(i => i.removalProbability === "medium").length;

    await storage.createNotification({
      type: "success",
      title: `Auto-Analysis Complete: ${client.firstName} ${client.lastName}`,
      message: `Credit Specialist AI analyzed "${fileName}" — ${sortedItems.length} negative items found (${highItems} high removal probability, ${medItems} medium). Created ${disputesCreated} dispute letters with FCRA citations, ready for e-OSCAR submission.${disputesFailed > 0 ? ` ${disputesFailed} disputes failed to create.` : ""} ${specialistReport.estimatedTimeline}`,
      clientId,
    });
  }

  app.post("/clients/:clientId/auto-analyze", async (req, res) => {
    try {
      const clientId = getRouteParam(req.params.clientId);
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const disputes = await storage.getDisputesByClient(clientId);

      const negativeItems = disputes.map((d: any) => ({
        creditorName: d.accountName,
        accountNumber: d.accountNumber || "",
        accountType: d.disputeType || "Other",
        negativeReason: d.reason,
        currentBalance: null,
        bureau: d.bureau,
        paymentStatus: d.status,
        dateOpened: null,
        lastReported: null,
        remarks: [] as string[],
      }));

      const specialistReport = await analyzeReportForDisputes({
        clientName: `${client.firstName} ${client.lastName}`,
        reportData: {
          scores: {
            equifax: (client as any).equifaxScore ?? null,
            experian: (client as any).experianScore ?? null,
            transunion: (client as any).transunionScore ?? null,
          },
          negativeItems,
          inquiries: [],
          publicRecords: [],
          summary: {
            totalAccounts: disputes.length,
            negativeAccounts: negativeItems.length,
            utilizationPercent: 0,
            inquiryCount: 0,
          },
        },
      });

      recordUsageEvent({ eventType: "ai_analysis", clientId, metadata: { type: "credit_specialist_manual" }, quantity: 1 }).catch(() => {});

      const existingKeys = new Set(disputes.map((d: any) => `${d.accountName?.toLowerCase()}::${d.bureau}`));
      let disputesCreated = 0;
      let disputesFailed = 0;
      const sorted = [...specialistReport.negativeItemAnalysis].sort((a, b) => b.priorityScore - a.priorityScore);

      for (const item of sorted) {
        for (const bureau of ["equifax", "experian", "transunion"] as const) {
          const key = `${item.creditorName.toLowerCase()}::${bureau}`;
          if (existingKeys.has(key)) continue;

          try {
            const letter = generateFCRADisputeLetter({
              clientName: `${client.firstName} ${client.lastName}`,
              clientAddress: [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || undefined,
              clientSSNLast4: (client as any).ssn ? (client as any).ssn.slice(-4) : undefined,
              clientDOB: (client as any).dob || undefined,
              bureau: bureau as "equifax" | "experian" | "transunion",
              accountName: item.creditorName,
              accountNumber: item.accountNumber || undefined,
              reason: `${item.disputeReason} [${item.legalBasis}]`,
              disputeType: item.disputeType,
            });

            await storage.createDispute({
              clientId,
              bureau: bureau as "equifax" | "experian" | "transunion",
              accountName: item.creditorName,
              accountNumber: item.accountNumber || undefined,
              reason: `${item.disputeReason} [${item.legalBasis}]`,
              status: "preparing",
              disputeType: item.disputeType,
              letterContent: letter,
            });

            disputesCreated++;
            existingKeys.add(key);
          } catch {
            disputesFailed++;
          }
        }
      }

      res.json({
        success: true,
        specialistReport,
        disputesCreated,
        disputesFailed,
        message: `AI analyzed ${negativeItems.length} items, created ${disputesCreated} new dispute letters (${disputesFailed} failed) ready for e-OSCAR submission`,
      });
    } catch (e) { handleError(res, e); }
  });

  // ─── CREDIT PREDICTOR ROUTES ─────────────────────────────────────────────

  app.post("/credit-predictor/analyze", async (req, res) => {
    try {
      const input = req.body as CreditFactorInput;
      if (!input || input.totalAccounts === undefined) return res.status(400).json({ message: "Credit factor input required" });
      const analysis = analyzeCreditFactors(input);
      res.json(analysis);
    } catch (e) { handleError(res, e); }
  });

  app.post("/credit-predictor/default-risk", async (req, res) => {
    try {
      const input = req.body as DefaultPredictionInput;
      if (!input || input.creditLimit === undefined || input.balance === undefined) return res.status(400).json({ message: "creditLimit and balance are required" });
      if (!Array.isArray(input.paymentHistory)) input.paymentHistory = [];
      if (!Array.isArray(input.billAmounts)) input.billAmounts = [];
      if (!Array.isArray(input.payAmounts)) input.payAmounts = [];
      const prediction = predictDefault(input);
      res.json(prediction);
    } catch (e) { handleError(res, e); }
  });

  app.post("/credit-predictor/analyze-client/:id", async (req, res) => {
    try {
      const clientId = req.params.id;
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      const input = req.body as CreditFactorInput;
      const analysis = analyzeCreditFactors(input);

      await saveCreditFactorSnapshot(clientId, {
        creditCardUtilization: input.creditCardUtilization,
        paymentHistoryScore: Math.round((input.onTimePayments / Math.max(input.totalPayments, 1)) * 100),
        derogatoryMarks: input.derogatoryMarks,
        creditAgeMonths: input.creditAgeMonths,
        totalAccounts: input.totalAccounts,
        hardInquiries: input.hardInquiries,
        totalBalance: input.totalBalance,
        totalCreditLimit: input.totalCreditLimit,
        collectionsCount: input.collectionsCount,
        publicRecords: input.publicRecords,
        onTimePayments: input.onTimePayments,
        totalPayments: input.totalPayments,
        overallScore: analysis.predictedScore,
        predictedScore30d: analysis.predictions.days30,
        predictedScore90d: analysis.predictions.days90,
        predictedScore180d: analysis.predictions.days180,
      });

      res.json(analysis);
    } catch (e) { handleError(res, e); }
  });

  app.get("/credit-factors/:clientId/history", async (req, res) => {
    try {
      const history = await getCreditFactorHistory(req.params.clientId);
      res.json(history);
    } catch (e) { handleError(res, e); }
  });

  // ─── FINANCIAL REPORTS ROUTES ──────────────────────────────────────────────

  app.get("/financial-reports/sales", async (req, res) => {
    try {
      const period = (req.query.period as string) || "monthly";
      if (!["daily", "weekly", "monthly", "yearly"].includes(period)) return res.status(400).json({ message: "Invalid period" });
      const report = await getSalesReport(period as any);
      res.json(report);
    } catch (e) { handleError(res, e); }
  });

  app.get("/financial-reports/client/:id", async (req, res) => {
    try {
      const summary = await getClientFinancialSummary(req.params.id);
      if (!summary) return res.status(404).json({ message: "Client not found" });
      res.json(summary);
    } catch (e) { handleError(res, e); }
  });

  app.get("/financial-reports/forecast", async (_req, res) => {
    try {
      const forecast = await getRevenueForecasting();
      res.json(forecast);
    } catch (e) { handleError(res, e); }
  });

  // ─── CREDIT SALES (POS) ROUTES ─────────────────────────────────────────────

  app.get("/credit-sales", async (req, res) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const sales = await getCreditSales(clientId);
      res.json(sales);
    } catch (e) { handleError(res, e); }
  });

  app.post("/credit-sales", async (req, res) => {
    try {
      const { clientId, description, amount, creditTerms, dueDate, notes } = req.body;
      if (!clientId || !description || !amount) return res.status(400).json({ message: "Client, description, and amount required" });
      const sale = await createCreditSale({ clientId, description, amount: Math.round(amount), creditTerms, dueDate, notes });
      res.json(sale);
    } catch (e) { handleError(res, e); }
  });

  app.post("/credit-sales/:id/payment", async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount) return res.status(400).json({ message: "Payment amount required" });
      const sale = await recordCreditSalePayment(req.params.id, Math.round(amount));
      if (!sale) return res.status(404).json({ message: "Credit sale not found" });
      res.json(sale);
    } catch (e) { handleError(res, e); }
  });

  // ─── BUREAU CONFIG (Innovis/CBC) ───────────────────────────────────────────

  // ─── CREDIT MONITORING ROUTES ─────────────────────────────────────────────

  app.get("/credit-monitor/config", async (_req, res) => {
    try {
      const config = await getMonitoringConfig();
      res.json(config);
    } catch (e) { handleError(res, e); }
  });

  app.post("/credit-monitor/config", async (req, res) => {
    try {
      const config = await setMonitoringConfig(req.body);
      res.json(config);
    } catch (e) { handleError(res, e); }
  });

  app.post("/credit-monitor/scan", async (_req, res) => {
    try {
      const alerts = await detectScoreChanges();
      const created = await createAlertsAsNotifications(alerts);
      res.json({ alerts, notificationsCreated: created });
    } catch (e) { handleError(res, e); }
  });

  app.get("/credit-monitor/history/:clientId", async (req, res) => {
    try {
      const history = await getClientScoreHistory(req.params.clientId);
      res.json(history);
    } catch (e) { handleError(res, e); }
  });

  app.post("/credit-report/parse-xml", async (req, res) => {
    try {
      const { xml } = req.body;
      if (!xml) return res.status(400).json({ message: "XML content required" });
      const parsed = parseXMLCreditReport(xml);
      res.json(parsed);
    } catch (e) { handleError(res, e); }
  });

  // ─── USAGE METERING ROUTES ───────────────────────────────────────────────

  app.get("/usage/summary", async (req, res) => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const summary = await getUsageSummary(startDate, endDate);
      res.json(summary);
    } catch (e) { handleError(res, e); }
  });

  app.get("/usage/report", async (req, res) => {
    try {
      const period = (req.query.period as string) || "monthly";
      const report = await getUsageReport(period as any);
      res.json(report);
    } catch (e) { handleError(res, e); }
  });

  app.get("/usage/events", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await getRecentEvents(limit);
      res.json(events);
    } catch (e) { handleError(res, e); }
  });

  app.get("/usage/client/:clientId", async (req, res) => {
    try {
      const events = await getClientUsage(req.params.clientId);
      res.json(events);
    } catch (e) { handleError(res, e); }
  });

  app.get("/usage/pricing", async (_req, res) => {
    try {
      res.json(getPricing());
    } catch (e) { handleError(res, e); }
  });

  app.post("/usage/record", async (req, res) => {
    try {
      const { eventType, clientId, metadata, quantity } = req.body;
      if (!eventType) return res.status(400).json({ message: "eventType required" });
      const event = await recordUsageEvent({ eventType, clientId, metadata, quantity: quantity || 1 });
      res.json(event);
    } catch (e) { handleError(res, e); }
  });

  // ─── TRUST ACCOUNTING / LEDGER ROUTES ────────────────────────────────────

  app.get("/trust-accounts", async (_req, res) => {
    try {
      await ensureLedgerTables();
      const accounts = await getAllTrustAccounts();
      res.json(accounts);
    } catch (e) { handleError(res, e); }
  });

  app.get("/trust-accounts/summary", async (_req, res) => {
    try {
      await ensureLedgerTables();
      const summary = await getAccountSummary();
      res.json(summary);
    } catch (e) { handleError(res, e); }
  });

  app.get("/trust-accounts/reconcile", async (_req, res) => {
    try {
      await ensureLedgerTables();
      const result = await reconcileTrustAccounts();
      res.json(result);
    } catch (e) { handleError(res, e); }
  });

  app.get("/trust-accounts/chart-of-accounts", (_req, res) => {
    res.json({
      assets: [
        { code: "1000", name: "Client Trust Account", type: "asset", subtype: "current", description: "Funds held in trust for clients" },
        { code: "1100", name: "Operating Cash", type: "asset", subtype: "current", description: "Company operating funds" },
        { code: "1200", name: "Accounts Receivable", type: "asset", subtype: "current", description: "Outstanding client invoices" },
        { code: "1500", name: "Prepaid Bureau Fees", type: "asset", subtype: "current", description: "Prepaid bureau API subscription fees" },
      ],
      liabilities: [
        { code: "2000", name: "Client Trust Liability", type: "liability", subtype: "current", description: "Obligation to return client trust funds" },
        { code: "2100", name: "Accounts Payable", type: "liability", subtype: "current", description: "Outstanding bills to vendors/partners" },
        { code: "2200", name: "Unearned Revenue", type: "liability", subtype: "current", description: "Prepaid service fees not yet earned" },
        { code: "2300", name: "Partner Payouts Payable", type: "liability", subtype: "current", description: "Owed tradeline partner payouts" },
      ],
      revenue: [
        { code: "4000", name: "Credit Repair Service Fees", type: "revenue", description: "Monthly credit repair subscription fees" },
        { code: "4100", name: "Tradeline Placement Revenue", type: "revenue", description: "Revenue from AU tradeline placements" },
        { code: "4200", name: "Credit Builder Revenue", type: "revenue", description: "Revenue from credit builder product enrollments" },
        { code: "4300", name: "Consultation Fees", type: "revenue", description: "One-time consultation and setup fees" },
      ],
      expenses: [
        { code: "5000", name: "Bureau API Costs", type: "expense", description: "Equifax/Experian/TransUnion API usage fees" },
        { code: "5100", name: "Partner Payouts", type: "expense", description: "Payments to AU tradeline cardholders" },
        { code: "5200", name: "Software & Tools", type: "expense", description: "CRM, e-OSCAR, and other platform costs" },
        { code: "5300", name: "AI/GPT Usage", type: "expense", description: "OpenAI API costs for dispute letters and analysis" },
        { code: "5400", name: "Marketing", type: "expense", description: "Advertising and client acquisition costs" },
        { code: "5500", name: "Insurance & Compliance", type: "expense", description: "E&O insurance, bond, and compliance costs" },
      ],
    });
  });

  app.get("/trust-accounts/:clientId", async (req, res) => {
    try {
      await ensureLedgerTables();
      const account = await getClientTrustAccount(req.params.clientId);
      if (!account) return res.status(404).json({ message: "No trust account found" });
      res.json(account);
    } catch (e) { handleError(res, e); }
  });

  app.get("/trust-accounts/:clientId/balance", async (req, res) => {
    try {
      await ensureLedgerTables();
      const balance = await getTrustBalance(req.params.clientId);
      res.json({ clientId: req.params.clientId, balance });
    } catch (e) { handleError(res, e); }
  });

  app.post("/trust-accounts/:clientId/deposit", async (req, res) => {
    try {
      await ensureLedgerTables();
      const { amount, description } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ message: "Positive amount required (in cents)" });
      const entry = await recordTrustDeposit(req.params.clientId, amount, description || "Client trust deposit");
      res.json(entry);
    } catch (e) { handleError(res, e); }
  });

  app.post("/trust-accounts/:clientId/withdraw", async (req, res) => {
    try {
      await ensureLedgerTables();
      const { amount, description, category } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ message: "Positive amount required (in cents)" });
      const entry = await recordTrustWithdrawal(req.params.clientId, amount, description || "Trust withdrawal", category || "trust_withdrawal");
      res.json(entry);
    } catch (e) { handleError(res, e); }
  });

  app.get("/ledger", async (req, res) => {
    try {
      await ensureLedgerTables();
      const accountId = req.query.accountId as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const entries = await getLedgerEntries(accountId, limit);
      res.json(entries);
    } catch (e) { handleError(res, e); }
  });

  app.post("/ledger", async (req, res) => {
    try {
      await ensureLedgerTables();
      const { accountId, type, amount, description, category } = req.body;
      if (!accountId || !type || !amount || !description || !category) {
        return res.status(400).json({ message: "accountId, type, amount, description, category required" });
      }
      const entry = await recordLedgerEntry({ accountId, type, amount, description, category });
      res.json(entry);
    } catch (e) { handleError(res, e); }
  });

  // ─── FINANCIAL CALCULATOR ROUTES ──────────────────────────────────────────

  app.post("/calculator/loan", async (req, res) => {
    try {
      const { principal, annualRate, termMonths } = req.body;
      if (!principal || annualRate === undefined || !termMonths) return res.status(400).json({ message: "principal, annualRate, termMonths required" });
      res.json(calculateLoanPayment(principal, annualRate, termMonths));
    } catch (e) { handleError(res, e); }
  });

  app.post("/calculator/debt-payoff", async (req, res) => {
    try {
      const { debts, extraPayment, method } = req.body;
      if (!debts || !Array.isArray(debts)) return res.status(400).json({ message: "debts array required (name, balance, rate, minPayment)" });
      res.json(calculateDebtPayoff(debts, extraPayment || 0, method || "avalanche"));
    } catch (e) { handleError(res, e); }
  });

  app.post("/calculator/repair-roi", async (req, res) => {
    try {
      const { currentScore, projectedScore, totalDebt, repairCost, loanTermMonths } = req.body;
      if (!currentScore || !projectedScore || !totalDebt) return res.status(400).json({ message: "currentScore, projectedScore, totalDebt required" });
      res.json(calculateCreditRepairROI(currentScore, projectedScore, totalDebt, repairCost || 0, loanTermMonths || 360));
    } catch (e) { handleError(res, e); }
  });

  app.post("/calculator/compound-interest", async (req, res) => {
    try {
      const { principal, annualRate, years, compoundingPerYear, periodicContribution } = req.body;
      if (principal === undefined || annualRate === undefined || !years) return res.status(400).json({ message: "principal, annualRate, years required" });
      res.json(calculateCompoundInterest(principal, annualRate, years, compoundingPerYear || 12, periodicContribution || 0));
    } catch (e) { handleError(res, e); }
  });

  app.post("/calculator/dti", async (req, res) => {
    try {
      const { monthlyDebtPayments, monthlyGrossIncome } = req.body;
      if (monthlyDebtPayments === undefined || !monthlyGrossIncome) return res.status(400).json({ message: "monthlyDebtPayments, monthlyGrossIncome required" });
      res.json(calculateDebtToIncomeRatio(monthlyDebtPayments, monthlyGrossIncome));
    } catch (e) { handleError(res, e); }
  });

  app.get("/bureau/status-all", async (_req, res) => {
    try {
      res.json(await getAllBureauConfigStatuses(storage));
    } catch (e) { handleError(res, e); }
  });


  // ─── AUTOMATION ENGINE ────────────────────────────────────────────────────

  app.get("/automation/rules", async (_req, res) => {
    try { res.json(await getAutomationRules()); } catch (e) { handleError(res, e); }
  });

  app.get("/automation/rules/:id", async (req, res) => {
    try {
      const rule = await getAutomationRule(req.params.id);
      if (!rule) return res.status(404).json({ message: "Rule not found" });
      res.json(rule);
    } catch (e) { handleError(res, e); }
  });

  app.post("/automation/rules", async (req, res) => {
    try {
      const rule = await createAutomationRule(req.body);
      res.status(201).json(rule);
    } catch (e) { handleError(res, e); }
  });

  app.put("/automation/rules/:id", async (req, res) => {
    try {
      const rule = await updateAutomationRule(req.params.id, req.body);
      res.json(rule);
    } catch (e) { handleError(res, e); }
  });

  app.patch("/automation/rules/:id", async (req, res) => {
    try {
      const rule = await updateAutomationRule(req.params.id, req.body);
      res.json(rule);
    } catch (e) { handleError(res, e); }
  });

  app.delete("/automation/rules/:id", async (req, res) => {
    try {
      await deleteAutomationRule(req.params.id);
      res.json({ success: true });
    } catch (e) { handleError(res, e); }
  });

  app.patch("/automation/rules/:id/toggle", async (req, res) => {
    try {
      const { enabled } = req.body;
      const rule = await toggleAutomationRule(req.params.id, enabled);
      res.json(rule);
    } catch (e) { handleError(res, e); }
  });

  app.post("/automation/rules/:id/execute", async (req, res) => {
    try {
      const run = await executeAutomationRule(req.params.id);
      res.json(run);
    } catch (e) { handleError(res, e); }
  });

  app.get("/automation/runs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      res.json(await getAutomationRuns(limit));
    } catch (e) { handleError(res, e); }
  });

  app.get("/automation/rules/:id/runs", async (req, res) => {
    try { res.json(await getRunsForRule(req.params.id)); } catch (e) { handleError(res, e); }
  });

  app.get("/automation/stats", async (_req, res) => {
    try { res.json(await getAutomationStats()); } catch (e) { handleError(res, e); }
  });

  app.get("/automation/workflow-types", (_req, res) => {
    res.json(getWorkflowTypes());
  });

  app.post("/automation/seed", async (_req, res) => {
    try {
      const count = await seedDefaultRules();
      res.json({ seeded: count });
    } catch (e) { handleError(res, e); }
  });

  app.post("/automation/reseed", async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      await db.execute(sql`DELETE FROM automation_runs`);
      await db.execute(sql`DELETE FROM automation_rules`);
      const count = await seedDefaultRules();
      res.json({ reseeded: count, message: `Cleared and reseeded ${count} automation rules including AI bot workers` });
    } catch (e) { handleError(res, e); }
  });

  // ─── SSN VERIFICATION ───────────────────────────────────────────────────────

  app.post("/verify/ssn", async (req, res) => {
    try {
      const { ssn, firstName, lastName, dob } = req.body;
      if (!ssn) return res.status(400).json({ message: "SSN is required" });
      const cleaned = ssn.replace(/\D/g, "");
      if (cleaned.length !== 9) return res.status(400).json({ message: "SSN must be 9 digits" });

      const isInvalidArea = ["000", "666"].includes(cleaned.slice(0, 3)) || cleaned.slice(0, 3) >= "900";
      const isInvalidGroup = cleaned.slice(3, 5) === "00";
      const isInvalidSerial = cleaned.slice(5) === "0000";
      const isITIN = cleaned[0] === "9" && ["7", "8"].includes(cleaned[1]);
      const isAdvertising = cleaned >= "987654320" && cleaned <= "987654329";

      const valid = !isInvalidArea && !isInvalidGroup && !isInvalidSerial && !isAdvertising;
      const areaNumber = parseInt(cleaned.slice(0, 3));
      const issueEra = areaNumber <= 586 ? "pre-2011-randomization" : "post-2011-randomization";

      recordUsageEvent({ eventType: "ssn_verification", quantity: 1 }).catch(() => {});
      res.json({
        valid,
        itin: isITIN,
        formatted: `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`,
        last4: cleaned.slice(-4),
        issueEra,
        warnings: [
          ...(!valid ? ["SSN format is invalid"] : []),
          ...(isITIN ? ["This appears to be an ITIN, not an SSN"] : []),
          ...(isAdvertising ? ["This is a known advertising/test SSN"] : []),
        ],
        nameMatch: firstName && lastName ? { provided: `${firstName} ${lastName}`, status: "verification_required" } : null,
      });
    } catch (e) { handleError(res, e); }
  });

  // ─── SKIP TRACING ─────────────────────────────────────────────────────────

  app.post("/skip-trace", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, address, city, state, zip, ssn } = req.body;
      if (!firstName || !lastName) return res.status(400).json({ message: "First and last name required" });

      const prompt = `You are a skip tracing AI specialist. Given the following information about a person, generate a comprehensive skip trace report with all likely current and previous contact information, addresses, and associated records.

Name: ${firstName} ${lastName}
${email ? `Email: ${email}` : ""}
${phone ? `Phone: ${phone}` : ""}
${address ? `Address: ${address}, ${city || ""}, ${state || ""} ${zip || ""}` : ""}
${ssn ? `SSN Last 4: ${ssn.slice(-4)}` : ""}

Generate a detailed skip trace report with:
1. IDENTITY VERIFICATION - Name variants, DOB range, SSN validation
2. CURRENT ADDRESS - Best known current residence
3. PREVIOUS ADDRESSES - Last 5 known addresses with dates
4. PHONE NUMBERS - Current and previous (landline, mobile, VoIP)
5. EMAIL ADDRESSES - All known email addresses
6. EMPLOYMENT - Current and previous employers
7. ASSOCIATES - Known relatives and associates
8. PUBLIC RECORDS - Liens, judgments, bankruptcies, UCCs
9. SOCIAL MEDIA - Identified profiles
10. CREDIT HEADER DATA - Summary from credit bureau headers
11. CONFIDENCE SCORE - Overall data confidence (0-100)

Format as structured data.`;

      const analysis = await chatWithAI(prompt);
      recordUsageEvent({ eventType: "skip_trace", metadata: { name: `${firstName} ${lastName}` }, quantity: 1 }).catch(() => {});

      res.json({
        subject: { firstName, lastName, email, phone },
        report: analysis,
        timestamp: new Date().toISOString(),
        source: "ai_analysis",
      });
    } catch (e) { handleError(res, e); }
  });

  // ─── CREDIT CHECK (SOFT PULL SIMULATION) ──────────────────────────────────

  app.post("/credit-check", async (req, res) => {
    try {
      const { clientId, checkType } = req.body;
      if (!clientId) return res.status(400).json({ message: "clientId required" });

      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const scores: Record<string, number | null> = {
        equifax: client.equifaxScore ?? null,
        experian: client.experianScore ?? null,
        transunion: client.transunionScore ?? null,
      };
      const avgScore = Object.values(scores).filter(Boolean).reduce((a: number, b) => a + (b || 0), 0) /
        Math.max(Object.values(scores).filter(Boolean).length, 1);

      const disputes = await storage.getDisputesByClient(clientId);
      const tradelines = (await storage.getTradelines()).filter((t: any) => t.clientId === clientId);
      const reports = await storage.getReportsByClient(clientId);

      const riskLevel = avgScore >= 700 ? "low" : avgScore >= 600 ? "medium" : avgScore >= 500 ? "high" : "critical";
      const creditworthy = avgScore >= 620;

      let aiSummary = "";
      try {
        aiSummary = await analyzeClientCredit({
          clientName: `${client.firstName} ${client.lastName}`,
          scores: Object.fromEntries(Object.entries(scores).filter(([, v]) => v !== null)) as Record<string, number>,
          negativeItems: disputes.map((d: any) => d.accountName),
          goal: client.goalScore ? `Reach ${client.goalScore}` : undefined,
        });
      } catch {}

      recordUsageEvent({ eventType: "credit_check", metadata: { clientId, checkType: checkType || "soft" }, quantity: 1 }).catch(() => {});

      res.json({
        client: { id: client.id, name: `${client.firstName} ${client.lastName}` },
        scores,
        averageScore: Math.round(avgScore),
        riskLevel,
        creditworthy,
        openDisputes: disputes.filter((d: any) => d.status === "preparing" || d.status === "sent").length,
        activeTradelines: tradelines.filter((t: any) => t.status === "active" || t.status === "placed").length,
        reportsOnFile: reports.length,
        aiAnalysis: aiSummary,
        checkType: checkType || "soft",
        timestamp: new Date().toISOString(),
      });
    } catch (e) { handleError(res, e); }
  });

  // ─── PAPERWORK AUTOMATION WORKER ──────────────────────────────────────────

  app.post("/paperwork/generate", async (req, res) => {
    try {
      const { clientId, documentType, customInstructions } = req.body;
      if (!clientId || !documentType) return res.status(400).json({ message: "clientId and documentType required" });

      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const disputes = await storage.getDisputesByClient(clientId);
      const clientName = `${client.firstName} ${client.lastName}`;
      const clientAddress = [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ");

      const DOC_TYPES: Record<string, string> = {
        "fcra_dispute": "FCRA Section 611 Dispute Letter to credit bureau requesting investigation of inaccurate items",
        "fdcpa_validation": "FDCPA Section 809 Debt Validation Letter demanding proof of debt from collector",
        "fcba_billing_error": "FCBA Billing Error Dispute Letter for unauthorized charges or billing mistakes",
        "cease_desist": "Cease and Desist Letter ordering debt collector to stop all contact",
        "goodwill_letter": "Goodwill Adjustment Letter requesting removal of negative item based on positive payment history",
        "pay_for_delete": "Pay-for-Delete Settlement Letter offering payment in exchange for removal of negative reporting",
        "intent_to_sue": "Intent to Sue Letter for FCRA/FDCPA violations with 15-day cure notice",
        "cfpb_complaint": "CFPB Complaint Narrative for filing with Consumer Financial Protection Bureau",
        "ag_complaint": "Attorney General Complaint Letter for state-level consumer protection enforcement",
        "id_theft_affidavit": "FTC Identity Theft Affidavit (Form 14039) for fraudulent accounts",
        "credit_freeze": "Credit Freeze/Thaw Request Letter for all three bureaus",
        "opt_out": "Pre-Screened Offer Opt-Out Letter to reduce hard inquiries from prescreened offers",
        "authorized_user_agreement": "Authorized User Agreement between cardholder partner and credit repair company",
        "client_engagement": "Client Engagement Agreement for credit repair services (CROA-compliant)",
        "power_of_attorney": "Limited Power of Attorney for credit repair representative actions",
        "right_to_cancel": "Notice of Right to Cancel (CROA § 1679e) — 3-day cancellation notice",
        "invoice": "Professional invoice for credit repair services rendered",
        "progress_report": "Client Progress Report summarizing score changes, disputes, and tradeline activity",
      };

      const docDescription = DOC_TYPES[documentType] || documentType;

      const prompt = `You are a Consumer Credit Law Expert and Document Specialist. Generate a complete, professional, legally-compliant document.

DOCUMENT TYPE: ${docDescription}

CLIENT INFO:
- Name: ${clientName}
- Address: ${clientAddress || "On file"}
- SSN Last 4: ${client.ssn ? client.ssn.slice(-4) : "XXXX"}
- Date of Birth: ${client.dateOfBirth || "On file"}

DISPUTE HISTORY:
${disputes.length > 0 ? disputes.slice(0, 10).map((d: any) => `- ${d.accountName} (${d.bureau}) — Status: ${d.status}`).join("\n") : "No disputes on file"}

${customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ""}

Generate the COMPLETE document ready to print and mail. Include:
- Proper header with date and addresses
- All required legal citations (FCRA, FDCPA, FCBA, CROA as applicable)
- Specific account details from client records
- Proper signature line
- Certified mail / return receipt notation where appropriate
- All legally required disclosures`;

      const document = await chatWithAI(prompt);
      recordUsageEvent({ eventType: "paperwork_generated", metadata: { clientId, documentType }, quantity: 1 }).catch(() => {});

      res.json({
        clientId,
        clientName,
        documentType,
        documentTitle: docDescription,
        content: document,
        generatedAt: new Date().toISOString(),
        availableTypes: Object.entries(DOC_TYPES).map(([key, desc]) => ({ key, description: desc })),
      });
    } catch (e) { handleError(res, e); }
  });

  app.get("/paperwork/types", (_req, res) => {
    res.json([
      { key: "fcra_dispute", label: "FCRA Dispute Letter", category: "disputes" },
      { key: "fdcpa_validation", label: "FDCPA Debt Validation", category: "disputes" },
      { key: "fcba_billing_error", label: "FCBA Billing Error", category: "disputes" },
      { key: "cease_desist", label: "Cease & Desist", category: "disputes" },
      { key: "goodwill_letter", label: "Goodwill Letter", category: "disputes" },
      { key: "pay_for_delete", label: "Pay-for-Delete", category: "disputes" },
      { key: "intent_to_sue", label: "Intent to Sue", category: "legal" },
      { key: "cfpb_complaint", label: "CFPB Complaint", category: "legal" },
      { key: "ag_complaint", label: "AG Complaint", category: "legal" },
      { key: "id_theft_affidavit", label: "ID Theft Affidavit", category: "legal" },
      { key: "credit_freeze", label: "Credit Freeze Request", category: "bureau" },
      { key: "opt_out", label: "Pre-Screened Opt-Out", category: "bureau" },
      { key: "authorized_user_agreement", label: "AU Agreement", category: "contracts" },
      { key: "client_engagement", label: "Client Agreement", category: "contracts" },
      { key: "power_of_attorney", label: "Limited POA", category: "contracts" },
      { key: "right_to_cancel", label: "Right to Cancel", category: "contracts" },
      { key: "invoice", label: "Invoice", category: "billing" },
      { key: "progress_report", label: "Progress Report", category: "reports" },
    ]);
  });

  // ─── AUTOMATED BUREAU PULL PER CLIENT ─────────────────────────────────────

  app.post("/bureau/auto-pull/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (!client.ssn) return res.status(400).json({ message: "Client SSN required for bureau pull" });

      const request = {
        firstName: client.firstName,
        lastName: client.lastName,
        ssn: client.ssn,
        dob: client.dateOfBirth || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        zip: client.zip || "",
      };

      const results = await pullAllBureauReports(request);
      const saved: any[] = [];

      for (const br of results) {
        if (br.success) {
          const report = await storage.createReport({
            clientId,
            equifaxScore: br.bureau === "equifax" ? br.score : undefined,
            experianScore: br.bureau === "experian" ? br.score : undefined,
            transunionScore: br.bureau === "transunion" ? br.score : undefined,
            rawData: br.rawData,
            negativeItems: 0,
          });
          saved.push({ bureau: br.bureau, score: br.score, reportId: report.id });

          if (br.score) {
            const update: any = {};
            if (br.bureau === "equifax") update.equifaxScore = br.score;
            else if (br.bureau === "experian") update.experianScore = br.score;
            else if (br.bureau === "transunion") update.transunionScore = br.score;
            if (Object.keys(update).length) await storage.updateClient(clientId, update);
          }
          recordUsageEvent({ eventType: "bureau_pull", metadata: { bureau: br.bureau, clientId, automated: true }, quantity: 1 }).catch(() => {});
        }
      }

      const analyze = req.body.analyze !== false;
      let aiAnalysis = null;
      if (analyze) {
        try {
          const scores: Record<string, number> = {};
          for (const br of results) { if (br.score) scores[br.bureau] = br.score; }
          if (Object.keys(scores).length > 0) {
            const disputes = await storage.getDisputesByClient(clientId);
            aiAnalysis = await analyzeClientCredit({
              clientName: `${client.firstName} ${client.lastName}`,
              scores,
              negativeItems: disputes.map((d: any) => d.accountName),
            });
          }
        } catch {}
      }

      res.json({
        clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        results: results.map(r => ({ bureau: r.bureau, success: r.success, score: r.score, error: r.error })),
        savedReports: saved,
        aiAnalysis,
      });
    } catch (e) { handleError(res, e); }
  });

  // ─── METRO 2 BATCH FURNISHING ─────────────────────────────────────────────

  app.post("/metro2/batch-furnish", async (req, res) => {
    try {
      const { bureaus, companyId, companyName } = req.body;
      const targetBureaus = bureaus || ["equifax", "experian", "transunion"];
      const cid = companyId || "CRP001";
      const cname = companyName || "CreditRepair Pro LLC";

      const clients = await storage.getClients();
      const tradelines = await storage.getTradelines();
      const activeTL = tradelines.filter((t: any) => t.status === "active" || t.status === "placed");
      const results: any[] = [];

      for (const client of clients) {
        if (client.status !== "active" || !client.ssn) continue;
        const clientTL = activeTL.filter((t: any) => t.clientId === client.id);
        if (clientTL.length === 0) continue;

        const records: any[] = clientTL.map((tl: any) => ({
          client: client,
          accountNumber: `AU-${client.id.slice(0, 8)}-${tl.id.slice(0, 4)}`,
          portfolioType: "R" as const,
          accountType: "18",
          accountStatus: "11",
          ecoaCode: "3",
          creditLimit: tl.creditLimit || 0,
          currentBalance: 0,
          dateOpened: tl.createdAt || new Date().toISOString(),
          dateOfAccountInfo: new Date().toISOString(),
          paymentHistory: "111111111111111111111111",
          companyId: cid,
          reportType: "M" as const,
        }));

        for (const bureau of targetBureaus) {
          try {
            const file = buildMetro2File(records, cid, cname);
            const submission = await storage.createMetro2Submission({
              clientId: client.id, bureau, accountNumber: `AU-${client.id.slice(0, 8)}`,
              portfolioType: "R", accountStatus: "11", ecoaCode: "3",
              creditLimit: clientTL.reduce((s: number, t: any) => s + (t.creditLimit || 0), 0),
              currentBalance: 0, status: "generated", fileContent: file,
              reportType: "M", submittedAt: null,
            });
            results.push({ clientId: client.id, clientName: `${client.firstName} ${client.lastName}`, bureau, submissionId: submission.id, records: records.length });
            recordUsageEvent({ eventType: "metro2_generated", metadata: { bureau, clientId: client.id, batch: true }, quantity: 1 }).catch(() => {});
          } catch {}
        }
      }

      const uniqueClients = new Set(results.map((r: any) => r.clientId)).size;
      res.json({ totalClients: uniqueClients, totalSubmissions: results.length, submissions: results });
    } catch (e) { handleError(res, e); }
  });

  // ─── ENHANCED TRUST ACCOUNTING ROUTES ─────────────────────────────────────

  app.post("/trust-accounts/invoice", async (req, res) => {
    try {
      const { clientId, items, dueDate, notes } = req.body;
      if (!clientId || !items || !Array.isArray(items)) return res.status(400).json({ message: "clientId and items[] required" });
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const totalCents = items.reduce((sum: number, item: any) => sum + Math.round((item.amount || 0) * (item.quantity || 1) * 100), 0);
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      const invoiceData = {
        invoiceNumber,
        clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        clientEmail: client.email,
        items: items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: Math.round((item.amount || 0) * 100),
          total: Math.round((item.amount || 0) * (item.quantity || 1) * 100),
        })),
        subtotal: totalCents,
        tax: 0,
        total: totalCents,
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        notes: notes || "",
        createdAt: new Date().toISOString(),
        companyName: "CreditRepair Pro LLC",
        companyAddress: "Nationwide (Remote)",
        companyPhone: "(888) 976-7280",
        companyEmail: "support@infinitearcadia.com",
      };

      recordUsageEvent({ eventType: "invoice_generated", metadata: { clientId, invoiceNumber }, quantity: 1 }).catch(() => {});
      res.json(invoiceData);
    } catch (e) { handleError(res, e); }
  });

  app.post("/trust-accounts/profit-loss", async (_req, res) => {
    try {
      const summary = await getAccountSummary();
      const accounts = await getAllTrustAccounts();
      const entries = await getLedgerEntries(undefined, 200);

      const byCategory: Record<string, number> = {};
      for (const e of entries) {
        const key = `${e.type}_${e.category}`;
        byCategory[key] = (byCategory[key] || 0) + e.amount;
      }

      res.json({
        period: "Current Period",
        revenue: {
          serviceFees: byCategory["debit_service_fee"] || 0,
          partnerPayouts: byCategory["debit_partner_payout"] || 0,
          totalRevenue: summary.totalRevenue,
        },
        expenses: {
          bureauFees: byCategory["debit_bureau_fee"] || 0,
          refunds: byCategory["debit_refund"] || 0,
          totalExpenses: summary.totalExpenses,
        },
        netIncome: summary.netIncome,
        trustFunds: summary.totalTrustFunds,
        accountsCount: summary.accountsCount,
        generatedAt: new Date().toISOString(),
      });
    } catch (e) { handleError(res, e); }
  });

  // ─── ONBOARDING ENGINE ─────────────────────────────────────────────────────
  app.get("/onboarding/:clientId", async (req, res) => {
    try {
      const steps = await db.select().from(onboardingSteps).where(eq(onboardingSteps.clientId, req.params.clientId));
      if (steps.length === 0) {
        const newSteps = await initializeOnboarding(req.params.clientId);
        return res.json({ steps: newSteps, progress: 0 });
      }
      const completed = steps.filter(s => s.status === "completed").length;
      res.json({ steps, progress: Math.round((completed / steps.length) * 100) });
    } catch (e) { handleError(res, e); }
  });

  app.post("/onboarding/:clientId/advance", async (req, res) => {
    try {
      const { step, data } = req.body;
      const result = await advanceOnboarding(req.params.clientId, step, data);
      res.json(result);
    } catch (e) { handleError(res, e); }
  });

  app.post("/onboarding/:clientId/auto-advance", async (req, res) => {
    try {
      const steps = await db.select().from(onboardingSteps).where(eq(onboardingSteps.clientId, req.params.clientId));
      const inProgress = steps.find(s => s.status === "in_progress");
      if (!inProgress) return res.json({ message: "No step in progress", complete: true });
      const result = await advanceOnboarding(req.params.clientId, inProgress.step, req.body.data);
      res.json(result);
    } catch (e) { handleError(res, e); }
  });

  app.get("/onboarding-steps", (_req, res) => {
    res.json(ONBOARDING_STEPS);
  });

  // ─── PLAID BANKING INTEGRATION ──────────────────────────────────────────────
  app.get("/plaid/status", async (_req, res) => {
    try {
      const config = await getPlaidConfigStatus(storage);
      res.json({
        configured: await isPlaidConfigured(),
        config,
      });
    } catch (e) { handleError(res, e); }
  });

  app.get("/plaid/config", async (_req, res) => {
    try {
      res.json(await getPlaidConfigStatus(storage));
    } catch (e) { handleError(res, e); }
  });

  app.post("/plaid/config", async (req, res) => {
    try {
      res.json(await savePlaidConfig(req.body, storage));
    } catch (e) {
      if (e instanceof ProviderConfigValidationError) {
        return res.status(400).json({ message: e.message, errors: e.fields });
      }

      const message = e instanceof Error ? e.message : "";
      if (message.includes("SENSITIVE_CONFIG_ENCRYPTION_KEY")) {
        return res.status(500).json({ message: "SENSITIVE_CONFIG_ENCRYPTION_KEY is required before saving sensitive configuration in production." });
      }

      handleError(res, e);
    }
  });

  app.post("/plaid/test", async (_req, res) => {
    try {
      res.json(await testPlaidConfigReadiness(storage));
    } catch (e) {
      if (e instanceof ProviderConfigValidationError) {
        return res.status(400).json({ message: e.message, errors: e.fields });
      }
      handleError(res, e);
    }
  });

  app.post("/plaid/create-link-token", async (req, res) => {
    try {
      const result = await createLinkToken(req.body.clientId || "system");
      res.json(result);
    } catch (e) { handleError(res, e); }
  });

  app.post("/plaid/exchange-token", async (req, res) => {
    try {
      const { publicToken, clientId, institutionName } = req.body;
      if (!publicToken || !clientId) return res.status(400).json({ message: "publicToken and clientId are required" });
      const result = await exchangePublicToken(publicToken);
      if ("error" in result) return res.status(400).json(result);
      const accounts = await getAccounts(result.accessToken);
      if ("error" in accounts) return res.status(400).json(accounts);

      const saved = [];
      for (const acct of accounts.accounts) {
        const [ba] = await db.insert(bankAccounts).values({
          clientId,
          plaidItemId: result.itemId,
          plaidAccessToken: encryptIfSensitive("plaid_access_token", result.accessToken),
          institutionName: institutionName || "Unknown",
          accountName: acct.name,
          accountType: acct.type,
          accountSubtype: acct.subtype || null,
          mask: acct.mask,
          balanceCurrent: acct.balanceCurrent,
          balanceAvailable: acct.balanceAvailable,
          balanceLimit: acct.balanceLimit,
          lastSynced: new Date(),
        }).returning();
        saved.push(sanitizeBankAccount(ba));
      }
      res.json({ accounts: saved });
    } catch (e) { handleError(res, e); }
  });

  const stripPlaidSecrets = (accts: any[]) => accts.map(sanitizeBankAccount);

  app.post("/bank-accounts", async (req, res) => {
    try {
      const { clientId, institutionName, accountName, accountType, accountSubtype, mask, balanceCurrent, balanceAvailable, balanceLimit } = req.body;
      if (!clientId || !institutionName || !accountName || !accountType) {
        return res.status(400).json({ message: "clientId, institutionName, accountName, and accountType are required" });
      }
      const [acct] = await db.insert(bankAccounts).values({
        clientId,
        institutionName,
        accountName,
        accountType,
        accountSubtype: accountSubtype || null,
        mask: mask || null,
        balanceCurrent: balanceCurrent ?? null,
        balanceAvailable: balanceAvailable ?? null,
        balanceLimit: balanceLimit ?? null,
        lastSynced: new Date(),
      }).returning();
      res.json(sanitizeBankAccount(acct));
    } catch (e) { handleError(res, e); }
  });

  app.delete("/bank-accounts/:id", async (req, res) => {
    try {
      await db.delete(bankAccounts).where(eq(bankAccounts.id, req.params.id));
      res.json({ deleted: true });
    } catch (e) { handleError(res, e); }
  });

  app.get("/bank-accounts/:clientId", async (req, res) => {
    try {
      const accounts = await db.select().from(bankAccounts).where(eq(bankAccounts.clientId, req.params.clientId));
      res.json(stripPlaidSecrets(accounts));
    } catch (e) { handleError(res, e); }
  });

  app.get("/bank-accounts", async (_req, res) => {
    try {
      const accounts = await db.select().from(bankAccounts);
      res.json(stripPlaidSecrets(accounts));
    } catch (e) { handleError(res, e); }
  });

  app.post("/bank-accounts/:id/sync", async (req, res) => {
    try {
      const [acct] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, req.params.id));
      if (!acct || !acct.plaidAccessToken) return res.status(404).json({ message: "Account not found or no Plaid token" });
      const accessToken = decryptIfEncrypted(acct.plaidAccessToken);
      const accounts = await getAccounts(accessToken!);
      if ("error" in accounts) return res.status(400).json(accounts);
      const match = accounts.accounts.find((a: any) => a.mask === acct.mask);
      if (match) {
        await db.update(bankAccounts).set({
          balanceCurrent: match.balanceCurrent,
          balanceAvailable: match.balanceAvailable,
          balanceLimit: match.balanceLimit,
          lastSynced: new Date(),
        }).where(eq(bankAccounts.id, req.params.id));
      }
      res.json({ synced: true });
    } catch (e) { handleError(res, e); }
  });

  app.get("/bank-accounts/:id/transactions", async (req, res) => {
    try {
      const [acct] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, req.params.id));
      if (!acct?.plaidAccessToken) return res.status(404).json({ message: "Account not found" });
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
      const result = await getTransactions(decryptIfEncrypted(acct.plaidAccessToken)!, start, end);
      res.json(result);
    } catch (e) { handleError(res, e); }
  });

  app.get("/bank-accounts/:id/liabilities", async (req, res) => {
    try {
      const [acct] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, req.params.id));
      if (!acct?.plaidAccessToken) return res.status(404).json({ message: "Account not found" });
      const result = await getLiabilities(decryptIfEncrypted(acct.plaidAccessToken)!);
      res.json(result);
    } catch (e) { handleError(res, e); }
  });

  // ─── CRYPTO WALLETS ─────────────────────────────────────────────────────────
  app.get("/crypto-wallets", async (_req, res) => {
    try {
      const wallets = await db.select().from(cryptoWallets);
      res.json(wallets);
    } catch (e) { handleError(res, e); }
  });

  app.get("/crypto-wallets/:clientId", async (req, res) => {
    try {
      const wallets = await db.select().from(cryptoWallets).where(eq(cryptoWallets.clientId, req.params.clientId));
      res.json(wallets);
    } catch (e) { handleError(res, e); }
  });

  app.post("/crypto-wallets", async (req, res) => {
    try {
      const { clientId, walletAddress, walletType, chainId, label } = req.body;
      if (!walletAddress) return res.status(400).json({ message: "Wallet address required" });
      const [wallet] = await db.insert(cryptoWallets).values({
        clientId: clientId || null,
        walletAddress,
        walletType: walletType || "metamask",
        chainId: chainId || 1,
        label: label || null,
      }).returning();
      res.json(wallet);
    } catch (e) { handleError(res, e); }
  });

  app.delete("/crypto-wallets/:id", async (req, res) => {
    try {
      await db.delete(cryptoWallets).where(eq(cryptoWallets.id, req.params.id));
      res.json({ deleted: true });
    } catch (e) { handleError(res, e); }
  });

  // ─── LOAN APPLICATIONS / LENDING ────────────────────────────────────────────
  app.get("/loans", async (_req, res) => {
    try {
      const loans = await db.select().from(loanApplications);
      res.json(loans);
    } catch (e) { handleError(res, e); }
  });

  app.get("/loans/:clientId", async (req, res) => {
    try {
      const loans = await db.select().from(loanApplications).where(eq(loanApplications.clientId, req.params.clientId));
      res.json(loans);
    } catch (e) { handleError(res, e); }
  });

  app.post("/loans", async (req, res) => {
    try {
      const { clientId, loanType, amount, termMonths, lender } = req.body;
      if (!clientId || !loanType || !amount) return res.status(400).json({ message: "clientId, loanType, amount required" });
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      let aiRecommendation = null;
      const avgScore = Math.round(((client.equifaxScore || 0) + (client.experianScore || 0) + (client.transunionScore || 0)) / 3);
      if (avgScore > 0) {
        const qualified = avgScore >= 620;
        const rateEstimate = avgScore >= 740 ? "3.5-5%" : avgScore >= 680 ? "5-8%" : avgScore >= 620 ? "8-15%" : "15-25%+";
        aiRecommendation = JSON.stringify({
          qualified,
          avgScore,
          rateEstimate,
          recommendation: qualified
            ? `Client qualifies. Avg score ${avgScore}. Estimated rate: ${rateEstimate}. ${loanType === "auto" ? "Good for auto financing." : loanType === "mortgage" ? "FHA minimum met." : "Consider secured options."}`
            : `Score too low (${avgScore}). Recommend 60-90 days of credit repair before applying. Target 620+ for conventional lending.`,
        });
      }

      const [loan] = await db.insert(loanApplications).values({
        clientId,
        loanType,
        amount,
        termMonths: termMonths || null,
        lender: lender || null,
        status: "draft",
        prequalified: avgScore >= 620,
        aiRecommendation,
      }).returning();
      res.json(loan);
    } catch (e) { handleError(res, e); }
  });

  app.patch("/loans/:id", async (req, res) => {
    try {
      const [updated] = await db.update(loanApplications).set(req.body).where(eq(loanApplications.id, req.params.id)).returning();
      res.json(updated);
    } catch (e) { handleError(res, e); }
  });

  // ─── UI CUSTOMIZATION ──────────────────────────────────────────────────────
  app.get("/ui-customization", async (_req, res) => {
    try {
      const rows = await db.select().from(uiCustomization);
      const config: Record<string, string> = {};
      rows.forEach(r => { config[r.key] = r.value; });
      res.json(config);
    } catch (e) { handleError(res, e); }
  });

  app.post("/ui-customization", async (req, res) => {
    try {
      const entries = Object.entries(req.body) as [string, string][];
      for (const [key, value] of entries) {
        const existing = await db.select().from(uiCustomization).where(eq(uiCustomization.key, key));
        if (existing.length > 0) {
          await db.update(uiCustomization).set({ value, updatedAt: new Date() }).where(eq(uiCustomization.key, key));
        } else {
          await db.insert(uiCustomization).values({ key, value });
        }
      }
      res.json({ saved: true });
    } catch (e) { handleError(res, e); }
  });

  // ─── LENDER DIRECTORY ───────────────────────────────────────────────────────
  app.get("/lenders", (_req, res) => {
    res.json([
      { id: "1", name: "LendingClub", types: ["personal", "debt_consolidation"], minScore: 600, maxAmount: 40000, apr: "8.98-35.99%", term: "24-60 months", features: ["No prepayment penalty", "Fixed rates", "Soft pull pre-qualify"] },
      { id: "2", name: "SoFi", types: ["personal", "student_refi", "mortgage"], minScore: 680, maxAmount: 100000, apr: "8.99-25.81%", term: "24-84 months", features: ["Unemployment protection", "No fees", "Member benefits"] },
      { id: "3", name: "Upstart", types: ["personal"], minScore: 300, maxAmount: 50000, apr: "6.4-35.99%", term: "36-60 months", features: ["AI underwriting", "Considers education", "Fast funding"] },
      { id: "4", name: "Avant", types: ["personal"], minScore: 580, maxAmount: 35000, apr: "9.95-35.99%", term: "24-60 months", features: ["Bad credit OK", "Next-day funding", "Flexible terms"] },
      { id: "5", name: "Prosper", types: ["personal", "debt_consolidation"], minScore: 640, maxAmount: 50000, apr: "6.99-35.99%", term: "24-60 months", features: ["Peer-to-peer", "Fixed rates", "Joint applications"] },
      { id: "6", name: "Marcus by Goldman Sachs", types: ["personal", "debt_consolidation"], minScore: 660, maxAmount: 40000, apr: "6.99-24.99%", term: "36-72 months", features: ["No fees at all", "On-time payment reward", "Flexible payments"] },
      { id: "7", name: "Capital One Auto", types: ["auto"], minScore: 500, maxAmount: 75000, apr: "4.49-24.99%", term: "36-72 months", features: ["Pre-qualify online", "Dealer network", "Refinance options"] },
      { id: "8", name: "Rocket Mortgage", types: ["mortgage", "refinance"], minScore: 580, maxAmount: 1000000, apr: "Current market", term: "15-30 years", features: ["100% online", "VA/FHA/Conv", "Fast approval"] },
      { id: "9", name: "Self Financial", types: ["credit_builder"], minScore: 0, maxAmount: 3600, apr: "N/A (builder)", term: "12-24 months", features: ["No credit check", "Builds credit", "Savings component"] },
      { id: "10", name: "Chime Credit Builder", types: ["credit_builder", "secured_card"], minScore: 0, maxAmount: 0, apr: "N/A", term: "Ongoing", features: ["No annual fee", "No credit check", "Automatic reporting"] },
      { id: "11", name: "OpenSky Secured Visa", types: ["secured_card"], minScore: 0, maxAmount: 3000, apr: "22.64%", term: "Ongoing", features: ["No credit check", "$200 minimum deposit", "Reports to all 3 bureaus"] },
      { id: "12", name: "Kikoff", types: ["credit_builder"], minScore: 0, maxAmount: 750, apr: "N/A", term: "Ongoing", features: ["$5/mo revolving line", "No hard pull", "Reports monthly"] },
    ]);
  });

  seedDefaultRules().catch(() => {});
  startScheduler();

  return httpServer;
}
