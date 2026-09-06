import { Router, type NextFunction, type Request, type Response } from "express";

export const aiEmployeesRouter = Router();

const allowedRoutes = [
  /^\/(workers|workers\/activate|workers\/deactivate|workers\/permissions|workers\/proposals|workers\/proposals\/reject|permissions|connectors|audit|approvals)$/,
  /^\/approvals\/[A-Za-z0-9-]+\/(approve|reject)$/,
  /^\/agents\/(dev|finance|ops)$/,
  /^\/agents\/finance\/erpnext$/,
  /^\/agents\/dev\/github(?:\/.*)?$/,
  /^\/task$/,
];

function requireConfiguredOwner(req: Request, res: Response, next: NextFunction) {
  const ownerUserId = process.env.AI_EMPLOYEES_OWNER_USER_ID;
  if (!ownerUserId) {
    return res.status(503).json({ message: "AI Employees owner identity is not configured." });
  }
  if (!req.session.userId || req.session.userId !== ownerUserId) {
    return res.status(403).json({ message: "Only the configured Infinite Arcadia owner may access AI workforce controls." });
  }
  return next();
}

function upstreamBaseUrl() {
  const raw = process.env.AI_EMPLOYEES_API_URL || "https://ai.infinitearcadia.com";
  const url = new URL(raw);
  const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localDevelopment) {
    throw new Error("AI Employees upstream must use HTTPS.");
  }
  return url;
}

aiEmployeesRouter.use(requireConfiguredOwner);

aiEmployeesRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!allowedRoutes.some((pattern) => pattern.test(req.path))) {
      return res.status(404).json({ message: "Unsupported AI Employees route." });
    }
    if (!["GET", "POST"].includes(req.method)) {
      return res.status(405).json({ message: "Method not allowed." });
    }
    const ownerToken = process.env.AI_EMPLOYEES_OWNER_APPROVAL_TOKEN;
    if (!ownerToken) {
      return res.status(503).json({ message: "AI Employees owner approval is not configured." });
    }

    const url = new URL(req.originalUrl.replace(/^\/api(?:\/v1)?\/ai-employees/, ""), upstreamBaseUrl());
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-IA-Owner-Token": ownerToken,
    };
    const init: RequestInit = { method: req.method, headers, signal: AbortSignal.timeout(30_000) };
    if (req.method !== "GET") {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(req.body || {});
    }

    const upstream = await fetch(url, init);
    const body = await upstream.text();
    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    return res.send(body);
  } catch (error) {
    return next(error);
  }
});
