import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MachinesClient from "@/features/admin/machines/MachinesClient";
import { AdminAbilityProvider } from "@/components/Admin/AdminAbilityProvider";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const groupsDict = plDict.dur.resourceGroups;
const machinesDict = plDict.admin.machines;

function renderMachines(durEnabled: boolean) {
  const fetchMock = stubFetch([
    { url: "/api/machines", json: [] },
    { url: "/api/categories", json: [] },
    {
      url: "/api/resource-groups",
      json: [{ id: 1, name: "Kapsułkarka 02A", description: null, sortOrder: 0, resourceCount: 0 }],
    },
  ]);

  renderWithProviders(
    <AdminAbilityProvider
      canMutate
      canDelegateOrders
      delegationScope="all"
      gpsEnabled
      durEnabled={durEnabled}
    >
      <MachinesClient />
    </AdminAbilityProvider>
  );

  return fetchMock;
}

function fetchUrls(fetchMock: ReturnType<typeof stubFetch>): string[] {
  return fetchMock.mock.calls.map(([input]) => {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    return input.url;
  });
}

describe("MachinesClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ładuje i pokazuje typy zasobów gdy DUR jest wyłączony", async () => {
    const fetchMock = renderMachines(false);

    expect(await screen.findByText(groupsDict.title)).toBeInTheDocument();
    expect(screen.getByText(groupsDict.subtitle)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchUrls(fetchMock).some((url) => url.includes("/api/resource-groups"))).toBe(true);
    });
    expect(fetchUrls(fetchMock).some((url) => url.includes("/api/dur/"))).toBe(false);
  });

  it("w formularzu zasobu pokazuje typ nawet bez DUR", async () => {
    const user = userEvent.setup();
    renderMachines(false);

    await user.click(await screen.findByRole("button", { name: machinesDict.addResource }));
    expect(screen.getByLabelText(machinesDict.resourceGroupLabel)).toBeInTheDocument();
  });
});
