import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("@/db/schema", () => ({
  resourceGroups: {
    id: "id",
    companyId: "companyId",
    name: "name",
    description: "description",
    sortOrder: "sortOrder",
  },
  resources: {
    id: "id",
    companyId: "companyId",
    resourceGroupId: "resourceGroupId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  asc: (col: unknown) => col,
  sql: (strings: TemplateStringsArray) => strings.join(""),
}));

import { ResourceGroupService } from "./ResourceGroupService";

function resultArray<T>(items: T[]): T[] & Promise<T[]> {
  const promise = Promise.resolve(items);
  const arr = items.slice() as T[] & Promise<T[]>;
  arr.then = promise.then.bind(promise);
  arr.catch = promise.catch.bind(promise);
  return arr;
}

describe("ResourceGroupService — tenant resourceCount", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("getGroup zlicza tylko maszyny z companyId grupy", async () => {
    const group = {
      id: 4,
      companyId: 2,
      name: "Koparki",
      description: null,
      sortOrder: 0,
    };
    const groupChain = {
      from: vi.fn(() => groupChain),
      where: vi.fn(() => groupChain),
      limit: vi.fn(() => resultArray([group])),
    };
    const countChain = {
      from: vi.fn(() => countChain),
      where: vi.fn(() => resultArray([{ count: 0 }])),
    };
    selectMock.mockReturnValueOnce(groupChain).mockReturnValueOnce(countChain);

    const result = await ResourceGroupService.getGroup(2, 4);
    expect(result).not.toBeNull();
    expect(result!.resourceCount).toBe(0);
    expect(countChain.where).toHaveBeenCalled();
  });
});
