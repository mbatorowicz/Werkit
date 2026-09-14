import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import {
  DeviceLogRateLimitService,
  MAX_DEVICE_LOGS_PER_MINUTE,
  deviceLogRateKey,
} from "@/services/DeviceLogRateLimitService";

describe("DeviceLogRateLimitService (Postgres)", () => {
  /** Ujemne id — nie koliduje z prawdziwymi userami; prefiks logs: nie rusza kluczy logowania. */
  const userId = -9_000_014;

  beforeAll(async () => {
    await DeviceLogRateLimitService.clear(userId);
  });

  afterAll(async () => {
    await DeviceLogRateLimitService.clear(userId);
  });

  it("30 INSERT-ów nie blokuje; 31. request jest ograniczony", async () => {
    for (let i = 0; i < MAX_DEVICE_LOGS_PER_MINUTE; i += 1) {
      await DeviceLogRateLimitService.record(userId);
      expect(await DeviceLogRateLimitService.isLimited(userId)).toBe(
        i + 1 >= MAX_DEVICE_LOGS_PER_MINUTE
      );
    }

    expect(await DeviceLogRateLimitService.isLimited(userId)).toBe(true);

    const [row] = await db
      .select({ count: loginAttempts.count })
      .from(loginAttempts)
      .where(eq(loginAttempts.key, deviceLogRateKey(userId)))
      .limit(1);
    expect(row?.count).toBe(MAX_DEVICE_LOGS_PER_MINUTE);
  });
});
