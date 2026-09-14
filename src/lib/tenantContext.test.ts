import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {},
}));

import * as tenantContext from "@/lib/tenantContext";
import { isCompanyScopedRole, isSuperadminRole } from "@/lib/tenantContext";
import { isAuthCookieClearLoginReason } from "@/lib/tenantRoles";

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkTsFiles(full));
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

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

  it("nie eksportuje helperów JWT companyId", () => {
    expect("getTenantCompanyId" in tenantContext).toBe(false);
    expect("resolveTenantCompanyId" in tenantContext).toBe(false);
  });

  it("src/app/api nie importuje JWT companyId (żywy principal)", () => {
    const apiRoot = join(process.cwd(), "src/app/api");
    const forbidden = /\b(getTenantCompanyId|resolveTenantCompanyId)\b/;
    const hits: string[] = [];
    for (const file of walkTsFiles(apiRoot)) {
      if (forbidden.test(readFileSync(file, "utf8"))) hits.push(file);
    }
    expect(hits).toEqual([]);
  });

  it("isAuthCookieClearLoginReason czyści cookie przy tenant i session", () => {
    expect(isAuthCookieClearLoginReason("tenant")).toBe(true);
    expect(isAuthCookieClearLoginReason("session")).toBe(true);
    expect(isAuthCookieClearLoginReason(null)).toBe(false);
    expect(isAuthCookieClearLoginReason("other")).toBe(false);
  });
});
