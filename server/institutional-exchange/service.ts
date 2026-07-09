import crypto from "crypto";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { decryptIfEncrypted, encryptIfSensitive } from "../secret-store";
import {
  auditEvents,
  connectorHealth,
  exchangeAttempts,
  exchangeRequests,
  exchangeResults,
  exchangeRoutes,
  financialNetworks,
  institutionCredentials,
  institutionRegistry,
  instrumentTypes,
  instruments,
  paymentRails,
  routingRules,
  settlementEvents,
} from "@shared/schema";
import {
  createExchangeRequestSchema,
  createInstitutionSchema,
  createInstrumentSchema,
  createRoutingRuleSchema,
  saveInstitutionCredentialSchema,
  type ConnectorHealthDto,
} from "@shared/institutional-exchange";
import { createConnector, buildConnectorConfig } from "./connectors";
import { decideExchangeRoute, maskCredential, normalizeIdempotencyKey, summarizeConnectorStatus, type RouteCandidate } from "./core";

const connectorLabels: Record<string, string> = {
  stripe: "Stripe",
  dwolla: "Dwolla",
  ach: "ACH",
  wire: "Wire Transfer",
  fedwire: "Fedwire",
  fednow: "FedNow",
  rtp: "RTP",
  swift: "SWIFT",
  sepa: "SEPA",
  card_networks: "Card Networks",
  treasury_direct: "TreasuryDirect",
  baas: "Banking-as-a-Service",
  federal_reserve_services: "Federal Reserve Services",
};

const connectorCapabilities: Record<string, string[]> = {
  stripe: ["payments", "refunds", "webhooks"],
  dwolla: ["ach", "transfers"],
  ach: ["ach_credit", "ach_debit", "returns"],
  wire: ["domestic_wire"],
  fedwire: ["fedwire_transfer"],
  fednow: ["instant_payment"],
  rtp: ["real_time_payment"],
  swift: ["swift_message"],
  sepa: ["sepa_credit_transfer"],
  card_networks: ["card_authorization", "settlement"],
  treasury_direct: ["published_interface_review"],
  baas: ["future_provider_adapter"],
  federal_reserve_services: ["future_federal_reserve_adapter"],
};

function badRequest(message: string, errors?: unknown) {
  return Object.assign(new Error(message), { status: 400, errors });
}

function sanitizeCredentialValue(value: string | undefined | null) {
  if (!value) return null;
  const decrypted = decryptIfEncrypted(value);
  return decrypted ? maskCredential({
    id: "preview",
    institutionId: "preview",
    credentialType: "preview",
    keyName: "preview",
    encryptedValue: decrypted,
    environment: "preview",
    status: "active",
  }).valueMasked : null;
}

async function writeAudit(action: string, entityType: string, entityId: string | null, actorUserId?: string | null, afterValue?: Record<string, unknown>) {
  await db.insert(auditEvents).values({
    action,
    entityType,
    entityId: entityId ?? undefined,
    actorUserId: actorUserId ?? undefined,
    afterValue: afterValue ?? null,
    highRisk: action.includes("credential") || action.includes("submit") || action.includes("settlement"),
    reason: "Institutional exchange module action",
  } as any);
}

export class InstitutionalExchangeService {
  async dashboard() {
    const [
      [networkCount],
      [institutionCount],
      [connectorCount],
      [openRequests],
      [retryQueue],
      [settlementQueue],
      [failedRequests],
      [deadLetters],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(financialNetworks),
      db.select({ count: sql<number>`count(*)` }).from(institutionRegistry),
      db.select({ count: sql<number>`count(*)` }).from(connectorHealth),
      db.select({ count: sql<number>`count(*)` }).from(exchangeRequests).where(sql`${exchangeRequests.status} in ('approved','queued','routing','retry_scheduled','blocked')`),
      db.select({ count: sql<number>`count(*)` }).from(exchangeAttempts).where(eq(exchangeAttempts.status, "retry_scheduled")),
      db.select({ count: sql<number>`count(*)` }).from(exchangeRequests).where(eq(exchangeRequests.status, "submitted")),
      db.select({ count: sql<number>`count(*)` }).from(exchangeRequests).where(eq(exchangeRequests.status, "failed")),
      db.select({ count: sql<number>`count(*)` }).from(exchangeRequests).where(eq(exchangeRequests.status, "dead_letter")),
    ]);

    return {
      networks: Number(networkCount.count),
      institutions: Number(institutionCount.count),
      connectors: Number(connectorCount.count),
      openRequests: Number(openRequests.count),
      retryQueue: Number(retryQueue.count),
      settlementQueue: Number(settlementQueue.count),
      failedRequests: Number(failedRequests.count),
      deadLetters: Number(deadLetters.count),
    };
  }

  async listNetworks() {
    return db.select().from(financialNetworks).orderBy(financialNetworks.category, financialNetworks.name);
  }

  async listPaymentRails() {
    return db.select().from(paymentRails).orderBy(paymentRails.category, paymentRails.name);
  }

  async listInstrumentTypes() {
    return db.select().from(instrumentTypes).orderBy(instrumentTypes.category, instrumentTypes.name);
  }

  async listInstitutions() {
    return db.select().from(institutionRegistry).orderBy(desc(institutionRegistry.createdAt));
  }

  async createInstitution(input: unknown, actorUserId?: string | null) {
    const parsed = createInstitutionSchema.parse(input);
    const [record] = await db.insert(institutionRegistry).values({
      ...parsed,
      website: parsed.website || null,
      contactEmail: parsed.contactEmail || null,
    } as any).returning();
    await writeAudit("institution.created", "institution_registry", record.id, actorUserId, { name: record.name });
    return record;
  }

  async listCredentials(institutionId: string) {
    const rows = await db.select().from(institutionCredentials)
      .where(eq(institutionCredentials.institutionId, institutionId))
      .orderBy(desc(institutionCredentials.updatedAt));

    return rows.map((row) => {
      const masked = sanitizeCredentialValue(row.encryptedValue);
      return {
        ...maskCredential(row),
        valueMasked: masked,
      };
    });
  }

  async saveCredential(input: unknown, actorUserId?: string | null) {
    const parsed = saveInstitutionCredentialSchema.parse(input);
    const encryptedValue = encryptIfSensitive(`institution_credential_secret_${parsed.keyName}`, parsed.value);
    const [record] = await db.insert(institutionCredentials).values({
      institutionId: parsed.institutionId,
      networkId: parsed.networkId,
      credentialType: parsed.credentialType,
      keyName: parsed.keyName,
      encryptedValue,
      environment: parsed.environment,
      status: parsed.status,
      lastRotatedAt: new Date(),
    } as any).returning();
    await writeAudit("institution_credential.saved", "institution_credentials", record.id, actorUserId, {
      institutionId: record.institutionId,
      credentialType: record.credentialType,
      keyName: record.keyName,
      environment: record.environment,
    });
    return {
      success: true,
      credential: {
        ...maskCredential(record),
        valueMasked: sanitizeCredentialValue(record.encryptedValue),
      },
    };
  }

  async listInstruments() {
    return db.select().from(instruments).orderBy(desc(instruments.createdAt));
  }

  async createInstrument(input: unknown, actorUserId?: string | null) {
    const parsed = createInstrumentSchema.parse(input);
    const [record] = await db.insert(instruments).values({
      ...parsed,
      ownerClientId: parsed.ownerClientId,
      referenceNumber: parsed.referenceNumber || null,
      amount: parsed.amount,
      maturityDate: parsed.maturityDate ? new Date(parsed.maturityDate) : null,
    } as any).returning();
    await writeAudit("instrument.created", "instruments", record.id, actorUserId, { title: record.title });
    return record;
  }

  async listExchangeRequests() {
    return db.select().from(exchangeRequests).orderBy(desc(exchangeRequests.createdAt));
  }

  async createExchangeRequest(input: unknown, actorUserId?: string | null) {
    const parsed = createExchangeRequestSchema.parse(input);
    if (!parsed.approved) {
      throw badRequest("Exchange request must be approved before it can enter the institutional exchange queue.");
    }
    if (!parsed.approvalReference) {
      throw badRequest("approvalReference is required for approved exchange requests.");
    }

    const idempotencyKey = normalizeIdempotencyKey(parsed.idempotencyKey, {
      requestType: parsed.requestType,
      instrumentId: parsed.instrumentId,
      institutionId: parsed.institutionId,
      networkId: parsed.networkId,
      paymentRailId: parsed.paymentRailId,
      amount: parsed.amount,
      currency: parsed.currency,
      approvalReference: parsed.approvalReference,
    });
    const [existing] = await db.select().from(exchangeRequests).where(eq(exchangeRequests.idempotencyKey, idempotencyKey));
    if (existing) {
      return { request: existing, idempotent: true };
    }

    const [record] = await db.insert(exchangeRequests).values({
      requestType: parsed.requestType,
      instrumentId: parsed.instrumentId,
      institutionId: parsed.institutionId,
      networkId: parsed.networkId,
      paymentRailId: parsed.paymentRailId,
      amount: parsed.amount,
      currency: parsed.currency,
      priority: parsed.priority,
      idempotencyKey,
      requestedByUserId: actorUserId ?? undefined,
      approvalReference: parsed.approvalReference,
      status: "approved",
      complianceStatus: "passed",
      metadata: parsed.metadata ?? {},
    } as any).returning();
    await writeAudit("exchange_request.created", "exchange_requests", record.id, actorUserId, {
      requestType: record.requestType,
      idempotencyKey: record.idempotencyKey,
    });
    return { request: record, idempotent: false };
  }

  async getRouteCandidates(): Promise<RouteCandidate[]> {
    const rails = await db.select().from(paymentRails);
    return rails.map((rail) => ({
      connectorCode: rail.code,
      paymentRailId: rail.id,
      status: rail.status,
      requiresEnrollment: rail.requiresEnrollment,
      score: rail.requiresEnrollment ? 50 : 100,
      capabilities: [rail.category, rail.settlementTiming],
    }));
  }

  async routeExchangeRequest(exchangeRequestId: string, actorUserId?: string | null) {
    const [request] = await db.select().from(exchangeRequests).where(eq(exchangeRequests.id, exchangeRequestId));
    if (!request) throw Object.assign(new Error("Exchange request not found"), { status: 404 });

    const [rail] = request.paymentRailId
      ? await db.select().from(paymentRails).where(eq(paymentRails.id, request.paymentRailId))
      : [undefined];
    const [network] = request.networkId
      ? await db.select().from(financialNetworks).where(eq(financialNetworks.id, request.networkId))
      : [undefined];

    const decision = decideExchangeRoute({
      requestType: request.requestType,
      paymentRailCode: rail?.code,
      networkCode: network?.code,
      amount: request.amount,
      approved: request.status === "approved" || request.status === "queued" || request.status === "retry_scheduled",
      candidates: await this.getRouteCandidates(),
    });

    if (!decision.selected || !decision.connectorCode) {
      await db.update(exchangeRequests).set({
        status: "blocked",
        validationErrors: [decision.reason],
        updatedAt: new Date(),
      } as any).where(eq(exchangeRequests.id, request.id));
      return { decision, route: null };
    }

    const [route] = await db.insert(exchangeRoutes).values({
      exchangeRequestId: request.id,
      sequence: 1,
      connectorCode: decision.connectorCode,
      networkId: request.networkId,
      institutionId: request.institutionId,
      paymentRailId: request.paymentRailId,
      decisionStatus: decision.status,
      decisionReason: decision.reason,
      score: decision.score,
      metadata: { requiresEnrollment: decision.candidate?.requiresEnrollment ?? false },
    } as any).returning();

    await db.update(exchangeRequests).set({ status: "routing", updatedAt: new Date() } as any).where(eq(exchangeRequests.id, request.id));
    await writeAudit("exchange_route.selected", "exchange_routes", route.id, actorUserId, {
      exchangeRequestId: request.id,
      connectorCode: route.connectorCode,
      reason: route.decisionReason,
    });
    return { decision, route };
  }

  async processExchangeRequest(exchangeRequestId: string, actorUserId?: string | null) {
    const [request] = await db.select().from(exchangeRequests).where(eq(exchangeRequests.id, exchangeRequestId));
    if (!request) throw Object.assign(new Error("Exchange request not found"), { status: 404 });

    const routed = await this.routeExchangeRequest(request.id, actorUserId);
    if (!routed.route) return { request, route: null, attempt: null, result: null };

    const label = connectorLabels[routed.route.connectorCode] ?? routed.route.connectorCode;
    const connector = createConnector(buildConnectorConfig(
      routed.route.connectorCode,
      label,
      connectorCapabilities[routed.route.connectorCode] ?? [],
    ));
    const submitResult = await connector.Submit({
      idempotencyKey: request.idempotencyKey,
      requestType: request.requestType,
      amount: request.amount,
      currency: request.currency,
      payload: {
        exchangeRequestId: request.id,
        instrumentId: request.instrumentId,
        institutionId: request.institutionId,
        networkId: request.networkId,
        paymentRailId: request.paymentRailId,
      },
    });

    const requestPayloadHash = crypto.createHash("sha256").update(JSON.stringify({
      exchangeRequestId: request.id,
      connectorCode: routed.route.connectorCode,
      idempotencyKey: request.idempotencyKey,
    })).digest("hex");
    const nextStatus = this.mapSubmitStatus(submitResult.status, submitResult.retryable);
    const [attempt] = await db.insert(exchangeAttempts).values({
      exchangeRequestId: request.id,
      exchangeRouteId: routed.route.id,
      attemptNumber: 1,
      status: submitResult.status,
      connectorCode: routed.route.connectorCode,
      idempotencyKey: request.idempotencyKey,
      requestPayloadHash,
      responseSummary: submitResult.mappedResponse,
      errorCode: submitResult.status === "submitted" ? null : submitResult.status,
      errorMessage: submitResult.status === "submitted" ? null : submitResult.message,
      nextRetryAt: submitResult.retryable ? new Date(Date.now() + 15 * 60 * 1000) : null,
      completedAt: new Date(),
    } as any).returning();
    const [result] = await db.insert(exchangeResults).values({
      exchangeRequestId: request.id,
      status: submitResult.status,
      externalReferenceId: submitResult.externalReferenceId,
      resultCode: submitResult.status,
      resultSummary: submitResult.message,
      settledAmount: submitResult.status === "submitted" ? request.amount : null,
      metadata: { retryable: submitResult.retryable },
    } as any).returning();

    await db.update(exchangeRequests).set({ status: nextStatus, updatedAt: new Date() } as any).where(eq(exchangeRequests.id, request.id));
    if (nextStatus === "submitted") {
      await db.insert(settlementEvents).values({
        exchangeRequestId: request.id,
        eventType: "submitted",
        status: "pending_settlement",
        amount: request.amount,
        currency: request.currency,
        externalReferenceId: submitResult.externalReferenceId,
        metadata: { connectorCode: routed.route.connectorCode },
      } as any);
    }
    await writeAudit("exchange_request.submit_attempted", "exchange_requests", request.id, actorUserId, {
      connectorCode: routed.route.connectorCode,
      status: submitResult.status,
    });

    return { request, route: routed.route, attempt, result, connectorResult: submitResult };
  }

  private mapSubmitStatus(status: string, retryable: boolean) {
    if (status === "submitted") return "submitted";
    if (retryable) return "retry_scheduled";
    if (["not_configured", "requires_enrollment", "credentials_missing", "endpoint_not_allowlisted"].includes(status)) return "blocked";
    return "failed";
  }

  async listSettlementEvents() {
    return db.select().from(settlementEvents).orderBy(desc(settlementEvents.createdAt));
  }

  async listRoutingRules() {
    return db.select().from(routingRules).orderBy(routingRules.priority, desc(routingRules.createdAt));
  }

  async createRoutingRule(input: unknown, actorUserId?: string | null) {
    const parsed = createRoutingRuleSchema.parse(input);
    const [record] = await db.insert(routingRules).values({
      ...parsed,
      createdByUserId: actorUserId ?? undefined,
    } as any).returning();
    await writeAudit("routing_rule.created", "routing_rules", record.id, actorUserId, { name: record.name });
    return record;
  }

  async refreshConnectorHealth() {
    const rails = await db.select().from(paymentRails);
    const healthRows: ConnectorHealthDto[] = [];
    for (const rail of rails) {
      const label = connectorLabels[rail.code] ?? rail.name;
      const connector = createConnector(buildConnectorConfig(rail.code, label, connectorCapabilities[rail.code] ?? []));
      const started = Date.now();
      const health = await connector.Health();
      const latencyMs = Date.now() - started;
      const [row] = await db.insert(connectorHealth).values({
        connectorCode: rail.code,
        status: health.status,
        configured: health.configured,
        lastCheckedAt: new Date(),
        latencyMs,
        message: health.message,
        capabilities: health.capabilities,
      } as any).onConflictDoUpdate({
        target: connectorHealth.connectorCode,
        set: {
          status: health.status,
          configured: health.configured,
          lastCheckedAt: new Date(),
          latencyMs,
          message: health.message,
          capabilities: health.capabilities,
          updatedAt: new Date(),
        } as any,
      }).returning();
      healthRows.push({
        connectorCode: row.connectorCode,
        status: row.status as ConnectorHealthDto["status"],
        configured: row.configured,
        message: row.message || health.message,
        capabilities: row.capabilities || [],
      });
    }
    return {
      status: summarizeConnectorStatus(healthRows),
      connectors: healthRows,
    };
  }

  async listConnectorHealth() {
    const rows = await db.select().from(connectorHealth).orderBy(connectorHealth.connectorCode);
    return {
      status: summarizeConnectorStatus(rows),
      connectors: rows,
    };
  }

  async retryQueue() {
    return db.select().from(exchangeAttempts)
      .where(eq(exchangeAttempts.status, "retry_scheduled"))
      .orderBy(exchangeAttempts.nextRetryAt, desc(exchangeAttempts.createdAt));
  }

  async processDueRetryQueue(limit = 10) {
    const due = await db.select().from(exchangeAttempts)
      .where(and(eq(exchangeAttempts.status, "retry_scheduled"), lte(exchangeAttempts.nextRetryAt, new Date())))
      .limit(limit);
    const processed = [];
    for (const attempt of due) {
      processed.push(await this.processExchangeRequest(attempt.exchangeRequestId));
    }
    return processed;
  }

  async auditTimeline() {
    return db.select().from(auditEvents)
      .where(sql`${auditEvents.entityType} in ('institution_registry','institution_credentials','instruments','exchange_requests','exchange_routes','routing_rules')`)
      .orderBy(desc(auditEvents.createdAt))
      .limit(100);
  }

  async health() {
    const connectorStatus = await this.listConnectorHealth();
    return {
      ok: true,
      service: "institutional-exchange",
      connectors: connectorStatus.status,
      submitEnabled: process.env.INSTITUTIONAL_EXCHANGE_SUBMIT_ENABLED === "true",
      workerEnabled: process.env.INSTITUTIONAL_EXCHANGE_WORKER_ENABLED === "true",
    };
  }
}

export function parseServiceError(error: unknown) {
  if (error instanceof z.ZodError) {
    return { status: 400, body: { message: "Validation error", errors: error.errors } };
  }
  const candidate = error as { status?: number; message?: string; errors?: unknown };
  if (candidate?.status && candidate.status >= 400 && candidate.status < 500) {
    return { status: candidate.status, body: { message: candidate.message || "Request failed", errors: candidate.errors } };
  }
  return { status: 500, body: { message: "Internal server error" } };
}

export const institutionalExchangeService = new InstitutionalExchangeService();
