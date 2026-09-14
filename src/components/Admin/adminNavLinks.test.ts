import { describe, expect, it } from "vitest";
import { buildAdminNavLinks } from "@/components/Admin/adminNavLinks";
import { adminRoutes } from "@/lib/appRoutes";
import { plDict } from "@/test/renderWithProviders";

function navItems(durEnabled: boolean) {
  return buildAdminNavLinks(plDict.admin, plDict.dur, { durEnabled });
}

function routeHrefs(durEnabled: boolean): string[] {
  return navItems(durEnabled)
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

  it("stawia materiały i części zamienne obok siebie pod logistyką, bez osobnej sekcji DUR", () => {
    const items = navItems(true);
    const logisticsLabel = plDict.admin.sidebar.logistics;
    const systemLabel = plDict.admin.sidebar.system;
    const ordersSection = plDict.admin.sidebar.ordersAndDispatch;

    expect(items.some((item) => item.kind === "section" && item.label === ordersSection)).toBe(
      false
    );

    const logisticsIdx = items.findIndex(
      (item) => item.kind === "section" && item.label === logisticsLabel
    );
    const systemIdx = items.findIndex(
      (item) => item.kind === "section" && item.label === systemLabel
    );
    expect(logisticsIdx).toBeGreaterThanOrEqual(0);
    expect(systemIdx).toBeGreaterThan(logisticsIdx);

    const logisticsRoutes = items.slice(logisticsIdx + 1, systemIdx).filter(
      (item): item is Extract<(typeof items)[number], { kind: "route" }> => item.kind === "route"
    );

    const materialsIdx = logisticsRoutes.findIndex((item) => item.href === adminRoutes.materials);
    const partsIdx = logisticsRoutes.findIndex((item) => item.href === adminRoutes.dur.warehouse);
    const customersIdx = logisticsRoutes.findIndex((item) => item.href === adminRoutes.customers);

    expect(materialsIdx).toBeGreaterThanOrEqual(0);
    expect(partsIdx).toBe(materialsIdx + 1);
    expect(customersIdx).toBe(partsIdx + 1);

    expect(logisticsRoutes[materialsIdx]?.label).toBe(plDict.admin.sidebar.materials);
    expect(logisticsRoutes[partsIdx]?.label).toBe(plDict.dur.sidebar.warehouse);
    expect(logisticsRoutes[partsIdx]?.icon).not.toBe(logisticsRoutes[customersIdx]?.icon);
  });

  it("nie wstawia pustego miejsca po materiałach, gdy DUR jest wyłączony", () => {
    const items = navItems(false);
    const hrefs = items
      .filter((item): item is Extract<typeof item, { kind: "route" }> => item.kind === "route")
      .map((item) => item.href);

    const materialsIdx = hrefs.indexOf(adminRoutes.materials);
    expect(hrefs[materialsIdx + 1]).toBe(adminRoutes.customers);
  });
});
