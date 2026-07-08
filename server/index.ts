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
import { requireAdmin } from "./authorization";
import { authRouter } from "./routes/auth.routes";
import { aiRouter } from "./routes/ai.routes";
import { creditRouter } from "./routes/credit.routes";
import { setupOAuth, registerOAuthRoutes } from "./oauth";
import { pool } from "./db";
import { storage } from "./storage";
import { agentDefinitions } from "./document-room-service";
import { csrfProtection, csrfTokenHandler } from "./csrf";
import { getRateLimitStatus, rateLimit } from "./rate-limit";
import { redactSensitiveText, safeErrorMessage } from "./security-utils";
import { getAIProviderStatus } from "./services/ai.service";
import { getAllBureauConfigStatuses } from "./bureau-api-config";
import { getPlaidConfigStatus } from "./provider-config";
import { getEoscarMetro2IntegrationStatus } from "./eoscar-metro2-readiness";

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

app.get("/live", (_req, res) => {
  res.json({ ok: true, service: "credit-eoscar-flow", status: "alive" });
});

app.get("/ready", async (_req, res) => {
  const checks: Record<string, string> = {};
  let ok = true;

  try {
    await pool.query("select 1");
    checks.database = "ready";
  } catch (err) {
    ok = false;
    checks.database = "unavailable";
  }

  const ai = getAIProviderStatus();
  checks.aiProvider = ai.status;
  if (!ai.configured) {
    ok = false;
  }

  res.status(ok ? 200 : 503).json({
    ok,
    service: "credit-eoscar-flow",
    checks,
  });
});

async function getBureauStatus() {
  try {
    return await getAllBureauConfigStatuses(storage);
  } catch {
    const bureaus = ["equifax", "experian", "transunion", "innovis"] as const;
    return Object.fromEntries(
      bureaus.map((bureau) => [bureau, {
        provider: bureau,
        configured: false,
        environment: "unknown",
        enabled: false,
        status: "unknown",
        apiName: null,
        productName: null,
        tokenUrl: null,
        baseUrl: null,
        clientIdMasked: null,
        clientSecretMasked: null,
        apiKeyMasked: null,
        memberIdMasked: null,
        hasClientSecret: false,
      }]),
    );
  }
}

async function integrationStatus() {
  const ai = getAIProviderStatus();
  const openAiConfigured = !!process.env.OPENAI_API_KEY;
  const localAiConfigured = !!process.env.LOCAL_MODEL_ENDPOINT;
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
  const stripeWebhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET;
  const plaidConfig = await getPlaidConfigStatus(storage);
  const bureauCredentials = await getBureauStatus();
  const eoscarMetro2 = getEoscarMetro2IntegrationStatus(bureauCredentials);
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
      aiProvider: ai.configured ? "configured" : ai.status,
      stripe: stripeConfigured ? "configured" : "not_configured",
      stripeWebhook: stripeWebhookConfigured ? "configured" : "not_configured",
      plaid: plaidConfig.configured ? "configured" : "not_configured",
      plaidConfig,
      bureauCredentials,
      eoscarConfigured: eoscarMetro2.eoscarConfigured,
      metro2Ready: eoscarMetro2.metro2Ready,
      bureauIntegrationsConfigured: eoscarMetro2.bureauIntegrationsConfigured,
      eoscarMetro2,
      oauth: oauthConfigured ? "configured" : "not_configured",
    },
  };
}

function configured(name: string) {
  return !!process.env[name];
}

function safeStatus(name: string, isConfigured: boolean, environment = process.env.NODE_ENV || "local") {
  return {
    name,
    configured: isConfigured,
    environment,
    last_check_at: new Date().toISOString(),
    status: isConfigured ? "configured" : "not_configured",
    error_summary: isConfigured ? null : `${name} is not configured for this environment`,
  };
}

function securityStatus() {
  return {
    ok: true,
    service: "credit-eoscar-flow",
    environment: process.env.NODE_ENV || "local",
    csrf: { enabled: true, excludedRoutes: ["/api/v1/stripe/webhook", "/api/stripe/webhook"] },
    rbac: { enabled: true, adminMiddleware: "centralized" },
    mfa: {
      ready: true,
      adminEnforcement: process.env.MFA_ENFORCE_ADMIN === "true",
      issuer: process.env.MFA_ISSUER || "Credit-Eoscar",
    },
    sessions: {
      secureCookies: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
    },
    sensitiveConfigEncryption: {
      configured: !!process.env.SENSITIVE_CONFIG_ENCRYPTION_KEY,
      requiredForSensitiveConfigInProduction: true,
    },
    uploads: {
      maxBytes: Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024),
      archiveUploadsEnabled: process.env.ALLOW_ARCHIVE_UPLOADS === "true",
      malwareScannerConfigured: !!process.env.MALWARE_SCAN_COMMAND || (!!process.env.MALWARE_SCAN_PROVIDER && process.env.MALWARE_SCAN_PROVIDER !== "disabled"),
      storage: process.env.PRIVATE_UPLOAD_STORAGE || "local",
      signedUrlsEnabled: process.env.SIGNED_DOWNLOAD_URLS_ENABLED === "true",
    },
    monitoring: {
      openTelemetryConfigured: !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      errorReportingConfigured: !!process.env.ERROR_REPORTING_DSN,
      structuredLogRedaction: true,
    },
    rateLimiting: getRateLimitStatus(),
  };
}

function infrastructureStatus() {
  return {
    ok: true,
    service: "credit-eoscar-flow",
    checks: [
      safeStatus("Cloudflare DNS", configured("CLOUDFLARE_ZONE_ID"), process.env.CLOUDFLARE_ENV || "manual"),
      safeStatus("Cloudflare Pages", configured("CLOUDFLARE_PAGES_PROJECT"), process.env.CLOUDFLARE_ENV || "manual"),
      safeStatus("Cloudflare Workers", configured("CLOUDFLARE_WORKER_NAME"), process.env.CLOUDFLARE_ENV || "manual"),
      safeStatus("Vercel", configured("VERCEL_PROJECT_ID"), process.env.VERCEL_ENV || "manual"),
      safeStatus("Render", configured("RENDER_SERVICE_ID"), process.env.RENDER_ENV || "manual"),
      safeStatus("Neon", configured("NEON_DATABASE_URL") || configured("DATABASE_URL"), process.env.DB_ENVIRONMENT || "postgresql"),
      safeStatus("PostgreSQL", configured("DATABASE_URL"), process.env.DB_ENVIRONMENT || "postgresql"),
      safeStatus("Stripe Test Mode", configured("STRIPE_SECRET_KEY"), process.env.STRIPE_MODE || "test"),
      safeStatus("Bureau Sandbox", configured("BUREAU_SANDBOX_ENABLED"), process.env.BUREAU_ENVIRONMENT || "sandbox"),
      safeStatus("GitHub Repository", configured("GITHUB_REPOSITORY"), process.env.GITHUB_ENVIRONMENT || "manual"),
      safeStatus("Object Storage", configured("OBJECT_STORAGE_BUCKET"), process.env.OBJECT_STORAGE_ENVIRONMENT || "manual"),
      safeStatus("Email Provider", configured("EMAIL_PROVIDER") || configured("SMTP_HOST"), process.env.EMAIL_ENVIRONMENT || "manual"),
      safeStatus("OpenAI Provider", configured("OPENAI_API_KEY"), process.env.AI_ENVIRONMENT || "manual"),
      safeStatus("Ollama Local AI", configured("LOCAL_MODEL_ENDPOINT"), process.env.AI_ENVIRONMENT || "local"),
    ],
  };
}

function agentsStatus() {
  const teamA = agentDefinitions.filter((agent) => agent.team === "A").length;
  const teamB = agentDefinitions.filter((agent) => agent.team === "B").length;
  return {
    ok: true,
    service: "credit-eoscar-flow",
    configured: true,
    last_check_at: new Date().toISOString(),
    status: "configured",
    active_agents: agentDefinitions.length,
    team_a_agents: teamA,
    team_b_agents: teamB,
    human_review_required: true,
    agents: agentDefinitions,
  };
}

async function automationStatus() {
  return {
    ok: true,
    service: "credit-eoscar-flow",
    configured: true,
    last_check_at: new Date().toISOString(),
    status: "configured",
    scheduler: process.env.AUTOMATION_SCHEDULER_ENABLED === "false" ? "disabled" : "available",
    failure_behavior: "log, retry where configured, escalate high-risk items for human review",
  };
}

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

app.get("/api/v1/auth/csrf", csrfTokenHandler);
app.get("/api/auth/csrf", csrfTokenHandler);

app.use(csrfProtection);

app.get("/status", (_req, res) => {
  res.json({ ok: true, service: "credit-eoscar-flow", readyEndpoint: "/ready", securityEndpoint: "/status/security" });
});

app.get("/api/v1/status", (_req, res) => {
  res.json({ ok: true, service: "credit-eoscar-flow", readyEndpoint: "/ready", securityEndpoint: "/api/v1/status/security" });
});

app.get("/status/security", requireAdmin, (_req, res) => {
  res.json(securityStatus());
});

app.get("/api/v1/status/security", requireAdmin, (_req, res) => {
  res.json(securityStatus());
});

app.get("/status/integrations", requireAdmin, async (_req, res) => {
  res.json(await integrationStatus());
});

app.get("/api/v1/status/integrations", requireAdmin, async (_req, res) => {
  res.json(await integrationStatus());
});

app.get("/status/infrastructure", requireAdmin, (_req, res) => {
  res.json(infrastructureStatus());
});

app.get("/api/v1/status/infrastructure", requireAdmin, (_req, res) => {
  res.json(infrastructureStatus());
});

app.get("/status/agents", requireAdmin, (_req, res) => {
  res.json(agentsStatus());
});

app.get("/api/v1/status/agents", requireAdmin, (_req, res) => {
  res.json(agentsStatus());
});

app.get("/status/automation", requireAdmin, async (_req, res) => {
  res.json(await automationStatus());
});

app.get("/api/v1/status/automation", requireAdmin, async (_req, res) => {
  res.json(await automationStatus());
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(redactSensitiveText(`${formattedTime} [${source}] ${message}`));
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

  const adminPathPrefixes = [
    "/admin-overrides",
    "/automation",
    "/bureau/configure",
    "/plaid/config",
    "/plaid/test",
    "/config",
    "/credit-monitor/config",
    "/document-room",
    "/status/agents",
    "/status/automation",
    "/status/infrastructure",
    "/status/integrations",
    "/status/security",
    "/ui-customization",
  ];

  function isAdminPath(path: string) {
    return adminPathPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  }

  const authGate = (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path === "/auth/login" ||
      req.path === "/auth/register" ||
      req.path === "/auth/csrf" ||
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
    const limiter = isAdminPath(req.path)
      ? rateLimit("admin", (request) => [request.session?.userId || request.ip || "unknown"])
      : rateLimit("api", (request) => [request.session?.userId || request.ip || "unknown"]);
    return limiter(req, res, () => {
    if (isAdminPath(req.path)) {
      return requireAdmin(req, res, next);
    }
    return requireAuth(req, res, next);
    });
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
  const message = status >= 500 ? "Internal Server Error" : err.message || "Request failed";

  console.error("Internal Server Error:", safeErrorMessage(err));

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
      reusePort: process.platform !== "win32",
    },
    () => {
      log(`serving on ${host}:${port}`);
    },
  );
})();
