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
  sparePartInventory: {
    companyId: "companyId",
    partId: "partId",
    quantity: "quantity",
    updatedAt: "updatedAt",
  },
  spareParts: {
    id: "id",
    companyId: "companyId",
    name: "name",
    catalogNumber: "catalogNumber",
    unit: "unit",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

describe("InventoryService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
  });

  it("setQuantity odrzuca czesc spoza firmy przed zapisem", async () => {
    const selectChain = {
      from: vi.fn(() => selectChain),
      where: vi.fn(() => selectChain),
      limit: vi.fn(() => Promise.resolve([])),
    };
    selectMock.mockReturnValue(selectChain);

    const { InventoryService } = await import("./InventoryService");
    await expect(InventoryService.setQuantity(1, 99, "5")).rejects.toMatchObject({
      code: "part_not_found",
    });

    expect(insertMock).not.toHaveBeenCalled();
  });
});
