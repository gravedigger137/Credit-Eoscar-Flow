import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export const authRouter = Router();

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.lastAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  entry.lastAttempt = now;
  return true;
}

authRouter.use("/auth", (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "POST" || !["/login", "/register"].includes(req.path)) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(`auth:${req.path}:${ip}`)) {
    return res.status(429).json({ message: "Too many auth attempts. Try again in 15 minutes." });
  }

  return next();
});

authRouter.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { username, password, fullName, email, phone } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const allUsers = await storage.getUsers();
    const isFirstUser = allUsers.length === 0;

    if (!isFirstUser) {
    }

    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const role = isFirstUser ? "admin" : "client";
    const user = await storage.createUser({ username, password: hashed, fullName, email, phone, role });

    if (isFirstUser) {
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ message: "Session error" });
        req.session.userId = user.id;
        req.session.save(() => {
          const { password: _, ...safe } = user;
          res.status(201).json(safe);
        });
      });
    } else {
      const { password: _, ...safe } = user;
      res.status(201).json(safe);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

authRouter.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: "Session error" });
      req.session.userId = user.id;
      req.session.save(() => {
        const { password: _, ...safe } = user;
        res.json(safe);
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

authRouter.post("/auth/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

authRouter.get("/auth/me", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const { password: _, ...safe } = user;
    res.json(safe);
  } catch {
    res.status(401).json({ message: "Not authenticated" });
  }
});

authRouter.get("/auth/has-users", async (_req: Request, res: Response) => {
  try {
    const allUsers = await storage.getUsers();
    res.json({ hasUsers: allUsers.length > 0 });
  } catch {
    res.json({ hasUsers: false });
  }
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}
