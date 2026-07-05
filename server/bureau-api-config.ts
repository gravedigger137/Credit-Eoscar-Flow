import { maskSecret } from "./secret-store";

export const bureauProviders = ["equifax", "experian", "transunion", "innovis"] as const;
export type BureauProvider = typeof bureauProviders[number];

export const bureauEnvironments = ["sandbox", "production"] as const;
export type BureauEnvironment = typeof bureauEnvironments[number];

export interface BureauConfigStorage {
  getApiConfig(key: string): Promise<string | undefined>;
  setApiConfig(key: string, value: string): Promise<void>;
}

export interface BureauApiConfigInput {
  provider?: string;
  bureau?: string;
  environment?: string;
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  memberId?: string;
  tokenUrl?: string;
  baseUrl?: string;
  productName?: string;
  apiName?: string;
  enabled?: boolean | string;
  status?: string;
}

export interface BureauConfigStatus {
  provider: BureauProvider;
  configured: boolean;
  environment: BureauEnvironment | "unknown";
  enabled: boolean;
  status: string;
  apiName: string | null;
  productName: string | null;
  tokenUrl: string | null;
  baseUrl: string | null;
  clientIdMasked: string | null;
  clientSecretMasked: string | null;
  apiKeyMasked: string | null;
  memberIdMasked: string | null;
  hasClientSecret: boolean;
}

interface NormalizedBureauConfig {
  provider: BureauProvider;
  environment: BureauEnvironment;
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  memberId?: string;
  tokenUrl?: string;
  baseUrl?: string;
  productName?: string;
  apiName?: string;
  enabled: boolean;
  status: string;
}

export class BureauApiConfigValidationError extends Error {
  readonly statusCode = 400;
  readonly fields: string[];

  constructor(fields: string[]) {
    super(`Missing or invalid bureau API configuration fields: ${fields.join(", ")}`);
    this.name = "BureauApiConfigValidationError";
    this.fields = fields;
  }
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeProvider(input: BureauApiConfigInput): BureauProvider | undefined {
  const value = clean(input.provider) ?? clean(input.bureau);
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return bureauProviders.includes(lower as BureauProvider) ? lower as BureauProvider : undefined;
}

function normalizeEnvironment(value: string | undefined): BureauEnvironment | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return bureauEnvironments.includes(lower as BureauEnvironment) ? lower as BureauEnvironment : undefined;
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

function prefixedKey(provider: BureauProvider, field: string) {
  return `bureau_${provider}_${field}`;
}

function legacyKey(provider: BureauProvider, field: string) {
  return `${provider}_${field}`;
}

export function validateBureauApiConfig(input: BureauApiConfigInput): NormalizedBureauConfig {
  const missing: string[] = [];
  const provider = normalizeProvider(input);
  if (!provider) missing.push("provider");

  const environment = normalizeEnvironment(clean(input.environment));
  if (!environment) missing.push("environment");

  const enabled = normalizeEnabled(input.enabled);
  const status = normalizeStatus(input.status, enabled);
  const apiKey = clean(input.apiKey);
  const apiSecret = clean(input.apiSecret);
  const clientId = clean(input.clientId);
  const clientSecret = clean(input.clientSecret) ?? apiKey;
  const memberId = clean(input.memberId);
  const tokenUrl = clean(input.tokenUrl);
  const baseUrl = clean(input.baseUrl);
  const productName = clean(input.productName);
  const apiName = clean(input.apiName) ?? productName;

  if (provider === "experian") {
    if (!clientId) missing.push("clientId");
    if (!clientSecret) missing.push("clientSecret");
    if (!tokenUrl) missing.push("tokenUrl");
    if (!baseUrl) missing.push("baseUrl");
    if (!apiName && !productName) missing.push("productName or apiName");
  } else {
    if (!apiKey) missing.push("apiKey");
  }

  if (missing.length > 0 || !provider || !environment) {
    throw new BureauApiConfigValidationError(missing);
  }

  return {
    provider,
    environment,
    ...(apiKey === undefined ? {} : { apiKey }),
    ...(apiSecret === undefined ? {} : { apiSecret }),
    ...(clientId === undefined ? {} : { clientId }),
    ...(clientSecret === undefined ? {} : { clientSecret }),
    ...(memberId === undefined ? {} : { memberId }),
    ...(tokenUrl === undefined ? {} : { tokenUrl }),
    ...(baseUrl === undefined ? {} : { baseUrl }),
    ...(productName === undefined ? {} : { productName }),
    ...(apiName === undefined ? {} : { apiName }),
    enabled,
    status,
  };
}

async function setIfPresent(storage: BureauConfigStorage, key: string, value: string | undefined) {
  if (value !== undefined) {
    await storage.setApiConfig(key, value);
  }
}

export async function saveBureauApiConfig(input: BureauApiConfigInput, storage: BureauConfigStorage) {
  const config = validateBureauApiConfig(input);
  const provider = config.provider;

  await storage.setApiConfig(legacyKey(provider, "environment"), config.environment);
  await storage.setApiConfig(prefixedKey(provider, "provider"), provider);
  await storage.setApiConfig(prefixedKey(provider, "environment"), config.environment);
  await storage.setApiConfig(prefixedKey(provider, "enabled"), String(config.enabled));
  await storage.setApiConfig(prefixedKey(provider, "status"), config.status);

  if (provider === "experian") {
    await storage.setApiConfig(legacyKey(provider, "api_key"), config.clientSecret ?? "");
    await storage.setApiConfig(legacyKey(provider, "client_id"), config.clientId ?? "");
    await storage.setApiConfig(legacyKey(provider, "client_secret"), config.clientSecret ?? "");
    await storage.setApiConfig(prefixedKey(provider, "client_id"), config.clientId ?? "");
    await storage.setApiConfig(prefixedKey(provider, "client_secret"), config.clientSecret ?? "");
    await storage.setApiConfig(prefixedKey(provider, "token_url"), config.tokenUrl ?? "");
    await storage.setApiConfig(prefixedKey(provider, "base_url"), config.baseUrl ?? "");
    await storage.setApiConfig(prefixedKey(provider, "product_name"), config.productName ?? config.apiName ?? "");
    await storage.setApiConfig(prefixedKey(provider, "api_name"), config.apiName ?? config.productName ?? "");
  } else {
    await storage.setApiConfig(legacyKey(provider, "api_key"), config.apiKey ?? "");
    await setIfPresent(storage, legacyKey(provider, "api_secret"), config.apiSecret);
    await setIfPresent(storage, legacyKey(provider, "client_id"), config.clientId);
    await setIfPresent(storage, legacyKey(provider, "member_id"), config.memberId);
  }

  return {
    success: true,
    message: `${provider} credentials saved`,
    config: await getBureauConfigStatus(provider, storage),
  };
}

async function readFirst(storage: BureauConfigStorage, keys: string[]) {
  for (const key of keys) {
    const value = await storage.getApiConfig(key);
    if (value) return value;
  }
  return undefined;
}

export async function getBureauConfigStatus(provider: BureauProvider, storage: BureauConfigStorage): Promise<BureauConfigStatus> {
  const environmentValue = await readFirst(storage, [prefixedKey(provider, "environment"), legacyKey(provider, "environment")]);
  const environment = normalizeEnvironment(environmentValue) ?? "sandbox";
  const enabled = normalizeEnabled(await storage.getApiConfig(prefixedKey(provider, "enabled")));
  const status = normalizeStatus(await storage.getApiConfig(prefixedKey(provider, "status")), enabled);
  const apiKey = await storage.getApiConfig(legacyKey(provider, "api_key"));
  const clientId = await readFirst(storage, [prefixedKey(provider, "client_id"), legacyKey(provider, "client_id")]);
  const clientSecret = await readFirst(storage, [prefixedKey(provider, "client_secret"), legacyKey(provider, "client_secret"), legacyKey(provider, "api_key")]);
  const tokenUrl = await storage.getApiConfig(prefixedKey(provider, "token_url"));
  const baseUrl = await storage.getApiConfig(prefixedKey(provider, "base_url"));
  const productName = await storage.getApiConfig(prefixedKey(provider, "product_name"));
  const apiName = await storage.getApiConfig(prefixedKey(provider, "api_name"));
  const memberId = await storage.getApiConfig(legacyKey(provider, "member_id"));

  const configured = provider === "experian"
    ? !!(clientId && clientSecret && tokenUrl && baseUrl && (apiName || productName) && enabled)
    : !!(apiKey && enabled);

  return {
    provider,
    configured,
    environment,
    enabled,
    status,
    apiName: apiName ?? null,
    productName: productName ?? null,
    tokenUrl: tokenUrl ?? null,
    baseUrl: baseUrl ?? null,
    clientIdMasked: maskSecret(clientId),
    clientSecretMasked: maskSecret(clientSecret),
    apiKeyMasked: maskSecret(apiKey),
    memberIdMasked: maskSecret(memberId),
    hasClientSecret: !!clientSecret,
  };
}

export async function getAllBureauConfigStatuses(storage: BureauConfigStorage) {
  const result: Record<BureauProvider, BureauConfigStatus> = {
    equifax: await getBureauConfigStatus("equifax", storage),
    experian: await getBureauConfigStatus("experian", storage),
    transunion: await getBureauConfigStatus("transunion", storage),
    innovis: await getBureauConfigStatus("innovis", storage),
  };

  return result;
}
