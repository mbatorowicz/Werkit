import { describe, expect, it, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
    delete: deleteMock,
    transaction: transactionMock,
  },
}));

vi.mock("@/db/schema", () => ({
  workSessions: {
    id: "id",
    companyId: "companyId",
    status: "status",
    workOrderId: "workOrderId",
    endTime: "endTime",
  },
  gpsLogs: { workSessionId: "workSessionId", timestamp: "timestamp" },
  sessionPhotos: { workSessionId: "workSessionId", createdAt: "createdAt" },
  sessionNotes: { workSessionId: "workSessionId", createdAt: "createdAt" },
  workOrders: { id: "id", companyId: "companyId", status: "status" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  desc: (col: unknown) => col,
  and: (...args: unknown[]) => args,
}));

vi.mock("@/lib/photoUpload", () => ({
  refreshPhotoUrls: vi.fn((photos: unknown[]) => photos),
}));

describe("AdminSessionService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    transactionMock.mockReset();
  });

  describe("getSessionDetails", () => {
    it("zwraca szczegóły sesji z logami, zdjęciami i notatkami", async () => {
      const fakeSession = { id: 1 };
      selectMock
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([fakeSession]) }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ orderBy: () => Promise.resolve([{ lat: "52.0", lng: "21.0" }]) }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => Promise.resolve([{ id: 10, photoUrl: "https://blob.url/1" }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ orderBy: () => Promise.resolve([{ id: 20, note: "Test note" }]) }),
          }),
        });

      const { AdminSessionService } = await import("@/services/AdminSessionService");
      const result = await AdminSessionService.getSessionDetails(1, 1);

      expect(result.logs).toHaveLength(1);
      expect(result.photos).toHaveLength(1);
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].note).toBe("Test note");
    });

    it("rzuca błąd gdy sesja nie istnieje", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
      });

      const { AdminSessionService } = await import("@/services/AdminSessionService");
      await expect(AdminSessionService.getSessionDetails(1, 999)).rejects.toThrow("not_found");
    });
  });

  describe("forceCompleteSession", () => {
    it("kończy sesję IN_PROGRESS i oznacza zlecenie jako COMPLETED", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([{ id: 1, status: "IN_PROGRESS", workOrderId: 42, companyId: 1 }]),
          }),
        }),
      });
      updateMock.mockReturnValue({ set: () => ({ where: () => Promise.resolve() }) });

      const { AdminSessionService } = await import("@/services/AdminSessionService");
      await AdminSessionService.forceCompleteSession(1, 1);

      expect(updateMock).toHaveBeenCalledTimes(2);
    });

    it("rzuca błąd gdy sesja nie istnieje", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
      });

      const { AdminSessionService } = await import("@/services/AdminSessionService");
      await expect(AdminSessionService.forceCompleteSession(1, 999)).rejects.toThrow("not_found");
    });

    it("rzuca błąd gdy sesja nie jest IN_PROGRESS", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([{ id: 1, status: "COMPLETED", workOrderId: null, companyId: 1 }]),
          }),
        }),
      });

      const { AdminSessionService } = await import("@/services/AdminSessionService");
      await expect(AdminSessionService.forceCompleteSession(1, 1)).rejects.toThrow(
        "not_in_progress"
      );
    });
  });

  describe("deleteArchivedSession", () => {
    it("usuwa zakończoną sesję i powiązane zlecenie", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([{ id: 1, status: "COMPLETED", workOrderId: 42, companyId: 1 }]),
          }),
        }),
      });
      transactionMock.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
        const tx = { delete: vi.fn(() => ({ where: () => Promise.resolve() })) };
        await cb(tx);
      });

      const { AdminSessionService } = await import("@/services/AdminSessionService");
      await AdminSessionService.deleteArchivedSession(1, 1);

      expect(transactionMock).toHaveBeenCalledTimes(1);
    });

    it("rzuca błąd gdy sesja jest wciąż aktywna", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([{ id: 1, status: "IN_PROGRESS", workOrderId: null, companyId: 1 }]),
          }),
        }),
      });

      const { AdminSessionService } = await import("@/services/AdminSessionService");
      await expect(AdminSessionService.deleteArchivedSession(1, 1)).rejects.toThrow(
        "session_still_active"
      );
    });

    it("rzuca błąd gdy sesja nie istnieje", async () => {
      selectMock.mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([]) }),
        }),
      });

      const { AdminSessionService } = await import("@/services/AdminSessionService");
      await expect(AdminSessionService.deleteArchivedSession(1, 999)).rejects.toThrow("not_found");
    });
  });
});
