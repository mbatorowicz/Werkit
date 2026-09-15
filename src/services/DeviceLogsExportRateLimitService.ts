import { MAX_DEVICE_LOGS_EXPORT_PER_WINDOW } from "@/lib/deviceLogLimits";
import { PostgresRateLimitService } from "@/services/PostgresRateLimitService";

/** 5 eksportów / 15 min / firmę — anty-exfil i obciążenie DB (S4). */
export const DEVICE_LOGS_EXPORT_RATE_KEY_PREFIX = "logs-export:";

export function deviceLogsExportRateKey(companyId: number): string {
  return `${DEVICE_LOGS_EXPORT_RATE_KEY_PREFIX}${companyId}`;
}

export class DeviceLogsExportRateLimitService {
  static async isLimited(companyId: number): Promise<boolean> {
    return PostgresRateLimitService.isLimited(
      deviceLogsExportRateKey(companyId),
      MAX_DEVICE_LOGS_EXPORT_PER_WINDOW
    );
  }

  static async record(companyId: number): Promise<number> {
    return PostgresRateLimitService.record(deviceLogsExportRateKey(companyId), "15 minutes");
  }

  static async clear(companyId: number): Promise<void> {
    return PostgresRateLimitService.clear(deviceLogsExportRateKey(companyId));
  }
}
