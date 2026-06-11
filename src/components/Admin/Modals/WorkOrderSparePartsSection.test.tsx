import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import WorkOrderSparePartsSection from "@/components/Admin/Modals/WorkOrderSparePartsSection";
import { AdminAbilityProvider } from "@/components/Admin/AdminAbilityProvider";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const durDict = plDict.dur.workOrderSpareParts;
const ordersDict = plDict.admin.orders;

const partsResponse = [
  {
    id: 1,
    workOrderId: 5,
    partId: 11,
    partName: "Filtr oleju",
    partSku: "FO-100",
    quantity: "2",
    unitPrice: "10.50",
    notes: null,
  },
  {
    id: 2,
    workOrderId: 5,
    partId: 12,
    partName: "Pasek klinowy",
    partSku: "PK-7",
    quantity: "1",
    unitPrice: null,
    notes: null,
  },
];

const catalogResponse = [
  { id: 11, name: "Filtr oleju", catalogNumber: "FO-100", unit: "szt", isActive: true },
  { id: 12, name: "Pasek klinowy", catalogNumber: "PK-7", unit: "szt", isActive: true },
];

function stubSparePartsApi(parts: unknown[] = partsResponse) {
  return stubFetch([
    { url: "/api/admin/work-orders/5/spare-parts/", method: "DELETE", json: {} },
    { url: "/api/admin/work-orders/5/spare-parts", method: "GET", json: parts },
    { url: "/api/admin/work-orders/5/spare-parts", method: "POST", json: {} },
    { url: "/api/dur/spare-parts", json: catalogResponse },
    { url: "/api/dur/inventory", json: [{ partId: 11, quantity: "4" }] },
  ]);
}

function renderSection(ui: ReactElement, durEnabled = true) {
  return renderWithProviders(
    <AdminAbilityProvider
      canMutate
      canDelegateOrders
      delegationScope="all"
      gpsEnabled
      durEnabled={durEnabled}
    >
      {ui}
    </AdminAbilityProvider>
  );
}

describe("WorkOrderSparePartsSection", () => {
  it("nie renderuje sekcji dla zlecenia, które nie jest naprawą", () => {
    stubSparePartsApi();
    renderSection(
      <WorkOrderSparePartsSection workOrderId={5} orderType="machine_work" resourceGroupId={null} />
    );
    expect(screen.queryByText(ordersDict.spareParts)).not.toBeInTheDocument();
  });

  it("nie renderuje sekcji gdy moduł DUR jest wyłączony", () => {
    stubSparePartsApi();
    renderSection(
      <WorkOrderSparePartsSection
        workOrderId={5}
        orderType="machine_repair"
        resourceGroupId={null}
      />,
      false
    );
    expect(screen.queryByText(ordersDict.spareParts)).not.toBeInTheDocument();
  });

  it("bez ID zlecenia pokazuje informację o zapisaniu zlecenia i nie strzela do API", () => {
    const fetchMock = stubSparePartsApi();
    renderSection(
      <WorkOrderSparePartsSection
        workOrderId={null}
        orderType="machine_repair"
        resourceGroupId={null}
      />
    );

    expect(screen.getByText(ordersDict.spareParts)).toBeInTheDocument();
    expect(screen.getByText("Zapisz zlecenie przed dodaniem części.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pobiera listę części i pokazuje tabelę z podsumowaniem wartości", async () => {
    stubSparePartsApi();
    renderSection(
      <WorkOrderSparePartsSection
        workOrderId={5}
        orderType="machine_repair"
        resourceGroupId={null}
      />
    );

    expect(await screen.findByText("Filtr oleju")).toBeInTheDocument();
    expect(screen.getByText("Pasek klinowy")).toBeInTheDocument();
    expect(screen.getByText("FO-100")).toBeInTheDocument();

    // 2 szt × 10.50 zł = 21.00 zł (druga część bez ceny nie wlicza się do wartości)
    expect(screen.getByText(durDict.totals.partsCount.replace("{count}", "2"))).toBeInTheDocument();
    expect(
      screen.getByText(durDict.totals.totalValue.replace("{value}", "21.00 zł"))
    ).toBeInTheDocument();
  });

  it("pokazuje stan pusty gdy zlecenie nie ma części", async () => {
    stubSparePartsApi([]);
    renderSection(
      <WorkOrderSparePartsSection
        workOrderId={5}
        orderType="machine_repair"
        resourceGroupId={null}
      />
    );

    expect(await screen.findByText(durDict.empty)).toBeInTheDocument();
  });

  it("dodanie części wysyła POST z wybraną częścią i ilością", async () => {
    const user = userEvent.setup();
    const fetchMock = stubSparePartsApi([]);
    renderSection(
      <WorkOrderSparePartsSection
        workOrderId={5}
        orderType="machine_repair"
        resourceGroupId={null}
      />
    );

    await screen.findByText(durDict.empty);
    await user.click(screen.getByRole("button", { name: ordersDict.addSparePart }));

    // Wybór części z katalogu (combobox)
    await user.click(screen.getByRole("combobox", { name: durDict.fields.part }));
    await user.click(await screen.findByText("Pasek klinowy"));

    await user.click(screen.getByRole("button", { name: ordersDict.addSparePart }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(postCall).toBeDefined();
    });
    const [, postInit] = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(postInit?.body))).toMatchObject({ partId: 12, quantity: "1" });

    // Komunikat sukcesu (automatyczne wydanie z magazynu)
    expect(await screen.findByText(durDict.pickSuccess)).toBeInTheDocument();
  });

  it("usunięcie części wymaga potwierdzenia i wysyła DELETE", async () => {
    const user = userEvent.setup();
    const fetchMock = stubSparePartsApi();
    renderSection(
      <WorkOrderSparePartsSection
        workOrderId={5}
        orderType="machine_repair"
        resourceGroupId={null}
      />
    );

    await screen.findByText("Filtr oleju");
    await user.click(screen.getAllByTitle(durDict.returnPart)[0]);

    expect(await screen.findByText(durDict.returnConfirm)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: plDict.admin.ui.dialogConfirm }));

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
      expect(deleteCall).toBeDefined();
    });
    const [deleteUrl] = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE")!;
    expect(String(deleteUrl)).toContain("/api/admin/work-orders/5/spare-parts/1");

    expect(await screen.findByText(durDict.returnSuccess)).toBeInTheDocument();
  });

  it("anulowanie potwierdzenia nie usuwa części", async () => {
    const user = userEvent.setup();
    const fetchMock = stubSparePartsApi();
    renderSection(
      <WorkOrderSparePartsSection
        workOrderId={5}
        orderType="machine_repair"
        resourceGroupId={null}
      />
    );

    await screen.findByText("Filtr oleju");
    await user.click(screen.getAllByTitle(durDict.returnPart)[0]);
    await screen.findByText(durDict.returnConfirm);

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.modalCancel }));

    await waitFor(() => expect(screen.queryByText(durDict.returnConfirm)).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
  });
});
