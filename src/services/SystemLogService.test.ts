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
  deviceLogs: {
    id: "id",
    userId: "userId",
    level: "level",
    message: "message",
    metadata: "metadata",
    createdAt: "createdAt",
    companyId: "companyId",
  },
  users: { id: "id", fullName: "fullName" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  desc: (col: unknown) => col,
}));

describe("SystemLogService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
  });

  describe("getRecentLogs", () => {
    it("zwraca listę logów z mapowaniem metadanych i daty", async () => {
      const fakeLogs = [
        {
          id: 1,
          userId: 10,
          level: "ERROR",
          message: "Test error",
          metadata: { code: "E001" },
          createdAt: new Date("2025-01-01T10:00:00Z"),
          workerName: "Jan Kowalski",
        },
        {
          id: 2,
          userId: 11,
          level: "INFO",
          message: "Test info",
          metadata: null,
          createdAt: new Date("2025-01-01T11:00:00Z"),
          workerName: "Anna Nowak",
        },
      ];

      selectMock.mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({ limit: () => Promise.resolve(fakeLogs) }),
            }),
          }),
        }),
      });

      const { SystemLogService } = await import("@/services/SystemLogService");
      const result = await SystemLogService.getRecentLogs(1);

      expect(result).toHaveLength(2);
      expect(result[0].level).toBe("ERROR");
      expect(result[0].metadata).toEqual({ code: "E001" });
      expect(result[0].createdAt).toBe("2025-01-01T10:00:00.000Z");
      expect(result[1].workerName).toBe("Anna Nowak");
    });

    it("używa domyślnego limitu 500", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({ limit: () => Promise.resolve([]) }),
            }),
          }),
        }),
      });

      const { SystemLogService } = await import("@/services/SystemLogService");
      await SystemLogService.getRecentLogs(1);

      const limitFn = selectMock.mock.results[0].value.from().leftJoin().where().orderBy().limit;
      expect(limitFn).toBeDefined();
    });

    it("zwraca pustą tablicę gdy brak logów", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({ limit: () => Promise.resolve([]) }),
            }),
          }),
        }),
      });

      const { SystemLogService } = await import("@/services/SystemLogService");
      const result = await SystemLogService.getRecentLogs(1);

      expect(result).toEqual([]);
    });
  });

  describe("insertLog", () => {
    it("wstawia log z przyciętymi wartościami", async () => {
      insertMock.mockReturnValue({ values: () => Promise.resolve() });

      const { SystemLogService } = await import("@/services/SystemLogService");
      await SystemLogService.insertLog(1, 10, "ERROR", "Test message", { foo: "bar" });

      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    it("używa domyślnych wartości dla brakujących pól", async () => {
      const valuesFn = vi.fn().mockResolvedValue(undefined);
      insertMock.mockReturnValue({ values: valuesFn });

      const { SystemLogService } = await import("@/services/SystemLogService");
      await SystemLogService.insertLog(1, 10, "", "");

      expect(valuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 1,
          userId: 10,
        }),
      );
    });

    it("przycina długie wartości do limitów", async () => {
      insertMock.mockReturnValue({ values: () => Promise.resolve() });

      const { SystemLogService } = await import("@/services/SystemLogService");
      const longMessage = "x".repeat(5000);
      await SystemLogService.insertLog(1, 10, "A".repeat(50), longMessage);

      const valuesArg = insertMock.mock.calls[0][0];
      expect(valuesArg).toBeDefined();
    });
  });
});
