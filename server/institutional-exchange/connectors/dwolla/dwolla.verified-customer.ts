import crypto from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import FormData from "form-data";
import { and, desc, eq, or, sql } from "drizzle-orm";
import type { Client as DwollaSdkClient } from "dwolla-v2";
import { z } from "zod";
import {
  auditEvents,
  clients,
  dwollaCustomerDocuments,
  dwollaCustomerEvents,
  type Client,
  type User,
} from "@shared/schema";
import { db } from "../../../db";
import { storage } from "../../../storage";
import { encryptIfSensitive } from "../../../secret-store";
import { isAdminUser } from "../../../authorization";
import { safeErrorMessage } from "../../../security-utils";
import { createDwollaClient, type DwollaConfigStorage } from "./dwolla.client";
import {
  buildDwollaVerifiedCustomerPayload,
  cleanSsn,
  extractDwollaIdFromUrl,
  normalizeDwollaVerificationStatus,
  normalizeDwollaWebhookTopic,
  serializeDwollaCustomerProfile,
  shouldApplyDwollaStatusUpdate,
  verifyDwollaWebhookSignature,
  type DwollaVerificationStatus,
} from "./dwolla.payloads";

type DwollaResponse = Awaited<ReturnType<DwollaSdkClient["post"]>>;

export interface DwollaVerifiedCustomerDependencies {
  clientFactory?: () => Promise<DwollaSdkClient>;
  configStorage?: DwollaConfigStorage;
  now?: () => Date;
}

export interface DwollaActor {
  id: string | null;
  email?: string | null;
  role?: string | null;
  isAdmin: boolean;
}

const verifiedCustomerSchema = z.object({
  clientId: z.string().trim().min(1).optional(),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "dateOfBirth must use YYYY-MM-DD format").optional(),
  address1: z.string().trim().min(1).optional(),
  address2: z.string().trim().optional(),
  city: z.string().trim().min(1).optional(),
  state: z.string().trim().min(2).max(2).optional(),
  postalCode: z.string().trim().min(5).optional(),
  last4SSN: z.string().trim().optional(),
  fullSSN: z.string().trim().optional(),
  ipAddress: z.string().trim().optional(),
  correlationId: z.string().trim().min(8).optional(),
});

const updateCustomerSchema = verifiedCustomerSchema.partial().extend({
  statusReason: z.string().trim().max(500).optional(),
});

const retrySchema = z.object({
  fullSSN: z.string().trim().optional(),
  last4SSN: z.string().trim().optional(),
  dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "dateOfBirth must use YYYY-MM-DD format").optional(),
  address1: z.string().trim().min(1).optional(),
  address2: z.string().trim().optional(),
  city: z.string().trim().min(1).optional(),
  state: z.string().trim().min(2).max(2).optional(),
  postalCode: z.string().trim().min(5).optional(),
});

export const supportedDwollaDocumentTypes = new Set([
  "passport",
  "license",
  "idCard",
  "other",
  "identity_verification",
]);

const allowedDocumentMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const allowedDocumentExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png"]);
const documentMaxBytes = Number(process.env.DWOLLA_DOCUMENT_MAX_BYTES || 10 * 1024 * 1024);
const privateUploadRoot = path.resolve(process.cwd(), process.env.DWOLLA_PRIVATE_UPLOAD_DIR || "private_uploads/dwolla-verification");

function locationFrom(response: DwollaResponse) {
  return response.headers.get("location") || response.headers.get("Location") || null;
}

function idempotencyKey(prefix: string, seed: Record<string, unknown>, explicit?: string | null) {
  if (explicit && explicit.trim().length >= 8) return explicit.trim();
  return `${prefix}_${crypto.createHash("sha256").update(JSON.stringify(seed)).digest("hex").slice(0, 32)}`;
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "" && entry !== null)) as T;
}

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function lower(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function sanitizeProviderBody(body: unknown) {
  if (!body || typeof body !== "object") return undefined;
  const raw = body as Record<string, unknown>;
  return {
    code: typeof raw.code === "string" ? raw.code : undefined,
    message: typeof raw.message === "string" ? raw.message : undefined,
    errors: Array.isArray(raw._embedded) ? undefined : undefined,
  };
}

export function actorFromUser(user: User | undefined | null): DwollaActor {
  return {
    id: user?.id || null,
    email: user?.email || null,
    role: user?.role || null,
    isAdmin: isAdminUser(user),
  };
}

export function canAccessDwollaClientRecord(actor: DwollaActor, client: Pick<Client, "email">) {
  return actor.isAdmin || (!!actor.email && lower(actor.email) === lower(client.email));
}

export function encryptDwollaFullSsn(fullSsn: string) {
  const cleaned = cleanSsn(fullSsn);
  if (cleaned.length !== 9) {
    throw Object.assign(new Error("fullSSN must contain exactly nine digits."), { status: 400, code: "invalid_full_ssn" });
  }
  const encrypted = encryptIfSensitive("dwolla_full_ssn", cleaned);
  if (encrypted === cleaned) {
    throw Object.assign(new Error("SENSITIVE_CONFIG_ENCRYPTION_KEY is required before storing full SSN."), {
      status: 400,
      code: "encryption_key_required",
    });
  }
  return encrypted;
}

export function validateDwollaDocumentFile(file: { originalname: string; mimetype: string; size: number; path: string }) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedDocumentExtensions.has(extension) || !allowedDocumentMimeTypes.has(file.mimetype)) {
    throw Object.assign(new Error("Unsupported Dwolla verification document type. Upload PDF, JPG, or PNG."), { status: 400, code: "unsupported_document_type" });
  }
  if (file.size <= 0 || file.size > documentMaxBytes) {
    throw Object.assign(new Error(`Dwolla verification document must be between 1 byte and ${documentMaxBytes} bytes.`), { status: 400, code: "invalid_document_size" });
  }
  const header = fs.readFileSync(file.path).subarray(0, 8);
  const isPdf = extension === ".pdf" && header.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]));
  const isJpeg = [".jpg", ".jpeg"].includes(extension) && header.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const isPng = extension === ".png" && header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!isPdf && !isJpeg && !isPng) {
    throw Object.assign(new Error("Document signature does not match the declared file type."), { status: 400, code: "document_signature_mismatch" });
  }
}

export function isDwollaProductionDocumentStorageConfigured(storageProvider = process.env.PRIVATE_UPLOAD_STORAGE) {
  const provider = (storageProvider || "").trim().toLowerCase();
  return !!provider && !["local", "local_private", "disk", "file", "filesystem"].includes(provider);
}

function requireProfile(profile: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter((field) => !clean(String(profile[field] || "")));
  if (missing.length) {
    throw Object.assign(new Error(`Missing required Dwolla verified customer fields: ${missing.join(", ")}`), {
      status: 400,
      code: "missing_required_fields",
      missingFields: missing,
    });
  }
}

function dwollaCustomerPath(customerId: string) {
  return customerId.startsWith("https://") ? customerId : `customers/${customerId}`;
}

function extractCustomerResourceUrl(payload: Record<string, unknown>) {
  const links = payload._links as Record<string, { href?: string }> | undefined;
  return links?.customer?.href || links?.resource?.href || links?.self?.href || null;
}

function parseDwollaEventPayload(raw: unknown) {
  const payload = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const eventId = clean(String(payload.id || payload.eventId || payload.resourceId || ""));
  const topic = clean(String(payload.topic || payload.type || "")) || "unknown";
  const occurredAtRaw = clean(String(payload.created || payload.createdAt || payload.timestamp || "")) || new Date().toISOString();
  const occurredAt = new Date(occurredAtRaw);
  const resourceUrl = extractCustomerResourceUrl(payload) || clean(String(payload.resourceUrl || ""));
  const customerId = extractDwollaIdFromUrl(resourceUrl) || clean(String(payload.customerId || ""));
  const rawStatus = clean(String(payload.status || ""));
  return {
    eventId,
    topic,
    internalTopic: normalizeDwollaWebhookTopic(topic),
    occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
    resourceUrl: resourceUrl || null,
    customerId: customerId || null,
    rawStatus: rawStatus || null,
    normalizedStatus: normalizeDwollaVerificationStatus(topic, rawStatus),
  };
}

export class DwollaVerifiedCustomerService {
  constructor(private readonly dependencies: DwollaVerifiedCustomerDependencies = {}) {}

  private now() {
    return this.dependencies.now ? this.dependencies.now() : new Date();
  }

  private async client() {
    return this.dependencies.clientFactory ? this.dependencies.clientFactory() : createDwollaClient(this.dependencies.configStorage ?? storage);
  }

  private async audit(action: string, entityId: string | null, afterValue: Record<string, unknown>, actorUserId?: string | null) {
    await db.insert(auditEvents).values({
      action,
      entityType: "dwolla_verified_customer",
      entityId: entityId ?? undefined,
      actorUserId: actorUserId ?? undefined,
      afterValue,
      highRisk: true,
      reason: "Dwolla verified customer onboarding action",
    } as any);
  }

  async findClientForActor(actor: DwollaActor, clientId?: string) {
    let client: Client | undefined;
    if (clientId) {
      [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    } else if (actor.email) {
      [client] = await db.select().from(clients).where(sql`lower(${clients.email}) = ${lower(actor.email)}`).limit(1);
    }
    if (!client) throw Object.assign(new Error("Client record not found for Dwolla onboarding."), { status: 404, code: "client_not_found" });
    if (!canAccessDwollaClientRecord(actor, client)) {
      throw Object.assign(new Error("You are not authorized to access this Dwolla customer record."), { status: 403, code: "dwolla_customer_forbidden" });
    }
    return client;
  }

  async findClientByCustomerIdentifier(identifier: string, actor?: DwollaActor) {
    const customerId = extractDwollaIdFromUrl(identifier) || identifier;
    const [client] = await db.select().from(clients).where(or(
      eq(clients.id, identifier),
      eq(clients.dwollaCustomerId, customerId),
      eq(clients.dwollaCustomerUrl, identifier),
    )).limit(1);
    if (!client) throw Object.assign(new Error("Dwolla customer record not found."), { status: 404, code: "dwolla_customer_not_found" });
    if (actor && !canAccessDwollaClientRecord(actor, client)) {
      throw Object.assign(new Error("You are not authorized to access this Dwolla customer record."), { status: 403, code: "dwolla_customer_forbidden" });
    }
    return client;
  }

  async createVerifiedCustomer(input: unknown, actor: DwollaActor) {
    const parsed = verifiedCustomerSchema.parse(input);
    const client = await this.findClientForActor(actor, parsed.clientId);
    if (client.dwollaCustomerId && client.dwollaCustomerUrl) {
      return {
        customer: serializeDwollaCustomerProfile(client),
        idempotent: true,
      };
    }

    const fullSSN = clean(parsed.fullSSN);
    const fullDigits = cleanSsn(fullSSN);
    const last4 = cleanSsn(parsed.last4SSN) || (fullDigits.length === 9 ? fullDigits.slice(-4) : cleanSsn(client.last4Ssn));
    const profile = compact({
      firstName: parsed.firstName || client.firstName,
      lastName: parsed.lastName || client.lastName,
      email: parsed.email || client.email,
      phone: parsed.phone || client.phone,
      dateOfBirth: parsed.dateOfBirth || client.dateOfBirth || client.dob,
      address1: parsed.address1 || client.address,
      address2: parsed.address2 || client.address2,
      city: parsed.city || client.city,
      state: (parsed.state || client.state || "").toUpperCase(),
      postalCode: parsed.postalCode || client.zip,
      last4SSN: last4,
      fullSSN: fullSSN || undefined,
    });
    requireProfile(profile, ["firstName", "lastName", "email", "dateOfBirth", "address1", "city", "state", "postalCode", "last4SSN"]);

    const body = buildDwollaVerifiedCustomerPayload(profile as any);
    const encryptedFullSsn = fullSSN ? encryptDwollaFullSsn(fullSSN) : client.encryptedFullSsn;
    const correlationId = parsed.correlationId || idempotencyKey("dwolla_verified_customer", { clientId: client.id, email: profile.email });
    const response = await (await this.client()).post("customers", body, { "Idempotency-Key": correlationId });
    const location = locationFrom(response);
    const dwollaCustomerId = extractDwollaIdFromUrl(location);
    if (!location || !dwollaCustomerId) {
      throw Object.assign(new Error("Dwolla did not return a customer location."), { status: 502, code: "dwolla_customer_location_missing" });
    }

    const update: Partial<Client> = {
      address2: clean(parsed.address2) || client.address2,
      last4Ssn: last4,
      encryptedFullSsn,
      ipAddress: clean(parsed.ipAddress) || client.ipAddress,
      correlationId,
      dwollaCustomerId,
      dwollaCustomerUrl: location,
      dwollaVerificationStatus: "pending",
      dwollaVerificationRawStatus: "created",
      dwollaVerificationUpdatedAt: this.now(),
      dwollaVerificationFailureReason: null,
    } as any;

    const [updated] = await db.update(clients).set(update as any).where(eq(clients.id, client.id)).returning();
    await this.audit("dwolla.customer.verified.create_requested", client.id, {
      clientId: client.id,
      dwollaCustomerId,
      status: "pending",
      hasEncryptedFullSsn: !!fullSSN,
      correlationId,
    }, actor.id);

    return {
      location,
      customer: serializeDwollaCustomerProfile(updated),
      idempotent: false,
    };
  }

  async retrieveVerifiedCustomer(customerIdentifier: string, actor: DwollaActor) {
    const client = await this.findClientByCustomerIdentifier(customerIdentifier, actor);
    return {
      customer: serializeDwollaCustomerProfile(client),
      documents: await this.listDocuments(client.id),
    };
  }

  async updateVerifiedCustomer(customerIdentifier: string, input: unknown, actor: DwollaActor) {
    const parsed = updateCustomerSchema.parse(input);
    const client = await this.findClientByCustomerIdentifier(customerIdentifier, actor);
    if (!client.dwollaCustomerId) throw Object.assign(new Error("Dwolla customer ID is not stored for this client."), { status: 400, code: "dwolla_customer_missing" });

    const fullSSN = clean(parsed.fullSSN);
    const last4 = fullSSN ? cleanSsn(fullSSN).slice(-4) : cleanSsn(parsed.last4SSN) || client.last4Ssn || undefined;
    const payload = compact({
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email,
      address1: parsed.address1,
      address2: parsed.address2,
      city: parsed.city,
      state: parsed.state?.toUpperCase(),
      postalCode: parsed.postalCode,
      dateOfBirth: parsed.dateOfBirth,
      ssn: fullSSN ? cleanSsn(fullSSN) : undefined,
    });
    if (Object.keys(payload).length === 0 && !parsed.phone && !parsed.ipAddress && !last4) {
      throw Object.assign(new Error("No Dwolla customer fields were provided for update."), { status: 400, code: "empty_update" });
    }
    const encryptedFullSsn = fullSSN ? encryptDwollaFullSsn(fullSSN) : undefined;
    if (Object.keys(payload).length > 0) {
      await (await this.client()).post(dwollaCustomerPath(client.dwollaCustomerId), payload, {
        "Idempotency-Key": idempotencyKey("dwolla_customer_update", { customerId: client.dwollaCustomerId, payload }),
      });
    }

    const [updated] = await db.update(clients).set(compact({
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email,
      phone: parsed.phone,
      dateOfBirth: parsed.dateOfBirth,
      address: parsed.address1,
      address2: parsed.address2,
      city: parsed.city,
      state: parsed.state?.toUpperCase(),
      zip: parsed.postalCode,
      last4Ssn: last4,
      encryptedFullSsn,
      ipAddress: parsed.ipAddress,
      dwollaVerificationFailureReason: parsed.statusReason || null,
      dwollaVerificationUpdatedAt: this.now(),
    }) as any).where(eq(clients.id, client.id)).returning();

    await this.audit("dwolla.customer.verified.updated", client.id, {
      clientId: client.id,
      dwollaCustomerId: client.dwollaCustomerId,
      fieldsUpdated: Object.keys(payload).filter((key) => key !== "ssn"),
      fullSsnProvided: !!fullSSN,
    }, actor.id);

    return { customer: serializeDwollaCustomerProfile(updated) };
  }

  async getVerification(customerIdentifier: string, actor: DwollaActor) {
    const client = await this.findClientByCustomerIdentifier(customerIdentifier, actor);
    return {
      customer: serializeDwollaCustomerProfile(client),
      canRetry: ["retry", "kba", "document", "failed"].includes(client.dwollaVerificationStatus || ""),
      documentRequired: client.dwollaVerificationStatus === "document",
      timeline: await this.timeline(client.id, actor),
    };
  }

  async retryVerification(customerIdentifier: string, input: unknown, actor: DwollaActor) {
    const parsed = retrySchema.parse(input);
    const client = await this.findClientByCustomerIdentifier(customerIdentifier, actor);
    if (!client.dwollaCustomerId) throw Object.assign(new Error("Dwolla customer ID is not stored for this client."), { status: 400, code: "dwolla_customer_missing" });
    if (!["retry", "kba", "document", "failed"].includes(client.dwollaVerificationStatus || "")) {
      throw Object.assign(new Error("Dwolla verification retry is not valid for the current status."), { status: 400, code: "retry_not_allowed" });
    }
    const fullSSN = clean(parsed.fullSSN);
    if ((client.dwollaVerificationStatus === "retry" || client.dwollaVerificationStatus === "failed") && !fullSSN && !parsed.last4SSN) {
      throw Object.assign(new Error("SSN information is required before retrying Dwolla verification."), { status: 400, code: "ssn_required_for_retry" });
    }

    const payload = compact({
      address1: parsed.address1,
      address2: parsed.address2,
      city: parsed.city,
      state: parsed.state?.toUpperCase(),
      postalCode: parsed.postalCode,
      dateOfBirth: parsed.dateOfBirth,
      ssn: fullSSN ? cleanSsn(fullSSN) : cleanSsn(parsed.last4SSN),
    });
    const encryptedFullSsn = fullSSN ? encryptDwollaFullSsn(fullSSN) : undefined;
    await (await this.client()).post(dwollaCustomerPath(client.dwollaCustomerId), payload, {
      "Idempotency-Key": idempotencyKey("dwolla_customer_retry", { customerId: client.dwollaCustomerId, payload }),
    });

    const retryUpdate = compact({
      last4Ssn: fullSSN ? cleanSsn(fullSSN).slice(-4) : cleanSsn(parsed.last4SSN) || undefined,
      encryptedFullSsn,
      dwollaVerificationStatus: "pending",
      dwollaVerificationRawStatus: "retry_submitted",
      dwollaVerificationUpdatedAt: this.now(),
    }) as any;
    retryUpdate.dwollaVerificationFailureReason = null;
    const [updated] = await db.update(clients).set(retryUpdate).where(eq(clients.id, client.id)).returning();

    await this.audit("dwolla.customer.verified.retry_requested", client.id, {
      clientId: client.id,
      dwollaCustomerId: client.dwollaCustomerId,
      fullSsnProvided: !!fullSSN,
      status: "pending",
    }, actor.id);

    return { customer: serializeDwollaCustomerProfile(updated) };
  }

  async submitVerificationDocument(customerIdentifier: string, input: { file: Express.Multer.File; documentType?: string }, actor: DwollaActor) {
    const client = await this.findClientByCustomerIdentifier(customerIdentifier, actor);
    if (!client.dwollaCustomerId) throw Object.assign(new Error("Dwolla customer ID is not stored for this client."), { status: 400, code: "dwolla_customer_missing" });
    if (!input.file) throw Object.assign(new Error("Verification document file is required."), { status: 400, code: "document_required" });
    const documentType = input.documentType && supportedDwollaDocumentTypes.has(input.documentType) ? input.documentType : "identity_verification";
    validateDwollaDocumentFile(input.file);

    await fsp.mkdir(privateUploadRoot, { recursive: true });
    const safeExtension = path.extname(input.file.originalname).toLowerCase();
    const sha256 = crypto.createHash("sha256").update(await fsp.readFile(input.file.path)).digest("hex");
    const storedName = `${client.id}-${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExtension}`;
    const storedPath = path.resolve(privateUploadRoot, storedName);
    if (!storedPath.startsWith(`${privateUploadRoot}${path.sep}`)) {
      throw Object.assign(new Error("Invalid Dwolla document storage path."), { status: 400 });
    }
    await fsp.rename(input.file.path, storedPath);

    let status = "received";
    let dwollaDocumentUrl: string | null = null;
    let dwollaDocumentId: string | null = null;
    let failureReason: string | null = null;
    const secureStorageConfigured = isDwollaProductionDocumentStorageConfigured();

    if (process.env.DWOLLA_DOCUMENT_UPLOADS_ENABLED === "true" && secureStorageConfigured) {
      try {
        const formData = new FormData();
        formData.append("documentType", documentType);
        formData.append("file", fs.createReadStream(storedPath), {
          filename: input.file.originalname,
          contentType: input.file.mimetype,
          knownLength: input.file.size,
        });
        const response = await (await this.client()).post(`${dwollaCustomerPath(client.dwollaCustomerId)}/documents`, formData);
        dwollaDocumentUrl = locationFrom(response);
        dwollaDocumentId = extractDwollaIdFromUrl(dwollaDocumentUrl);
        status = "submitted";
      } catch (error) {
        status = "submission_failed";
        failureReason = safeErrorMessage(error);
      }
    } else {
      status = "storage_provider_required";
      failureReason = "Private production storage and DWOLLA_DOCUMENT_UPLOADS_ENABLED=true are required before sending identity documents to Dwolla.";
    }

    const [record] = await db.insert(dwollaCustomerDocuments).values({
      clientId: client.id,
      dwollaCustomerId: client.dwollaCustomerId,
      dwollaDocumentId,
      dwollaDocumentUrl,
      documentType,
      status,
      fileName: storedName,
      originalName: path.basename(input.file.originalname),
      mimeType: input.file.mimetype,
      fileSize: input.file.size,
      sha256,
      storageProvider: process.env.PRIVATE_UPLOAD_STORAGE || "local_private",
      storagePath: storedPath,
      uploadedByUserId: actor.id || undefined,
      failureReason,
    } as any).returning();

    await this.audit("dwolla.customer.document.uploaded", client.id, {
      clientId: client.id,
      dwollaCustomerId: client.dwollaCustomerId,
      documentId: record.id,
      dwollaDocumentId,
      documentType,
      status,
      storageProvider: record.storageProvider,
    }, actor.id);

    return {
      document: {
        id: record.id,
        clientId: record.clientId,
        dwollaCustomerId: record.dwollaCustomerId,
        dwollaDocumentId: record.dwollaDocumentId,
        dwollaDocumentUrl: record.dwollaDocumentUrl,
        documentType: record.documentType,
        status: record.status,
        originalName: record.originalName,
        mimeType: record.mimeType,
        fileSize: record.fileSize,
        createdAt: record.createdAt,
        failureReason: record.failureReason,
      },
      productionStorageConfigured: !!secureStorageConfigured,
    };
  }

  async listDocuments(clientId: string) {
    const rows = await db.select().from(dwollaCustomerDocuments).where(eq(dwollaCustomerDocuments.clientId, clientId)).orderBy(desc(dwollaCustomerDocuments.createdAt));
    return rows.map((row) => ({
      id: row.id,
      clientId: row.clientId,
      dwollaCustomerId: row.dwollaCustomerId,
      dwollaDocumentId: row.dwollaDocumentId,
      dwollaDocumentUrl: row.dwollaDocumentUrl,
      documentType: row.documentType,
      status: row.status,
      originalName: row.originalName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      failureReason: row.failureReason,
    }));
  }

  async timeline(customerIdentifierOrClientId: string, actor: DwollaActor) {
    const client = await this.findClientByCustomerIdentifier(customerIdentifierOrClientId, actor);
    const rows = await db.select().from(dwollaCustomerEvents)
      .where(eq(dwollaCustomerEvents.clientId, client.id))
      .orderBy(desc(dwollaCustomerEvents.occurredAt));
    return rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      topic: row.topic,
      internalTopic: row.internalTopic,
      rawStatus: row.rawStatus,
      normalizedStatus: row.normalizedStatus,
      occurredAt: row.occurredAt,
      processedAt: row.processedAt,
      payloadSummary: row.payloadSummary,
    }));
  }

  async handleWebhook(rawPayload: string, signature: string | undefined) {
    const verification = verifyDwollaWebhookSignature(rawPayload, signature);
    if (!verification.verified) {
      throw Object.assign(new Error(verification.message), { status: 401, code: verification.status });
    }

    const parsedBody = JSON.parse(rawPayload);
    const event = parseDwollaEventPayload(parsedBody);
    if (!event.eventId) {
      throw Object.assign(new Error("Dwolla webhook event ID is required."), { status: 400, code: "missing_event_id" });
    }

    try {
      return await db.transaction(async (tx) => {
        let client: Client | undefined;
        if (event.customerId) {
          [client] = await tx.select().from(clients).where(or(
            eq(clients.dwollaCustomerId, event.customerId),
            eq(clients.dwollaCustomerUrl, event.resourceUrl || ""),
          )).limit(1);
        }
        const shouldUpdate = client ? shouldApplyDwollaStatusUpdate(client.dwollaVerificationUpdatedAt, event.occurredAt) : false;
        const [eventRecord] = await tx.insert(dwollaCustomerEvents).values({
          eventId: event.eventId,
          topic: event.topic,
          internalTopic: event.internalTopic,
          resourceUrl: event.resourceUrl,
          clientId: client?.id,
          dwollaCustomerId: event.customerId,
          rawStatus: event.rawStatus,
          normalizedStatus: event.normalizedStatus,
          occurredAt: event.occurredAt,
          payloadSummary: {
            topic: event.topic,
            resourceUrl: event.resourceUrl,
            customerId: event.customerId,
            staleIgnored: !shouldUpdate && !!client,
          },
        } as any).returning();

        if (client && shouldUpdate) {
          await tx.update(clients).set({
            dwollaVerificationStatus: event.normalizedStatus,
            dwollaVerificationRawStatus: event.rawStatus || event.topic,
            dwollaVerificationUpdatedAt: event.occurredAt,
            dwollaVerificationFailureReason: failureReasonFor(event.normalizedStatus, event.topic),
          } as any).where(eq(clients.id, client.id));
        }

        await tx.insert(auditEvents).values({
          action: "dwolla.customer.webhook.accepted",
          entityType: "dwolla_customer_webhook",
          entityId: eventRecord.id,
          afterValue: {
            eventId: event.eventId,
            topic: event.topic,
            customerId: event.customerId,
            clientId: client?.id || null,
            normalizedStatus: event.normalizedStatus,
            staleIgnored: !shouldUpdate && !!client,
          },
          highRisk: true,
          reason: "Accepted verified Dwolla webhook event",
        } as any);

        return { ok: true, duplicate: false, eventId: event.eventId, status: event.normalizedStatus };
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        return { ok: true, duplicate: true, eventId: event.eventId };
      }
      throw error;
    }
  }
}

function failureReasonFor(status: DwollaVerificationStatus, topic: string) {
  if (status === "failed") return "Dwolla verification document failed.";
  if (status === "suspended") return "Dwolla customer is suspended.";
  if (status === "retry") return "Dwolla requires reverification.";
  if (status === "document") return "Dwolla requires a verification document.";
  if (topic) return null;
  return null;
}

export function mapDwollaVerifiedCustomerError(error: unknown) {
  const candidate = error as { status?: number; body?: unknown; message?: string; code?: string; missingFields?: string[]; errors?: unknown };
  if (error instanceof z.ZodError) {
    return { status: 400, body: { message: "Validation error", errors: error.errors } };
  }
  if (typeof candidate?.status === "number" && candidate.status >= 400 && candidate.status < 500) {
    return {
      status: candidate.status,
      body: {
        message: candidate.message || "Dwolla verified customer request failed.",
        code: candidate.code,
        missingFields: candidate.missingFields,
        providerError: sanitizeProviderBody(candidate.body),
      },
    };
  }
  return { status: 500, body: { message: "Dwolla verified customer request failed.", error: safeErrorMessage(error) } };
}

export const dwollaVerifiedCustomerService = new DwollaVerifiedCustomerService();
