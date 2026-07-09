import crypto from "crypto";

export type ConnectorSubmitStatus =
  | "submitted"
  | "not_configured"
  | "requires_enrollment"
  | "credentials_missing"
  | "endpoint_not_allowlisted"
  | "validation_failed"
  | "cancelled"
  | "retry_scheduled"
  | "status_unavailable";

export interface ConnectorConfig {
  code: string;
  displayName: string;
  category: string;
  requiresEnrollment: boolean;
  enabled: boolean;
  endpoint?: string;
  allowedEndpoints: string[];
  credentialsPresent: boolean;
  capabilities: string[];
}

export interface ConnectorRequest {
  idempotencyKey: string;
  requestType: string;
  amount?: number | null;
  currency?: string | null;
  payload: Record<string, unknown>;
}

export interface ConnectorResponse {
  connectorCode: string;
  status: ConnectorSubmitStatus;
  externalReferenceId?: string;
  message: string;
  retryable: boolean;
  mappedResponse: Record<string, unknown>;
  mappedErrors: string[];
}

export interface ConnectorHealthResponse {
  connectorCode: string;
  status: "configured" | "not_configured" | "requires_enrollment" | "disabled";
  configured: boolean;
  message: string;
  capabilities: string[];
}

export interface InstitutionalConnector {
  code: string;
  Validate(request: ConnectorRequest): Promise<ConnectorResponse>;
  Authenticate(): Promise<ConnectorResponse>;
  DiscoverCapabilities(): Promise<string[]>;
  Submit(request: ConnectorRequest): Promise<ConnectorResponse>;
  GetStatus(externalReferenceId: string): Promise<ConnectorResponse>;
  Cancel(externalReferenceId: string): Promise<ConnectorResponse>;
  Retry(request: ConnectorRequest): Promise<ConnectorResponse>;
  Health(): Promise<ConnectorHealthResponse>;
  MapResponse(response: unknown): Record<string, unknown>;
  MapErrors(error: unknown): string[];
}

function response(
  connectorCode: string,
  status: ConnectorSubmitStatus,
  message: string,
  retryable = false,
  mappedResponse: Record<string, unknown> = {},
  mappedErrors: string[] = [],
): ConnectorResponse {
  return {
    connectorCode,
    status,
    message,
    retryable,
    mappedResponse,
    mappedErrors,
  };
}

function endpointAllowed(endpoint: string | undefined, allowedEndpoints: string[]) {
  if (!endpoint) return false;
  try {
    const url = new URL(endpoint);
    return allowedEndpoints.some((allowed) => {
      const allowedUrl = new URL(allowed);
      return url.protocol === allowedUrl.protocol && url.host === allowedUrl.host;
    });
  } catch {
    return false;
  }
}

export class GuardedInstitutionalConnector implements InstitutionalConnector {
  readonly code: string;

  constructor(private readonly config: ConnectorConfig) {
    this.code = config.code;
  }

  async Validate(request: ConnectorRequest) {
    const errors: string[] = [];
    if (!request.idempotencyKey) errors.push("idempotencyKey is required");
    if (!request.requestType) errors.push("requestType is required");
    if (request.amount !== undefined && request.amount !== null && request.amount < 0) {
      errors.push("amount cannot be negative");
    }

    if (errors.length > 0) {
      return response(this.code, "validation_failed", "Connector request validation failed.", false, {}, errors);
    }

    return response(this.code, "submitted", "Connector request shape is valid.", false, { valid: true });
  }

  async Authenticate() {
    if (!this.config.enabled) {
      return response(this.code, "not_configured", `${this.config.displayName} connector is disabled.`);
    }
    if (!this.config.credentialsPresent) {
      return response(this.code, "credentials_missing", `${this.config.displayName} credentials are not configured.`);
    }
    return response(this.code, "submitted", `${this.config.displayName} credentials are present.`);
  }

  async DiscoverCapabilities() {
    return [...this.config.capabilities];
  }

  async Submit(request: ConnectorRequest) {
    const validation = await this.Validate(request);
    if (validation.status !== "submitted") return validation;

    if (!this.config.enabled) {
      return response(this.code, "not_configured", `${this.config.displayName} connector is disabled.`);
    }

    if (this.config.requiresEnrollment) {
      return response(
        this.code,
        "requires_enrollment",
        `${this.config.displayName} requires partner enrollment, approved credentials, and configured capabilities before submission.`,
      );
    }

    if (!this.config.credentialsPresent) {
      return response(this.code, "credentials_missing", `${this.config.displayName} credentials are missing.`);
    }

    if (!endpointAllowed(this.config.endpoint, this.config.allowedEndpoints)) {
      return response(this.code, "endpoint_not_allowlisted", `${this.config.displayName} endpoint is not allowlisted.`);
    }

    return response(this.code, "submitted", `${this.config.displayName} accepted the request for downstream processing.`, false, {
      requestHash: crypto.createHash("sha256").update(JSON.stringify(request.payload)).digest("hex"),
    });
  }

  async GetStatus(externalReferenceId: string) {
    if (!externalReferenceId) {
      return response(this.code, "validation_failed", "externalReferenceId is required.", false, {}, ["externalReferenceId is required"]);
    }
    return response(this.code, "status_unavailable", "External connector status polling is not configured for this adapter.", true);
  }

  async Cancel(externalReferenceId: string) {
    if (!externalReferenceId) {
      return response(this.code, "validation_failed", "externalReferenceId is required.", false, {}, ["externalReferenceId is required"]);
    }
    return response(this.code, "cancelled", "Cancellation request was accepted by the local exchange workflow.");
  }

  async Retry(request: ConnectorRequest) {
    const submitted = await this.Submit(request);
    if (submitted.status === "submitted") return submitted;
    return { ...submitted, retryable: ["not_configured", "credentials_missing", "endpoint_not_allowlisted"].includes(submitted.status) };
  }

  async Health(): Promise<ConnectorHealthResponse> {
    if (!this.config.enabled) {
      return {
        connectorCode: this.code,
        status: "disabled",
        configured: false,
        message: `${this.config.displayName} connector is disabled.`,
        capabilities: [],
      };
    }
    if (this.config.requiresEnrollment) {
      return {
        connectorCode: this.code,
        status: "requires_enrollment",
        configured: false,
        message: `${this.config.displayName} requires enrollment and partner approval.`,
        capabilities: this.config.capabilities,
      };
    }
    if (!this.config.credentialsPresent || !endpointAllowed(this.config.endpoint, this.config.allowedEndpoints)) {
      return {
        connectorCode: this.code,
        status: "not_configured",
        configured: false,
        message: `${this.config.displayName} requires credentials and an allowlisted endpoint.`,
        capabilities: this.config.capabilities,
      };
    }
    return {
      connectorCode: this.code,
      status: "configured",
      configured: true,
      message: `${this.config.displayName} connector is configured.`,
      capabilities: this.config.capabilities,
    };
  }

  MapResponse(responseValue: unknown) {
    if (responseValue && typeof responseValue === "object") {
      return responseValue as Record<string, unknown>;
    }
    return { value: responseValue ?? null };
  }

  MapErrors(error: unknown) {
    if (error instanceof Error) return [error.message];
    if (typeof error === "string") return [error];
    return ["Unknown connector error"];
  }
}

export const regulatedConnectorCodes = new Set([
  "ach",
  "wire",
  "fedwire",
  "fednow",
  "rtp",
  "swift",
  "sepa",
  "card_networks",
  "treasury_direct",
  "baas",
  "federal_reserve_services",
  "dwolla",
]);

export function buildConnectorConfig(
  code: string,
  displayName: string,
  capabilities: string[],
  env: NodeJS.ProcessEnv = process.env,
): ConnectorConfig {
  const normalized = code.toLowerCase();
  const prefix = `INSTITUTIONAL_EXCHANGE_${normalized.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const enabled = env[`${prefix}_ENABLED`] === "true";
  const endpoint = env[`${prefix}_ENDPOINT`];
  const allowedEndpoints = (env.INSTITUTIONAL_EXCHANGE_ALLOWED_ENDPOINTS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const credentialsPresent = !!env[`${prefix}_CREDENTIAL_REF`] || (normalized === "stripe" && !!env.STRIPE_SECRET_KEY);

  return {
    code: normalized,
    displayName,
    category: "institutional_exchange",
    requiresEnrollment: regulatedConnectorCodes.has(normalized) && !enabled,
    enabled,
    endpoint,
    allowedEndpoints,
    credentialsPresent,
    capabilities,
  };
}

export function createConnector(config: ConnectorConfig): InstitutionalConnector {
  return new GuardedInstitutionalConnector(config);
}
