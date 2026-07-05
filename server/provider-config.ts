import { maskSecret } from "./secret-store";

export const plaidEnvironments = ["sandbox", "development", "production"] as const;
export type PlaidEnvironment = typeof plaidEnvironments[number];

export interface ProviderConfigStorage {
  getApiConfig(key: string): Promise<string | undefined>;
  setApiConfig(key: string, value: string): Promise<void>;
}

export interface PlaidConfigInput {
  clientId?: string;
  secret?: string;
  environment?: string;
  products?: string[] | string;
  enabled?: boolean | string;
  status?: string;
}

export interface PlaidRuntimeConfig {
  clientId: string;
  secret: string;
  environment: PlaidEnvironment;
  products: string[];
  enabled: boolean;
  status: string;
  source: "stored" | "environment";
}

export interface PlaidConfigStatus {
  provider: "plaid";
  configured: boolean;
  environment: PlaidEnvironment | "unknown";
  enabled: boolean;
  status: string;
  source: "stored" | "environment" | "none";
  products: string[];
  clientIdMasked: string | null;
  secretMasked: string | null;
  hasClientId: boolean;
  hasSecret: boolean;
}

interface NormalizedPlaidConfig {
  clientId: string;
  secret: string;
  environment: PlaidEnvironment;
  products: string[];
  enabled: boolean;
  status: string;
}

export class ProviderConfigValidationError extends Error {
  readonly statusCode = 400;
  readonly fields: string[];

  constructor(fields: string[]) {
    super(`Missing or invalid Plaid configuration fields: ${fields.join(", ")}`);
    this.name = "ProviderConfigValidationError";
    this.fields = fields;
  }
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEnvironment(value: string | undefined): PlaidEnvironment | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return plaidEnvironments.includes(lower as PlaidEnvironment) ? lower as PlaidEnvironment : undefined;
}

function normalizeEnabled(value: boolean | string | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return !["false", "0", "disabled", "inactive"].includes(value.trim().toLowerCase());
  }
  return true;
}

function normalizeStatus(value: string | undefined, enabled: boolean): string {
  const cleaned = clean(value)?.toLowerCase();
  if (cleaned) return cleaned;
  return enabled ? "active" : "disabled";
}

function normalizeProducts(value: string[] | string | undefined): string[] {
  const source = Array.isArray(value) ? value : clean(value)?.split(",");
  const normalized = (source || ["auth", "transactions", "identity", "liabilities"])
    .map((item) => clean(item)?.toLowerCase())
    .filter((item): item is string => !!item);

  return Array.from(new Set(normalized));
}

async function readFirst(storage: ProviderConfigStorage, keys: string[]) {
  for (const key of keys) {
    const value = await storage.getApiConfig(key);
    if (value) return value;
  }
  return undefined;
}

async function getStoredPlaidConfig(storage: ProviderConfigStorage): Promise<Partial<NormalizedPlaidConfig>> {
  const enabled = normalizeEnabled(await storage.getApiConfig("plaid_enabled"));
  const status = normalizeStatus(await storage.getApiConfig("plaid_status"), enabled);
  const environment = normalizeEnvironment(await readFirst(storage, ["plaid_environment", "plaid_env"]));
  const productsValue = await storage.getApiConfig("plaid_products");

  return {
    clientId: await storage.getApiConfig("plaid_client_id"),
    secret: await storage.getApiConfig("plaid_secret"),
    ...(environment ? { environment } : {}),
    products: normalizeProducts(productsValue),
    enabled,
    status,
  };
}

async function normalizePlaidConfig(input: PlaidConfigInput, storage: ProviderConfigStorage): Promise<NormalizedPlaidConfig> {
  const stored = await getStoredPlaidConfig(storage);
  const clientId = clean(input.clientId) ?? stored.clientId;
  const secret = clean(input.secret) ?? stored.secret;
  const environment = normalizeEnvironment(clean(input.environment)) ?? stored.environment;
  const products = normalizeProducts(input.products ?? stored.products);
  const enabled = normalizeEnabled(input.enabled);
  const status = normalizeStatus(clean(input.status), enabled);
  const fields: string[] = [];

  if (!clientId) fields.push("clientId");
  if (!secret) fields.push("secret");
  if (!environment) fields.push("environment");

  if (fields.length > 0 || !clientId || !secret || !environment) {
    throw new ProviderConfigValidationError(fields);
  }

  return { clientId, secret, environment, products, enabled, status };
}

export async function savePlaidConfig(input: PlaidConfigInput, storage: ProviderConfigStorage) {
  const config = await normalizePlaidConfig(input, storage);

  await storage.setApiConfig("plaid_client_id", config.clientId);
  await storage.setApiConfig("plaid_secret", config.secret);
  await storage.setApiConfig("plaid_environment", config.environment);
  await storage.setApiConfig("plaid_env", config.environment);
  await storage.setApiConfig("plaid_products", config.products.join(","));
  await storage.setApiConfig("plaid_enabled", String(config.enabled));
  await storage.setApiConfig("plaid_status", config.status);

  return {
    success: true,
    message: "Plaid configuration saved",
    config: await getPlaidConfigStatus(storage, "stored"),
  };
}

export async function getPlaidRuntimeConfig(storage: ProviderConfigStorage): Promise<PlaidRuntimeConfig | null> {
  const stored = await getStoredPlaidConfig(storage);
  if (stored.clientId && stored.secret && stored.environment) {
    return {
      clientId: stored.clientId,
      secret: stored.secret,
      environment: stored.environment,
      products: stored.products && stored.products.length > 0 ? stored.products : normalizeProducts(undefined),
      enabled: stored.enabled ?? true,
      status: stored.status ?? "active",
      source: "stored",
    };
  }

  const envClientId = clean(process.env.PLAID_CLIENT_ID);
  const envSecret = clean(process.env.PLAID_SECRET);
  const envEnvironment = normalizeEnvironment(clean(process.env.PLAID_ENV) ?? "sandbox");
  if (!envClientId || !envSecret || !envEnvironment) return null;

  return {
    clientId: envClientId,
    secret: envSecret,
    environment: envEnvironment,
    products: normalizeProducts(process.env.PLAID_PRODUCTS),
    enabled: true,
    status: "active",
    source: "environment",
  };
}

export async function getPlaidConfigStatus(
  storage: ProviderConfigStorage,
  preferredSource?: "stored" | "environment",
): Promise<PlaidConfigStatus> {
  const runtime = await getPlaidRuntimeConfig(storage);
  if (!runtime) {
    return {
      provider: "plaid",
      configured: false,
      environment: "unknown",
      enabled: false,
      status: "not_configured",
      source: "none",
      products: [],
      clientIdMasked: null,
      secretMasked: null,
      hasClientId: false,
      hasSecret: false,
    };
  }

  const configured = runtime.enabled && !["disabled", "inactive"].includes(runtime.status);

  return {
    provider: "plaid",
    configured,
    environment: runtime.environment,
    enabled: runtime.enabled,
    status: runtime.status,
    source: preferredSource ?? runtime.source,
    products: runtime.products,
    clientIdMasked: maskSecret(runtime.clientId),
    secretMasked: maskSecret(runtime.secret),
    hasClientId: !!runtime.clientId,
    hasSecret: !!runtime.secret,
  };
}

export async function testPlaidConfigReadiness(storage: ProviderConfigStorage) {
  const runtime = await getPlaidRuntimeConfig(storage);
  const missing: string[] = [];

  if (!runtime?.clientId) missing.push("clientId");
  if (!runtime?.secret) missing.push("secret");
  if (!runtime?.environment) missing.push("environment");

  if (missing.length > 0 || !runtime) {
    throw new ProviderConfigValidationError(missing);
  }

  if (!runtime.enabled || ["disabled", "inactive"].includes(runtime.status)) {
    throw new ProviderConfigValidationError(["enabled/status"]);
  }

  return {
    success: true,
    ready: true,
    provider: "plaid",
    environment: runtime.environment,
    source: runtime.source,
    products: runtime.products,
    message: "Plaid configuration is complete. Live connectivity is verified when a link token is created during account linking.",
  };
}
