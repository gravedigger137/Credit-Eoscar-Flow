import assert from "node:assert/strict";
import test from "node:test";
import { decryptIfEncrypted, encryptIfSensitive } from "../secret-store";
import { createConnector, type ConnectorConfig } from "../institutional-exchange/connectors";
import { decideExchangeRoute, maskCredential, normalizeIdempotencyKey } from "../institutional-exchange/core";

async function withTemporaryEnv<T>(updates: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(updates)) {
    previous[key] = process.env[key];
    if (updates[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = updates[key];
    }
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

const baseConnectorConfig: ConnectorConfig = {
  code: "ach",
  displayName: "ACH",
  category: "bank_transfer",
  requiresEnrollment: true,
  enabled: false,
  endpoint: undefined,
  allowedEndpoints: [],
  credentialsPresent: false,
  capabilities: ["ach_credit", "ach_debit"],
};

test("routing decision blocks unapproved exchange requests", () => {
  const decision = decideExchangeRoute({
    requestType: "payment",
    paymentRailCode: "ach",
    approved: false,
    candidates: [{
      connectorCode: "ach",
      paymentRailId: "rail_ach",
      status: "active",
      requiresEnrollment: true,
      score: 50,
      capabilities: ["ach_credit"],
    }],
  });

  assert.equal(decision.selected, false);
  assert.equal(decision.status, "blocked");
});

test("routing decision selects active requested rail and preserves enrollment warning", () => {
  const decision = decideExchangeRoute({
    requestType: "payment",
    paymentRailCode: "ach",
    approved: true,
    candidates: [
      { connectorCode: "stripe", status: "active", requiresEnrollment: false, score: 100, capabilities: ["payments"] },
      { connectorCode: "ach", status: "active", requiresEnrollment: true, score: 50, capabilities: ["ach_credit"] },
    ],
  });

  assert.equal(decision.selected, true);
  assert.equal(decision.connectorCode, "ach");
  assert.equal(decision.status, "selected");
  assert.equal(decision.reason.includes("enrollment"), true);
});

test("idempotency key generation is stable for equivalent request seeds", () => {
  const seed = { requestType: "payment", amount: 12500, currency: "USD", approvalReference: "approval-123" };

  const first = normalizeIdempotencyKey(undefined, seed);
  const second = normalizeIdempotencyKey(undefined, seed);
  const explicit = normalizeIdempotencyKey("provided-key-123", seed);

  assert.equal(first, second);
  assert.equal(explicit, "provided-key-123");
  assert.notEqual(first, explicit);
});

test("institution credential values encrypt and masked responses do not leak raw secrets", async () => {
  await withTemporaryEnv({
    NODE_ENV: "production",
    SENSITIVE_CONFIG_ENCRYPTION_KEY: "12345678901234567890123456789012",
  }, () => {
    const rawSecret = "institution-secret-value";
    const encrypted = encryptIfSensitive("institution_credential_secret_api_key", rawSecret);
    const masked = maskCredential({
      id: "cred_123",
      institutionId: "inst_123",
      networkId: null,
      credentialType: "api_secret",
      keyName: "api_key",
      encryptedValue: encrypted,
      environment: "sandbox",
      status: "active",
    });

    assert.equal(encrypted.startsWith("enc:v1:"), true);
    assert.equal(decryptIfEncrypted(encrypted), rawSecret);
    assert.equal(JSON.stringify(masked).includes(rawSecret), false);
    assert.equal(masked.hasValue, true);
  });
});

test("connector submit returns requires_enrollment instead of pretending network access exists", async () => {
  const connector = createConnector({ ...baseConnectorConfig, enabled: true });

  const result = await connector.Submit({
    idempotencyKey: "idempotency-123",
    requestType: "payment",
    amount: 1000,
    currency: "USD",
    payload: { exchangeRequestId: "exchange_123" },
  });

  assert.equal(result.status, "requires_enrollment");
  assert.equal(result.message.includes("requires partner enrollment"), true);
});

test("connector guardrail rejects non-allowlisted endpoint even with credentials", async () => {
  const connector = createConnector({
    ...baseConnectorConfig,
    requiresEnrollment: false,
    enabled: true,
    endpoint: "https://not-allowed.example.test/exchange",
    allowedEndpoints: ["https://allowed.example.test"],
    credentialsPresent: true,
  });

  const result = await connector.Submit({
    idempotencyKey: "idempotency-456",
    requestType: "payment",
    amount: 1000,
    currency: "USD",
    payload: { exchangeRequestId: "exchange_456" },
  });

  assert.equal(result.status, "endpoint_not_allowlisted");
});

test("connector health reports configured only when endpoint and credentials are safe", async () => {
  const connector = createConnector({
    ...baseConnectorConfig,
    requiresEnrollment: false,
    enabled: true,
    endpoint: "https://allowed.example.test/exchange",
    allowedEndpoints: ["https://allowed.example.test"],
    credentialsPresent: true,
  });

  const health = await connector.Health();

  assert.equal(health.status, "configured");
  assert.equal(health.configured, true);
  assert.deepEqual(health.capabilities, ["ach_credit", "ach_debit"]);
});
