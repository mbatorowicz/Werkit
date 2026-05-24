import { describe, expect, it, vi, beforeEach } from "vitest";

const selectMock = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("@/db/schema", () => ({
  users: { canEditRoute: "can_edit_route", id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
}));

describe("AdminUserService.userCanEditRoute", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("zwraca true gdy użytkownik ma canEditRoute", async () => {
    const limit = vi.fn().mockResolvedValue([{ canEditRoute: true }]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    selectMock.mockReturnValue({ from });

    const { AdminUserService } = await import("./AdminUserService");
    await expect(AdminUserService.userCanEditRoute(42)).resolves.toBe(true);
  });

  it("zwraca false gdy brak rekordu lub flaga wyłączona", async () => {
    const limit = vi.fn().mockResolvedValue([{ canEditRoute: false }]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    selectMock.mockReturnValue({ from });

    const { AdminUserService } = await import("./AdminUserService");
    await expect(AdminUserService.userCanEditRoute(7)).resolves.toBe(false);
  });
});
