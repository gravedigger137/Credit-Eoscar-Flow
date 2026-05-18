import type { Request } from "express";

export const isProduction = process.env.NODE_ENV === "production";

export function getPublicAppUrl(req?: Request): string {
  const configuredUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (req?.headers.host) {
    const protoHeader = req.headers["x-forwarded-proto"];
    const protocol = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
    return `${protocol || (isProduction ? "https" : "http")}://${req.headers.host}`;
  }

  const port = process.env.PORT || "5000";
  return `http://localhost:${port}`;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Copy .env.example to .env and configure it for your deployment.`);
  }
  return value;
}
