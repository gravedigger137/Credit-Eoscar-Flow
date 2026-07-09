import assert from "node:assert/strict";
import test from "node:test";
import { decryptIfEncrypted, encryptIfSensitive } from "../secret-store";
import { getDwollaHealthStatus, isDwollaEndpointAllowed } from "../institutional-exchange/connectors/dwolla/dwolla.client";
import {
  buildDwollaExchangePayload,
  buildDwollaFundingSourcePayload,
  buildDwollaTransferPayload,
  verifyDwollaWebhookSignature,
} from "../institutional-exchange/connectors/dwolla/dwolla.payloads";
import crypto from "crypto";

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

test("Dwolla health reports missing credentials without exposing values", async () => {
  await withTemporaryEnv({
    DWOLLA_KEY: undefined,
    DWOLLA_SECRET: undefined,
    DWOLLA_ENV: "sandbox",
  }, async () => {
    const health = await getDwollaHealthStatus(undefined, process.env);

    assert.equal(health.configured, false);
    assert.equal(health.status, "not_configured");
    assert.equal(health.keyMasked, null);
    assert.equal(health.secretMasked, null);
  });
});

test("Dwolla endpoint allowlist accepts official sandbox and rejects unknown custom endpoint", () => {
  assert.equal(isDwollaEndpointAllowed("https://api-sandbox.dwolla.com", "sandbox", {}), true);
  assert.equal(isDwollaEndpointAllowed("https://not-dwolla.example.test", "sandbox", {}), false);
  assert.equal(isDwollaEndpointAllowed(
    "https://partner-gateway.example.test",
    "sandbox",
    { INSTITUTIONAL_EXCHANGE_ALLOWED_ENDPOINTS: "https://partner-gateway.example.test" },
  ), true);
});

test("DWOLLA_KEY and DWOLLA_SECRET use existing sensitive encryption", async () => {
  await withTemporaryEnv({
    NODE_ENV: "production",
    SENSITIVE_CONFIG_ENCRYPTION_KEY: "12345678901234567890123456789012",
  }, () => {
    const encryptedKey = encryptIfSensitive("dwolla_key", "dwolla-key-fixture");
    const encryptedSecret = encryptIfSensitive("dwolla_secret", "dwolla-secret-fixture");

    assert.equal(encryptedKey.startsWith("enc:v1:"), true);
    assert.equal(encryptedSecret.startsWith("enc:v1:"), true);
    assert.equal(decryptIfEncrypted(encryptedKey), "dwolla-key-fixture");
    assert.equal(decryptIfEncrypted(encryptedSecret), "dwolla-secret-fixture");
  });
});

test("Dwolla Exchange payload uses Plaid processor token and configured exchange partner href", () => {
  const payload = buildDwollaExchangePayload(
    "processor-sandbox-fixture",
    "https://api-sandbox.dwolla.com/exchange-partners/partner-fixture",
  );

  assert.deepEqual(payload, {
    _links: {
      "exchange-partner": {
        href: "https://api-sandbox.dwolla.com/exchange-partners/partner-fixture",
      },
    },
    token: "processor-sandbox-fixture",
  });
});

test("Dwolla funding source payload uses exchange link instead of manual routing when Plaid exists", () => {
  const payload = buildDwollaFundingSourcePayload({
    customerUrl: "https://api-sandbox.dwolla.com/customers/customer-fixture",
    exchangeUrl: "https://api-sandbox.dwolla.com/exchanges/exchange-fixture",
    name: "Plaid Checking",
  });

  assert.equal("routingNumber" in payload, false);
  assert.deepEqual(payload, {
    _links: {
      customer: { href: "https://api-sandbox.dwolla.com/customers/customer-fixture" },
      exchange: { href: "https://api-sandbox.dwolla.com/exchanges/exchange-fixture" },
    },
    name: "Plaid Checking",
  });
});

test("Dwolla manual funding source payload remains available as fallback", () => {
  const payload = buildDwollaFundingSourcePayload({
    customerUrl: "https://api-sandbox.dwolla.com/customers/customer-fixture",
    name: "Manual Checking",
    bankAccountType: "checking",
    routingNumber: "222222226",
    accountNumber: "123456789",
  });

  assert.equal(payload.routingNumber, "222222226");
  assert.equal(payload.accountNumber, "123456789");
});

test("Dwolla transfer payload uses cents to dollar string conversion", () => {
  const payload = buildDwollaTransferPayload({
    sourceFundingSourceUrl: "https://api-sandbox.dwolla.com/funding-sources/source-fixture",
    destinationFundingSourceUrl: "https://api-sandbox.dwolla.com/funding-sources/destination-fixture",
    amount: 12345,
    currency: "USD",
  });

  assert.equal(payload.amount.value, "123.45");
});

test("Dwolla webhook verification scaffold validates HMAC signatures when configured", () => {
  const payload = JSON.stringify({ id: "event-fixture" });
  const secret = "webhook-secret-fixture";
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const result = verifyDwollaWebhookSignature(payload, signature, secret);

  assert.equal(result.verified, true);
  assert.equal(result.status, "verified");
});
