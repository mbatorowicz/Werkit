import { describe, expect, it } from "vitest";
import {
  NON_WORKER_PERMISSION_FLAGS,
  applyWorkerPermissionsToUpdate,
  normalizeAppRole,
  workerPermissionsFromBody,
} from "@/lib/workerUserPermissions";

describe("workerUserPermissions", () => {
  it("normalizes roles", () => {
    expect(normalizeAppRole("admin")).toBe("admin");
    expect(normalizeAppRole("viewer")).toBe("viewer");
    expect(normalizeAppRole("worker")).toBe("worker");
    expect(normalizeAppRole("other")).toBe("worker");
  });

  it("maps worker flags from body", () => {
    expect(
      workerPermissionsFromBody("worker", {
        canCreateOwnOrders: true,
        canEditRoute: false,
        canCreateCustomers: true,
      })
    ).toEqual({
      canCreateOwnOrders: true,
      canEditRoute: false,
      canCreateCustomers: true,
    });
  });

  it("clears worker flags for non-worker roles", () => {
    expect(workerPermissionsFromBody("admin", { canCreateOwnOrders: true })).toEqual(
      NON_WORKER_PERMISSION_FLAGS
    );
  });

  it("applies flags to update payload", () => {
    const updateData: Record<string, unknown> = { role: "worker" };
    applyWorkerPermissionsToUpdate(updateData, "worker", {
      canCreateOwnOrders: false,
      canEditRoute: true,
      canCreateCustomers: false,
    });
    expect(updateData).toMatchObject({
      canCreateOwnOrders: false,
      canEditRoute: true,
      canCreateCustomers: false,
    });
  });
});
