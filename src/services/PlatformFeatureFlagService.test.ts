// ============================================================
// Werkit — Testy: PlatformFeatureFlagService
// ============================================================

import { describe, expect, it, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}));

vi.mock("@/db/schema", () => ({
  companySettings: {
    companyId: "companyId",
    gpsTrackingEnabled: "gpsTrackingEnabled",
    mapViewEnabled: "mapViewEnabled",
    geofencingEnabled: "geofencingEnabled",
    routePlanningEnabled: "routePlanningEnabled",
    navigationEnabled: "navigationEnabled",
    durEnabled: "durEnabled",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
}));

describe("PlatformFeatureFlagService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
  });

  describe("getFlags", () => {
    it("zwraca domyślne flagi gdy brak wiersza company_settings", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
      });

      const { PlatformFeatureFlagService } = await import("./PlatformFeatureFlagService");
      const flags = await PlatformFeatureFlagService.getFlags(1);

      expect(flags.gpsTrackingEnabled).toBe(true);
      expect(flags.mapViewEnabled).toBe(true);
      expect(flags.geofencingEnabled).toBe(true);
      expect(flags.routePlanningEnabled).toBe(true);
      expect(flags.navigationEnabled).toBe(true);
      expect(flags.durEnabled).toBe(false);
    });

    it("zwraca flagi z DB gdy wiersz istnieje", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  companyId: 1,
                  gpsTrackingEnabled: true,
                  mapViewEnabled: false,
                  geofencingEnabled: true,
                  routePlanningEnabled: false,
                  navigationEnabled: true,
                  durEnabled: true,
                },
              ]),
          }),
        }),
      });

      const { PlatformFeatureFlagService } = await import("./PlatformFeatureFlagService");
      const flags = await PlatformFeatureFlagService.getFlags(1);

      expect(flags.gpsTrackingEnabled).toBe(true);
      expect(flags.mapViewEnabled).toBe(false);
      expect(flags.geofencingEnabled).toBe(true);
      expect(flags.routePlanningEnabled).toBe(false);
      expect(flags.navigationEnabled).toBe(true);
      expect(flags.durEnabled).toBe(true);
    });

    it("obsługuje null w DB — fallback do domyślnych", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  companyId: 1,
                  gpsTrackingEnabled: null,
                  mapViewEnabled: null,
                  geofencingEnabled: null,
                  routePlanningEnabled: null,
                  navigationEnabled: null,
                  durEnabled: null,
                },
              ]),
          }),
        }),
      });

      const { PlatformFeatureFlagService } = await import("./PlatformFeatureFlagService");
      const flags = await PlatformFeatureFlagService.getFlags(1);

      expect(flags.gpsTrackingEnabled).toBe(true);
      expect(flags.durEnabled).toBe(false);
    });
  });

  describe("updateFlags", () => {
    it("aktualizuje wybrane flagi — UPSERT", async () => {
      // insert z onConflictDoUpdate
      const onConflictDoUpdateMock = vi.fn().mockResolvedValue(undefined);
      insertMock.mockReturnValueOnce({
        values: () => ({
          onConflictDoUpdate: onConflictDoUpdateMock,
        }),
      });

      // getFlags po update — zwraca nowy stan
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  companyId: 1,
                  gpsTrackingEnabled: true,
                  mapViewEnabled: true,
                  geofencingEnabled: true,
                  routePlanningEnabled: true,
                  navigationEnabled: true,
                  durEnabled: true,
                },
              ]),
          }),
        }),
      });

      const { PlatformFeatureFlagService } = await import("./PlatformFeatureFlagService");
      const flags = await PlatformFeatureFlagService.updateFlags(1, { durEnabled: true });

      expect(flags.durEnabled).toBe(true);
      expect(onConflictDoUpdateMock).toHaveBeenCalledWith({
        target: "companyId",
        set: { dur_enabled: true },
      });
    });

    it("pomija nie-boolean wartości w Partial", async () => {
      // getFlags — zwraca istniejący wiersz
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  companyId: 1,
                  gpsTrackingEnabled: true,
                  mapViewEnabled: true,
                  geofencingEnabled: true,
                  routePlanningEnabled: true,
                  navigationEnabled: true,
                  durEnabled: false,
                },
              ]),
          }),
        }),
      });

      // insert nie powinien być wywołany, bo Partial jest puste
      const { PlatformFeatureFlagService } = await import("./PlatformFeatureFlagService");
      const flags = await PlatformFeatureFlagService.updateFlags(1, { durEnabled: undefined as unknown as boolean });

      // insert nie został wywołany — tylko getFlags
      expect(insertMock).not.toHaveBeenCalled();
      expect(flags.durEnabled).toBe(false);
    });

    it("mapuje camelCase → snake_case dla kluczy DB", async () => {
      const onConflictDoUpdateMock = vi.fn().mockResolvedValue(undefined);
      insertMock.mockReturnValueOnce({
        values: () => ({
          onConflictDoUpdate: onConflictDoUpdateMock,
        }),
      });

      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  companyId: 1,
                  gpsTrackingEnabled: true,
                  mapViewEnabled: false,
                  geofencingEnabled: true,
                  routePlanningEnabled: false,
                  navigationEnabled: true,
                  durEnabled: false,
                },
              ]),
          }),
        }),
      });

      const { PlatformFeatureFlagService } = await import("./PlatformFeatureFlagService");
      await PlatformFeatureFlagService.updateFlags(1, {
        gpsTrackingEnabled: true,
        mapViewEnabled: false,
        navigationEnabled: true,
      });

      // Sprawdź, czy klucze zostały zamienione na snake_case
      const valuesArg = insertMock.mock.calls[0][0];
      expect(valuesArg).toBeDefined();

      const onConflictArg = onConflictDoUpdateMock.mock.calls[0][0];
      expect(onConflictArg).toEqual({
        target: "companyId",
        set: {
          gps_tracking_enabled: true,
          map_view_enabled: false,
          navigation_enabled: true,
        },
      });
    });
  });
});
