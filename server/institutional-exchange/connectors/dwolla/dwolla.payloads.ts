import crypto from "crypto";

export interface DwollaFundingSourcePayloadInput {
  customerUrl: string;
  name: string;
  exchangeUrl?: string;
  bankAccountType?: string;
  routingNumber?: string;
  accountNumber?: string;
}

export interface DwollaTransferPayloadInput {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: number | string;
  currency: string;
  metadata?: Record<string, unknown>;
}

export function buildDwollaExchangePayload(processorToken: string, partnerHref: string) {
  return {
    _links: {
      "exchange-partner": {
        href: partnerHref,
      },
    },
    token: processorToken,
  };
}

export function buildDwollaFundingSourcePayload(input: DwollaFundingSourcePayloadInput) {
  if (input.exchangeUrl) {
    return {
      _links: {
        customer: { href: input.customerUrl },
        exchange: { href: input.exchangeUrl },
      },
      name: input.name,
    };
  }

  if (!input.routingNumber || !input.accountNumber || !input.bankAccountType) {
    throw Object.assign(new Error("routingNumber, accountNumber, and bankAccountType are required for manual Dwolla funding source creation."), { status: 400 });
  }

  return {
    _links: {
      customer: { href: input.customerUrl },
    },
    routingNumber: input.routingNumber,
    accountNumber: input.accountNumber,
    bankAccountType: input.bankAccountType,
    name: input.name,
  };
}

export function buildDwollaTransferPayload(input: DwollaTransferPayloadInput) {
  return {
    _links: {
      source: { href: input.sourceFundingSourceUrl },
      destination: { href: input.destinationFundingSourceUrl },
    },
    amount: {
      currency: input.currency,
      value: typeof input.amount === "number" ? (input.amount / 100).toFixed(2) : input.amount,
    },
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
}

export function verifyDwollaWebhookSignature(payload: string, signature: string | undefined, secret = process.env.DWOLLA_WEBHOOK_SECRET) {
  if (!secret) return { verified: false, status: "not_configured", message: "DWOLLA_WEBHOOK_SECRET is not configured." };
  if (!signature) return { verified: false, status: "missing_signature", message: "Dwolla webhook signature is missing." };
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  const verified = expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  return { verified, status: verified ? "verified" : "invalid_signature", message: verified ? "Webhook signature verified." : "Webhook signature did not match." };
}

export type DwollaVerificationStatus = "verified" | "retry" | "kba" | "document" | "suspended" | "pending" | "failed";

export interface DwollaVerifiedCustomerPayloadInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  last4SSN: string;
  fullSSN?: string | null;
}

export interface DwollaCustomerProfileSummary {
  clientId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  last4SSN: string | null;
  dwollaCustomerId: string | null;
  dwollaCustomerUrl: string | null;
  dwollaVerificationStatus: DwollaVerificationStatus;
  dwollaVerificationRawStatus: string | null;
  dwollaVerificationUpdatedAt: string | null;
  dwollaVerificationFailureReason: string | null;
}

const topicStatusMap: Record<string, DwollaVerificationStatus> = {
  customer_created: "pending",
  customer_verified: "verified",
  customer_reverification_needed: "retry",
  customer_verification_document_needed: "document",
  customer_verification_document_uploaded: "pending",
  customer_verification_document_approved: "verified",
  customer_verification_document_failed: "failed",
  customer_suspended: "suspended",
};

const rawStatusMap: Record<string, DwollaVerificationStatus> = {
  verified: "verified",
  retry: "retry",
  kba: "kba",
  document: "document",
  suspended: "suspended",
  pending: "pending",
  deactivated: "failed",
};

export function cleanSsn(value: string | undefined | null) {
  return (value || "").replace(/\D/g, "");
}

export function maskSsnLast4(value: string | undefined | null) {
  const digits = cleanSsn(value);
  if (digits.length !== 4) return null;
  return `***-**-${digits}`;
}

export function normalizeDwollaVerificationStatus(topic?: string | null, rawStatus?: string | null): DwollaVerificationStatus {
  const normalizedTopic = normalizeDwollaWebhookTopic(topic || "");
  if (normalizedTopic && topicStatusMap[normalizedTopic]) return topicStatusMap[normalizedTopic];
  const normalizedRaw = (rawStatus || "").trim().toLowerCase();
  return rawStatusMap[normalizedRaw] || "pending";
}

export function normalizeDwollaWebhookTopic(topic: string) {
  return topic
    .trim()
    .toLowerCase()
    .replace(/[.\s-]+/g, "_");
}

export function shouldApplyDwollaStatusUpdate(currentUpdatedAt: Date | string | null | undefined, eventOccurredAt: Date | string) {
  if (!currentUpdatedAt) return true;
  const current = currentUpdatedAt instanceof Date ? currentUpdatedAt : new Date(currentUpdatedAt);
  const event = eventOccurredAt instanceof Date ? eventOccurredAt : new Date(eventOccurredAt);
  if (Number.isNaN(current.getTime())) return true;
  if (Number.isNaN(event.getTime())) return false;
  return event.getTime() >= current.getTime();
}

export function extractDwollaIdFromUrl(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/").filter(Boolean);
  return parts.at(-1) || null;
}

export function buildDwollaVerifiedCustomerPayload(input: DwollaVerifiedCustomerPayloadInput) {
  const last4 = cleanSsn(input.last4SSN);
  if (last4.length !== 4) {
    throw Object.assign(new Error("last4SSN must contain exactly four digits."), { status: 400, code: "invalid_last4_ssn" });
  }

  return compactPayload({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    type: "personal",
    address1: input.address1,
    address2: input.address2 || undefined,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    dateOfBirth: input.dateOfBirth,
    ssn: input.fullSSN ? cleanSsn(input.fullSSN) : last4,
  });
}

export function serializeDwollaCustomerProfile(client: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  dob?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  last4Ssn?: string | null;
  dwollaCustomerId?: string | null;
  dwollaCustomerUrl?: string | null;
  dwollaVerificationStatus?: string | null;
  dwollaVerificationRawStatus?: string | null;
  dwollaVerificationUpdatedAt?: Date | string | null;
  dwollaVerificationFailureReason?: string | null;
}): DwollaCustomerProfileSummary {
  return {
    clientId: client.id,
    firstName: client.firstName || null,
    lastName: client.lastName || null,
    email: client.email || null,
    phone: client.phone || null,
    dateOfBirth: client.dateOfBirth || client.dob || null,
    address1: client.address || null,
    address2: client.address2 || null,
    city: client.city || null,
    state: client.state || null,
    postalCode: client.zip || null,
    last4SSN: maskSsnLast4(client.last4Ssn),
    dwollaCustomerId: client.dwollaCustomerId || null,
    dwollaCustomerUrl: client.dwollaCustomerUrl || null,
    dwollaVerificationStatus: normalizeDwollaVerificationStatus(null, client.dwollaVerificationStatus || "pending"),
    dwollaVerificationRawStatus: client.dwollaVerificationRawStatus || null,
    dwollaVerificationUpdatedAt: client.dwollaVerificationUpdatedAt ? new Date(client.dwollaVerificationUpdatedAt).toISOString() : null,
    dwollaVerificationFailureReason: client.dwollaVerificationFailureReason || null,
  };
}

function compactPayload<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "" && entry !== null)) as T;
}
