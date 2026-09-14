import { describe, expect, it } from "vitest";
import { buildAdminNavLinks } from "@/components/Admin/adminNavLinks";
import { adminRoutes } from "@/lib/appRoutes";
import { plDict } from "@/test/renderWithProviders";

function routeHrefs(durEnabled: boolean): string[] {
  return buildAdminNavLinks(plDict.admin, plDict.dur, { durEnabled })
    .filter((item): item is Extract<typeof item, { kind: "route" }> => item.kind === "route")
    .map((item) => item.href);
}

describe("buildAdminNavLinks", () => {
  it("zawsze pokazuje zasoby, a magazyn części tylko przy durEnabled", () => {
    const withoutDur = routeHrefs(false);
    const withDur = routeHrefs(true);

    expect(withoutDur).toContain(adminRoutes.machines);
    expect(withoutDur).not.toContain(adminRoutes.dur.warehouse);
    expect(withDur).toContain(adminRoutes.machines);
    expect(withDur).toContain(adminRoutes.dur.warehouse);
  });
});
