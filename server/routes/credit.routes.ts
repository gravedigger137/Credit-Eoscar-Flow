import { Router } from "express";
import { ZodError } from "zod";
import { creditService } from "../services/credit.service";
import { recordUsageEvent } from "../usage-metering";

export const creditRouter = Router();

function handleError(res: import("express").Response, err: unknown) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Validation error", errors: err.errors });
  }
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}

creditRouter.get("/dashboard/stats", async (_req, res) => {
  try {
    res.json(await creditService.getDashboardStats());
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.get("/clients", async (_req, res) => {
  try {
    res.json(await creditService.listClients());
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.get("/clients/:id", async (req, res) => {
  try {
    const client = await creditService.getClient(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.post("/clients", async (req, res) => {
  try {
    const client = await creditService.createClient(req.body);
    res.status(201).json(client);
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.patch("/clients/:id", async (req, res) => {
  try {
    res.json(await creditService.updateClient(req.params.id, req.body));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.delete("/clients/:id", async (req, res) => {
  try {
    await creditService.deleteClient(req.params.id);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.get("/disputes", async (_req, res) => {
  try {
    res.json(await creditService.listDisputes());
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.get("/disputes/client/:clientId", async (req, res) => {
  try {
    res.json(await creditService.listDisputes(req.params.clientId));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.post("/disputes", async (req, res) => {
  try {
    const dispute = await creditService.createDispute(req.body);
    res.status(201).json(dispute);
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.patch("/disputes/:id", async (req, res) => {
  try {
    res.json(await creditService.updateDispute(req.params.id, req.body));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.delete("/disputes/:id", async (req, res) => {
  try {
    await creditService.deleteDispute(req.params.id);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.post("/disputes/:id/generate-letter", async (req, res) => {
  try {
    const result = await creditService.generateDisputeLetter(req.params.id, req.body.disputeType || "general");
    if (!result) return res.status(404).json({ message: "Dispute or client not found" });
    recordUsageEvent({ eventType: "dispute_letter_generated", metadata: { disputeId: req.params.id }, quantity: 1 }).catch(() => {});
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.get("/reports", async (_req, res) => {
  try {
    res.json(await creditService.listReports());
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.get("/reports/client/:clientId", async (req, res) => {
  try {
    res.json(await creditService.listReports(req.params.clientId));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.post("/reports", async (req, res) => {
  try {
    res.status(201).json(await creditService.createReport(req.body));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.patch("/reports/:id", async (req, res) => {
  try {
    res.json(await creditService.updateReport(req.params.id, req.body));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.get("/tradelines", async (_req, res) => {
  try {
    res.json(await creditService.listTradelines());
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.get("/tradelines/client/:clientId", async (req, res) => {
  try {
    res.json(await creditService.listTradelines(req.params.clientId));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.post("/tradelines", async (req, res) => {
  try {
    res.status(201).json(await creditService.createTradeline(req.body));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.patch("/tradelines/:id", async (req, res) => {
  try {
    res.json(await creditService.updateTradeline(req.params.id, req.body));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.delete("/tradelines/:id", async (req, res) => {
  try {
    await creditService.deleteTradeline(req.params.id);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.get("/credit-lines", async (_req, res) => {
  try {
    res.json(await creditService.listCreditLines());
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.get("/credit-lines/client/:clientId", async (req, res) => {
  try {
    res.json(await creditService.listCreditLines(req.params.clientId));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.post("/credit-lines", async (req, res) => {
  try {
    res.status(201).json(await creditService.createCreditLine(req.body));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.patch("/credit-lines/:id", async (req, res) => {
  try {
    res.json(await creditService.updateCreditLine(req.params.id, req.body));
  } catch (err) {
    handleError(res, err);
  }
});

creditRouter.delete("/credit-lines/:id", async (req, res) => {
  try {
    await creditService.deleteCreditLine(req.params.id);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});
