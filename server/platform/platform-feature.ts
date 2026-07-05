import { readBooleanEnv } from "./platform-core";

export const PLATFORM_INTEGRATION_ENABLED_FLAG = "PLATFORM_INTEGRATION_ENABLED";

export function isPlatformIntegrationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readBooleanEnv(env, PLATFORM_INTEGRATION_ENABLED_FLAG, false);
}
