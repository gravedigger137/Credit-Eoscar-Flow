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
