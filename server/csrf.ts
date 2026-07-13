import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

declare module "express-session" {
  interface SessionData {
    csrfSecret?: string;
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "x-csrf-token";

function getCsrfSecret(req: Request) {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = crypto.randomBytes(32).toString("base64url");
  }
  return req.session.csrfSecret;
}

function signToken(secret: string) {
  return crypto.createHmac("sha256", secret).update("credit-eoscar-csrf-v1").digest("base64url");
}

function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function isExempt(req: Request) {
  return [
    "/stripe/webhook",
    "/api/stripe/webhook",
    "/api/v1/stripe/webhook",
    "/dwolla/webhooks",
    "/api/dwolla/webhooks",
    "/api/v1/dwolla/webhooks",
  ].includes(req.path);
}

export function issueCsrfToken(req: Request, res: Response) {
  const token = signToken(getCsrfSecret(req));
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return token;
}

export function csrfTokenHandler(req: Request, res: Response) {
  res.json({ csrfToken: issueCsrfToken(req, res) });
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || isExempt(req)) {
    issueCsrfToken(req, res);
    return next();
  }

  const expected = signToken(getCsrfSecret(req));
  const provided = String(req.headers[CSRF_HEADER_NAME] || "");
  if (!provided || !timingSafeEqual(provided, expected)) {
    return res.status(403).json({ message: "Invalid or missing CSRF token" });
  }

  issueCsrfToken(req, res);
  return next();
}
