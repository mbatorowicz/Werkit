// ============================================================
// Werkit — Testy: DelegationScopeService
// ============================================================

import { describe, expect, it, vi, beforeEach } from "vitest";

function resultArray<T>(items: T[]): T[] & Promise<T[]> {
  const promise = Promise.resolve(items);
  const arr = items.slice() as T[] & Promise<T[]>;
  arr.then = promise.then.bind(promise);
  arr.catch = promise.catch.bind(promise);
  return arr;
}

const selectMock = vi.fn();

vi.mock("@/db", () => ({
  db: { select: selectMock },
}));

vi.mock("@/db/schema", () => ({
  departments: { id: "id", companyId: "companyId", name: "name", managerId: "managerId" },
  teams: {
    id: "id",
    companyId: "companyId",
    name: "name",
    departmentId: "departmentId",
    leaderId: "leaderId",
  },
  teamMembers: { userId: "userId", teamId: "teamId", role: "role" },
  users: {
    id: "id",
    companyId: "companyId",
    fullName: "fullName",
    role: "role",
    isActive: "isActive",
    reportsToId: "reportsToId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  inArray: (_col: unknown, vals: unknown) => vals,
}));

function mockSelectSequence(results: unknown[][]) {
  let call = 0;
  selectMock.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    const data = results[call] ?? [];
    call += 1;
    const terminal = resultArray(data);
    for (const m of ["from", "innerJoin", "where"]) {
      chain[m] = () => chain;
    }
    chain.from = () => chain;
    chain.innerJoin = () => chain;
    chain.where = () => terminal;
    return chain;
  });
}

describe("DelegationScopeService", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("admin ma zasięg all", async () => {
    const { DelegationScopeService } = await import("./DelegationScopeService");
    const scope = await DelegationScopeService.getDelegatableUserIds(1, 10, "admin");
    expect(scope).toBe("all");
  });

  it("lider zespołu widzi tylko aktywnych workerów z zespołu", async () => {
    mockSelectSequence([
      [{ id: 1, name: "Transport", managerId: null }],
      [{ id: 5, name: "Zmiana A", departmentId: 1, leaderId: 10 }],
      [
        { userId: 20, teamId: 5, teamName: "Zmiana A", departmentName: "Transport", role: "member" },
        { userId: 21, teamId: 5, teamName: "Zmiana A", departmentName: "Transport", role: "member" },
        { userId: 10, teamId: 5, teamName: "Zmiana A", departmentName: "Transport", role: "leader" },
      ],
      [
        { id: 10, fullName: "Lider", role: "worker", isActive: true, reportsToId: null },
        { id: 20, fullName: "Jan", role: "worker", isActive: true, reportsToId: null },
        { id: 21, fullName: "Anna", role: "worker", isActive: false, reportsToId: null },
        { id: 30, fullName: "Obcy", role: "worker", isActive: true, reportsToId: null },
      ],
    ]);

    const { DelegationScopeService } = await import("./DelegationScopeService");
    const scope = await DelegationScopeService.getDelegatableUserIds(1, 10, "worker");
    expect(scope).toEqual([20]);
  });

  it("kierownik działu widzi członków zespołów bezpośrednio w dziale", async () => {
    mockSelectSequence([
      [
        { id: 1, name: "Transport", managerId: 50 },
        { id: 2, name: "Poddział", managerId: null },
      ],
      [
        { id: 5, name: "Zmiana A", departmentId: 1, leaderId: 10 },
        { id: 6, name: "Zmiana B", departmentId: 2, leaderId: 11 },
      ],
      [
        { userId: 20, teamId: 5, teamName: "Zmiana A", departmentName: "Transport", role: "member" },
        { userId: 22, teamId: 6, teamName: "Zmiana B", departmentName: "Poddział", role: "member" },
      ],
      [
        { id: 50, fullName: "Kierownik", role: "viewer", isActive: true, reportsToId: null },
        { id: 20, fullName: "Jan", role: "worker", isActive: true, reportsToId: null },
        { id: 22, fullName: "Piotr", role: "worker", isActive: true, reportsToId: null },
      ],
    ]);

    const { DelegationScopeService } = await import("./DelegationScopeService");
    const scope = await DelegationScopeService.getDelegatableUserIds(1, 50, "viewer");
    expect(scope).toEqual([20]);
  });

  it("assertCanDelegateTo rzuca forbidden poza zasięgiem", async () => {
    mockSelectSequence([
      [],
      [{ id: 5, name: "Zmiana A", departmentId: 1, leaderId: 10 }],
      [],
      [{ id: 10, fullName: "Lider", role: "worker", isActive: true, reportsToId: null }],
    ]);

    const { DelegationScopeService } = await import("./DelegationScopeService");
    await expect(
      DelegationScopeService.assertCanDelegateTo(1, 10, "worker", 99)
    ).rejects.toThrow("forbidden");
  });

  it("hasDelegationRights true dla lidera", async () => {
    mockSelectSequence([
      [],
      [{ id: 5, name: "Zmiana A", departmentId: 1, leaderId: 10 }],
      [],
      [{ id: 10, fullName: "Lider", role: "worker", isActive: true, reportsToId: null }],
    ]);

    const { DelegationScopeService } = await import("./DelegationScopeService");
    expect(await DelegationScopeService.hasDelegationRights(1, 10)).toBe(true);
    expect(await DelegationScopeService.hasDelegationRights(1, 99)).toBe(false);
  });
});
