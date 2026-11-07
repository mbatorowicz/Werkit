import { expect, it, vi } from "vitest";

vi.mock("./WorkerClient", () => ({ default: () => null }));
vi.mock("@/lib/livePrincipal", () => ({
  requireLiveCompanyPrincipalOrRedirect: async () => ({ userId: 1, companyId: 1 }),
}));
vi.mock("@/services/WorkerOrderService", () => ({
  WorkerOrderService: { getPendingOrders: async () => [] },
}));
vi.mock("@/services/DelegationScopeService", () => ({
  DelegationScopeService: { hasDelegationRights: async () => false },
}));
vi.mock("@/services/WorkerSessionService", () => ({
  WorkerSessionService: {
    getActiveSessionWithDetails: async () => ({
      session: {
        id: 7,
        startTime: new Date("2026-11-07T08:00:00Z"),
        status: "active",
        categoryId: 2,
        workOrderId: 12,
        orderType: "machine_repair",
        repairDescription: "Wymiana łożyska",
        resourceGroupId: 3,
      },
      settings: { durEnabled: true },
      user: { isDurWorker: true },
      events: [],
      notes: [],
    }),
  },
}));

import WorkerPage from "./page";

it("preserves the repair context on the first server render after restart", async () => {
  const page = await WorkerPage();
  expect(page.props.initialData.session).toMatchObject({
    id: 7,
    workOrderId: 12,
    orderType: "machine_repair",
    repairDescription: "Wymiana łożyska",
    resourceGroupId: 3,
  });
});
