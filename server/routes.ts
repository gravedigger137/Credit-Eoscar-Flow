import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import {
  insertClientSchema, insertDisputeSchema, insertCreditReportSchema,
  insertTradelineSchema, insertCreditLineSchema, insertTransactionSchema,
  insertNotificationSchema, insertCardholderPartnerSchema, insertMetro2SubmissionSchema,
} from "@shared/schema";
import {
  buildMetro2File, ACCOUNT_TYPES, ACCOUNT_STATUSES, ECOA_CODES, SPECIAL_COMMENT_CODES,
  validateMetro2BaseRecord, parseMetro2File, convertCsvToJson, convertJsonToMetro2,
  detectFormat, jsonToMetro2Record, metro2RecordToJson,
  type Metro2JsonRecord,
} from "./metro2";
import { generateDisputeLetter, analyzeClientCredit, chatWithAI, validateMetro2Record } from "./ai";
import { parseCreditReportPDF, parseCreditReportText } from "./credit-report-parser";
import { pullAllBureauReports, getBureauClient } from "./bureau-clients";
import { simulateScoreChanges, generateRecommendations, type ScoreFactors, type SimulationAction } from "./score-simulator";
import { analyzeCreditFactors, type CreditFactorInput } from "./credit-predictor";
import {
  getSalesReport, getClientFinancialSummary, getRevenueForecasting,
  createCreditSale, getCreditSales, recordCreditSalePayment,
  saveCreditFactorSnapshot, getCreditFactorHistory
} from "./financial-reports";
import {
  detectScoreChanges, createAlertsAsNotifications, getClientScoreHistory,
  getMonitoringConfig, setMonitoringConfig, parseXMLCreditReport
} from "./credit-monitor";
import { generateFCRADisputeLetter, DISPUTE_REASONS, type DisputeType } from "./dispute-letters";
import { ZodError } from "zod";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".doc", ".docx", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("File type not allowed. Accepted: PDF, images, Word docs, text files."));
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
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) { handleError(res, err); }
  });

  // ─── CLIENTS ───────────────────────────────────────────────────────────────
  app.get("/api/clients", async (_req, res) => {
    try {
      const data = await storage.getClients();
      res.json(data);
    } catch (err) { handleError(res, err); }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      res.json(client);
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/clients", async (req, res) => {
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
      res.status(201).json(client);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      res.json(client);
    } catch (err) { handleError(res, err); }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── DISPUTES ──────────────────────────────────────────────────────────────
  app.get("/api/disputes", async (_req, res) => {
    try {
      res.json(await storage.getDisputes());
    } catch (err) { handleError(res, err); }
  });

  app.get("/api/disputes/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getDisputesByClient(req.params.clientId));
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/disputes", async (req, res) => {
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
      res.status(201).json(dispute);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/disputes/:id", async (req, res) => {
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

  app.delete("/api/disputes/:id", async (req, res) => {
    try {
      await storage.deleteDispute(req.params.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  app.get("/api/dispute-reasons", (_req, res) => {
    res.json(DISPUTE_REASONS);
  });

  app.post("/api/disputes/:id/generate-letter", async (req, res) => {
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

      res.json({ letter, disputeId: dispute.id });
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/disputes/generate-letter-preview", async (req, res) => {
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
  app.get("/api/reports", async (_req, res) => {
    try {
      res.json(await storage.getCreditReports());
    } catch (err) { handleError(res, err); }
  });

  app.get("/api/reports/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getCreditReportsByClient(req.params.clientId));
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const parsed = insertCreditReportSchema.parse(req.body);
      const report = await storage.createCreditReport(parsed);
      res.status(201).json(report);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/reports/:id", async (req, res) => {
    try {
      res.json(await storage.updateCreditReport(req.params.id, req.body));
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/reports/pull", async (req, res) => {
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

  app.post("/api/reports/:id/analyze", async (req, res) => {
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
  app.get("/api/tradelines", async (_req, res) => {
    try {
      res.json(await storage.getTradelines());
    } catch (err) { handleError(res, err); }
  });

  app.get("/api/tradelines/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getTradelinesByClient(req.params.clientId));
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/tradelines", async (req, res) => {
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
      res.status(201).json(tl);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/tradelines/:id", async (req, res) => {
    try {
      res.json(await storage.updateTradeline(req.params.id, req.body));
    } catch (err) { handleError(res, err); }
  });

  app.delete("/api/tradelines/:id", async (req, res) => {
    try {
      await storage.deleteTradeline(req.params.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── CREDIT LINES ──────────────────────────────────────────────────────────
  app.get("/api/credit-lines", async (_req, res) => {
    try {
      res.json(await storage.getCreditLines());
    } catch (err) { handleError(res, err); }
  });

  app.get("/api/credit-lines/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getCreditLinesByClient(req.params.clientId));
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/credit-lines", async (req, res) => {
    try {
      const parsed = insertCreditLineSchema.parse(req.body);
      const cl = await storage.createCreditLine(parsed);
      res.status(201).json(cl);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/credit-lines/:id", async (req, res) => {
    try {
      res.json(await storage.updateCreditLine(req.params.id, req.body));
    } catch (err) { handleError(res, err); }
  });

  app.delete("/api/credit-lines/:id", async (req, res) => {
    try {
      await storage.deleteCreditLine(req.params.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── TRANSACTIONS / BILLING ─────────────────────────────────────────────────
  app.get("/api/transactions", async (_req, res) => {
    try {
      res.json(await storage.getTransactions());
    } catch (err) { handleError(res, err); }
  });

  app.get("/api/transactions/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getTransactionsByClient(req.params.clientId));
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const parsed = insertTransactionSchema.parse(req.body);
      const txn = await storage.createTransaction(parsed);
      res.status(201).json(txn);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      res.json(await storage.updateTransaction(req.params.id, req.body));
    } catch (err) { handleError(res, err); }
  });

  // ─── STRIPE WEBHOOK ────────────────────────────────────────────────────────
  app.post("/api/stripe/webhook", async (req, res) => {
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
  app.post("/api/stripe/create-checkout", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(400).json({ message: "Add STRIPE_SECRET_KEY to your environment secrets to enable payments." });
    }
    try {
      const { amount, description, clientId, type } = req.body;
      if (!amount || typeof amount !== "number" || amount < 50) {
        return res.status(400).json({ message: "Amount must be at least $0.50 (50 cents) as an integer." });
      }
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || req.headers.host || "localhost:5000";
      const baseUrl = `https://${domain}`;

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
  app.post("/api/stripe/create-payment-link", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(400).json({ message: "Add STRIPE_SECRET_KEY to your environment secrets to enable payments." });
    }
    try {
      const { amount, description, clientId, type } = req.body;
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || req.headers.host || "localhost:5000";
      const baseUrl = `https://${domain}`;

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
  app.get("/api/notifications", async (_req, res) => {
    try {
      res.json(await storage.getNotifications());
    } catch (err) { handleError(res, err); }
  });

  app.get("/api/notifications/unread-count", async (_req, res) => {
    try {
      const count = await storage.getUnreadCount();
      res.json({ count });
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const parsed = insertNotificationSchema.parse(req.body);
      res.status(201).json(await storage.createNotification(parsed));
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/notifications/mark-all-read", async (_req, res) => {
    try {
      await storage.markAllNotificationsRead();
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── API CONFIGS (admin only) ───────────────────────────────────────────────
  app.get("/api/admin-overrides", async (req, res) => {
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

  app.get("/api/config/:key", async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const val = await storage.getApiConfig(req.params.key);
      res.json({ key: req.params.key, value: val ?? null });
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/config", async (req, res) => {
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
  app.get("/api/bureaus", (_req, res) => {
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
  app.get("/api/partners", async (_req, res) => {
    try {
      res.json(await storage.getCardholderPartners());
    } catch (e) { handleError(res, e); }
  });

  app.post("/api/partners", async (req, res) => {
    try {
      const data = insertCardholderPartnerSchema.parse(req.body);
      res.status(201).json(await storage.createCardholderPartner(data));
    } catch (e) { handleError(res, e); }
  });

  app.put("/api/partners/:id", async (req, res) => {
    try {
      const data = insertCardholderPartnerSchema.partial().parse(req.body);
      res.json(await storage.updateCardholderPartner(req.params.id, data));
    } catch (e) { handleError(res, e); }
  });

  app.delete("/api/partners/:id", async (req, res) => {
    try {
      await storage.deleteCardholderPartner(req.params.id);
      res.json({ success: true });
    } catch (e) { handleError(res, e); }
  });

  // ── METRO 2 SUBMISSIONS ─────────────────────────────────────────────────
  app.get("/api/metro2", async (_req, res) => {
    try {
      res.json(await storage.getMetro2Submissions());
    } catch (e) { handleError(res, e); }
  });

  app.get("/api/metro2/client/:clientId", async (req, res) => {
    try {
      res.json(await storage.getMetro2SubmissionsByClient(req.params.clientId));
    } catch (e) { handleError(res, e); }
  });

  // Generate Metro 2 file from client data and record the submission
  app.post("/api/metro2/generate", async (req, res) => {
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
  app.post("/api/metro2/upload", async (req, res) => {
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

  app.put("/api/metro2/:id", async (req, res) => {
    try {
      res.json(await storage.updateMetro2Submission(req.params.id, req.body));
    } catch (e) { handleError(res, e); }
  });

  // ── AI ENDPOINTS ────────────────────────────────────────────────────────────

  // AI Dispute Letter Generator
  app.post("/api/ai/dispute-letter", async (req, res) => {
    try {
      const { clientName, bureau, accountName, accountNumber, reason, type } = req.body;
      if (!clientName || !bureau || !accountName || !reason || !type) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const letter = await generateDisputeLetter({ clientName, bureau, accountName, accountNumber, reason, type });
      res.json({ letter });
    } catch (e) { handleError(res, e); }
  });

  // AI Client Credit Analysis
  app.post("/api/ai/analyze-client", async (req, res) => {
    try {
      const { clientName, scores, negativeItems, goal } = req.body;
      if (!clientName) return res.status(400).json({ message: "clientName is required" });
      const analysis = await analyzeClientCredit({ clientName, scores: scores ?? {}, negativeItems: negativeItems ?? [], goal });
      res.json({ analysis });
    } catch (e) { handleError(res, e); }
  });

  // AI Chat Assistant
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) return res.status(400).json({ message: "messages array required" });
      const reply = await chatWithAI(messages);
      res.json({ reply });
    } catch (e) { handleError(res, e); }
  });

  // AI Metro 2 Validator
  app.post("/api/ai/validate-metro2", async (req, res) => {
    try {
      const { record } = req.body;
      if (!record) return res.status(400).json({ message: "record is required" });
      const result = await validateMetro2Record(record);
      res.json({ result });
    } catch (e) { handleError(res, e); }
  });

  // ─── METRO 2 FORMAT CONVERSION ──────────────────────────────────────────
  app.post("/api/metro2/validate", async (req, res) => {
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

  app.post("/api/metro2/convert", upload.single("file"), async (req, res) => {
    try {
      let content = "";
      let sourceFormat = req.body.sourceFormat as string || "";

      if (req.file) {
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

  app.get("/api/metro2/reference-codes", (_req, res) => {
    res.json({
      accountTypes: ACCOUNT_TYPES,
      accountStatuses: ACCOUNT_STATUSES,
      ecoaCodes: ECOA_CODES,
      specialComments: SPECIAL_COMMENT_CODES,
    });
  });

  // ─── CLIENT DOCUMENT UPLOAD ─────────────────────────────────────────────
  app.get("/api/clients/:clientId/documents", async (req, res) => {
    try {
      const docs = await storage.getDocumentsByClient(req.params.clientId);
      res.json(docs);
    } catch (e) { handleError(res, e); }
  });

  app.post("/api/clients/:clientId/documents", upload.single("file"), async (req, res) => {
    const file = req.file;
    try {
      if (!file) return res.status(400).json({ message: "No file uploaded" });
      const client = await storage.getClient(req.params.clientId);
      if (!client) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ message: "Client not found" });
      }
      const validCategories = ["credit_report", "id_document", "proof_of_address", "dispute_letter", "bureau_response", "other"];
      const category = validCategories.includes(req.body.category) ? req.body.category : "credit_report";
      const notes = typeof req.body.notes === "string" ? req.body.notes.slice(0, 500) : null;
      const doc = await storage.createDocument({
        clientId: req.params.clientId,
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
      res.json(doc);
    } catch (e) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      handleError(res, e);
    }
  });

  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      const filePath = path.join(uploadsDir, doc.fileName);
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found on disk" });
      res.setHeader("Content-Disposition", `attachment; filename="${doc.originalName}"`);
      res.setHeader("Content-Type", doc.mimeType);
      fs.createReadStream(filePath).pipe(res);
    } catch (e) { handleError(res, e); }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      const filePath = path.join(uploadsDir, doc.fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await storage.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (e) { handleError(res, e); }
  });


  // ─── CREDIT REPORT PARSER ROUTES ──────────────────────────────────────────

  app.post("/api/credit-report/parse", upload.single("file"), async (req: any, res) => {
    const filePath = req.file?.path;
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const report = await parseCreditReportPDF(filePath!);
      res.json(report);
    } catch (e) { handleError(res, e); }
    finally { if (filePath && fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch {} }
  });

  app.post("/api/credit-report/parse-text", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ message: "No text provided" });
      const report = parseCreditReportText(text);
      res.json(report);
    } catch (e) { handleError(res, e); }
  });

  // ─── BUREAU API ROUTES ──────────────────────────────────────────────────────

  app.post("/api/bureau/pull-report", async (req, res) => {
    try {
      const { bureau, firstName, lastName, ssn, dob, address, city, state, zip } = req.body;
      if (!firstName || !lastName || !ssn) {
        return res.status(400).json({ message: "First name, last name, and SSN are required" });
      }

      if (bureau && ["equifax", "experian", "transunion"].includes(bureau)) {
        const client = await getBureauClient(bureau);
        if (!client) return res.status(400).json({ message: `${bureau} API not configured. Add credentials in Settings > Bureau APIs.` });
        const report = await client.pullReport({ firstName, lastName, ssn, dob, address, city, state, zip });
        return res.json(report);
      }

      const reports = await pullAllBureauReports({ firstName, lastName, ssn, dob, address, city, state, zip });
      res.json(reports);
    } catch (e) { handleError(res, e); }
  });

  app.get("/api/bureau/status", async (_req, res) => {
    try {
      const bureaus = ["equifax", "experian", "transunion"] as const;
      const status: Record<string, { configured: boolean; environment: string }> = {};
      for (const b of bureaus) {
        const key = await storage.getApiConfig(`${b}_api_key`);
        const env = await storage.getApiConfig(`${b}_environment`) || "sandbox";
        status[b] = { configured: !!key, environment: env };
      }
      res.json(status);
    } catch (e) { handleError(res, e); }
  });

  app.post("/api/bureau/configure", async (req, res) => {
    try {
      const { bureau, apiKey, apiSecret, clientId, memberId, environment } = req.body;
      if (!bureau || !apiKey) return res.status(400).json({ message: "Bureau and API key required" });
      if (!["equifax", "experian", "transunion", "innovis"].includes(bureau)) return res.status(400).json({ message: "Invalid bureau" });

      await storage.setApiConfig(`${bureau}_api_key`, apiKey);
      if (apiSecret) await storage.setApiConfig(`${bureau}_api_secret`, apiSecret);
      if (clientId) await storage.setApiConfig(`${bureau}_client_id`, clientId);
      if (memberId) await storage.setApiConfig(`${bureau}_member_id`, memberId);
      await storage.setApiConfig(`${bureau}_environment`, environment || "sandbox");

      res.json({ success: true, message: `${bureau} credentials saved` });
    } catch (e) { handleError(res, e); }
  });

  // ─── SCORE SIMULATOR ROUTES ─────────────────────────────────────────────────

  app.post("/api/score-simulator/simulate", async (req, res) => {
    try {
      const { factors, actions } = req.body as { factors: ScoreFactors; actions: SimulationAction[] };
      if (!factors || !factors.currentScore) return res.status(400).json({ message: "Score factors required" });
      if (!actions || !Array.isArray(actions)) return res.status(400).json({ message: "Actions array required" });
      const result = simulateScoreChanges(factors, actions);
      res.json(result);
    } catch (e) { handleError(res, e); }
  });

  app.post("/api/score-simulator/recommend", async (req, res) => {
    try {
      const factors = req.body as ScoreFactors;
      if (!factors || !factors.currentScore) return res.status(400).json({ message: "Score factors required" });
      const actions = generateRecommendations(factors);
      const simulation = simulateScoreChanges(factors, actions);
      res.json({ recommendations: actions, simulation });
    } catch (e) { handleError(res, e); }
  });

  // ─── CLIENT REPORT PARSE & AUTO-IMPORT ──────────────────────────────────────

  app.post("/api/clients/:id/parse-report", upload.single("file"), async (req: any, res) => {
    const filePath = req.file?.path;
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

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


  // ─── CREDIT PREDICTOR ROUTES ─────────────────────────────────────────────

  app.post("/api/credit-predictor/analyze", async (req, res) => {
    try {
      const input = req.body as CreditFactorInput;
      if (!input || input.totalAccounts === undefined) return res.status(400).json({ message: "Credit factor input required" });
      const analysis = analyzeCreditFactors(input);
      res.json(analysis);
    } catch (e) { handleError(res, e); }
  });

  app.post("/api/credit-predictor/analyze-client/:id", async (req, res) => {
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

  app.get("/api/credit-factors/:clientId/history", async (req, res) => {
    try {
      const history = await getCreditFactorHistory(req.params.clientId);
      res.json(history);
    } catch (e) { handleError(res, e); }
  });

  // ─── FINANCIAL REPORTS ROUTES ──────────────────────────────────────────────

  app.get("/api/financial-reports/sales", async (req, res) => {
    try {
      const period = (req.query.period as string) || "monthly";
      if (!["daily", "weekly", "monthly", "yearly"].includes(period)) return res.status(400).json({ message: "Invalid period" });
      const report = await getSalesReport(period as any);
      res.json(report);
    } catch (e) { handleError(res, e); }
  });

  app.get("/api/financial-reports/client/:id", async (req, res) => {
    try {
      const summary = await getClientFinancialSummary(req.params.id);
      if (!summary) return res.status(404).json({ message: "Client not found" });
      res.json(summary);
    } catch (e) { handleError(res, e); }
  });

  app.get("/api/financial-reports/forecast", async (_req, res) => {
    try {
      const forecast = await getRevenueForecasting();
      res.json(forecast);
    } catch (e) { handleError(res, e); }
  });

  // ─── CREDIT SALES (POS) ROUTES ─────────────────────────────────────────────

  app.get("/api/credit-sales", async (req, res) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const sales = await getCreditSales(clientId);
      res.json(sales);
    } catch (e) { handleError(res, e); }
  });

  app.post("/api/credit-sales", async (req, res) => {
    try {
      const { clientId, description, amount, creditTerms, dueDate, notes } = req.body;
      if (!clientId || !description || !amount) return res.status(400).json({ message: "Client, description, and amount required" });
      const sale = await createCreditSale({ clientId, description, amount: Math.round(amount), creditTerms, dueDate, notes });
      res.json(sale);
    } catch (e) { handleError(res, e); }
  });

  app.post("/api/credit-sales/:id/payment", async (req, res) => {
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

  app.get("/api/credit-monitor/config", async (_req, res) => {
    try {
      const config = await getMonitoringConfig();
      res.json(config);
    } catch (e) { handleError(res, e); }
  });

  app.post("/api/credit-monitor/config", async (req, res) => {
    try {
      const config = await setMonitoringConfig(req.body);
      res.json(config);
    } catch (e) { handleError(res, e); }
  });

  app.post("/api/credit-monitor/scan", async (_req, res) => {
    try {
      const alerts = await detectScoreChanges();
      const created = await createAlertsAsNotifications(alerts);
      res.json({ alerts, notificationsCreated: created });
    } catch (e) { handleError(res, e); }
  });

  app.get("/api/credit-monitor/history/:clientId", async (req, res) => {
    try {
      const history = await getClientScoreHistory(req.params.clientId);
      res.json(history);
    } catch (e) { handleError(res, e); }
  });

  app.post("/api/credit-report/parse-xml", async (req, res) => {
    try {
      const { xml } = req.body;
      if (!xml) return res.status(400).json({ message: "XML content required" });
      const parsed = parseXMLCreditReport(xml);
      res.json(parsed);
    } catch (e) { handleError(res, e); }
  });

  app.get("/api/bureau/status-all", async (_req, res) => {
    try {
      const bureaus = ["equifax", "experian", "transunion", "innovis"] as const;
      const status: Record<string, { configured: boolean; environment: string }> = {};
      for (const b of bureaus) {
        const key = await storage.getApiConfig(`${b}_api_key`);
        const env = await storage.getApiConfig(`${b}_environment`) || "sandbox";
        status[b] = { configured: !!key, environment: env };
      }
      res.json(status);
    } catch (e) { handleError(res, e); }
  });


  return httpServer;
}
