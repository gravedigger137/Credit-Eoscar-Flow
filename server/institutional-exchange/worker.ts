import { institutionalExchangeService } from "./service";
import { safeErrorMessage } from "../security-utils";

let workerTimer: NodeJS.Timeout | undefined;

export function startInstitutionalExchangeWorker() {
  if (process.env.INSTITUTIONAL_EXCHANGE_WORKER_ENABLED !== "true") {
    return { started: false, reason: "disabled" };
  }
  if (workerTimer) {
    return { started: true, reason: "already_running" };
  }

  const intervalMs = Number(process.env.INSTITUTIONAL_EXCHANGE_WORKER_INTERVAL_MS || 30000);
  workerTimer = setInterval(() => {
    institutionalExchangeService.processDueRetryQueue()
      .catch((error) => console.error("Institutional exchange worker failed:", safeErrorMessage(error)));
  }, Math.max(intervalMs, 10000));

  return { started: true, intervalMs: Math.max(intervalMs, 10000) };
}

export function stopInstitutionalExchangeWorker() {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = undefined;
  }
}
