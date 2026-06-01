// ============================================================
// Werkit — Serwis: feature flags organizacji (GPS, DUR, …)
// ============================================================

import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { FeatureFlags } from "@/types/featureFlags";
import { DEFAULT_FEATURE_FLAGS } from "@/types/featureFlags";

/**
 * Mapuje wiersz company_settings na FeatureFlags.
 * Nieznane/nullowane kolumny zastępuje domyślnymi.
 */
function rowToFlags(row: typeof companySettings.$inferSelect | undefined): FeatureFlags {
  if (!row) return { ...DEFAULT_FEATURE_FLAGS };
  return {
    gpsTrackingEnabled: row.gpsTrackingEnabled ?? DEFAULT_FEATURE_FLAGS.gpsTrackingEnabled,
    mapViewEnabled: row.mapViewEnabled ?? DEFAULT_FEATURE_FLAGS.mapViewEnabled,
    geofencingEnabled: row.geofencingEnabled ?? DEFAULT_FEATURE_FLAGS.geofencingEnabled,
    routePlanningEnabled: row.routePlanningEnabled ?? DEFAULT_FEATURE_FLAGS.routePlanningEnabled,
    navigationEnabled: row.navigationEnabled ?? DEFAULT_FEATURE_FLAGS.navigationEnabled,
    durEnabled: row.durEnabled ?? DEFAULT_FEATURE_FLAGS.durEnabled,
  };
}

export class PlatformFeatureFlagService {
  /**
   * Pobiera aktualne flagi funkcji dla organizacji.
   * Jeśli wiersz company_settings nie istnieje — zwraca domyślne (wszystkie włączone, DUR wyłączony).
   */
  static async getFlags(companyId: number): Promise<FeatureFlags> {
    const rows = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.companyId, companyId))
      .limit(1);

    return rowToFlags(rows[0]);
  }

  /**
   * Aktualizuje wybrane flagi funkcji dla organizacji.
   * Przyjmuje Partial<FeatureFlags> — tylko podane klucze zostaną zmienione.
   * Zwraca nowy, pełny stan flag.
   */
  static async updateFlags(companyId: number, flags: Partial<FeatureFlags>): Promise<FeatureFlags> {
    const updateData: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(flags)) {
      if (typeof value === "boolean") {
        // Mapowanie camelCase → snake_case dla kolumn DB
        const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        updateData[dbKey] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return this.getFlags(companyId);
    }

    await db
      .insert(companySettings)
      .values({ companyId, ...updateData } as typeof companySettings.$inferInsert)
      .onConflictDoUpdate({
        target: companySettings.companyId,
        set: updateData,
      });

    return this.getFlags(companyId);
  }
}
