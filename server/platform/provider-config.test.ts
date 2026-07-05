import assert from "node:assert/strict";
import test from "node:test";
import { decryptIfEncrypted, encryptIfSensitive } from "../secret-store";
import {
  getPlaidConfigStatus,
  ProviderConfigValidationError,
  savePlaidConfig,
  testPlaidConfigReadiness,
  type ProviderConfigStorage,
} from "../provider-config";

class MemoryConfigStorage implements ProviderConfigStorage {
  readonly values = new Map<string, string>();

  async getApiConfig(key: string) {
    return this.values.get(key);
  }

  async setApiConfig(key: string, value: string) {
    this.values.set(key, value);
  }
}

class SecureMemoryConfigStorage extends MemoryConfigStorage {
  async getApiConfig(key: string) {
    return decryptIfEncrypted(this.values.get(key));
  }

  async setApiConfig(key: string, value: string) {
    this.values.set(key, encryptIfSensitive(key, value));
  }
}

const plaidSandboxConfig = {
  clientId: "not-a-real-plaid-client-id",
  secret: "not-a-real-plaid-secret",
  environment: "sandbox",
  products: ["auth", "transactions", "identity"],
  enabled: true,
  status: "active",
};

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

test("saves Plaid config through provider config storage", async () => {
  const storage = new MemoryConfigStorage();

  const result = await savePlaidConfig(plaidSandboxConfig, storage);

  assert.equal(result.success, true);
  assert.equal(result.config.provider, "plaid");
  assert.equal(result.config.configured, true);
  assert.equal(storage.values.get("plaid_client_id"), plaidSandboxConfig.clientId);
  assert.equal(storage.values.get("plaid_secret"), plaidSandboxConfig.secret);
  assert.equal(storage.values.get("plaid_environment"), "sandbox");
  assert.equal(storage.values.get("plaid_env"), "sandbox");
  assert.equal(storage.values.get("plaid_products"), "auth,transactions,identity");
});

test("masks Plaid secret in config status responses", async () => {
  const storage = new MemoryConfigStorage();
  await savePlaidConfig(plaidSandboxConfig, storage);

  const status = await getPlaidConfigStatus(storage);
  const serialized = JSON.stringify(status);

  assert.equal(status.hasSecret, true);
  assert.notEqual(status.secretMasked, plaidSandboxConfig.secret);
  assert.equal(serialized.includes(plaidSandboxConfig.secret), false);
});

test("returns clear Plaid validation errors for missing required fields", async () => {
  const storage = new MemoryConfigStorage();

  await assert.rejects(
    () => savePlaidConfig({ environment: "sandbox" }, storage),
    (error) => {
      assert.equal(error instanceof ProviderConfigValidationError, true);
      assert.deepEqual((error as ProviderConfigValidationError).fields, ["clientId", "secret"]);
      return true;
    },
  );
});

test("Plaid test connection reports missing config clearly", async () => {
  const storage = new MemoryConfigStorage();

  await withTemporaryEnv({
    PLAID_CLIENT_ID: undefined,
    PLAID_SECRET: undefined,
    PLAID_ENV: undefined,
    PLAID_PRODUCTS: undefined,
  }, async () => {
    await assert.rejects(
      () => testPlaidConfigReadiness(storage),
      (error) => {
        assert.equal(error instanceof ProviderConfigValidationError, true);
        assert.deepEqual((error as ProviderConfigValidationError).fields, ["clientId", "secret", "environment"]);
        return true;
      },
    );
  });
});

test("Plaid sandbox config shape is retained after save", async () => {
  const storage = new MemoryConfigStorage();
  await savePlaidConfig(plaidSandboxConfig, storage);

  const status = await getPlaidConfigStatus(storage);

  assert.equal(status.environment, "sandbox");
  assert.equal(status.enabled, true);
  assert.equal(status.status, "active");
  assert.deepEqual(status.products, ["auth", "transactions", "identity"]);
});

test("production Plaid config save requires SENSITIVE_CONFIG_ENCRYPTION_KEY", async () => {
  const storage = new SecureMemoryConfigStorage();

  await withTemporaryEnv({
    NODE_ENV: "production",
    SENSITIVE_CONFIG_ENCRYPTION_KEY: undefined,
  }, async () => {
    await assert.rejects(
      () => savePlaidConfig(plaidSandboxConfig, storage),
      /SENSITIVE_CONFIG_ENCRYPTION_KEY is required/,
    );
  });
});
