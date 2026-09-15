import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSession = vi.fn();
const resolve = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession: (...args: unknown[]) => getAuthSession(...args),
}));

vi.mock("@/services/AuthPrincipalService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/AuthPrincipalService")>();
  return {
    ...actual,
    AuthPrincipalService: {
      resolve: (...args: unknown[]) => resolve(...args),
    },
  };
});

import {
  requireAdminPanelSession,
  requireCompanyScopedSession,
  requireWorkerCompanySession,
} from "@/lib/apiTenant";
import { requireSuperadminSession } from "@/lib/apiPlatform";
import { guardAdminMutation } from "@/lib/requireAdminMutation";

describe("API tenant / platform — żywy principal", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
    resolve.mockReset();
  });

  it("nieaktywny user → 401", async () => {
    getAuthSession.mockResolvedValue({ userId: 1, role: "admin", companyId: 1 });
    resolve.mockResolvedValue(null);
    const scoped = await requireCompanyScopedSession();
    expect(scoped.ok).toBe(false);
    if (scoped.ok) return;
    expect(scoped.response.status).toBe(401);
  });

  it("żywy worker: companyId i rola z DB, nie z JWT", async () => {
    getAuthSession.mockResolvedValue({ userId: 5, role: "admin", companyId: 1 });
    resolve.mockResolvedValue({
      userId: 5,
      role: "worker",
      companyId: 8,
      fullName: "Ewa",
    });
    const scoped = await requireWorkerCompanySession();
    expect(scoped.ok).toBe(true);
    if (!scoped.ok) return;
    expect(scoped.companyId).toBe(8);
    expect(scoped.session.role).toBe("worker");
  });

  it("superadmin na API firmy → 403 (sesja żywa, zły kontekst)", async () => {
    getAuthSession.mockResolvedValue({ userId: 2, role: "superadmin", companyId: null });
    resolve.mockResolvedValue({
      userId: 2,
      role: "superadmin",
      companyId: null,
      fullName: "Plat",
    });
    const scoped = await requireCompanyScopedSession();
    expect(scoped.ok).toBe(false);
    if (scoped.ok) return;
    expect(scoped.response.status).toBe(403);
  });

  it("requireSuperadminSession wymaga roli superadmin z DB", async () => {
    getAuthSession.mockResolvedValue({ userId: 3, role: "superadmin", companyId: null });
    resolve.mockResolvedValue({
      userId: 3,
      role: "admin",
      companyId: 1,
      fullName: "Demoted",
    });
    const auth = await requireSuperadminSession();
    expect(auth.ok).toBe(false);
    if (auth.ok) return;
    expect(auth.response.status).toBe(403);
  });

  it("requireWorkerCompanySession podczas impersonacji → 403", async () => {
    getAuthSession.mockResolvedValue({
      userId: 10,
      role: "admin",
      companyId: 1,
      impersonatorUserId: 2,
    });
    resolve.mockResolvedValue({
      userId: 10,
      role: "admin",
      companyId: 1,
      fullName: "Anna",
      impersonatorUserId: 2,
    });
    const scoped = await requireWorkerCompanySession();
    expect(scoped.ok).toBe(false);
    if (scoped.ok) return;
    expect(scoped.response.status).toBe(403);
  });

  it("requireAdminPanelSession: worker → 403", async () => {
    getAuthSession.mockResolvedValue({ userId: 9, role: "worker", companyId: 1 });
    resolve.mockResolvedValue({
      userId: 9,
      role: "worker",
      companyId: 1,
      fullName: "Ewa",
    });
    const scoped = await requireAdminPanelSession();
    expect(scoped.ok).toBe(false);
    if (scoped.ok) return;
    expect(scoped.response.status).toBe(403);
  });

  it("requireAdminPanelSession: viewer → ok", async () => {
    getAuthSession.mockResolvedValue({ userId: 8, role: "viewer", companyId: 1 });
    resolve.mockResolvedValue({
      userId: 8,
      role: "viewer",
      companyId: 1,
      fullName: "Ola",
    });
    const scoped = await requireAdminPanelSession();
    expect(scoped.ok).toBe(true);
  });

  it("guardAdminMutation: demotion admin→worker → 403", async () => {
    getAuthSession.mockResolvedValue({ userId: 4, role: "admin", companyId: 1 });
    resolve.mockResolvedValue({
      userId: 4,
      role: "worker",
      companyId: 1,
      fullName: "Jan",
    });
    const denied = await guardAdminMutation();
    expect(denied).toBeDefined();
    expect(denied?.status).toBe(403);
  });
});
