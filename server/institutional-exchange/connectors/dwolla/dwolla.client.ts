import { Client as DwollaSdkClient } from "dwolla-v2";
import { maskSecret } from "../../../secret-store";

export type DwollaEnvironment = "sandbox" | "production";
export type DwollaConfigStatus = "configured" | "not_configured" | "credentials_missing" | "endpoint_not_allowlisted";

export interface DwollaConfigStorage {
  getApiConfig(key: string): Promise<string | undefined>;
}

export interface DwollaRuntimeConfig {
  key: string;
  secret: string;
  environment: DwollaEnvironment;
  apiUrl: string;
  source: "stored" | "environment";
}

export interface DwollaHealthStatus {
  provider: "dwolla";
  configured: boolean;
  status: DwollaConfigStatus;
  environment: DwollaEnvironment | "unknown";
  apiUrl: string | null;
  keyMasked: string | null;
  secretMasked: string | null;
  hasKey: boolean;
  hasSecret: boolean;
  message: string;
}

const officialApiUrls: Record<DwollaEnvironment, string> = {
  sandbox: "https://api-sandbox.dwolla.com",
  production: "https://api.dwolla.com",
};

function clean(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEnvironment(value: string | undefined): DwollaEnvironment {
  return value?.toLowerCase() === "production" ? "production" : "sandbox";
}

async function readFirst(storage: DwollaConfigStorage | undefined, keys: string[]) {
  if (!storage) return undefined;
  for (const key of keys) {
    const value = clean(await storage.getApiConfig(key));
    if (value) return value;
  }
  return undefined;
}

function sameOrigin(left: string, right: string) {
  try {
    const leftUrl = new URL(left);
    const rightUrl = new URL(right);
    return leftUrl.protocol === rightUrl.protocol && leftUrl.host === rightUrl.host;
  } catch {
    return false;
  }
}

export function isDwollaEndpointAllowed(apiUrl: string, environment: DwollaEnvironment, env: NodeJS.ProcessEnv = process.env) {
  if (sameOrigin(apiUrl, officialApiUrls[environment])) return true;
  const allowlist = (env.INSTITUTIONAL_EXCHANGE_ALLOWED_ENDPOINTS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return allowlist.some((allowed) => sameOrigin(apiUrl, allowed));
}

export async function getDwollaRuntimeConfig(
  storage?: DwollaConfigStorage,
  env: NodeJS.ProcessEnv = process.env,
): Promise<DwollaRuntimeConfig | null> {
  const storedKey = await readFirst(storage, ["dwolla_key", "DWOLLA_KEY"]);
  const storedSecret = await readFirst(storage, ["dwolla_secret", "DWOLLA_SECRET"]);
  const storedEnvironment = await readFirst(storage, ["dwolla_env", "DWOLLA_ENV"]);
  const storedApiUrl = await readFirst(storage, ["dwolla_api_url", "DWOLLA_API_URL"]);

  if (storedKey && storedSecret) {
    const environment = normalizeEnvironment(storedEnvironment || env.DWOLLA_ENV);
    return {
      key: storedKey,
      secret: storedSecret,
      environment,
      apiUrl: clean(storedApiUrl || env.DWOLLA_API_URL) || officialApiUrls[environment],
      source: "stored",
    };
  }

  const key = clean(env.DWOLLA_KEY);
  const secret = clean(env.DWOLLA_SECRET);
  const environment = normalizeEnvironment(env.DWOLLA_ENV);
  if (!key || !secret) return null;

  return {
    key,
    secret,
    environment,
    apiUrl: clean(env.DWOLLA_API_URL) || officialApiUrls[environment],
    source: "environment",
  };
}

export async function getDwollaHealthStatus(storage?: DwollaConfigStorage, env: NodeJS.ProcessEnv = process.env): Promise<DwollaHealthStatus> {
  const runtime = await getDwollaRuntimeConfig(storage, env);
  const environment = normalizeEnvironment(env.DWOLLA_ENV);
  if (!runtime) {
    const hasKey = !!clean(env.DWOLLA_KEY);
    const hasSecret = !!clean(env.DWOLLA_SECRET);
    return {
      provider: "dwolla",
      configured: false,
      status: hasKey || hasSecret ? "credentials_missing" : "not_configured",
      environment,
      apiUrl: clean(env.DWOLLA_API_URL) || officialApiUrls[environment],
      keyMasked: maskSecret(env.DWOLLA_KEY),
      secretMasked: maskSecret(env.DWOLLA_SECRET),
      hasKey,
      hasSecret,
      message: "DWOLLA_KEY and DWOLLA_SECRET are required before Dwolla requests can be sent.",
    };
  }

  if (!isDwollaEndpointAllowed(runtime.apiUrl, runtime.environment, env)) {
    return {
      provider: "dwolla",
      configured: false,
      status: "endpoint_not_allowlisted",
      environment: runtime.environment,
      apiUrl: runtime.apiUrl,
      keyMasked: maskSecret(runtime.key),
      secretMasked: maskSecret(runtime.secret),
      hasKey: true,
      hasSecret: true,
      message: "DWOLLA_API_URL must be an official Dwolla endpoint or listed in INSTITUTIONAL_EXCHANGE_ALLOWED_ENDPOINTS.",
    };
  }

  return {
    provider: "dwolla",
    configured: true,
    status: "configured",
    environment: runtime.environment,
    apiUrl: runtime.apiUrl,
    keyMasked: maskSecret(runtime.key),
    secretMasked: maskSecret(runtime.secret),
    hasKey: true,
    hasSecret: true,
    message: "Dwolla credentials and endpoint are configured.",
  };
}

export async function createDwollaClient(storage?: DwollaConfigStorage, env: NodeJS.ProcessEnv = process.env) {
  const runtime = await getDwollaRuntimeConfig(storage, env);
  if (!runtime) {
    throw Object.assign(new Error("DWOLLA_KEY and DWOLLA_SECRET are required before Dwolla requests can be sent."), { status: 400, code: "credentials_missing" });
  }
  if (!isDwollaEndpointAllowed(runtime.apiUrl, runtime.environment, env)) {
    throw Object.assign(new Error("DWOLLA_API_URL is not allowlisted."), { status: 400, code: "endpoint_not_allowlisted" });
  }

  const client = new DwollaSdkClient({
    key: runtime.key,
    secret: runtime.secret,
    environment: runtime.environment,
  });
  (client as unknown as { apiUrl: string }).apiUrl = runtime.apiUrl;
  return client;
}
