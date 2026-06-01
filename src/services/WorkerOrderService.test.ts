import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Testy dla WorkerOrderService.
 *
 * Strategia: mockujemy tylko db.select/db.insert/db.update/db.transaction.
 * Każda z tych metod zwraca chainable obiekt naśladujący Drizzle Query Builder.
 *
 * WAŻNE: Drizzle chain builder ma dwie role:
 * - Metody pośrednie (from, leftJoin, where, orderBy, limit) zwracają chain,
 *   żeby można było wywołać kolejną metodę.
 * - Metoda terminalna (ostatnia w chainie) zwraca thenable+iterable,
 *   który działa zarówno z `await` jak i destrukturyzacją `const [row] = await ...`.
 *
 * Różne serwisy mają różne długości chaina:
 * - acceptOrder:       .select().from().where()                    ← where terminalem
 * - getPendingOrders:  .select().from().where().orderBy().limit().offset() ← offset terminalem
 * - createOwnOrder:    .select().from().where().limit()            ← limit terminalem (user check)
 *                      .insert().values().returning()              ← returning terminalem
 * - transakcja update: tx.update().set().where()                   ← where terminalem
 * - transakcja insert: tx.insert().values().returning()            ← returning terminalem
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
const { selectMock, insertMock, updateMock, transactionMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    transaction: transactionMock,
  },
}));

vi.mock("@/db/schema", () => ({
  workOrders: {
    id: "id",
    companyId: "companyId",
    userId: "userId",
    status: "status",
    dueDate: "dueDate",
    createdAt: "createdAt",
    priority: "priority",
    hasPhotos: "hasPhotos",
    hasNotes: "hasNotes",
    resourceId: "resourceId",
    customerId: "customerId",
    customerLocationId: "customerLocationId",
    categoryId: "categoryId",
    materialId: "materialId",
    taskDescription: "taskDescription",
    quantityTons: "quantityTons",
    expectedDurationHours: "expectedDurationHours",
    lockedUntil: "lockedUntil",
    createdById: "createdById",
  },
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
    startLatitude: "startLatitude",
    startLongitude: "startLongitude",
  },
  customers: {
    id: "id",
    lastName: "lastName",
    firstName: "firstName",
    defaultAddress: "defaultAddress",
    latitude: "latitude",
    longitude: "longitude",
  },
  users: { id: "id", companyId: "companyId", canCreateOwnOrders: "canCreateOwnOrders" },
  resources: { id: "id", name: "name", companyId: "companyId" },
  materials: { id: "id", name: "name", companyId: "companyId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  asc: (col: unknown) => col,
}));

vi.mock("@/services/ScheduleConflictService", () => ({
  ScheduleConflictService: {
    hasActiveWorkerSession: vi.fn(),
    findConflictsForRequest: vi.fn(),
    hasActiveResourceSession: vi.fn(),
    assertNoScheduleConflict: vi.fn(),
  },
}));

vi.mock("@/services/workOrders/workOrderListQueryParts", () => ({
  applyWorkOrderListJoins: vi.fn((qb: unknown) => qb),
  newWorkOrderCreatorUserAlias: vi.fn(() => "creator"),
  workOrderListSharedSelectFields: vi.fn(() => ({ id: "id", status: "status" })),
}));

vi.mock("@/features/worker/lib/workOrderPriority", () => ({
  normalizeWorkOrderPriority: vi.fn((p: unknown) => p),
}));

vi.mock("@/lib/coordsFromRequestBody", () => ({
  coordPairToNumericStrings: vi.fn((c: { lat: number; lng: number }) => ({
    lat: String(c.lat),
    lng: String(c.lng),
  })),
}));

vi.mock("@/lib/scheduleConflict", () => ({
  computeLockedUntil: vi.fn(() => new Date("2026-06-01")),
  parseDurationHours: vi.fn((v: unknown) => (v != null ? Number(v) : null)),
}));

vi.mock("@/lib/workOrderCategoryValidation", () => ({
  coerceWorkOrderPriority: vi.fn((p: unknown) => p || "NORMAL"),
  validateWorkOrderFieldsAgainstCategory: vi.fn(() => "ok" as const),
  validateCategoryForOrder: vi.fn(),
}));

vi.mock("@/services/CustomerLocationService", () => ({
  CustomerLocationService: {
    getDefaultForCustomer: vi.fn(),
  },
}));

vi.mock("@/services/DictionaryService", () => ({
  DictionaryService: {
    getResourceCategoryById: vi.fn(),
  },
}));

describe("WorkerOrderService", () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    transactionMock.mockReset();
  });

  describe("getPendingOrders", () => {
    it("zwraca listę oczekujących zleceń z paginacją", async () => {
      const rows = resultArray([
        { id: 1, status: "PENDING", priority: "NORMAL", hasPhotos: false, hasNotes: false },
      ]);
      // Chain: .select().from().leftJoin().where().orderBy().limit().offset()
      // Terminal: offset
      const chain = {
        from: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        offset: vi.fn(() => rows),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerOrderService } = await import("./WorkerOrderService");
      const result = await WorkerOrderService.getPendingOrders(1, 1, { offset: 0, limit: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(chain.offset).toHaveBeenCalledWith(0);
    });

    it("używa domyślnych wartości offset=0, limit=50", async () => {
      const rows = resultArray([]);
      const chain = {
        from: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        offset: vi.fn(() => rows),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerOrderService } = await import("./WorkerOrderService");
      await WorkerOrderService.getPendingOrders(1, 1);

      expect(chain.limit).toHaveBeenCalledWith(50);
      expect(chain.offset).toHaveBeenCalledWith(0);
    });
  });

  describe("acceptOrder", () => {
    it("rzuca błąd gdy zlecenie nie istnieje", async () => {
      const emptyResult = resultArray([]);
      // Chain: .select().from().where()
      // Terminal: where (acceptOrder nie ma .limit() — patrz linia 64-73 serwisu)
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => emptyResult),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerOrderService } = await import("./WorkerOrderService");
      await expect(WorkerOrderService.acceptOrder(1, 1, 999)).rejects.toThrow("order_not_found");
    });

    it("rzuca błąd gdy aktywna sesja", async () => {
      const orderRow = {
        id: 1,
        userId: 1,
        companyId: 1,
        status: "PENDING",
        resourceId: 1,
        customerId: 1,
        customerLocationId: null,
        dueDate: null,
        expectedDurationHours: null,
        categoryId: 1,
      };
      const orderResult = resultArray([orderRow]);
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => orderResult),
      };
      selectMock.mockReturnValue(chain);

      const { ScheduleConflictService } = await import("@/services/ScheduleConflictService");
      vi.mocked(ScheduleConflictService.hasActiveWorkerSession).mockResolvedValue(true);

      const { WorkerOrderService } = await import("./WorkerOrderService");
      await expect(WorkerOrderService.acceptOrder(1, 1, 1)).rejects.toThrow("session_active");
    });

    it("wykonuje transakcję przy akceptacji zlecenia", async () => {
      const orderRow = {
        id: 1,
        userId: 1,
        companyId: 1,
        status: "PENDING",
        resourceId: 1,
        customerId: 1,
        customerLocationId: null,
        dueDate: null,
        expectedDurationHours: null,
        categoryId: 1,
      };
      const orderResult = resultArray([orderRow]);
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => orderResult),
      };
      selectMock.mockReturnValue(chain);

      const { ScheduleConflictService } = await import("@/services/ScheduleConflictService");
      vi.mocked(ScheduleConflictService.hasActiveWorkerSession).mockResolvedValue(false);
      vi.mocked(ScheduleConflictService.hasActiveResourceSession).mockResolvedValue(false);

      // Mock transaction - wykonuje callback z tx
      // tx.update(workOrders).set({...}).where(eq(...))  → where terminalem (Promise<void>)
      // tx.insert(workSessions).values({...}).returning() → returning terminalem (resultArray)
      const txWhere = vi.fn().mockResolvedValue(undefined);
      const txSet = vi.fn().mockReturnValue({ where: txWhere });
      const txUpdate = vi.fn().mockReturnValue({ set: txSet });

      const txReturning = vi.fn().mockReturnValue(resultArray([{ id: 100 }]));
      const txValues = vi.fn().mockReturnValue({ returning: txReturning });
      const txInsert = vi.fn().mockReturnValue({ values: txValues });

      const tx = { update: txUpdate, insert: txInsert };
      transactionMock.mockImplementation(async (cb: (tx: unknown) => Promise<number>) => cb(tx));

      const { WorkerOrderService } = await import("./WorkerOrderService");
      const sessionId = await WorkerOrderService.acceptOrder(1, 1, 1, { lat: 50.1, lng: 20.1 });

      expect(sessionId).toBe(100);
      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(txUpdate).toHaveBeenCalled();
      expect(txSet).toHaveBeenCalled();
      expect(txWhere).toHaveBeenCalled();
      expect(txInsert).toHaveBeenCalled();
      expect(txValues).toHaveBeenCalled();
      expect(txReturning).toHaveBeenCalled();
    });
  });

  describe("createOwnOrder", () => {
    it("rzuca błąd gdy brak wymaganych pól", async () => {
      const { WorkerOrderService } = await import("./WorkerOrderService");
      await expect(WorkerOrderService.createOwnOrder(1, 1, {})).rejects.toThrow("missing_fields");
    });

    it("rzuca błąd gdy brak uprawnień", async () => {
      // Chain: .select().from().where().limit()
      // Terminal: limit (createOwnOrder ma .limit(1) — patrz linia 165-169 serwisu)
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([{ canCreateOwnOrders: false }])),
      };
      selectMock.mockReturnValue(chain);

      const { WorkerOrderService } = await import("./WorkerOrderService");
      await expect(
        WorkerOrderService.createOwnOrder(1, 1, { categoryId: 1, resourceId: 1 })
      ).rejects.toThrow("forbidden");
    });

    it("tworzy zlecenie gdy użytkownik ma uprawnienia", async () => {
      // Pierwsze zapytanie: SELECT sprawdza uprawnienia
      // Chain: .select().from().where().limit() — terminal: limit
      const userChain = {
        from: vi.fn(() => userChain),
        where: vi.fn(() => userChain),
        limit: vi.fn(() => resultArray([{ canCreateOwnOrders: true }])),
      };
      // Drugie zapytanie: assertResourceBelongsToCompany — .select().from().where().limit()
      const resourceChain = {
        from: vi.fn(() => resourceChain),
        where: vi.fn(() => resourceChain),
        limit: vi.fn(() => resultArray([{ id: 1, companyId: 1 }])),
      };
      selectMock.mockReturnValueOnce(userChain).mockReturnValueOnce(resourceChain);

      const { ScheduleConflictService } = await import("@/services/ScheduleConflictService");
      vi.mocked(ScheduleConflictService.hasActiveWorkerSession).mockResolvedValue(false);
      vi.mocked(ScheduleConflictService.hasActiveResourceSession).mockResolvedValue(false);

      const { DictionaryService } = await import("@/services/DictionaryService");
      vi.mocked(DictionaryService.getResourceCategoryById).mockResolvedValue({
        id: 1,
        name: "Test",
        isGroup: false,
        companyId: 1,
        parentId: null,
        sortOrder: 0,
        icon: null,
        showCustomer: false,
        showMaterial: false,
        showQuantity: false,
        showTaskDescription: false,
        showResourceName: false,
        showResourceDescription: false,
        showRegistrationNumber: false,
        reqCustomer: false,
        reqMaterial: false,
        reqQuantity: false,
        reqTaskDescription: false,
        isGlobal: false,
        isStationary: false,
        color: null,
        orderType: "machine_work",
      });

      // Drugie zapytanie: INSERT ... VALUES ... RETURNING
      // Chain: .insert().values().returning() — terminal: returning
      const returningResult = resultArray([{ id: 42 }]);
      const insertChain = {
        values: vi.fn(() => ({ returning: vi.fn(() => returningResult) })),
      };
      insertMock.mockReturnValue(insertChain);

      const { WorkerOrderService } = await import("./WorkerOrderService");
      const orderId = await WorkerOrderService.createOwnOrder(1, 1, {
        categoryId: 1,
        resourceId: 1,
        priority: "NORMAL",
      });

      expect(orderId).toBe(42);
      expect(insertMock).toHaveBeenCalledTimes(1);
    });
  });
});
