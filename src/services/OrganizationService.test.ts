// ============================================================
// Werkit — Testy: OrganizationService
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
  departments: {
    id: "id",
    companyId: "companyId",
    name: "name",
    parentId: "parentId",
    managerId: "managerId",
    sortOrder: "sortOrder",
  },
  teams: {
    id: "id",
    companyId: "companyId",
    departmentId: "departmentId",
    name: "name",
    leaderId: "leaderId",
    sortOrder: "sortOrder",
  },
  teamMembers: {
    id: "id",
    teamId: "teamId",
    userId: "userId",
    role: "role",
    joinedAt: "joinedAt",
  },
  users: {
    id: "id",
    fullName: "fullName",
    usernameEmail: "usernameEmail",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
}));

describe("OrganizationService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
  });

  // ==================== DEPARTAMENTY ====================

  describe("getDepartments", () => {
    it("zwraca pusta liste dla firmy bez departamentow", async () => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getDepartments(1);

      expect(result).toEqual([]);
    });

    it("zwraca liste departamentow firmy", async () => {
      const mockDepts = [
        { id: 1, companyId: 1, name: "Transport", parentId: null, managerId: 1, sortOrder: 0 },
        { id: 2, companyId: 1, name: "Warsztat", parentId: null, managerId: 2, sortOrder: 1 },
      ];
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => resultArray(mockDepts)),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getDepartments(1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Transport");
      expect(result[1].name).toBe("Warsztat");
    });
  });

  describe("getDepartment", () => {
    it("zwraca null gdy departament nie istnieje", async () => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getDepartment(1, 999);

      expect(result).toBeNull();
    });

    it("zwraca departament po ID", async () => {
      const dept = {
        id: 1,
        companyId: 1,
        name: "Transport",
        parentId: null,
        managerId: 1,
        sortOrder: 0,
      };
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([dept])),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getDepartment(1, 1);

      expect(result).not.toBeNull();
      expect(result!.name).toBe("Transport");
    });
  });

  describe("createDepartment", () => {
    it("tworzy nowy departament", async () => {
      const inserted = {
        id: 1,
        companyId: 1,
        name: "Administracja",
        parentId: null,
        managerId: null,
        sortOrder: 0,
      };
      const chain = {
        values: vi.fn(() => ({ returning: vi.fn(() => resultArray([inserted])) })),
      };
      insertMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.createDepartment(1, { name: "Administracja" });

      expect(result.id).toBe(1);
      expect(result.name).toBe("Administracja");
    });

    it("tworzy departament z parentId i managerId", async () => {
      const inserted = {
        id: 2,
        companyId: 1,
        name: "Serwis mobilny",
        parentId: 1,
        managerId: 3,
        sortOrder: 0,
      };
      const chain = {
        values: vi.fn(() => ({ returning: vi.fn(() => resultArray([inserted])) })),
      };
      insertMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.createDepartment(1, {
        name: "Serwis mobilny",
        parentId: 1,
        managerId: 3,
      });

      expect(result.parentId).toBe(1);
      expect(result.managerId).toBe(3);
    });
  });

  describe("updateDepartment", () => {
    it("aktualizuje nazwe departamentu", async () => {
      const updated = {
        id: 1,
        companyId: 1,
        name: "Transport i logistyka",
        parentId: null,
        managerId: 1,
        sortOrder: 0,
      };
      const chain = {
        set: vi.fn(() => chain),
        where: vi.fn(() => ({ returning: vi.fn(() => resultArray([updated])) })),
      };
      updateMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.updateDepartment(1, {
        name: "Transport i logistyka",
      });

      expect(result.name).toBe("Transport i logistyka");
    });
  });

  describe("deleteDepartment", () => {
    it("usuwa departament", async () => {
      const deleted = {
        id: 1,
        companyId: 1,
        name: "Transport",
        parentId: null,
        managerId: 1,
        sortOrder: 0,
      };
      const chain = {
        where: vi.fn(() => ({ returning: vi.fn(() => resultArray([deleted])) })),
      };
      deleteMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.deleteDepartment(1);

      expect(result.id).toBe(1);
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== ZESPOŁY ====================

  describe("getTeams", () => {
    it("zwraca liste zespolow firmy przez join z departamentami", async () => {
      const mockRows = [
        {
          teams: {
            id: 1,
            companyId: 1,
            departmentId: 1,
            name: "Zmiana A",
            leaderId: 1,
            sortOrder: 0,
          },
        },
        {
          teams: {
            id: 2,
            companyId: 1,
            departmentId: 1,
            name: "Zmiana B",
            leaderId: 2,
            sortOrder: 1,
          },
        },
      ];
      // .where() zwraca thenable — serwis woła .then() na wyniku where
      const whereResult = {
        then: (fn: (rows: typeof mockRows) => unknown) => Promise.resolve(fn(mockRows)),
      };
      const chain = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        where: vi.fn(() => whereResult),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getTeams(1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Zmiana A");
    });
  });

  describe("getTeamsByDepartment", () => {
    it("zwraca zespoły dla danego departamentu", async () => {
      const mockTeams = [
        { id: 1, companyId: 1, departmentId: 1, name: "Zmiana A", leaderId: 1, sortOrder: 0 },
      ];
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => resultArray(mockTeams)),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getTeamsByDepartment(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Zmiana A");
    });
  });

  describe("getTeam", () => {
    it("zwraca null gdy zespol nie istnieje", async () => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getTeam(999);

      expect(result).toBeNull();
    });

    it("zwraca zespol po ID", async () => {
      const team = {
        id: 1,
        companyId: 1,
        departmentId: 1,
        name: "Zmiana A",
        leaderId: 1,
        sortOrder: 0,
      };
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => resultArray([team])),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getTeam(1);

      expect(result).not.toBeNull();
      expect(result!.name).toBe("Zmiana A");
    });
  });

  describe("createTeam", () => {
    it("tworzy nowy zespol", async () => {
      const inserted = {
        id: 1,
        companyId: 1,
        departmentId: 1,
        name: "Zmiana C",
        leaderId: null,
        sortOrder: 0,
      };
      const chain = {
        values: vi.fn(() => ({ returning: vi.fn(() => resultArray([inserted])) })),
      };
      insertMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.createTeam(1, { departmentId: 1, name: "Zmiana C" });

      expect(result.id).toBe(1);
      expect(result.name).toBe("Zmiana C");
    });
  });

  describe("updateTeam", () => {
    it("aktualizuje lidera zespolu", async () => {
      const updated = {
        id: 1,
        companyId: 1,
        departmentId: 1,
        name: "Zmiana A",
        leaderId: 5,
        sortOrder: 0,
      };
      const chain = {
        set: vi.fn(() => chain),
        where: vi.fn(() => ({ returning: vi.fn(() => resultArray([updated])) })),
      };
      updateMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.updateTeam(1, { leaderId: 5 });

      expect(result.leaderId).toBe(5);
    });
  });

  describe("deleteTeam", () => {
    it("usuwa zespol", async () => {
      const deleted = {
        id: 1,
        companyId: 1,
        departmentId: 1,
        name: "Zmiana A",
        leaderId: 1,
        sortOrder: 0,
      };
      const chain = {
        where: vi.fn(() => ({ returning: vi.fn(() => resultArray([deleted])) })),
      };
      deleteMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.deleteTeam(1);

      expect(result.id).toBe(1);
    });
  });

  // ==================== CZŁONKOWIE ZESPOŁU ====================

  describe("getTeamMembersWithUsers", () => {
    it("zwraca członków zespołu z danymi użytkownika", async () => {
      const mockRows = [
        {
          id: 1,
          teamId: 1,
          userId: 10,
          role: "leader",
          joinedAt: new Date("2026-01-01"),
          user: { id: 10, fullName: "Jan Kowalski", usernameEmail: "jan@test.pl" },
        },
        {
          id: 2,
          teamId: 1,
          userId: 11,
          role: "member",
          joinedAt: new Date("2026-02-01"),
          user: { id: 11, fullName: "Anna Nowak", usernameEmail: "anna@test.pl" },
        },
      ];
      const chain = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        where: vi.fn(() => resultArray(mockRows)),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getTeamMembersWithUsers(1);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe("leader");
      expect(result[0].user.fullName).toBe("Jan Kowalski");
      expect(result[1].user.fullName).toBe("Anna Nowak");
    });

    it("zwraca pusta liste gdy zespol nie ma czlonkow", async () => {
      const chain = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        where: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getTeamMembersWithUsers(999);

      expect(result).toEqual([]);
    });
  });

  describe("addTeamMember", () => {
    it("dodaje czlonka do zespolu z domyslna rola", async () => {
      const inserted = { id: 1, teamId: 1, userId: 10, role: "member", joinedAt: new Date() };
      const chain = {
        values: vi.fn(() => ({ returning: vi.fn(() => resultArray([inserted])) })),
      };
      insertMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.addTeamMember({ teamId: 1, userId: 10 });

      expect(result.role).toBe("member");
    });

    it("dodaje czlonka z okreslona rola", async () => {
      const inserted = { id: 2, teamId: 1, userId: 11, role: "leader", joinedAt: new Date() };
      const chain = {
        values: vi.fn(() => ({ returning: vi.fn(() => resultArray([inserted])) })),
      };
      insertMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.addTeamMember({
        teamId: 1,
        userId: 11,
        role: "leader",
      });

      expect(result.role).toBe("leader");
    });
  });

  describe("updateTeamMember", () => {
    it("aktualizuje role czlonka", async () => {
      const updated = { id: 1, teamId: 1, userId: 10, role: "leader", joinedAt: new Date() };
      const chain = {
        set: vi.fn(() => chain),
        where: vi.fn(() => ({ returning: vi.fn(() => resultArray([updated])) })),
      };
      updateMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.updateTeamMember(1, { role: "leader" });

      expect(result.role).toBe("leader");
    });
  });

  describe("removeTeamMember", () => {
    it("usuwa czlonka z zespolu", async () => {
      const deleted = { id: 1, teamId: 1, userId: 10, role: "member", joinedAt: new Date() };
      const chain = {
        where: vi.fn(() => ({ returning: vi.fn(() => resultArray([deleted])) })),
      };
      deleteMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.removeTeamMember(1);

      expect(result.id).toBe(1);
    });
  });

  describe("getUserTeams", () => {
    it("zwraca zespoły użytkownika z departamentami", async () => {
      const mockRows = [
        {
          team: {
            id: 1,
            companyId: 1,
            departmentId: 1,
            name: "Zmiana A",
            leaderId: 1,
            sortOrder: 0,
          },
          department: {
            id: 1,
            companyId: 1,
            name: "Transport",
            parentId: null,
            managerId: 1,
            sortOrder: 0,
          },
        },
      ];
      const chain = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        where: vi.fn(() => resultArray(mockRows)),
      };
      // Potrzebujemy dwóch innerJoin — mock zwraca chain za każdym razem
      chain.innerJoin = vi.fn(() => chain);
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getUserTeams(10);

      expect(result).toHaveLength(1);
      expect(result[0].team.name).toBe("Zmiana A");
      expect(result[0].department.name).toBe("Transport");
    });

    it("zwraca pusta liste gdy uzytkownik nie nalezy do zadnego zespolu", async () => {
      const chain = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        where: vi.fn(() => resultArray([])),
      };
      selectMock.mockReturnValue(chain);

      const { OrganizationService } = await import("./OrganizationService");
      const result = await OrganizationService.getUserTeams(999);

      expect(result).toEqual([]);
    });
  });
});
