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

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);
app.use(
  cors({
    origin: [
      "https://www.infinitearcadia.com",
      "https://infinitearcadia.com",
      "http://localhost:5000",
    ],
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

const PgStore = connectPgSimple(session);

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
