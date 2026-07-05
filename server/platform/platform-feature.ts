export const PLATFORM_INTEGRATION_ENABLED_FLAG = "PLATFORM_INTEGRATION_ENABLED";

export function isPlatformIntegrationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env[PLATFORM_INTEGRATION_ENABLED_FLAG];

  if (value === undefined) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
