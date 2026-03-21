import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import {
  insertClientSchema, insertDisputeSchema, insertCreditReportSchema,
  insertTradelineSchema, insertCreditLineSchema, insertTransactionSchema,
  insertNotificationSchema, insertCardholderPartnerSchema, insertMetro2SubmissionSchema,
} from "@shared/schema";
import { buildMetro2File, ACCOUNT_TYPES, ACCOUNT_STATUSES } from "./metro2";
import { generateDisputeLetter, analyzeClientCredit, chatWithAI, validateMetro2Record } from "./ai";
import { ZodError } from "zod";

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

  return httpServer;
}
