import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertClientSchema, insertDisputeSchema, insertCreditReportSchema,
  insertTradelineSchema, insertCreditLineSchema, insertTransactionSchema,
  insertNotificationSchema, insertCardholderPartnerSchema, insertMetro2SubmissionSchema,
} from "@shared/schema";
import { buildMetro2File, ACCOUNT_TYPES, ACCOUNT_STATUSES } from "./metro2";
import { ZodError } from "zod";

function handleError(res: Response, err: unknown) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Validation error", errors: err.errors });
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
    const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeSecret) {
      return res.status(400).json({ message: "Stripe webhook secret not configured" });
    }
    try {
      const event = req.body;
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object;
        await storage.createTransaction({
          stripePaymentIntentId: pi.id,
          type: "payment",
          description: `Stripe payment ${pi.id}`,
          amount: pi.amount,
          status: "completed",
          paidAt: new Date(),
        });
        await storage.createNotification({
          type: "billing",
          title: "Payment Received",
          message: `Payment of $${(pi.amount / 100).toFixed(2)} received via Stripe.`,
          read: false,
        });
      } else if (event.type === "payment_intent.payment_failed") {
        const pi = event.data.object;
        await storage.createNotification({
          type: "warning",
          title: "Payment Failed",
          message: `A Stripe payment of $${(pi.amount / 100).toFixed(2)} failed. Please follow up with client.`,
          read: false,
        });
      }
      res.json({ received: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── STRIPE PAYMENT LINK ───────────────────────────────────────────────────
  app.post("/api/stripe/create-payment-link", async (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(400).json({ message: "Stripe secret key not configured. Add STRIPE_SECRET_KEY to your environment secrets." });
    }
    try {
      const { amount, description, clientId } = req.body;
      // Return a placeholder payment URL since Stripe requires live keys
      res.json({
        url: `https://checkout.stripe.com/pay/placeholder`,
        message: "Configure STRIPE_SECRET_KEY to enable live payment links.",
      });
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

  // ─── API CONFIGS ───────────────────────────────────────────────────────────
  app.get("/api/config/:key", async (req, res) => {
    try {
      const val = await storage.getApiConfig(req.params.key);
      res.json({ key: req.params.key, value: val ?? null });
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/config", async (req, res) => {
    try {
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
        accountNumber: accountNumber || `AU-${clientId.slice(0, 8)}`,
        portfolioType: portfolioType || "R",
        accountType: accountType || "18",
        dateOpened: dateOpened || new Date().toISOString().slice(0, 10),
        creditLimit: creditLimit || 0,
        currentBalance: currentBalance || 0,
        accountStatus: accountStatus || "11",
        paymentHistoryProfile: "CCCCCCCCCCCCCCCCCCCCCCC",
        firstName: client.firstName,
        lastName: client.lastName,
        ssn: client.ssn || "",
        dob: client.dateOfBirth || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        zip: client.zipCode || "",
        ecoaCode: ecoaCode || "3",
        companyId: companyId || "CRP001",
        companyName: companyName || "CreditRepair Pro LLC",
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

  return httpServer;
}
