import { MAX_DEVICE_LOGS_PER_MINUTE } from "@/lib/deviceLogLimits";
import { PostgresRateLimitService } from "@/services/PostgresRateLimitService";

export { MAX_DEVICE_LOGS_PER_MINUTE };

/** 30 INSERT `device_logs` / min / user — SSOT w `deviceLogLimits` (Postgres, klucz z prefiksem). */
export const DEVICE_LOG_RATE_KEY_PREFIX = "logs:";

export function deviceLogRateKey(userId: number): string {
  return `${DEVICE_LOG_RATE_KEY_PREFIX}${userId}`;
}

export class DeviceLogRateLimitService {
  static async isLimited(userId: number): Promise<boolean> {
    return PostgresRateLimitService.isLimited(deviceLogRateKey(userId), MAX_DEVICE_LOGS_PER_MINUTE);
  }

  static async record(userId: number): Promise<number> {
    return PostgresRateLimitService.record(deviceLogRateKey(userId), "1 minute");
  }

  static async clear(userId: number): Promise<void> {
    return PostgresRateLimitService.clear(deviceLogRateKey(userId));
  }
}
