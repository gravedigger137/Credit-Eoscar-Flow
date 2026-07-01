import type { NextFunction, Request, Response } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const REDIS_CONFIGURED = !!process.env.REDIS_URL;
const RATE_LIMIT_BACKEND = REDIS_CONFIGURED ? "redis_configured_memory_fallback" : "memory";

function envInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getClientIp(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export type RateLimitPolicyName = "auth" | "passwordReset" | "api" | "upload" | "admin";

const policies: Record<RateLimitPolicyName, { windowMs: number; max: number }> = {
  auth: {
    windowMs: envInt("RATE_LIMIT_AUTH_WINDOW_MS", 15 * 60 * 1000),
    max: envInt("RATE_LIMIT_AUTH_MAX", 10),
  },
  passwordReset: {
    windowMs: envInt("RATE_LIMIT_PASSWORD_RESET_WINDOW_MS", 60 * 60 * 1000),
    max: envInt("RATE_LIMIT_PASSWORD_RESET_MAX", 5),
  },
  api: {
    windowMs: envInt("RATE_LIMIT_API_WINDOW_MS", 60 * 1000),
    max: envInt("RATE_LIMIT_API_MAX", 300),
  },
  upload: {
    windowMs: envInt("RATE_LIMIT_UPLOAD_WINDOW_MS", 60 * 1000),
    max: envInt("RATE_LIMIT_UPLOAD_MAX", 20),
  },
  admin: {
    windowMs: envInt("RATE_LIMIT_ADMIN_WINDOW_MS", 60 * 1000),
    max: envInt("RATE_LIMIT_ADMIN_MAX", 120),
  },
};

function consume(key: string, windowMs: number, max: number) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (existing.count >= max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: max - existing.count, resetAt: existing.resetAt };
}

export function rateLimit(policyName: RateLimitPolicyName, keyParts?: (req: Request) => string[]) {
  const policy = policies[policyName];
  return (req: Request, res: Response, next: NextFunction) => {
    const parts = keyParts?.(req) || [getClientIp(req)];
    const key = [policyName, ...parts].join(":");
    const result = consume(key, policy.windowMs, policy.max);

    res.setHeader("RateLimit-Limit", String(policy.max));
    res.setHeader("RateLimit-Remaining", String(result.remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      return res.status(429).json({ message: "Too many requests. Try again later." });
    }

    return next();
  };
}

export function getRateLimitStatus() {
  return {
    backend: RATE_LIMIT_BACKEND,
    redisConfigured: REDIS_CONFIGURED,
    activeBuckets: buckets.size,
    policies: Object.fromEntries(
      Object.entries(policies).map(([name, policy]) => [
        name,
        { windowMs: policy.windowMs, max: policy.max },
      ]),
    ),
  };
}
