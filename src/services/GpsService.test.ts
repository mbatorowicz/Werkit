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
  workSessions: { id: "id", userId: "userId", companyId: "companyId", status: "status" },
  gpsLogs: { workSessionId: "workSessionId", latitude: "latitude", longitude: "longitude", timestamp: "timestamp" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  asc: (col: unknown) => col,
  and: (...args: unknown[]) => args,
}));

describe("GpsService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
  });

  describe("getActiveSessionGpsLogs", () => {
    it("zwraca puste gdy brak aktywnej sesji", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
      });

      const { GpsService } = await import("@/services/GpsService");
      const result = await GpsService.getActiveSessionGpsLogs(1, 1);

      expect(result).toEqual([]);
    });

    it("zwraca logi GPS dla aktywnej sesji", async () => {
      selectMock
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([{ id: 10 }]) }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () =>
                Promise.resolve([
                  { latitude: "52.2297", longitude: "21.0122", timestamp: new Date("2025-01-01T10:00:00Z") },
                  { latitude: "52.2298", longitude: "21.0123", timestamp: new Date("2025-01-01T10:01:00Z") },
                ]),
            }),
          }),
        });

      const { GpsService } = await import("@/services/GpsService");
      const result = await GpsService.getActiveSessionGpsLogs(1, 1);

      expect(result).toHaveLength(2);
      expect(result[0].lat).toBe(52.2297);
      expect(result[0].lng).toBe(21.0122);
    });
  });

  describe("saveGpsLogs", () => {
    it("zapisuje punkty GPS do aktywnej sesji", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ id: 10 }]) }),
        }),
      });
      insertMock.mockReturnValue({ values: () => Promise.resolve() });

      const { GpsService } = await import("@/services/GpsService");
      const count = await GpsService.saveGpsLogs(1, 1, [
        { lat: 52.2297, lng: 21.0122 },
        { lat: 52.2298, lng: 21.0123 },
      ]);

      expect(count).toBe(2);
      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    it("rzuca błąd gdy brak aktywnej sesji", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
      });

      const { GpsService } = await import("@/services/GpsService");
      await expect(
        GpsService.saveGpsLogs(1, 1, [{ lat: 52.2297, lng: 21.0122 }]),
      ).rejects.toThrow("no_active_session");
    });

    it("zwraca 0 gdy pusta tablica punktów", async () => {
      const { GpsService } = await import("@/services/GpsService");
      const count = await GpsService.saveGpsLogs(1, 1, []);

      expect(count).toBe(0);
      expect(selectMock).not.toHaveBeenCalled();
    });

    it("filtruje punkty z brakującymi współrzędnymi", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ id: 10 }]) }),
        }),
      });
      insertMock.mockReturnValue({ values: () => Promise.resolve() });

      const { GpsService } = await import("@/services/GpsService");
      const count = await GpsService.saveGpsLogs(1, 1, [
        { lat: 52.2297, lng: 21.0122 },
        { lat: undefined as unknown as number, lng: 21.0123 },
        { lat: 52.2298, lng: undefined as unknown as number },
      ]);

      // typeof undefined === 'undefined' → filtered out; typeof NaN === 'number' → passes
      expect(count).toBe(1);
    });
  });
});
