import { PostgresRateLimitService } from "@/services/PostgresRateLimitService";

/** 30 geocode / min / firmę — Nominatim ToS + anty-nadużycie (S3). */
export const MAX_GEOCODE_PER_MINUTE = 30;
export const GEOCODE_RATE_KEY_PREFIX = "geocode:";

export function geocodeRateKey(companyId: number): string {
  return `${GEOCODE_RATE_KEY_PREFIX}${companyId}`;
}

export class GeocodeRateLimitService {
  static async isLimited(companyId: number): Promise<boolean> {
    return PostgresRateLimitService.isLimited(geocodeRateKey(companyId), MAX_GEOCODE_PER_MINUTE);
  }

  static async record(companyId: number): Promise<number> {
    return PostgresRateLimitService.record(geocodeRateKey(companyId), "1 minute");
  }

  static async clear(companyId: number): Promise<void> {
    return PostgresRateLimitService.clear(geocodeRateKey(companyId));
  }
}
