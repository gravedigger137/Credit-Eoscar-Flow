import assert from "node:assert/strict";
import test from "node:test";
import {
  BureauApiConfigValidationError,
  getBureauConfigStatus,
  saveBureauApiConfig,
  type BureauConfigStorage,
} from "../bureau-api-config";

class MemoryConfigStorage implements BureauConfigStorage {
  readonly values = new Map<string, string>();

  async getApiConfig(key: string) {
    return this.values.get(key);
  }

  async setApiConfig(key: string, value: string) {
    this.values.set(key, value);
  }
}

const experianSandboxConfig = {
  provider: "experian",
  environment: "sandbox",
  clientId: "placeholder-client-id",
  clientSecret: "placeholder-client-secret",
  tokenUrl: "https://sandbox-us-api.experian.com/oauth2/v1/token",
  baseUrl: "https://sandbox-us-api.experian.com",
  productName: "Consumer Credit Profile",
  apiName: "consumer-credit-profile",
  enabled: true,
  status: "active",
};

test("saves an Experian sandbox bureau API config", async () => {
  const storage = new MemoryConfigStorage();

  const result = await saveBureauApiConfig(experianSandboxConfig, storage);

  assert.equal(result.success, true);
  assert.equal(result.config.provider, "experian");
  assert.equal(result.config.environment, "sandbox");
  assert.equal(result.config.configured, true);
  assert.equal(storage.values.get("experian_client_id"), "placeholder-client-id");
  assert.equal(storage.values.get("experian_client_secret"), "placeholder-client-secret");
  assert.equal(storage.values.get("experian_api_key"), "placeholder-client-secret");
  assert.equal(storage.values.get("bureau_experian_token_url"), experianSandboxConfig.tokenUrl);
  assert.equal(storage.values.get("bureau_experian_base_url"), experianSandboxConfig.baseUrl);
});

test("returns clear validation errors for missing required Experian fields", async () => {
  const storage = new MemoryConfigStorage();

  await assert.rejects(
    () => saveBureauApiConfig({ provider: "experian", environment: "sandbox", clientId: "placeholder-client-id" }, storage),
    (error) => {
      assert.equal(error instanceof BureauApiConfigValidationError, true);
      assert.deepEqual((error as BureauApiConfigValidationError).fields, [
        "clientSecret",
        "tokenUrl",
        "baseUrl",
        "productName or apiName",
      ]);
      return true;
    },
  );
});

test("masks stored secrets in bureau config status responses", async () => {
  const storage = new MemoryConfigStorage();
  await saveBureauApiConfig(experianSandboxConfig, storage);

  const status = await getBureauConfigStatus("experian", storage);
  const serialized = JSON.stringify(status);

  assert.equal(status.hasClientSecret, true);
  assert.notEqual(status.clientSecretMasked, experianSandboxConfig.clientSecret);
  assert.equal(serialized.includes(experianSandboxConfig.clientSecret), false);
});

test("updates an existing provider config without returning raw credentials", async () => {
  const storage = new MemoryConfigStorage();
  await saveBureauApiConfig(experianSandboxConfig, storage);

  const result = await saveBureauApiConfig({
    ...experianSandboxConfig,
    clientSecret: "replacement-placeholder-secret",
    apiName: "consumer-credit-profile-v2",
  }, storage);

  assert.equal(storage.values.get("experian_api_key"), "replacement-placeholder-secret");
  assert.equal(storage.values.get("bureau_experian_api_name"), "consumer-credit-profile-v2");
  assert.notEqual(result.config.clientSecretMasked, "replacement-placeholder-secret");
  assert.equal(JSON.stringify(result).includes("replacement-placeholder-secret"), false);
});

test("preserves legacy API key config behavior for non-Experian bureaus", async () => {
  const storage = new MemoryConfigStorage();

  const result = await saveBureauApiConfig({
    bureau: "equifax",
    environment: "sandbox",
    apiKey: "placeholder-api-key",
    apiSecret: "placeholder-api-secret",
    clientId: "placeholder-equifax-client-id",
  }, storage);

  assert.equal(result.config.provider, "equifax");
  assert.equal(result.config.configured, true);
  assert.equal(storage.values.get("equifax_api_key"), "placeholder-api-key");
  assert.equal(storage.values.get("equifax_api_secret"), "placeholder-api-secret");
});
