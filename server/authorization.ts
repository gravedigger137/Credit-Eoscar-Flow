import type { NextFunction, Request, Response } from "express";
import type { User } from "@shared/schema";
import { storage } from "./storage";

const ADMIN_ROLES = new Set(["admin", "administrator", "owner"]);

function normalizeEmail(email: string | null | undefined) {
  return (email || "").trim().toLowerCase();
}

function parseEmailList(value: string | undefined) {
  return new Set(
    (value || "")
      .split(",")
      .map((entry) => normalizeEmail(entry))
      .filter(Boolean),
  );
}

export function getBootstrapAdminEmails() {
  return parseEmailList(process.env.BOOTSTRAP_ADMIN_EMAILS);
}

export function isBootstrapAdminEmail(email: string | null | undefined) {
  const bootstrapEmails = getBootstrapAdminEmails();
  return bootstrapEmails.size > 0 && bootstrapEmails.has(normalizeEmail(email));
}

export function getBootstrapRole(email: string | null | undefined, fallbackRole: string) {
  return isBootstrapAdminEmail(email) ? "admin" : fallbackRole;
}

export function isAdminUser(user: Pick<User, "role"> | null | undefined) {
  return !!user?.role && ADMIN_ROLES.has(user.role.toLowerCase());
}

export function sanitizeUser(user: User) {
  const {
    password: _password,
    oauthProviderId: _oauthProviderId,
    mfaTotpSecret: _mfaTotpSecret,
    mfaRecoveryCodeHashes: _mfaRecoveryCodeHashes,
    ...safe
  } = user;
  return safe;
}

export async function getRequestUser(req: Request) {
  const userId = req.session?.userId;
  if (!userId) return undefined;
  return storage.getUser(userId);
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getRequestUser(req);
    if (!user) return res.status(401).json({ message: "Authentication required" });
    if (!isAdminUser(user)) return res.status(403).json({ message: "Admin access required" });
    if (process.env.MFA_ENFORCE_ADMIN === "true") {
      if (!user.mfaEnabled) {
        return res.status(403).json({ message: "MFA enrollment required", code: "MFA_ENROLLMENT_REQUIRED" });
      }
      if (!req.session?.mfaVerified) {
        return res.status(403).json({ message: "MFA verification required", code: "MFA_REQUIRED" });
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireRole(roles: string[]) {
  const allowed = new Set(roles.map((role) => role.toLowerCase()));
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getRequestUser(req);
      if (!user) return res.status(401).json({ message: "Authentication required" });
      if (!user.role || !allowed.has(user.role.toLowerCase())) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
