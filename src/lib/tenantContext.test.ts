import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {},
}));

import {
  getTenantCompanyId,
  isCompanyScopedRole,
  isSuperadminRole,
  TenantContextError,
} from "@/lib/tenantContext";

describe("tenantContext", () => {
  it("rozpoznaje superadmina", () => {
    expect(isSuperadminRole("superadmin")).toBe(true);
    expect(isSuperadminRole("admin")).toBe(false);
  });

  it("rozpoznaje role w scope firmy", () => {
    expect(isCompanyScopedRole("admin")).toBe(true);
    expect(isCompanyScopedRole("worker")).toBe(true);
    expect(isCompanyScopedRole("viewer")).toBe(true);
    expect(isCompanyScopedRole("superadmin")).toBe(false);
  });

  it("getTenantCompanyId zwraca companyId z JWT", () => {
    expect(getTenantCompanyId({ userId: 1, role: "worker", companyId: 5 })).toBe(5);
  });

  it("getTenantCompanyId rzuca gdy brak firmy", () => {
    expect(() => getTenantCompanyId({ userId: 1, role: "worker" })).toThrow(TenantContextError);
  });

  it("getTenantCompanyId blokuje superadmina", () => {
    expect(() => getTenantCompanyId({ userId: 1, role: "superadmin", companyId: 1 })).toThrow(
      TenantContextError,
    );
  });
});
