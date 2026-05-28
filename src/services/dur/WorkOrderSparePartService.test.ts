// ============================================================
// Werkit — Testy: WorkOrderSparePartService
// ============================================================

import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Strategia: mockujemy db.select / db.insert / db.update / db.delete.
 * Każda z tych metod zwraca chainable obiekt naśladujący Drizzle Query Builder.
 *
 * Chain builder:
 * - Metody pośrednie (from, innerJoin, where, orderBy, limit) zwracają chain.
 * - Metoda terminalna (ostatnia w chainie) zwraca thenable+iterable (tablica).
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
const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

vi.mock("@/db/schema", () => ({
  workOrderSpareParts: {
    id: "id",
    workOrderId: "workOrderId",
    partId: "partId",
    quantity: "quantity",
    unitPrice: "unitPrice",
    notes: "notes",
  },
  spareParts: {
    id: "id",
    name: "name",
    catalogNumber: "catalogNumber",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
}));

describe("WorkOrderSparePartService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
  });

  describe("getPartsForOrder", () => {
    it("zwraca pusta liste dla zlecenia bez czesci", async () => {
      const chain = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { WorkOrderSparePartService } = await import("./WorkOrderSparePartService");
      const result = await WorkOrderSparePartService.getPartsForOrder(1);

      expect(result).toEqual([]);
      expect(selectMock).toHaveBeenCalledTimes(1);
    });

    it("zwraca liste czesci dla zlecenia", async () => {
      const mockParts = [
        { id: 1, workOrderId: 1, partId: 10, partName: "SKF 6205", partSku: "6205-2RS", quantity: "2", unitPrice: "45.50", notes: null },
        { id: 2, workOrderId: 1, partId: 11, partName: "FAG 6305", partSku: "6305-C3", quantity: "1", unitPrice: "32.00", notes: "szybka dostawa" },
      ];
      const chain = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => resultArray(mockParts)),
      };
      selectMock.mockReturnValue(chain);

      const { WorkOrderSparePartService } = await import("./WorkOrderSparePartService");
      const result = await WorkOrderSparePartService.getPartsForOrder(1);

      expect(result).toHaveLength(2);
      expect(result[0].partName).toBe("SKF 6205");
      expect(result[1].partName).toBe("FAG 6305");
      expect(result[0].quantity).toBe("2");
    });
  });

  describe("addPartToOrder", () => {
    it("dodaje czesc do zlecenia z domyslna iloscia 1", async () => {
      const inserted = { id: 1, workOrderId: 1, partId: 10, quantity: "1", unitPrice: null, notes: null };
      const chain = {
        values: vi.fn(() => ({ returning: vi.fn(() => resultArray([inserted])) })),
      };
      insertMock.mockReturnValue(chain);

      const { WorkOrderSparePartService } = await import("./WorkOrderSparePartService");
      const result = await WorkOrderSparePartService.addPartToOrder(1, { partId: 10 });

      expect(result.id).toBe(1);
      expect(result.quantity).toBe("1");
      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    it("dodaje czesc z podana iloscia i cena", async () => {
      const inserted = { id: 2, workOrderId: 1, partId: 11, quantity: "3", unitPrice: "25.00", notes: "oryginal" };
      const chain = {
        values: vi.fn(() => ({ returning: vi.fn(() => resultArray([inserted])) })),
      };
      insertMock.mockReturnValue(chain);

      const { WorkOrderSparePartService } = await import("./WorkOrderSparePartService");
      const result = await WorkOrderSparePartService.addPartToOrder(1, {
        partId: 11,
        quantity: "3",
        unitPrice: "25.00",
        notes: "oryginal",
      });

      expect(result.quantity).toBe("3");
      expect(result.unitPrice).toBe("25.00");
      expect(result.notes).toBe("oryginal");
    });
  });

  describe("updatePartInOrder", () => {
    it("aktualizuje ilosc czesci w zleceniu", async () => {
      const updated = { id: 1, workOrderId: 1, partId: 10, quantity: "5", unitPrice: null, notes: null };
      const chain = {
        set: vi.fn(() => chain),
        where: vi.fn(() => ({ returning: vi.fn(() => resultArray([updated])) })),
      };
      updateMock.mockReturnValue(chain);

      const { WorkOrderSparePartService } = await import("./WorkOrderSparePartService");
      const result = await WorkOrderSparePartService.updatePartInOrder(1, { quantity: "5" });

      expect(result.quantity).toBe("5");
    });

    it("aktualizuje cene i notatki", async () => {
      const updated = { id: 1, workOrderId: 1, partId: 10, quantity: "2", unitPrice: "50.00", notes: "zmiana ceny" };
      const chain = {
        set: vi.fn(() => chain),
        where: vi.fn(() => ({ returning: vi.fn(() => resultArray([updated])) })),
      };
      updateMock.mockReturnValue(chain);

      const { WorkOrderSparePartService } = await import("./WorkOrderSparePartService");
      const result = await WorkOrderSparePartService.updatePartInOrder(1, {
        unitPrice: "50.00",
        notes: "zmiana ceny",
      });

      expect(result.unitPrice).toBe("50.00");
      expect(result.notes).toBe("zmiana ceny");
    });
  });

  describe("removePartFromOrder", () => {
    it("usuwa czesc ze zlecenia i zwraca ja", async () => {
      const deleted = { id: 1, workOrderId: 1, partId: 10, quantity: "1", unitPrice: null, notes: null };
      const chain = {
        where: vi.fn(() => ({ returning: vi.fn(() => resultArray([deleted])) })),
      };
      deleteMock.mockReturnValue(chain);

      const { WorkOrderSparePartService } = await import("./WorkOrderSparePartService");
      const result = await WorkOrderSparePartService.removePartFromOrder(1);

      expect(result.id).toBe(1);
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("assertPartBelongsToOrder", () => {
    it("zwraca true gdy czesc nalezy do zlecenia", async () => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([{ id: 1 }])),
      };
      selectMock.mockReturnValue(chain);

      const { WorkOrderSparePartService } = await import("./WorkOrderSparePartService");
      const result = await WorkOrderSparePartService.assertPartBelongsToOrder(1, 42);

      expect(result).toBe(true);
    });

    it("zwraca false gdy czesc nie nalezy do zlecenia", async () => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { WorkOrderSparePartService } = await import("./WorkOrderSparePartService");
      const result = await WorkOrderSparePartService.assertPartBelongsToOrder(999, 42);

      expect(result).toBe(false);
    });
  });
});
