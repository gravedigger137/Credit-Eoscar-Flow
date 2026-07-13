import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import crypto from "node:crypto";
import { decryptIfEncrypted } from "../secret-store";
import {
  buildDwollaVerifiedCustomerPayload,
  normalizeDwollaVerificationStatus,
  normalizeDwollaWebhookTopic,
  serializeDwollaCustomerProfile,
  shouldApplyDwollaStatusUpdate,
  verifyDwollaWebhookSignature,
} from "../institutional-exchange/connectors/dwolla/dwolla.payloads";

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

async function loadVerifiedCustomerHelpers() {
  process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
  return import("../institutional-exchange/connectors/dwolla/dwolla.verified-customer");
}

test("Dwolla full SSN encryption refuses plaintext storage when no key is configured", async () => {
  await withTemporaryEnv({
    SENSITIVE_CONFIG_ENCRYPTION_KEY: undefined,
    NODE_ENV: "development",
  }, async () => {
    const { encryptDwollaFullSsn } = await loadVerifiedCustomerHelpers();
    assert.throws(() => encryptDwollaFullSsn("123-45-6789"), /SENSITIVE_CONFIG_ENCRYPTION_KEY/);
  });
});

test("Dwolla full SSN persistence uses existing encryption and decrypts with configured key", async () => {
  await withTemporaryEnv({
    SENSITIVE_CONFIG_ENCRYPTION_KEY: "12345678901234567890123456789012",
    NODE_ENV: "production",
  }, async () => {
    const { encryptDwollaFullSsn } = await loadVerifiedCustomerHelpers();
    const encrypted = encryptDwollaFullSsn("123-45-6789");
    assert.equal(encrypted.startsWith("enc:v1:"), true);
    assert.equal(decryptIfEncrypted(encrypted), "123456789");
  });
});

test("Dwolla customer serialization excludes full and encrypted SSN fields", () => {
  const serialized = serializeDwollaCustomerProfile({
    id: "client-1",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.test",
    phone: "555-0100",
    dob: "1990-01-01",
    address: "1 Main St",
    city: "Atlanta",
    state: "GA",
    zip: "30301",
    last4Ssn: "6789",
    dwollaCustomerId: "dwolla-customer-1",
    dwollaCustomerUrl: "https://api-sandbox.dwolla.com/customers/dwolla-customer-1",
    dwollaVerificationStatus: "pending",
    dwollaVerificationUpdatedAt: new Date("2026-07-01T00:00:00Z"),
    encryptedFullSsn: "enc:v1:fixture",
    fullSSN: "123456789",
  } as any);

  const json = JSON.stringify(serialized);
  assert.equal(json.includes("123456789"), false);
  assert.equal(json.includes("enc:v1:fixture"), false);
  assert.equal(serialized.last4SSN, "***-**-6789");
});

test("Dwolla Verified Customer payload sends only last4 SSN unless full SSN is explicitly supplied", () => {
  const payload = buildDwollaVerifiedCustomerPayload({
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.test",
    address1: "1 Main St",
    city: "Atlanta",
    state: "GA",
    postalCode: "30301",
    dateOfBirth: "1990-01-01",
    last4SSN: "6789",
  });

  assert.equal(payload.type, "personal");
  assert.equal(payload.ssn, "6789");
});

test("Dwolla verification status mapping supports customer webhook topics", () => {
  assert.equal(normalizeDwollaWebhookTopic("customer.verification.document-needed"), "customer_verification_document_needed");
  assert.equal(normalizeDwollaVerificationStatus("customer_verified"), "verified");
  assert.equal(normalizeDwollaVerificationStatus("customer_kba_verification_needed"), "kba");
  assert.equal(normalizeDwollaVerificationStatus("customer_kba_verification_failed"), "failed");
  assert.equal(normalizeDwollaVerificationStatus("customer_kba_verification_passed"), "verified");
  assert.equal(normalizeDwollaVerificationStatus("customer_verification_document_needed"), "document");
  assert.equal(normalizeDwollaVerificationStatus("customer_suspended"), "suspended");
  assert.equal(normalizeDwollaVerificationStatus(undefined, "retry"), "retry");
});

test("Dwolla stale-event protection ignores older verification events", () => {
  assert.equal(shouldApplyDwollaStatusUpdate("2026-07-10T12:00:00Z", "2026-07-10T12:00:00Z"), true);
  assert.equal(shouldApplyDwollaStatusUpdate("2026-07-10T12:00:00Z", "2026-07-10T11:59:59Z"), false);
  assert.equal(shouldApplyDwollaStatusUpdate(null, "2026-07-10T11:59:59Z"), true);
});

test("Dwolla webhook signature rejection does not accept missing or invalid signatures", () => {
  const payload = JSON.stringify({ id: "event-1", topic: "customer_verified" });
  const secret = "dwolla-webhook-secret";
  const valid = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  assert.equal(verifyDwollaWebhookSignature(payload, undefined, secret).verified, false);
  assert.equal(verifyDwollaWebhookSignature(payload, "00", secret).verified, false);
  assert.equal(verifyDwollaWebhookSignature(payload, valid, secret).verified, true);
});

test("Dwolla ownership check allows admins and matching client email only", () => {
  return loadVerifiedCustomerHelpers().then(({ canAccessDwollaClientRecord }) => {
  const client = { email: "client@example.test" } as any;
  assert.equal(canAccessDwollaClientRecord({ id: "admin", email: "admin@example.test", role: "admin", isAdmin: true }, client), true);
  assert.equal(canAccessDwollaClientRecord({ id: "client", email: "CLIENT@example.test", role: "client", isAdmin: false }, client), true);
  assert.equal(canAccessDwollaClientRecord({ id: "other", email: "other@example.test", role: "client", isAdmin: false }, client), false);
  });
});

test("Dwolla document validation accepts PDF signatures and rejects mismatched file content", async () => {
  const { validateDwollaDocumentFile } = await loadVerifiedCustomerHelpers();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dwolla-doc-"));
  const pdf = path.join(dir, "document.pdf");
  const fake = path.join(dir, "fake.pdf");
  fs.writeFileSync(pdf, Buffer.concat([Buffer.from([0x25, 0x50, 0x44, 0x46]), Buffer.from(" fixture")]));
  fs.writeFileSync(fake, "not a pdf");

  validateDwollaDocumentFile({ originalname: "document.pdf", mimetype: "application/pdf", size: fs.statSync(pdf).size, path: pdf });
  assert.throws(() => validateDwollaDocumentFile({ originalname: "fake.pdf", mimetype: "application/pdf", size: fs.statSync(fake).size, path: fake }), /signature/);

  fs.rmSync(dir, { recursive: true, force: true });
});

test("Dwolla document submission requires non-local private storage configuration", async () => {
  const { isDwollaProductionDocumentStorageConfigured } = await loadVerifiedCustomerHelpers();

  assert.equal(isDwollaProductionDocumentStorageConfigured(undefined), false);
  assert.equal(isDwollaProductionDocumentStorageConfigured("local"), false);
  assert.equal(isDwollaProductionDocumentStorageConfigured("local_private"), false);
  assert.equal(isDwollaProductionDocumentStorageConfigured("filesystem"), false);
  assert.equal(isDwollaProductionDocumentStorageConfigured("s3"), true);
  assert.equal(isDwollaProductionDocumentStorageConfigured("private-object-storage"), true);
});

test("Dwolla error mapper does not return raw provider bodies with sensitive fields", async () => {
  const { mapDwollaVerifiedCustomerError } = await loadVerifiedCustomerHelpers();
  const mapped = mapDwollaVerifiedCustomerError({
    status: 400,
    message: "Dwolla validation failed",
    body: {
      code: "ValidationError",
      message: "Invalid request",
      ssn: "123456789",
      access_token: "token-fixture",
    },
  });

  const json = JSON.stringify(mapped);
  assert.equal(json.includes("123456789"), false);
  assert.equal(json.includes("token-fixture"), false);
  assert.equal(mapped.status, 400);
});
