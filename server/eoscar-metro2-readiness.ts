import { validateMetro2BaseRecord, type Metro2Record, type ValidationError } from "./metro2";
import type { BureauConfigStatus } from "./bureau-api-config";

export const eoscarEnvironments = ["sandbox", "staging", "production"] as const;
export type EoscarEnvironment = typeof eoscarEnvironments[number];

export type EoscarWorkflowType = "ACDV" | "AUD";
export type EoscarWorkflowStatus =
  | "not_configured"
  | "ready"
  | "requires_official_documentation";

export interface EoscarApiClientConfigStatus {
  configured: boolean;
  status: "configured" | "not_configured";
  environment: EoscarEnvironment | "unknown";
  missingEnvVars: string[];
}

export interface EoscarApiClientConfig {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  environment: EoscarEnvironment;
}

export interface EoscarSubmissionRequest {
  workflowType: EoscarWorkflowType;
  correlationId: string;
  furnisherId?: string;
  bureau?: string;
  payload: Record<string, unknown>;
}

export interface EoscarSubmissionResult {
  accepted: boolean;
  externalReferenceId?: string;
  status: string;
  message?: string;
}

export interface EoscarApiClient {
  submitAcdv(request: EoscarSubmissionRequest): Promise<EoscarSubmissionResult>;
  submitAud(request: EoscarSubmissionRequest): Promise<EoscarSubmissionResult>;
  getSubmissionStatus(externalReferenceId: string): Promise<EoscarSubmissionResult>;
}

export interface AcdvWorkflowRequest {
  disputeId: string;
  clientId: string;
  bureau: string;
  furnisherAccountId?: string;
  reasonCode?: string;
  supportingDocumentIds?: string[];
}

export interface AudWorkflowRequest {
  metro2SubmissionId: string;
  furnisherAccountId: string;
  bureau?: string;
  correctionReason?: string;
  supportingDocumentIds?: string[];
}

export interface EoscarWorkflowReadiness {
  workflowType: EoscarWorkflowType;
  status: EoscarWorkflowStatus;
  configured: boolean;
  message: string;
}

export interface AcdvWorkflowHandler {
  getReadiness(): EoscarWorkflowReadiness;
  prepare(request: AcdvWorkflowRequest): Promise<EoscarSubmissionRequest>;
  submit(request: AcdvWorkflowRequest): Promise<EoscarSubmissionResult>;
}

export interface AudWorkflowHandler {
  getReadiness(): EoscarWorkflowReadiness;
  prepare(request: AudWorkflowRequest): Promise<EoscarSubmissionRequest>;
  submit(request: AudWorkflowRequest): Promise<EoscarSubmissionResult>;
}

export interface Metro2ValidationAdapter {
  validateBaseRecord(record: Metro2Record): ValidationError[];
}

export interface Metro2ReadinessStatus {
  ready: boolean;
  status: "ready" | "not_ready";
  validatorConfigured: boolean;
  localValidationAvailable: boolean;
  officialTransmissionConfigured: boolean;
}

export interface EoscarMetro2IntegrationStatus {
  eoscarConfigured: boolean;
  metro2Ready: boolean;
  bureauIntegrationsConfigured: boolean;
  eoscar: EoscarApiClientConfigStatus;
  metro2: Metro2ReadinessStatus;
  workflows: {
    acdv: EoscarWorkflowReadiness;
    aud: EoscarWorkflowReadiness;
  };
}

const requiredEoscarEnvVars = [
  "EOSCAR_API_BASE_URL",
  "EOSCAR_CLIENT_ID",
  "EOSCAR_CLIENT_SECRET",
  "EOSCAR_ENVIRONMENT",
] as const;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEoscarEnvironment(value: string | undefined): EoscarEnvironment | undefined {
  const cleaned = clean(value)?.toLowerCase();
  if (!cleaned) return undefined;
  return eoscarEnvironments.includes(cleaned as EoscarEnvironment) ? cleaned as EoscarEnvironment : undefined;
}

export function getEoscarConfigStatus(env: NodeJS.ProcessEnv = process.env): EoscarApiClientConfigStatus {
  const missingEnvVars = requiredEoscarEnvVars.filter((key) => !clean(env[key]));
  const environment = normalizeEoscarEnvironment(env.EOSCAR_ENVIRONMENT);
  const effectiveMissing = environment
    ? missingEnvVars
    : Array.from(new Set([...missingEnvVars, "EOSCAR_ENVIRONMENT"]));
  const configured = effectiveMissing.length === 0;

  return {
    configured,
    status: configured ? "configured" : "not_configured",
    environment: environment ?? "unknown",
    missingEnvVars: effectiveMissing,
  };
}

export function createLocalMetro2ValidationAdapter(): Metro2ValidationAdapter {
  return {
    validateBaseRecord: validateMetro2BaseRecord,
  };
}

export function getMetro2ReadinessStatus(): Metro2ReadinessStatus {
  return {
    ready: true,
    status: "ready",
    validatorConfigured: true,
    localValidationAvailable: true,
    officialTransmissionConfigured: false,
  };
}

export function getBureauIntegrationsConfigured(
  bureauStatuses: Record<string, Pick<BureauConfigStatus, "configured">> | undefined,
) {
  return Object.values(bureauStatuses ?? {}).some((status) => status.configured);
}

function workflowReadiness(
  workflowType: EoscarWorkflowType,
  eoscarConfigured: boolean,
  metro2Ready: boolean,
): EoscarWorkflowReadiness {
  if (!eoscarConfigured) {
    return {
      workflowType,
      configured: false,
      status: "not_configured",
      message: "e-OSCAR environment variables are not fully configured.",
    };
  }

  if (workflowType === "AUD" && !metro2Ready) {
    return {
      workflowType,
      configured: false,
      status: "not_configured",
      message: "Metro 2 validation is not ready for AUD workflow preparation.",
    };
  }

  return {
    workflowType,
    configured: false,
    status: "requires_official_documentation",
    message: "Official e-OSCAR API documentation is required before live workflow submission is implemented.",
  };
}

export function getEoscarMetro2IntegrationStatus(
  bureauStatuses: Record<string, Pick<BureauConfigStatus, "configured">> | undefined,
  env: NodeJS.ProcessEnv = process.env,
): EoscarMetro2IntegrationStatus {
  const eoscar = getEoscarConfigStatus(env);
  const metro2 = getMetro2ReadinessStatus();

  return {
    eoscarConfigured: eoscar.configured,
    metro2Ready: metro2.ready,
    bureauIntegrationsConfigured: getBureauIntegrationsConfigured(bureauStatuses),
    eoscar,
    metro2,
    workflows: {
      acdv: workflowReadiness("ACDV", eoscar.configured, metro2.ready),
      aud: workflowReadiness("AUD", eoscar.configured, metro2.ready),
    },
  };
}
