import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getBootstrapAdminEmails, getBootstrapRole, isAdminUser, requireAdmin, sanitizeUser } from "./authorization";
import { createOtpAuthUrl, createRecoveryCodes, createTotpSecret, consumeRecoveryCode, verifyTotp } from "./mfa-service";
import { rateLimit } from "./rate-limit";
import {
  canUserLogin,
  ensureUserAccess,
  getUserAccess,
  listUsersWithAccess,
  markUserLogin,
  setUserAccess,
} from "./user-access";

declare module "express-session" {
  interface SessionData {
    userId: string;
    mfaVerified?: boolean;
  }
}

export const authRouter = Router();

authRouter.use("/auth", (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "POST" && ["/login", "/register"].includes(req.path)) {
    return rateLimit("auth", (request) => [request.ip || "unknown", String(request.body?.username || request.body?.email || "anonymous").toLowerCase()])(req, res, next);
  }
  if (req.method === "POST" && req.path.startsWith("/mfa")) {
    return rateLimit("auth", (request) => [request.session?.userId || request.ip || "unknown", "mfa"])(req, res, next);
  }
  return next();
});

authRouter.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { username, password, fullName, email, phone } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password are required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    const allUsers = await storage.getUsers();
    const isFirstUser = allUsers.length === 0;
    const existing = await storage.getUserByUsername(username);
    if (existing) return res.status(409).json({ message: "Username already taken" });

    const hashed = await bcrypt.hash(password, 12);
    const bootstrapEmails = getBootstrapAdminEmails();
    const fallbackRole = isFirstUser && bootstrapEmails.size === 0 ? "admin" : "client";
    const role = getBootstrapRole(email, fallbackRole);
    const user = await storage.createUser({ username, password: hashed, fullName, email, phone, role });
    const access = await ensureUserAccess(user);

    if (isAdminUser(user)) {
      const csrfSecret = req.session.csrfSecret;
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ message: "Session error" });
        if (csrfSecret) req.session.csrfSecret = csrfSecret;
        req.session.userId = user.id;
        req.session.mfaVerified = !user.mfaEnabled;
        req.session.save(() => res.status(201).json({ ...sanitizeUser(user), approvalStatus: "approved", isActive: true }));
      });
      return;
    }

    res.status(201).json({
      ...sanitizeUser(user),
      approvalStatus: access.status,
      isActive: access.isActive,
      pendingApproval: true,
      message: "Account created and pending administrator approval.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

authRouter.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    if (!isAdminUser(user) && !(await canUserLogin(user))) {
      const access = await getUserAccess(user.id);
      if (access?.status === "rejected") {
        return res.status(403).json({ message: "Account access has been rejected. Contact an administrator.", code: "ACCOUNT_REJECTED" });
      }
      return res.status(403).json({ message: "Account pending administrator approval.", code: "ACCOUNT_PENDING_APPROVAL" });
    }

    const csrfSecret = req.session.csrfSecret;
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: "Session error" });
      if (csrfSecret) req.session.csrfSecret = csrfSecret;
      req.session.userId = user.id;
      req.session.mfaVerified = !user.mfaEnabled;
      req.session.save(async () => {
        try { await markUserLogin(user.id); } catch (markError) { console.error("Unable to record login timestamp", markError); }
        res.json({ ...sanitizeUser(user), mfaRequired: user.mfaEnabled && isAdminUser(user) });
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
    res.clearCookie("XSRF-TOKEN");
    res.json({ ok: true });
  });
});

authRouter.post("/auth/mfa/setup", async (req: Request, res: Response) => {
  if (!req.session.userId) return res.status(401).json({ message: "Authentication required" });
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Authentication required" });
    const secret = createTotpSecret();
    const { codes, hashes } = await createRecoveryCodes();
    await db.update(users).set({ mfaTotpSecret: secret, mfaRecoveryCodeHashes: hashes, mfaEnabled: false, mfaConfirmedAt: null }).where(eq(users.id, user.id));
    res.json({ secret, otpAuthUrl: createOtpAuthUrl(user.email || user.username, secret), recoveryCodes: codes, message: "Store recovery codes securely. They will not be shown again." });
  } catch {
    res.status(500).json({ message: "MFA setup failed" });
  }
});

authRouter.post("/auth/mfa/enable", async (req: Request, res: Response) => {
  if (!req.session.userId) return res.status(401).json({ message: "Authentication required" });
  try {
    const user = await storage.getUser(req.session.userId);
    const token = String(req.body?.token || "");
    if (!user?.mfaTotpSecret) return res.status(400).json({ message: "MFA setup has not been started" });
    if (!verifyTotp(user.mfaTotpSecret, token)) return res.status(400).json({ message: "Invalid MFA token" });
    await db.update(users).set({ mfaEnabled: true, mfaConfirmedAt: new Date() }).where(eq(users.id, user.id));
    req.session.mfaVerified = true;
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "MFA enable failed" });
  }
});

authRouter.post("/auth/mfa/verify", async (req: Request, res: Response) => {
  if (!req.session.userId) return res.status(401).json({ message: "Authentication required" });
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user?.mfaEnabled || !user.mfaTotpSecret) return res.status(400).json({ message: "MFA is not enabled" });
    const token = String(req.body?.token || "");
    const recoveryCode = String(req.body?.recoveryCode || "");
    let verified = token ? verifyTotp(user.mfaTotpSecret, token) : false;
    if (!verified && recoveryCode) {
      const remaining = await consumeRecoveryCode(recoveryCode, user.mfaRecoveryCodeHashes || []);
      if (remaining) {
        verified = true;
        await db.update(users).set({ mfaRecoveryCodeHashes: remaining }).where(eq(users.id, user.id));
      }
    }
    if (!verified) return res.status(400).json({ message: "Invalid MFA verification" });
    req.session.mfaVerified = true;
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "MFA verification failed" });
  }
});

authRouter.get("/auth/me", async (req: Request, res: Response) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if (!isAdminUser(user) && !(await canUserLogin(user))) {
      req.session.destroy(() => undefined);
      return res.status(403).json({ message: "Account is not approved for access", code: "ACCOUNT_NOT_APPROVED" });
    }
    res.json(sanitizeUser(user));
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

authRouter.get("/auth/admin/users", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const allUsers = await storage.getUsers();
    res.json(await listUsersWithAccess(allUsers));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load staff accounts" });
  }
});

authRouter.post("/auth/admin/users/:id/approve", requireAdmin, async (req: Request, res: Response) => {
  try {
    const administratorId = req.session.userId;
    if (!administratorId) return res.status(401).json({ message: "Authentication required" });
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await setUserAccess(user.id, "approved", administratorId);
    const access = await getUserAccess(user.id);
    res.json({ ...sanitizeUser(user), approvalStatus: access?.status, isActive: access?.isActive });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to approve account" });
  }
});

authRouter.post("/auth/admin/users/:id/reject", requireAdmin, async (req: Request, res: Response) => {
  try {
    const administratorId = req.session.userId;
    if (!administratorId) return res.status(401).json({ message: "Authentication required" });
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (isAdminUser(user)) return res.status(400).json({ message: "Administrator accounts cannot be rejected here" });
    await setUserAccess(user.id, "rejected", administratorId);
    const access = await getUserAccess(user.id);
    res.json({ ...sanitizeUser(user), approvalStatus: access?.status, isActive: access?.isActive });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to reject account" });
  }
});

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: "Authentication required" });

  try {
    const user = await storage.getUser(userId);
    if (!user) {
      req.session.destroy(() => undefined);
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!isAdminUser(user) && !(await canUserLogin(user))) {
      req.session.destroy(() => undefined);
      return res.status(403).json({ message: "Account is not approved for access", code: "ACCOUNT_NOT_APPROVED" });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}
