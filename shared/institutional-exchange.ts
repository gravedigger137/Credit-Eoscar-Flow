import { z } from "zod";

export const paymentRailCodes = [
  "stripe",
  "dwolla",
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
] as const;

export const instrumentTypeCodes = [
  "promissory_note",
  "receivable",
  "invoice",
  "purchase_order",
  "assignment",
  "contract",
  "security_agreement",
  "lease_agreement",
  "vehicle_paper",
  "commercial_paper",
  "collateral_package",
  "investment_certificate",
  "trust_asset_package",
  "ucc_documentation",
  "supporting_document",
] as const;

export const connectorMethodNames = [
  "Validate",
  "Authenticate",
  "DiscoverCapabilities",
  "Submit",
  "GetStatus",
  "Cancel",
  "Retry",
  "Health",
  "MapResponse",
  "MapErrors",
] as const;

export type PaymentRailCode = typeof paymentRailCodes[number];
export type InstrumentTypeCode = typeof instrumentTypeCodes[number];
export type ConnectorMethodName = typeof connectorMethodNames[number];

export type ExchangeStatus =
  | "draft"
  | "approved"
  | "queued"
  | "routing"
  | "submitted"
  | "blocked"
  | "retry_scheduled"
  | "dead_letter"
  | "settled"
  | "failed"
  | "cancelled";

export type ConnectorStatus =
  | "configured"
  | "not_configured"
  | "requires_enrollment"
  | "unhealthy"
  | "disabled";

export const createInstitutionSchema = z.object({
  name: z.string().trim().min(2),
  legalName: z.string().trim().optional(),
  institutionType: z.string().trim().min(2).default("financial_institution"),
  status: z.string().trim().default("active"),
  jurisdiction: z.string().trim().optional(),
  website: z.string().trim().url().optional().or(z.literal("")),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  riskRating: z.string().trim().default("standard"),
  metadata: z.record(z.unknown()).optional(),
});

export const saveInstitutionCredentialSchema = z.object({
  institutionId: z.string().uuid(),
  networkId: z.string().uuid().optional(),
  credentialType: z.string().trim().min(2),
  keyName: z.string().trim().min(2),
  value: z.string().min(1),
  environment: z.string().trim().default("sandbox"),
  status: z.string().trim().default("active"),
});

export const createRoutingRuleSchema = z.object({
  name: z.string().trim().min(2),
  priority: z.number().int().min(0).max(100000).default(100),
  enabled: z.boolean().default(true),
  conditions: z.record(z.unknown()).default({}),
  actions: z.record(z.unknown()).default({}),
});

export const createExchangeRequestSchema = z.object({
  requestType: z.enum(["payment", "document", "settlement", "instrument_submission"]),
  instrumentId: z.string().uuid().optional(),
  institutionId: z.string().uuid().optional(),
  networkId: z.string().uuid().optional(),
  paymentRailId: z.string().uuid().optional(),
  amount: z.number().int().nonnegative().optional(),
  currency: z.string().trim().length(3).default("USD"),
  priority: z.number().int().min(0).max(1000).default(100),
  idempotencyKey: z.string().trim().min(8).optional(),
  approved: z.boolean(),
  approvalReference: z.string().trim().min(3).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createInstrumentSchema = z.object({
  instrumentTypeId: z.string().uuid(),
  ownerClientId: z.string().uuid().optional(),
  title: z.string().trim().min(2),
  referenceNumber: z.string().trim().optional(),
  amount: z.number().int().nonnegative().optional(),
  currency: z.string().trim().length(3).default("USD"),
  status: z.string().trim().default("draft"),
  jurisdiction: z.string().trim().optional(),
  maturityDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export interface ConnectorHealthDto {
  connectorCode: string;
  status: ConnectorStatus;
  configured: boolean;
  message: string;
  capabilities: string[];
}

export interface ExchangeDashboardDto {
  networks: number;
  institutions: number;
  connectors: number;
  openRequests: number;
  retryQueue: number;
  settlementQueue: number;
  failedRequests: number;
  deadLetters: number;
}
