import { describe, it, expect, vi, beforeEach } from "vitest";

const getActiveWorkOrdersMock = vi.fn();
const getInProgressSessionsMock = vi.fn();
const getCompletedArchiveSessionsMock = vi.fn();
const getAllUsersMock = vi.fn();
const getDelegatableWorkersMock = vi.fn();
const getResourcesMock = vi.fn();
const getMaterialsMock = vi.fn();
const getMaterialCategoriesMock = vi.fn();
const getCustomersMock = vi.fn();
const getCategoriesMock = vi.fn();

vi.mock("@/services/AdminOrderService", () => ({
  AdminOrderService: {
    getActiveWorkOrders: (...args: unknown[]) => getActiveWorkOrdersMock(...args),
    getInProgressSessions: (...args: unknown[]) => getInProgressSessionsMock(...args),
    getCompletedArchiveSessions: (...args: unknown[]) => getCompletedArchiveSessionsMock(...args),
  },
}));

vi.mock("@/services/AdminUserService", () => ({
  AdminUserService: {
    getAllUsers: (...args: unknown[]) => getAllUsersMock(...args),
  },
}));

vi.mock("@/services/DelegationScopeService", () => ({
  DelegationScopeService: {
    getDelegatableWorkers: (...args: unknown[]) => getDelegatableWorkersMock(...args),
  },
}));

vi.mock("@/services/DictionaryService", () => ({
  DictionaryService: {
    getResources: (...args: unknown[]) => getResourcesMock(...args),
    getMaterials: (...args: unknown[]) => getMaterialsMock(...args),
    getMaterialCategories: (...args: unknown[]) => getMaterialCategoriesMock(...args),
    getCustomers: (...args: unknown[]) => getCustomersMock(...args),
    getCategories: (...args: unknown[]) => getCategoriesMock(...args),
  },
}));

describe("AdminDispatchService", () => {
  beforeEach(() => {
    vi.resetModules();
    getActiveWorkOrdersMock.mockReset();
    getInProgressSessionsMock.mockReset();
    getCompletedArchiveSessionsMock.mockReset();
    getAllUsersMock.mockReset();
    getDelegatableWorkersMock.mockReset();
    getResourcesMock.mockReset();
    getMaterialsMock.mockReset();
    getMaterialCategoriesMock.mockReset();
    getCustomersMock.mockReset();
    getCategoriesMock.mockReset();
  });

  it("getBootstrap łączy słowniki i dane live równolegle", async () => {
    getAllUsersMock.mockResolvedValue([{ id: 1, fullName: "Jan" }]);
    getResourcesMock.mockResolvedValue([{ id: 10, name: "Koparka" }]);
    getMaterialsMock.mockResolvedValue([{ id: 20, name: "Piasek", unit: "t" }]);
    getMaterialCategoriesMock.mockResolvedValue([{ id: 30, name: "Kruszywo", color: "#fff" }]);
    getCustomersMock.mockResolvedValue([{ id: 40, firstName: "A", lastName: "B", phone: null }]);
    getCategoriesMock.mockResolvedValue([
      {
        id: 50,
        name: "Budowa",
        showCustomer: true,
        showMaterial: false,
        showQuantity: true,
        showTaskDescription: true,
        reqCustomer: false,
        reqMaterial: false,
        reqQuantity: false,
        reqTaskDescription: false,
        isGlobal: false,
        isStationary: false,
        color: null,
        showResourceName: true,
        showResourceDescription: false,
        showRegistrationNumber: true,
        orderType: "machine_work",
      },
    ]);
    getActiveWorkOrdersMock.mockResolvedValue([{ id: 100, status: "PENDING" }]);
    getInProgressSessionsMock.mockResolvedValue([{ id: 200, status: "IN_PROGRESS" }]);

    const { AdminDispatchService } = await import("./AdminDispatchService");
    const result = await AdminDispatchService.getBootstrap({
      companyId: 1,
      actorUserId: 9,
      actorRole: "admin",
      scopedWorkers: false,
    });

    expect(result.workers).toEqual([{ id: 1, fullName: "Jan" }]);
    expect(result.orders).toHaveLength(1);
    expect(result.liveSessions).toHaveLength(1);
    expect(getMaterialCategoriesMock).toHaveBeenCalledWith(1, { leavesOnly: true });
    expect(getCategoriesMock).toHaveBeenCalledWith(1, { leavesOnly: true });
  });

  it("fetchDispatchWorkers używa delegacji gdy scopedWorkers", async () => {
    getDelegatableWorkersMock.mockResolvedValue([{ id: 2, fullName: "Scoped", orgLabel: "Team" }]);

    const { AdminDispatchService } = await import("./AdminDispatchService");
    const workers = await AdminDispatchService.fetchDispatchWorkers({
      companyId: 1,
      actorUserId: 5,
      actorRole: "worker",
      scopedWorkers: true,
    });

    expect(workers).toHaveLength(1);
    expect(getDelegatableWorkersMock).toHaveBeenCalledWith(1, 5, "worker");
    expect(getAllUsersMock).not.toHaveBeenCalled();
  });
});
