import { Router, type Request, type Response } from "express";
import { requireAdmin } from "../authorization";
import { rateLimit } from "../rate-limit";
import { institutionalExchangeService, parseServiceError } from "../institutional-exchange/service";

export const institutionalExchangeRouter = Router();

institutionalExchangeRouter.use(requireAdmin);
institutionalExchangeRouter.use(rateLimit("admin", (req) => [req.session?.userId || req.ip || "unknown", "institutional-exchange"]));

function actor(req: Request) {
  return req.session?.userId || null;
}

function sendError(res: Response, error: unknown) {
  const parsed = parseServiceError(error);
  return res.status(parsed.status).json(parsed.body);
}

institutionalExchangeRouter.get("/health", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.health());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/dashboard", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.dashboard());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/networks", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.listNetworks());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/payment-rails", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.listPaymentRails());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/instrument-types", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.listInstrumentTypes());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/institutions", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.listInstitutions());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.post("/institutions", async (req, res) => {
  try {
    res.status(201).json(await institutionalExchangeService.createInstitution(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/institutions/:institutionId/credentials", async (req, res) => {
  try {
    res.json(await institutionalExchangeService.listCredentials(req.params.institutionId));
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.post("/credentials", async (req, res) => {
  try {
    res.status(201).json(await institutionalExchangeService.saveCredential(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/instruments", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.listInstruments());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.post("/instruments", async (req, res) => {
  try {
    res.status(201).json(await institutionalExchangeService.createInstrument(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/exchange-requests", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.listExchangeRequests());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.post("/exchange-requests", async (req, res) => {
  try {
    const result = await institutionalExchangeService.createExchangeRequest(req.body, actor(req));
    res.status(result.idempotent ? 200 : 201).json(result);
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.post("/exchange-requests/:exchangeRequestId/route", async (req, res) => {
  try {
    res.json(await institutionalExchangeService.routeExchangeRequest(req.params.exchangeRequestId, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.post("/exchange-requests/:exchangeRequestId/process", async (req, res) => {
  try {
    res.json(await institutionalExchangeService.processExchangeRequest(req.params.exchangeRequestId, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/settlement-events", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.listSettlementEvents());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/connector-health", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.listConnectorHealth());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.post("/connector-health/refresh", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.refreshConnectorHealth());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/routing-rules", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.listRoutingRules());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.post("/routing-rules", async (req, res) => {
  try {
    res.status(201).json(await institutionalExchangeService.createRoutingRule(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/retry-queue", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.retryQueue());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.post("/retry-queue/process", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.processDueRetryQueue());
  } catch (error) {
    sendError(res, error);
  }
});

institutionalExchangeRouter.get("/audit-timeline", async (_req, res) => {
  try {
    res.json(await institutionalExchangeService.auditTimeline());
  } catch (error) {
    sendError(res, error);
  }
});
