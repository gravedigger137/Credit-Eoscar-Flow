import crypto from "crypto";
import { maskSecret } from "../secret-store";

export interface RouteCandidate {
  connectorCode: string;
  networkId?: string | null;
  institutionId?: string | null;
  paymentRailId?: string | null;
  status: string;
  requiresEnrollment: boolean;
  score: number;
  capabilities: string[];
}

export interface RouteDecisionInput {
  requestType: string;
  paymentRailCode?: string | null;
  networkCode?: string | null;
  amount?: number | null;
  approved: boolean;
  candidates: RouteCandidate[];
}

export interface RouteDecision {
  selected: boolean;
  connectorCode: string | null;
  status: "selected" | "blocked" | "manual_review";
  reason: string;
  score: number;
  candidate?: RouteCandidate;
}

export interface MaskedCredential {
  id: string;
  institutionId: string;
  networkId: string | null;
  credentialType: string;
  keyName: string;
  environment: string;
  status: string;
  hasValue: boolean;
  valueMasked: string | null;
  updatedAt?: Date | null;
}

export function createIdempotencyKey(seed: Record<string, unknown>) {
  return crypto.createHash("sha256").update(JSON.stringify(seed)).digest("hex");
}

export function normalizeIdempotencyKey(value: string | undefined, seed: Record<string, unknown>) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length >= 8 ? trimmed : createIdempotencyKey(seed);
}

export function decideExchangeRoute(input: RouteDecisionInput): RouteDecision {
  if (!input.approved) {
    return {
      selected: false,
      connectorCode: null,
      status: "blocked",
      reason: "Exchange request must be approved before routing.",
      score: 0,
    };
  }

  const requestedCode = (input.paymentRailCode || input.networkCode || "").toLowerCase();
  const eligible = input.candidates
    .filter((candidate) => candidate.status === "active")
    .filter((candidate) => !requestedCode || candidate.connectorCode === requestedCode)
    .sort((a, b) => b.score - a.score);

  const selected = eligible[0];
  if (!selected) {
    return {
      selected: false,
      connectorCode: null,
      status: "manual_review",
      reason: requestedCode
        ? `No active connector candidate matched ${requestedCode}.`
        : "No active connector candidate matched the request.",
      score: 0,
    };
  }

  if (selected.requiresEnrollment) {
    return {
      selected: true,
      connectorCode: selected.connectorCode,
      status: "selected",
      reason: `${selected.connectorCode} selected, but submission will remain blocked until enrollment and credentials are complete.`,
      score: selected.score,
      candidate: selected,
    };
  }

  return {
    selected: true,
    connectorCode: selected.connectorCode,
    status: "selected",
    reason: `${selected.connectorCode} selected by routing score.`,
    score: selected.score,
    candidate: selected,
  };
}

export function maskCredential(record: {
  id: string;
  institutionId: string;
  networkId?: string | null;
  credentialType: string;
  keyName: string;
  encryptedValue?: string | null;
  environment: string;
  status: string;
  updatedAt?: Date | null;
}): MaskedCredential {
  return {
    id: record.id,
    institutionId: record.institutionId,
    networkId: record.networkId ?? null,
    credentialType: record.credentialType,
    keyName: record.keyName,
    environment: record.environment,
    status: record.status,
    hasValue: !!record.encryptedValue,
    valueMasked: maskSecret(record.encryptedValue),
    updatedAt: record.updatedAt,
  };
}

export function summarizeConnectorStatus(statuses: Array<{ configured: boolean; status: string }>) {
  const configured = statuses.filter((status) => status.configured).length;
  const requiresEnrollment = statuses.filter((status) => status.status === "requires_enrollment").length;
  const notConfigured = statuses.filter((status) => status.status === "not_configured" || status.status === "disabled").length;
  return { configured, requiresEnrollment, notConfigured, total: statuses.length };
}
