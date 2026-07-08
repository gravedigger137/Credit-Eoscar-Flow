import assert from "node:assert/strict";
import test from "node:test";
import {
  createLocalMetro2ValidationAdapter,
  getBureauIntegrationsConfigured,
  getEoscarConfigStatus,
  getEoscarMetro2IntegrationStatus,
  getMetro2ReadinessStatus,
} from "../eoscar-metro2-readiness";

test("reports e-OSCAR as not configured when env vars are missing", () => {
  const status = getEoscarConfigStatus({});

  assert.equal(status.configured, false);
  assert.equal(status.status, "not_configured");
  assert.equal(status.environment, "unknown");
  assert.deepEqual(status.missingEnvVars, [
    "EOSCAR_API_BASE_URL",
    "EOSCAR_CLIENT_ID",
    "EOSCAR_CLIENT_SECRET",
    "EOSCAR_ENVIRONMENT",
  ]);
});

test("reports e-OSCAR as configured when required env vars are present", () => {
  const status = getEoscarConfigStatus({
    EOSCAR_API_BASE_URL: "https://eoscar-api.example.test",
    EOSCAR_CLIENT_ID: "unit-test-client-id",
    EOSCAR_CLIENT_SECRET: "unit-test-client-secret",
    EOSCAR_ENVIRONMENT: "sandbox",
  });

  assert.equal(status.configured, true);
  assert.equal(status.status, "configured");
  assert.equal(status.environment, "sandbox");
  assert.deepEqual(status.missingEnvVars, []);
});

test("rejects unsupported e-OSCAR environments without crashing startup", () => {
  const status = getEoscarConfigStatus({
    EOSCAR_API_BASE_URL: "https://eoscar-api.example.test",
    EOSCAR_CLIENT_ID: "unit-test-client-id",
    EOSCAR_CLIENT_SECRET: "unit-test-client-secret",
    EOSCAR_ENVIRONMENT: "unsupported",
  });

  assert.equal(status.configured, false);
  assert.equal(status.status, "not_configured");
  assert.equal(status.environment, "unknown");
  assert.deepEqual(status.missingEnvVars, ["EOSCAR_ENVIRONMENT"]);
});

test("keeps Metro 2 local validation readiness independent of e-OSCAR config", () => {
  const status = getMetro2ReadinessStatus();
  const adapter = createLocalMetro2ValidationAdapter();

  assert.equal(status.ready, true);
  assert.equal(status.status, "ready");
  assert.equal(status.validatorConfigured, true);
  assert.equal(status.officialTransmissionConfigured, false);
  assert.equal(typeof adapter.validateBaseRecord, "function");
});

test("calculates bureau integration status from masked provider statuses", () => {
  assert.equal(getBureauIntegrationsConfigured(undefined), false);
  assert.equal(getBureauIntegrationsConfigured({
    experian: { configured: false },
    equifax: { configured: true },
  }), true);
});

test("integration status exposes requested booleans without leaking secret values", () => {
  const status = getEoscarMetro2IntegrationStatus(
    {
      experian: { configured: false },
      equifax: { configured: true },
    },
    {
      EOSCAR_API_BASE_URL: "https://eoscar-api.example.test",
      EOSCAR_CLIENT_ID: "unit-test-client-id",
      EOSCAR_CLIENT_SECRET: "unit-test-client-secret",
      EOSCAR_ENVIRONMENT: "sandbox",
    },
  );
  const serialized = JSON.stringify(status);

  assert.equal(status.eoscarConfigured, true);
  assert.equal(status.metro2Ready, true);
  assert.equal(status.bureauIntegrationsConfigured, true);
  assert.equal(serialized.includes("unit-test-client-secret"), false);
  assert.equal(serialized.includes("unit-test-client-id"), false);
  assert.equal(serialized.includes("https://eoscar-api.example.test"), false);
});

test("workflow readiness remains documentation-gated even when env config exists", () => {
  const status = getEoscarMetro2IntegrationStatus(undefined, {
    EOSCAR_API_BASE_URL: "https://eoscar-api.example.test",
    EOSCAR_CLIENT_ID: "unit-test-client-id",
    EOSCAR_CLIENT_SECRET: "unit-test-client-secret",
    EOSCAR_ENVIRONMENT: "sandbox",
  });

  assert.equal(status.workflows.acdv.status, "requires_official_documentation");
  assert.equal(status.workflows.aud.status, "requires_official_documentation");
  assert.equal(status.workflows.acdv.configured, false);
  assert.equal(status.workflows.aud.configured, false);
});
