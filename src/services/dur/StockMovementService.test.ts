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
  sparePartInventory: { companyId: "companyId", partId: "partId", quantity: "quantity" },
  stockReceipts: { id: "id" },
  stockIssues: { id: "id" },
  spareParts: { id: "id", companyId: "companyId", name: "name", catalogNumber: "catalogNumber" },
  users: { id: "id", fullName: "fullName" },
  workOrders: { id: "id", taskDescription: "taskDescription", resourceId: "resourceId" },
  resources: { id: "id", name: "name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
}));

vi.mock("drizzle-orm/pg-core", () => ({
  alias: (table: unknown, name: string) => ({ table, name }),
}));

describe("StockMovementService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
  });

  it("addReceipt odrzuca czesc spoza firmy przed insertem", async () => {
    const selectChain = {
      from: vi.fn(() => selectChain),
      where: vi.fn(() => selectChain),
      limit: vi.fn(() => Promise.resolve([])),
    };
    selectMock.mockReturnValue(selectChain);

    const { StockMovementService } = await import("./StockMovementService");
    await expect(
      StockMovementService.addReceipt(1, 2, { partId: 99, quantity: "1" })
    ).rejects.toMatchObject({ code: "part_not_found" });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("addIssue odrzuca czesc spoza firmy przed sprawdzeniem stanu", async () => {
    const selectChain = {
      from: vi.fn(() => selectChain),
      where: vi.fn(() => selectChain),
      limit: vi.fn(() => Promise.resolve([])),
    };
    selectMock.mockReturnValue(selectChain);

    const { StockMovementService } = await import("./StockMovementService");
    await expect(
      StockMovementService.addIssue(1, 2, { partId: 99, quantity: "1" })
    ).rejects.toMatchObject({ code: "part_not_found" });

    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
