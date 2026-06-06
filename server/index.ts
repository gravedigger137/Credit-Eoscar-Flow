import 'dd-trace/init';
import "dotenv/config";
import crypto from "crypto";
import express, { Router, type Request, Response, NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { requireAuth } from "./auth";
import { authRouter } from "./routes/auth.routes";
import { aiRouter } from "./routes/ai.routes";
import { creditRouter } from "./routes/credit.routes";
import { setupOAuth, registerOAuthRoutes } from "./oauth";
import { pool } from "./db";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

const defaultAllowedOrigins = [
  "https://www.infinitearcadia.com",
  "https://infinitearcadia.com",
  "http://localhost:5000",
];

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultAllowedOrigins;

app.set("trust proxy", 1);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "credit-eoscar-flow" });
});

app.get("/ready", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true, database: "ready" });
  } catch (err) {
    res.status(503).json({ ok: false, database: "unavailable" });
  }
});

async function getBureauStatus() {
  const bureaus = ["equifax", "experian", "transunion", "innovis"] as const;
  const result: Record<string, { configured: boolean; environment: string }> = {};

  try {
    for (const bureau of bureaus) {
      const apiKey = await storage.getApiConfig(`${bureau}_api_key`);
      const environment = await storage.getApiConfig(`${bureau}_environment`);
      result[bureau] = {
        configured: !!apiKey,
        environment: environment || "sandbox",
      };
    }
  } catch {
    for (const bureau of bureaus) {
      result[bureau] = {
        configured: false,
        environment: "unknown",
      };
    }
  }

  return result;
}

async function integrationStatus() {
  const openAiConfigured = !!process.env.OPENAI_API_KEY;
  const localAiConfigured = !!process.env.LOCAL_MODEL_ENDPOINT;
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
  const stripeWebhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET;
  const plaidConfigured = !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
  const oauthConfigured = !!(
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
    (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) ||
    (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
  );

  return {
    ok: true,
    service: "credit-eoscar-flow",
    integrations: {
      database: process.env.DATABASE_URL ? "configured" : "not_configured",
      sessionSecret: process.env.SESSION_SECRET ? "configured" : "not_configured",
      aiProvider: openAiConfigured || localAiConfigured ? "configured" : "not_configured",
      stripe: stripeConfigured ? "configured" : "not_configured",
      stripeWebhook: stripeWebhookConfigured ? "configured" : "not_configured",
      plaid: plaidConfigured ? "configured" : "not_configured",
      bureauCredentials: await getBureauStatus(),
      oauth: oauthConfigured ? "configured" : "not_configured",
    },
  };
}

app.get("/status/integrations", async (_req, res) => {
  res.json(await integrationStatus());
});

app.get("/api/v1/status/integrations", async (_req, res) => {
  res.json(await integrationStatus());
});

const PgStore = connectPgSimple(session);

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required in production.");
}

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET) {
  console.warn("WARNING: SESSION_SECRET not set — using auto-generated secret. Sessions will reset on restart.");
}

app.use(
  session({
store: new PgStore({ conString: process.env.DATABASE_URL }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  app.use("/api/v1", authRouter);
  app.use("/api", authRouter);
  setupOAuth();
  registerOAuthRoutes(app);

  // This gate verifies authentication only. Product-grade RBAC still needs to be added per route group before real users.
  const authGate = (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path === "/auth/login" ||
      req.path === "/auth/register" ||
      req.path === "/auth/logout" ||
      req.path === "/auth/me" ||
      req.path === "/auth/has-users" ||
      req.path === "/stripe/webhook" ||
      req.path === "/book-consultation" ||
      req.path === "/auth/providers" ||
      req.path === "/auth/google" ||
      req.path === "/auth/google/callback" ||
      req.path === "/auth/facebook" ||
      req.path === "/auth/facebook/callback" ||
      req.path === "/auth/github" ||
      req.path === "/auth/github/callback" ||
      req.path === "/auth/twitter" ||
      req.path === "/auth/twitter/callback" ||
      req.path === "/auth/linkedin" ||
      req.path === "/auth/linkedin/callback" ||
      req.path === "/auth/apple" ||
      req.path === "/auth/apple/callback"
    ) {
      return next();
    }
    requireAuth(req, res, next);
  };

  app.use("/api/v1", authGate);
  app.use("/api", authGate);

  const v1Router = Router();
  v1Router.use("/credit", creditRouter);
  v1Router.use("/ai", aiRouter);

  await registerRoutes(httpServer, v1Router);

  app.use("/api/v1", v1Router);
  app.use("/api", v1Router);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "0.0.0.0";
  httpServer.listen(
    {
      port,
      host,
      reusePort: true,
    },
    () => {
      log(`serving on ${host}:${port}`);
    },
  );
})();
