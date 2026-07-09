import { Router, type Request } from "express";
import { requireAdmin } from "../../../authorization";
import { rateLimit } from "../../../rate-limit";
import { dwollaInstitutionalService, mapDwollaError } from "./dwolla.service";

export const dwollaRouter = Router();

dwollaRouter.use(requireAdmin);
dwollaRouter.use(rateLimit("admin", (req) => [req.session?.userId || req.ip || "unknown", "dwolla"]));

function actor(req: Request) {
  return req.session?.userId || null;
}

function sendError(res: any, error: unknown) {
  const mapped = mapDwollaError(error);
  return res.status(mapped.status).json(mapped.body);
}

dwollaRouter.post("/customer", async (req, res) => {
  try {
    res.status(201).json(await dwollaInstitutionalService.createCustomer(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.get("/customer/:id", async (req, res) => {
  try {
    res.json(await dwollaInstitutionalService.retrieveCustomer(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.post("/exchange", async (req, res) => {
  try {
    res.status(201).json(await dwollaInstitutionalService.createExchange(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.post("/funding-source", async (req, res) => {
  try {
    res.status(201).json(await dwollaInstitutionalService.createFundingSource(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.get("/funding-sources/:customerId", async (req, res) => {
  try {
    res.json(await dwollaInstitutionalService.listFundingSources(req.params.customerId));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.post("/transfer", async (req, res) => {
  try {
    res.status(201).json(await dwollaInstitutionalService.createTransfer(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.get("/transfer/:id", async (req, res) => {
  try {
    res.json(await dwollaInstitutionalService.retrieveTransfer(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.get("/health", async (_req, res) => {
  try {
    res.json(await dwollaInstitutionalService.health());
  } catch (error) {
    sendError(res, error);
  }
});
