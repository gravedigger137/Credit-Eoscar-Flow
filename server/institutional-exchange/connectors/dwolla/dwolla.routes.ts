import fs from "fs";
import path from "path";
import multer from "multer";
import { Router, type Request, type Response } from "express";
import { requireAuth } from "../../../auth";
import { getRequestUser, requireAdmin } from "../../../authorization";
import { rateLimit } from "../../../rate-limit";
import { dwollaInstitutionalService, mapDwollaError } from "./dwolla.service";
import {
  actorFromUser,
  dwollaVerifiedCustomerService,
  mapDwollaVerifiedCustomerError,
} from "./dwolla.verified-customer";

export const dwollaRouter = Router();
export const dwollaAdminRouter = Router();

const tempUploadDir = path.resolve(process.cwd(), "tmp/dwolla-verification");
if (!fs.existsSync(tempUploadDir)) fs.mkdirSync(tempUploadDir, { recursive: true });

const dwollaDocumentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempUploadDir),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: Number(process.env.DWOLLA_DOCUMENT_MAX_BYTES || 10 * 1024 * 1024), files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".pdf", ".jpg", ".jpeg", ".png"].includes(ext) && ["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error("Unsupported Dwolla verification document type. Upload PDF, JPG, or PNG."));
  },
});

const adminDwollaLimiter = rateLimit("admin", (req) => [req.session?.userId || req.ip || "unknown", "dwolla"]);
const customerDwollaLimiter = rateLimit("api", (req) => [req.session?.userId || req.ip || "unknown", "dwolla-customers"]);
const webhookDwollaLimiter = rateLimit("api", (req) => [req.ip || "unknown", "dwolla-webhook"]);
const uploadDwollaLimiter = rateLimit("upload", (req) => [req.session?.userId || req.ip || "unknown", "dwolla-documents"]);

function actor(req: Request) {
  return req.session?.userId || null;
}

async function verifiedActor(req: Request) {
  const user = await getRequestUser(req);
  if (!user) throw Object.assign(new Error("Authentication required"), { status: 401 });
  return actorFromUser(user);
}

function sendError(res: Response, error: unknown, verified = false) {
  const mapped = verified ? mapDwollaVerifiedCustomerError(error) : mapDwollaError(error);
  return res.status(mapped.status).json(mapped.body);
}

function rawBodyString(req: Request) {
  const raw = req.rawBody;
  if (Buffer.isBuffer(raw)) return raw.toString("utf8");
  if (typeof raw === "string") return raw;
  return JSON.stringify(req.body || {});
}

function routeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function unlinkTemp(file: Express.Multer.File | undefined) {
  if (!file?.path) return;
  try {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  } catch {}
}

// Dwolla webhooks are intentionally unauthenticated here; authenticity is
// enforced with Dwolla's HMAC signature before any event is persisted.
dwollaRouter.post("/webhooks", webhookDwollaLimiter, async (req, res) => {
  try {
    const signature = String(req.headers["x-request-signature-sha-256"] || req.headers["x-dwolla-signature"] || "");
    res.json(await dwollaVerifiedCustomerService.handleWebhook(rawBodyString(req), signature));
  } catch (error) {
    sendError(res, error, true);
  }
});

dwollaRouter.post("/customers/verified", requireAuth, customerDwollaLimiter, async (req, res) => {
  try {
    const result = await dwollaVerifiedCustomerService.createVerifiedCustomer({
      ...req.body,
      ipAddress: req.body?.ipAddress || req.ip,
    }, await verifiedActor(req));
    res.status(result.idempotent ? 200 : 201).json(result);
  } catch (error) {
    sendError(res, error, true);
  }
});

dwollaRouter.get("/customers/:customerId", requireAuth, customerDwollaLimiter, async (req, res) => {
  try {
    res.json(await dwollaVerifiedCustomerService.retrieveVerifiedCustomer(routeParam(req.params.customerId), await verifiedActor(req)));
  } catch (error) {
    sendError(res, error, true);
  }
});

dwollaRouter.patch("/customers/:customerId", requireAuth, customerDwollaLimiter, async (req, res) => {
  try {
    res.json(await dwollaVerifiedCustomerService.updateVerifiedCustomer(routeParam(req.params.customerId), req.body, await verifiedActor(req)));
  } catch (error) {
    sendError(res, error, true);
  }
});

dwollaRouter.get("/customers/:customerId/verification", requireAuth, customerDwollaLimiter, async (req, res) => {
  try {
    res.json(await dwollaVerifiedCustomerService.getVerification(routeParam(req.params.customerId), await verifiedActor(req)));
  } catch (error) {
    sendError(res, error, true);
  }
});

dwollaRouter.post("/customers/:customerId/retry", requireAuth, customerDwollaLimiter, async (req, res) => {
  try {
    res.json(await dwollaVerifiedCustomerService.retryVerification(routeParam(req.params.customerId), req.body, await verifiedActor(req)));
  } catch (error) {
    sendError(res, error, true);
  }
});

dwollaRouter.post("/customers/:customerId/documents", requireAuth, uploadDwollaLimiter, dwollaDocumentUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Verification document file is required." });
    res.status(202).json(await dwollaVerifiedCustomerService.submitVerificationDocument(
      routeParam(req.params.customerId),
      { file: req.file, documentType: typeof req.body?.documentType === "string" ? req.body.documentType : undefined },
      await verifiedActor(req),
    ));
  } catch (error) {
    unlinkTemp(req.file);
    sendError(res, error, true);
  }
});

// Existing institutional connector routes remain admin-only.
dwollaRouter.post("/customer", requireAdmin, adminDwollaLimiter, async (req, res) => {
  try {
    res.status(201).json(await dwollaInstitutionalService.createCustomer(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.get("/customer/:id", requireAdmin, adminDwollaLimiter, async (req, res) => {
  try {
    res.json(await dwollaInstitutionalService.retrieveCustomer(routeParam(req.params.id)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.post("/exchange", requireAdmin, adminDwollaLimiter, async (req, res) => {
  try {
    res.status(201).json(await dwollaInstitutionalService.createExchange(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.post("/funding-source", requireAdmin, adminDwollaLimiter, async (req, res) => {
  try {
    res.status(201).json(await dwollaInstitutionalService.createFundingSource(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.get("/funding-sources/:customerId", requireAdmin, adminDwollaLimiter, async (req, res) => {
  try {
    res.json(await dwollaInstitutionalService.listFundingSources(routeParam(req.params.customerId)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.post("/transfer", requireAdmin, adminDwollaLimiter, async (req, res) => {
  try {
    res.status(201).json(await dwollaInstitutionalService.createTransfer(req.body, actor(req)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.get("/transfer/:id", requireAdmin, adminDwollaLimiter, async (req, res) => {
  try {
    res.json(await dwollaInstitutionalService.retrieveTransfer(routeParam(req.params.id)));
  } catch (error) {
    sendError(res, error);
  }
});

dwollaRouter.get("/health", requireAdmin, adminDwollaLimiter, async (_req, res) => {
  try {
    res.json(await dwollaInstitutionalService.health());
  } catch (error) {
    sendError(res, error);
  }
});

dwollaAdminRouter.get("/customers/:customerId/timeline", requireAdmin, adminDwollaLimiter, async (req, res) => {
  try {
    res.json({
      timeline: await dwollaVerifiedCustomerService.timeline(routeParam(req.params.customerId), await verifiedActor(req)),
    });
  } catch (error) {
    sendError(res, error, true);
  }
});
