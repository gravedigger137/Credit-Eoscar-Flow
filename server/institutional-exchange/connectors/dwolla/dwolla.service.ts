import crypto from "crypto";
import { eq } from "drizzle-orm";
import type { Client as DwollaSdkClient } from "dwolla-v2";
import { z } from "zod";
import { bankAccounts, auditEvents, connectorHealth } from "@shared/schema";
import { db } from "../../../db";
import { storage } from "../../../storage";
import { decryptIfEncrypted } from "../../../secret-store";
import { safeErrorMessage } from "../../../security-utils";
import { createDwollaProcessorToken } from "../../../plaid-client";
import { createDwollaClient, getDwollaHealthStatus, type DwollaConfigStorage } from "./dwolla.client";
import {
  buildDwollaExchangePayload,
  buildDwollaFundingSourcePayload,
  buildDwollaTransferPayload,
  verifyDwollaWebhookSignature,
} from "./dwolla.payloads";

export {
  buildDwollaExchangePayload,
  buildDwollaFundingSourcePayload,
  buildDwollaTransferPayload,
  verifyDwollaWebhookSignature,
} from "./dwolla.payloads";

type DwollaResponse = Awaited<ReturnType<DwollaSdkClient["post"]>>;

export interface DwollaServiceDependencies {
  clientFactory?: () => Promise<DwollaSdkClient>;
  configStorage?: DwollaConfigStorage;
}

const createCustomerSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  type: z.string().trim().optional(),
  address1: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  dateOfBirth: z.string().trim().optional(),
  ssn: z.string().trim().optional(),
  businessName: z.string().trim().optional(),
  idempotencyKey: z.string().trim().optional(),
});

const exchangeSchema = z.object({
  processorToken: z.string().trim().optional(),
  bankAccountId: z.string().uuid().optional(),
  exchangePartnerHref: z.string().trim().url().optional(),
  idempotencyKey: z.string().trim().optional(),
});

const fundingSourceSchema = z.object({
  customerId: z.string().trim().optional(),
  customerUrl: z.string().trim().url().optional(),
  bankAccountId: z.string().uuid().optional(),
  exchangeUrl: z.string().trim().url().optional(),
  name: z.string().trim().min(1),
  bankAccountType: z.string().trim().optional(),
  routingNumber: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  idempotencyKey: z.string().trim().optional(),
});

const transferSchema = z.object({
  sourceFundingSourceUrl: z.string().trim().url(),
  destinationFundingSourceUrl: z.string().trim().url(),
  amount: z.union([z.number(), z.string()]),
  currency: z.string().trim().length(3).default("USD"),
  idempotencyKey: z.string().trim().optional(),
  metadata: z.record(z.unknown()).optional(),
});

function locationFrom(response: DwollaResponse) {
  return response.headers.get("location") || response.headers.get("Location") || null;
}

function idempotencyKey(prefix: string, seed: Record<string, unknown>, explicit?: string) {
  if (explicit && explicit.trim().length >= 8) return explicit.trim();
  return `${prefix}_${crypto.createHash("sha256").update(JSON.stringify(seed)).digest("hex").slice(0, 32)}`;
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")) as T;
}

function resourcePath(resource: string, idOrUrl: string) {
  if (idOrUrl.startsWith("https://")) return idOrUrl;
  return `${resource}/${idOrUrl}`;
}

function customerUrl(input: { customerId?: string; customerUrl?: string }) {
  if (input.customerUrl) return input.customerUrl;
  if (input.customerId) return resourcePath("customers", input.customerId);
  throw Object.assign(new Error("customerId or customerUrl is required."), { status: 400 });
}

function exchangePartnerHref(input?: string) {
  const configured = input || process.env.DWOLLA_PLAID_EXCHANGE_PARTNER_HREF;
  if (!configured) {
    throw Object.assign(new Error("DWOLLA_PLAID_EXCHANGE_PARTNER_HREF is required to create a Dwolla Exchange from a Plaid processor token."), {
      status: 400,
      code: "requires_enrollment",
    });
  }
  return configured;
}

export class DwollaInstitutionalService {
  constructor(private readonly dependencies: DwollaServiceDependencies = {}) {}

  private async client() {
    return this.dependencies.clientFactory ? this.dependencies.clientFactory() : createDwollaClient(this.dependencies.configStorage ?? storage);
  }

  private async audit(action: string, entityType: string, entityId: string | null, afterValue?: Record<string, unknown>, actorUserId?: string | null) {
    await db.insert(auditEvents).values({
      action,
      entityType,
      entityId: entityId ?? undefined,
      actorUserId: actorUserId ?? undefined,
      afterValue: afterValue ?? null,
      highRisk: true,
      reason: "Dwolla institutional connector action",
    } as any);
  }

  async health() {
    const health = await getDwollaHealthStatus(this.dependencies.configStorage ?? storage);
    await db.insert(connectorHealth).values({
      connectorCode: "dwolla",
      status: health.status === "configured" ? "configured" : health.status,
      configured: health.configured,
      lastCheckedAt: new Date(),
      message: health.message,
      capabilities: ["customers", "exchanges", "funding_sources", "transfers"],
    } as any).onConflictDoUpdate({
      target: connectorHealth.connectorCode,
      set: {
        status: health.status === "configured" ? "configured" : health.status,
        configured: health.configured,
        lastCheckedAt: new Date(),
        message: health.message,
        capabilities: ["customers", "exchanges", "funding_sources", "transfers"],
        updatedAt: new Date(),
      } as any,
    });
    return health;
  }

  async createCustomer(input: unknown, actorUserId?: string | null) {
    const parsed = createCustomerSchema.parse(input);
    const body = compact({
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email,
      type: parsed.type,
      address1: parsed.address1,
      city: parsed.city,
      state: parsed.state,
      postalCode: parsed.postalCode,
      dateOfBirth: parsed.dateOfBirth,
      ssn: parsed.ssn,
      businessName: parsed.businessName,
    });
    const response = await (await this.client()).post("customers", body, {
      "Idempotency-Key": idempotencyKey("dwolla_customer", body, parsed.idempotencyKey),
    });
    const location = locationFrom(response);
    await this.audit("dwolla.customer.created", "dwolla_customer", location, { location }, actorUserId);
    return { location, status: response.status, body: response.body };
  }

  async retrieveCustomer(id: string) {
    const response = await (await this.client()).get(resourcePath("customers", id));
    return { status: response.status, body: response.body };
  }

  async createExchange(input: unknown, actorUserId?: string | null) {
    const parsed = exchangeSchema.parse(input);
    let processorToken = parsed.processorToken;
    let bankAccountId = parsed.bankAccountId;

    if (!processorToken && bankAccountId) {
      const account = await this.findPlaidBankAccount(bankAccountId);
      if (!account.plaidAccessToken || !account.plaidAccountId) {
        throw Object.assign(new Error("Selected bank account does not have the Plaid token and account ID required for a Dwolla processor token."), { status: 400 });
      }
      const accessToken = decryptIfEncrypted(account.plaidAccessToken);
      const plaidResult = await createDwollaProcessorToken(accessToken || "", account.plaidAccountId);
      if ("error" in plaidResult) throw Object.assign(new Error(plaidResult.error), { status: 400 });
      processorToken = plaidResult.processorToken;
    }

    if (!processorToken) {
      throw Object.assign(new Error("processorToken or bankAccountId is required."), { status: 400 });
    }

    const body = buildDwollaExchangePayload(processorToken, exchangePartnerHref(parsed.exchangePartnerHref));
    const response = await (await this.client()).post("exchanges", body, {
      "Idempotency-Key": idempotencyKey("dwolla_exchange", { processorToken, bankAccountId }, parsed.idempotencyKey),
    });
    const location = locationFrom(response);

    if (location && bankAccountId) {
      await db.update(bankAccounts).set({ dwollaExchangeUrl: location } as any).where(eq(bankAccounts.id, bankAccountId));
    }

    await this.audit("dwolla.exchange.created", "dwolla_exchange", location, { bankAccountId, location }, actorUserId);
    return { location, status: response.status, body: response.body };
  }

  async createFundingSource(input: unknown, actorUserId?: string | null) {
    const parsed = fundingSourceSchema.parse(input);
    const resolvedCustomerUrl = customerUrl(parsed);
    let exchangeUrl = parsed.exchangeUrl;

    if (!exchangeUrl && parsed.bankAccountId) {
      const account = await this.findPlaidBankAccount(parsed.bankAccountId);
      if (account.plaidAccessToken && account.plaidAccountId) {
        const exchange = await this.createExchange({
          bankAccountId: parsed.bankAccountId,
          idempotencyKey: parsed.idempotencyKey ? `${parsed.idempotencyKey}:exchange` : undefined,
        }, actorUserId);
        exchangeUrl = exchange.location || undefined;
      }
    }

    const body = buildDwollaFundingSourcePayload({
      customerUrl: resolvedCustomerUrl,
      name: parsed.name,
      exchangeUrl,
      bankAccountType: parsed.bankAccountType,
      routingNumber: parsed.routingNumber,
      accountNumber: parsed.accountNumber,
    });
    const response = await (await this.client()).post("funding-sources", body, {
      "Idempotency-Key": idempotencyKey("dwolla_funding_source", { customerUrl: resolvedCustomerUrl, name: parsed.name, exchangeUrl }, parsed.idempotencyKey),
    });
    const location = locationFrom(response);

    if (parsed.bankAccountId && location) {
      await db.update(bankAccounts).set({
        dwollaCustomerUrl: resolvedCustomerUrl,
        dwollaExchangeUrl: exchangeUrl || null,
        dwollaFundingSourceUrl: location,
      } as any).where(eq(bankAccounts.id, parsed.bankAccountId));
    }

    await this.audit("dwolla.funding_source.created", "dwolla_funding_source", location, {
      bankAccountId: parsed.bankAccountId,
      customerUrl: resolvedCustomerUrl,
      usedPlaidExchange: !!exchangeUrl,
    }, actorUserId);
    return { location, status: response.status, body: response.body };
  }

  async listFundingSources(customerId: string) {
    const response = await (await this.client()).get(`${resourcePath("customers", customerId)}/funding-sources`);
    return { status: response.status, body: response.body };
  }

  async createTransfer(input: unknown, actorUserId?: string | null) {
    const parsed = transferSchema.parse(input);
    const body = buildDwollaTransferPayload(parsed);
    const response = await (await this.client()).post("transfers", body, {
      "Idempotency-Key": idempotencyKey("dwolla_transfer", body, parsed.idempotencyKey),
    });
    const location = locationFrom(response);
    await this.audit("dwolla.transfer.created", "dwolla_transfer", location, { location, amount: body.amount }, actorUserId);
    return { location, status: response.status, body: response.body };
  }

  async retrieveTransfer(id: string) {
    const response = await (await this.client()).get(resourcePath("transfers", id));
    return { status: response.status, body: response.body };
  }

  private async findPlaidBankAccount(bankAccountId: string) {
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, bankAccountId));
    if (!account) throw Object.assign(new Error("Bank account not found."), { status: 404 });
    return account;
  }
}

export function mapDwollaError(error: unknown) {
  const candidate = error as { status?: number; body?: unknown; message?: string; code?: string; errors?: unknown };
  if (candidate?.status && candidate.status >= 400 && candidate.status < 500) {
    return {
      status: candidate.status,
      body: {
        message: candidate.message || "Dwolla request failed.",
        code: candidate.code,
        errors: candidate.errors,
        providerError: summarizeDwollaError(candidate.body),
      },
    };
  }
  if (error instanceof z.ZodError) {
    return { status: 400, body: { message: "Validation error", errors: error.errors } };
  }
  return { status: 500, body: { message: "Dwolla request failed.", error: safeErrorMessage(error) } };
}

function summarizeDwollaError(body: unknown) {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    path: typeof record.path === "string" ? record.path : undefined,
  };
}

export const dwollaInstitutionalService = new DwollaInstitutionalService();
