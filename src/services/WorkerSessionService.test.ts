import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Testy dla WorkerSessionService.
 *
 * Strategia: mockujemy tylko db.select/db.insert/db.update/db.delete/db.transaction.
 * Każda z tych metod zwraca chainable obiekt naśladujący Drizzle Query Builder.
 *
 * Różne metody mają różne długości chaina:
 * - getActiveSessionWithDetails: .select().from().leftJoin(x4).where().limit()  ← limit terminalem
 *                                .select().from().where().limit()               ← limit terminalem (settings)
 *                                .select().from().where().limit()               ← limit terminalem (user)
 *                                .select().from().where()                       ← where terminalem (photos)
 *                                .select().from().where()                       ← where terminalem (notes)
 * - endActiveSession:            .select().from().where().limit()               ← limit terminalem
 *                                tx.update().set().where()                      ← where terminalem
 *                                tx.update().set().where()                      ← where terminalem
 * - cancelActiveSession:         .select().from().where().limit()               ← limit terminalem
 *                                tx.update().set().where()                      ← where terminalem
 *                                tx.delete().where()                            ← where terminalem
 * - addNote:                     .select().from().where().limit()               ← limit terminalem
 *                                .insert().values()                             ← values terminalem (brak returning)
 * - addPhoto:                    .select().from().where().limit()               ← limit terminalem
 *                                .insert().values()                             ← values terminalem
 * - getCompletedSessions:        .select().from().leftJoin(x4).where().orderBy().limit() ← limit terminalem
 * - getSessionHistoryFull:       .select().from().leftJoin(x4).where()          ← where terminalem
 *                                .select().from().where().orderBy()             ← orderBy terminalem
 *                                .select().from().where()                       ← where terminalem
 *                                .select().from().where()                       ← where terminalem
 */

// --- Helper: tworzy thenable który jest też iterable (tablica) ---
function resultArray<T>(items: T[]): T[] & Promise<T[]> {
  const promise = Promise.resolve(items);
  const arr = items.slice() as T[] & Promise<T[]>;
  arr.then = promise.then.bind(promise);
  arr.catch = promise.catch.bind(promise);
  return arr;
}

// --- Mocks ---
const { selectMock, insertMock, updateMock, deleteMock, transactionMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    transaction: transactionMock,
  },
}));

vi.mock("@/db/schema", () => ({
  workSessions: {
    id: "id",
    companyId: "companyId",
    workOrderId: "workOrderId",
    userId: "userId",
    categoryId: "categoryId",
    resourceId: "resourceId",
    materialId: "materialId",
    customerId: "customerId",
    taskDescription: "taskDescription",
    quantityTons: "quantityTons",
    expectedDurationHours: "expectedDurationHours",
    dueDate: "dueDate",
    status: "status",
    startTime: "startTime",
    endTime: "endTime",
    startLatitude: "startLatitude",
    startLongitude: "startLongitude",
    endLatitude: "endLatitude",
    endLongitude: "endLongitude",
  },
  workOrders: { id: "id", status: "status" },
  customers: {
    id: "id",
    lastName: "lastName",
    firstName: "firstName",
    defaultAddress: "defaultAddress",
    latitude: "latitude",
    longitude: "longitude",
  },
  resources: { id: "id", name: "name" },
  materials: { id: "id", name: "name" },
  resourceCategories: { id: "id", name: "name", isStationary: "isStationary" },
  companySettings: { id: "id", companyId: "companyId" },
  users: { id: "id", canCreateOwnOrders: "canCreateOwnOrders" },
  sessionPhotos: {
    id: "id",
    workSessionId: "workSessionId",
    photoUrl: "photoUrl",
    photoType: "photoType",
    latitude: "latitude",
    longitude: "longitude",
  },
  sessionNotes: {
    id: "id",
    workSessionId: "workSessionId",
    note: "note",
    latitude: "latitude",
    longitude: "longitude",
  },
  gpsLogs: { id: "id", workSessionId: "workSessionId", timestamp: "timestamp" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
}));

vi.mock("@/lib/coordsFromRequestBody", () => ({
  coordPairToNumericStrings: vi.fn((c: { lat: number; lng: number }) => ({
    lat: String(c.lat),
    lng: String(c.lng),
  })),
  coordsFromRequestBody: vi.fn((_body: unknown) => null),
}));

vi.mock("@/services/CustomerLocationService", () => ({
  CustomerLocationService: {
    resolveForWorkOrder: vi.fn(),
  },
}));

vi.mock("@/services/ScheduleConflictService", () => ({
  ScheduleConflictService: {
    hasActiveResourceSession: vi.fn(),
  },
}));

vi.mock("@/lib/workerUserPermissions", () => ({
  pickWorkerUserFlags: vi.fn((row: unknown) => row),
}));

vi.mock("@/services/sql/attachmentExistsSql", () => ({
  sqlSessionHasNotes: vi.fn(() => "hasNotes"),
  sqlSessionHasPhotos: vi.fn(() => "hasPhotos"),
}));

vi.mock("@/services/materials/WorkSessionMaterialService", () => ({
  WorkSessionMaterialService: {
    issueForSessionStart: vi.fn().mockResolvedValue(undefined),
    returnForSessionIfIssued: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("WorkerSessionService", () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    transactionMock.mockReset();
  });

  describe("getActiveSessionWithDetails", () => {
    it("zwraca null session gdy brak aktywnej sesji", async () => {
      // 1. SELECT sesji: .select().from().leftJoin(x4).where().limit() — limit terminalem
      const sessionChain = {
        from: vi.fn(() => sessionChain),
        leftJoin: vi.fn(() => sessionChain),
        where: vi.fn(() => sessionChain),
        limit: vi.fn(() => resultArray([])),
      };
      // 2. SELECT settings: .select().from().where().limit() — limit terminalem
      const settingsChain = {
        from: vi.fn(() => settingsChain),
        where: vi.fn(() => settingsChain),
        limit: vi.fn(() => resultArray([{ id: 1, companyId: 1 }])),
      };
      // 3. SELECT user: .select().from().where().limit() — limit terminalem
      const userChain = {
        from: vi.fn(() => userChain),
        where: vi.fn(() => userChain),
        limit: vi.fn(() => resultArray([{ id: 1, canCreateOwnOrders: true }])),
      };

      selectMock
        .mockReturnValueOnce(sessionChain)
        .mockReturnValueOnce(settingsChain)
        .mockReturnValueOnce(userChain);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      const result = await WorkerSessionService.getActiveSessionWithDetails(1, 1);

      expect(result.session).toBeNull();
      expect(result.settings).not.toBeNull();
      expect(result.user).not.toBeNull();
    });

    it("zwraca pełne dane sesji gdy aktywna sesja istnieje", async () => {
      const sessionRow = {
        session: {
          id: 1,
          userId: 1,
          companyId: 1,
          status: "IN_PROGRESS",
          categoryId: 1,
          resourceId: 1,
          customerId: 1,
          materialId: 1,
          workOrderId: 1,
        },
        customerAddress: "ul. Test 1",
        customerLat: "50.1",
        customerLng: "20.1",
        customerFirstName: "Jan",
        customerLastName: "Kowalski",
        resourceName: "Koparka",
        categoryId: 1,
        categoryName: "Budowlane",
        categoryIsStationary: false,
        materialName: "Piasek",
      };

      // 1. SELECT sesji z joinami
      const sessionChain = {
        from: vi.fn(() => sessionChain),
        leftJoin: vi.fn(() => sessionChain),
        where: vi.fn(() => sessionChain),
        limit: vi.fn(() => resultArray([sessionRow])),
      };
      // 2. SELECT settings
      const settingsChain = {
        from: vi.fn(() => settingsChain),
        where: vi.fn(() => settingsChain),
        limit: vi.fn(() => resultArray([{ id: 1, companyId: 1 }])),
      };
      // 3. SELECT user
      const userChain = {
        from: vi.fn(() => userChain),
        where: vi.fn(() => userChain),
        limit: vi.fn(() => resultArray([{ id: 1, canCreateOwnOrders: true }])),
      };
      // 4. SELECT photos: .select().from().where() — where terminalem
      const photosChain = {
        from: vi.fn(() => photosChain),
        where: vi.fn(() =>
          resultArray([{ id: 1, photoUrl: "https://example.com/photo.jpg", photoType: "AD_HOC" }])
        ),
      };
      // 5. SELECT notes: .select().from().where() — where terminalem
      const notesChain = {
        from: vi.fn(() => notesChain),
        where: vi.fn(() => resultArray([{ id: 1, note: "Test note" }])),
      };

      selectMock
        .mockReturnValueOnce(sessionChain)
        .mockReturnValueOnce(settingsChain)
        .mockReturnValueOnce(userChain)
        .mockReturnValueOnce(photosChain)
        .mockReturnValueOnce(notesChain);

      const { CustomerLocationService } = await import("@/services/CustomerLocationService");
      vi.mocked(CustomerLocationService.resolveForWorkOrder).mockResolvedValue({
        id: 1,
        customerId: 1,
        label: "Główny",
        address: "ul. Test 1",
        latitude: "50.1",
        longitude: "20.1",
        isDefault: true,
        sortOrder: 0,
        routeWaypoints: [],
      });

      const { WorkerSessionService } = await import("./WorkerSessionService");
      const result = await WorkerSessionService.getActiveSessionWithDetails(1, 1);

      expect(result.session).not.toBeNull();
      expect(result.session!.id).toBe(1);
      expect(result.session!.resourceName).toBe("Koparka");
      expect(result.events).toHaveLength(1);
      expect(result.notes).toHaveLength(1);
    });
  });

  describe("endActiveSession", () => {
    it("rzuca błąd gdy brak aktywnej sesji", async () => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      await expect(WorkerSessionService.endActiveSession(1, 1)).rejects.toThrow(
        "no_active_session"
      );
    });

    it("wykonuje transakcję zamknięcia sesji", async () => {
      const sessionRow = {
        id: 1,
        userId: 1,
        companyId: 1,
        status: "IN_PROGRESS",
        workOrderId: 1,
        categoryId: 1,
        resourceId: 1,
        customerId: 1,
        materialId: 1,
        taskDescription: null,
        quantityTons: null,
        expectedDurationHours: null,
        dueDate: null,
        startLatitude: null,
        startLongitude: null,
        endLatitude: null,
        endLongitude: null,
        startTime: null,
        endTime: null,
      };
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([sessionRow])),
      };
      selectMock.mockReturnValue(chain);

      // Mock transakcji
      const txWhere = vi.fn().mockResolvedValue(undefined);
      const txSet = vi.fn().mockReturnValue({ where: txWhere });
      const txUpdate = vi.fn().mockReturnValue({ set: txSet });
      const tx = { update: txUpdate };
      transactionMock.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => cb(tx));

      const { WorkerSessionService } = await import("./WorkerSessionService");
      const result = await WorkerSessionService.endActiveSession(1, 1, { lat: 50.1, lng: 20.1 });

      expect(result).toBe(true);
      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(txUpdate).toHaveBeenCalledTimes(2); // work_sessions + work_orders
      expect(txSet).toHaveBeenCalledTimes(2);
      expect(txWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe("cancelActiveSession", () => {
    it("rzuca błąd gdy brak aktywnej sesji", async () => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      await expect(WorkerSessionService.cancelActiveSession(1, 1)).rejects.toThrow(
        "no_active_session"
      );
    });

    it("wykonuje transakcję anulowania sesji", async () => {
      const sessionRow = { id: 1, userId: 1, companyId: 1, status: "IN_PROGRESS", workOrderId: 1 };
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([sessionRow])),
      };
      selectMock.mockReturnValue(chain);

      // Mock transakcji: tx.update().set().where() + tx.delete().where()
      const updateWhere = vi.fn().mockResolvedValue(undefined);
      const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
      const txUpdate = vi.fn().mockReturnValue({ set: updateSet });

      const deleteWhere = vi.fn().mockResolvedValue(undefined);
      const txDelete = vi.fn().mockReturnValue({ where: deleteWhere });

      const tx = { update: txUpdate, delete: txDelete };
      transactionMock.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => cb(tx));

      const { WorkerSessionService } = await import("./WorkerSessionService");
      await WorkerSessionService.cancelActiveSession(1, 1);

      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(txUpdate).toHaveBeenCalledTimes(1);
      expect(txDelete).toHaveBeenCalledTimes(1);
      expect(updateSet).toHaveBeenCalled();
      expect(updateWhere).toHaveBeenCalled();
      expect(deleteWhere).toHaveBeenCalled();
    });
  });

  describe("addNote", () => {
    it("rzuca błąd gdy brak aktywnej sesji", async () => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      await expect(WorkerSessionService.addNote(1, 1, "Test")).rejects.toThrow("no_active_session");
    });

    it("dodaje notatkę do aktywnej sesji", async () => {
      // SELECT sesji: .select().from().where().limit() — limit terminalem
      const selectChain = {
        from: vi.fn(() => selectChain),
        where: vi.fn(() => selectChain),
        limit: vi.fn(() => resultArray([{ id: 1 }])),
      };
      selectMock.mockReturnValue(selectChain);

      // INSERT notatki: .insert().values() — values terminalem (brak returning)
      const valuesMock = vi.fn().mockResolvedValue(undefined);
      insertMock.mockReturnValue({ values: valuesMock });

      const { WorkerSessionService } = await import("./WorkerSessionService");
      await WorkerSessionService.addNote(1, 1, "Test note", "50.1", "20.1");

      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({ note: "Test note" }));
    });
  });

  describe("addPhoto", () => {
    it("rzuca błąd gdy brak aktywnej sesji", async () => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      await expect(
        WorkerSessionService.addPhoto(1, 1, "https://example.com/photo.jpg")
      ).rejects.toThrow("no_active_session");
    });

    it("dodaje zdjęcie do aktywnej sesji", async () => {
      const selectChain = {
        from: vi.fn(() => selectChain),
        where: vi.fn(() => selectChain),
        limit: vi.fn(() => resultArray([{ id: 1 }])),
      };
      selectMock.mockReturnValue(selectChain);

      const valuesMock = vi.fn().mockResolvedValue(undefined);
      insertMock.mockReturnValue({ values: valuesMock });

      const { WorkerSessionService } = await import("./WorkerSessionService");
      await WorkerSessionService.addPhoto(1, 1, "https://example.com/photo.jpg", "50.1", "20.1");

      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({ photoUrl: "https://example.com/photo.jpg", photoType: "AD_HOC" })
      );
    });
  });

  describe("getCompletedSessions", () => {
    it("zwraca listę zakończonych sesji", async () => {
      const rows = resultArray([
        {
          id: 1,
          workOrderId: null,
          categoryId: 1,
          categoryName: "Budowlane",
          startTime: new Date(),
          endTime: new Date(),
          taskDescription: null,
          quantityTons: null,
          materialName: null,
          customerLastName: null,
          resourceName: "Koparka",
          hasPhotos: 1,
          hasNotes: 0,
        },
      ]);
      // Chain: .select().from().leftJoin(x4).where().orderBy().limit()
      // Terminal: limit
      const chain = {
        from: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => rows),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      const result = await WorkerSessionService.getCompletedSessions(1, 1, 10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].hasPhotos).toBe(true);
      expect(result[0].hasNotes).toBe(false);
      expect(chain.limit).toHaveBeenCalledWith(10);
    });

    it("używa domyślnego limitu 20", async () => {
      const rows = resultArray([]);
      const chain = {
        from: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => rows),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      await WorkerSessionService.getCompletedSessions(1, 1);

      expect(chain.limit).toHaveBeenCalledWith(20);
    });
  });

  describe("getSessionHistoryFull", () => {
    it("zwraca null gdy sesja nie istnieje", async () => {
      // .select().from().leftJoin(x4).where() — where terminalem
      const chain = {
        from: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        where: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      const result = await WorkerSessionService.getSessionHistoryFull(999, 1, 1);

      expect(result).toBeNull();
    });

    it("zwraca pełne dane sesji historycznej", async () => {
      const sessionData = {
        id: 1,
        workOrderId: null,
        categoryId: 1,
        categoryName: "Budowlane",
        categoryIsStationary: false,
        startTime: new Date(),
        endTime: new Date(),
        taskDescription: null,
        quantityTons: null,
        materialName: null,
        resourceName: "Koparka",
        customerFirstName: "Jan",
        customerLastName: "Kowalski",
        customerAddress: "ul. Test 1",
        customerLat: "50.1",
        customerLng: "20.1",
      };

      // 1. SELECT sesji z joinami: .select().from().leftJoin(x4).where() — where terminalem
      const sessionChain = {
        from: vi.fn(() => sessionChain),
        leftJoin: vi.fn(() => sessionChain),
        where: vi.fn(() => resultArray([sessionData])),
      };

      // 2. SELECT gpsLogs: .select().from().where().orderBy() — orderBy terminalem
      const gpsChain = {
        from: vi.fn(() => gpsChain),
        where: vi.fn(() => gpsChain),
        orderBy: vi.fn(() =>
          resultArray([{ id: 1, latitude: "50.1", longitude: "20.1", timestamp: new Date() }])
        ),
      };

      // 3. SELECT notes: .select().from().where() — where terminalem
      const notesChain = {
        from: vi.fn(() => notesChain),
        where: vi.fn(() => resultArray([{ id: 1, note: "Test" }])),
      };

      // 4. SELECT photos: .select().from().where() — where terminalem
      const photosChain = {
        from: vi.fn(() => photosChain),
        where: vi.fn(() => resultArray([{ id: 1, photoUrl: "https://example.com/photo.jpg" }])),
      };

      selectMock
        .mockReturnValueOnce(sessionChain)
        .mockReturnValueOnce(gpsChain)
        .mockReturnValueOnce(notesChain)
        .mockReturnValueOnce(photosChain);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      const result = await WorkerSessionService.getSessionHistoryFull(1, 1, 1);

      expect(result).not.toBeNull();
      expect(result!.sessionData.id).toBe(1);
      expect(result!.logs).toHaveLength(1);
      expect(result!.notes).toHaveLength(1);
      expect(result!.photos).toHaveLength(1);
    });
  });
  describe("createWizardSession", () => {
    it("rzuca błąd gdy brak wymaganych pól", async () => {
      const { WorkerSessionService } = await import("./WorkerSessionService");
      await expect(WorkerSessionService.createWizardSession(1, 1, {})).rejects.toThrow(
        "missing_fields"
      );
    });

    it("rzuca błąd gdy aktywna sesja", async () => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([{ id: 1 }])),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      await expect(
        WorkerSessionService.createWizardSession(1, 1, { resourceId: "1", categoryId: "2" })
      ).rejects.toThrow("session_active");
    });

    it("tworzy sesję gdy wszystkie dane poprawne", async () => {
      // 1. SELECT sprawdza czy istnieje aktywna sesja — brak
      const sessionCheckChain = {
        from: vi.fn(() => sessionCheckChain),
        where: vi.fn(() => sessionCheckChain),
        limit: vi.fn(() => resultArray([])),
      };
      // 2. assertResourceBelongsToCompany — .select().from().where().limit()
      const resourceCheckChain = {
        from: vi.fn(() => resourceCheckChain),
        where: vi.fn(() => resourceCheckChain),
        limit: vi.fn(() => resultArray([{ id: 1, companyId: 1 }])),
      };
      // 3. assertCustomerBelongsToCompany — .select().from().where().limit()
      const customerCheckChain = {
        from: vi.fn(() => customerCheckChain),
        where: vi.fn(() => customerCheckChain),
        limit: vi.fn(() => resultArray([{ id: 4, companyId: 1 }])),
      };
      // 4. assertMaterialBelongsToCompany — .select().from().where().limit()
      const materialCheckChain = {
        from: vi.fn(() => materialCheckChain),
        where: vi.fn(() => materialCheckChain),
        limit: vi.fn(() => resultArray([{ id: 3, companyId: 1 }])),
      };
      selectMock
        .mockReturnValueOnce(sessionCheckChain)
        .mockReturnValueOnce(resourceCheckChain)
        .mockReturnValueOnce(customerCheckChain)
        .mockReturnValueOnce(materialCheckChain);

      // 5. hasActiveResourceSession — zwraca false
      const { ScheduleConflictService } = await import("@/services/ScheduleConflictService");
      vi.mocked(ScheduleConflictService.hasActiveResourceSession).mockResolvedValue(false);

      // 6. Transakcja: INSERT sesji z returning + ewentualne WZ materiału
      const returningMock = vi.fn().mockResolvedValue([{ id: 1, status: "IN_PROGRESS" }]);
      const txInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ returning: returningMock }),
      });
      const tx = { insert: txInsert };
      transactionMock.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(tx));

      const { WorkerSessionService } = await import("./WorkerSessionService");
      const result = await WorkerSessionService.createWizardSession(1, 1, {
        resourceId: "1",
        categoryId: "2",
        materialId: "3",
        customerId: "4",
        taskDescription: "Test task",
        quantityTons: "10.5",
      });

      expect(result).not.toBeNull();
      expect(result.id).toBe(1);
      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(txInsert).toHaveBeenCalledTimes(1);
      expect(returningMock).toHaveBeenCalled();
    });

    it("rzuca błąd gdy zasób zajęty", async () => {
      // 1. SELECT sprawdza czy istnieje aktywna sesja — brak
      const sessionCheckChain = {
        from: vi.fn(() => sessionCheckChain),
        where: vi.fn(() => sessionCheckChain),
        limit: vi.fn(() => resultArray([])),
      };
      // 2. assertResourceBelongsToCompany — resource exists and belongs to company
      const resourceCheckChain = {
        from: vi.fn(() => resourceCheckChain),
        where: vi.fn(() => resourceCheckChain),
        limit: vi.fn(() => resultArray([{ id: 1, companyId: 1 }])),
      };
      selectMock.mockReturnValueOnce(sessionCheckChain).mockReturnValueOnce(resourceCheckChain);

      const { ScheduleConflictService } = await import("@/services/ScheduleConflictService");
      vi.mocked(ScheduleConflictService.hasActiveResourceSession).mockResolvedValue(true);

      const { WorkerSessionService } = await import("./WorkerSessionService");
      await expect(
        WorkerSessionService.createWizardSession(1, 1, { resourceId: "1", categoryId: "2" })
      ).rejects.toThrow("resource_busy");
    });
  });
});
