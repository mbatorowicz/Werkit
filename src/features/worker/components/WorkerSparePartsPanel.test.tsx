import { preparePartPick } from "@/lib/partPickStore";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkerSparePartsPanel from "@/features/worker/components/WorkerSparePartsPanel";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const dict = plDict.worker.client;
const ui = plDict.admin.ui;

const partsListRow = {
  id: 1,
  partName: "Filtr oleju",
  partSku: "FO-1",
  quantity: "2",
  unitPrice: null,
  notes: null,
};

const catalogPart = {
  id: 5,
  name: "Filtr powietrza",
  catalogNumber: "FP-9",
  unit: "szt",
  stockQuantity: "4",
  purchasePrice: null,
  isActive: true,
};

function stubPanelFetch() {
  return stubFetch([
    {
      url: "/api/worker/work-orders/10/spare-parts/1",
      method: "DELETE",
      json: { ok: true },
    },
    { url: "/api/worker/work-orders/10/spare-parts", method: "GET", json: [partsListRow] },
    { url: "/api/worker/work-orders/10/spare-parts", method: "POST", json: { ok: true } },
    { url: "/api/worker/dur/spare-parts", method: "GET", json: [catalogPart] },
  ]);
}

function renderPanel(overrides: Partial<Parameters<typeof WorkerSparePartsPanel>[0]> = {}) {
  return renderWithProviders(
    <WorkerSparePartsPanel
      workOrderId={10}
      orderType="machine_repair"
      resourceGroupId={null}
      durEnabled
      isDurWorker
      {...overrides}
    />
  );
}

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  const meta = document.createElement("meta");
  meta.name = "werkit-offline-owner";
  meta.content = "1:2";
  document.head.append(meta);
});
afterEach(() => {
  document.querySelector('meta[name="werkit-offline-owner"]')?.remove();
  vi.unstubAllGlobals();
});

describe("WorkerSparePartsPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("nie renderuje się gdy DUR wyłączony, brak roli DUR lub zlecenie nie jest naprawą", () => {
    stubPanelFetch();
    const { container: c1 } = renderPanel({ durEnabled: false });
    expect(c1).toBeEmptyDOMElement();
    const { container: c2 } = renderPanel({ isDurWorker: false });
    expect(c2).toBeEmptyDOMElement();
    const { container: c3 } = renderPanel({ orderType: "machine_work" });
    expect(c3).toBeEmptyDOMElement();
  });

  it("pobiera i renderuje listę części zlecenia", async () => {
    const fetchMock = stubPanelFetch();
    renderPanel();

    expect(await screen.findByText("Filtr oleju")).toBeInTheDocument();
    expect(screen.getByText("FO-1 · 2")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/worker/work-orders/10/spare-parts", undefined);
  });

  it("bez zapisanego zlecenia pokazuje informację i nie pobiera listy", () => {
    const fetchMock = stubPanelFetch();
    renderPanel({ workOrderId: null });

    expect(screen.getByText(dict.saveOrderBeforeSpareParts)).toBeInTheDocument();
    expect(screen.getByText(dict.noSpareParts)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dodaje część: wybór z katalogu, POST i komunikat sukcesu", async () => {
    const user = userEvent.setup();
    const fetchMock = stubPanelFetch();
    renderPanel();

    await screen.findByText("Filtr oleju");
    await user.click(screen.getByRole("button", { name: new RegExp(dict.addSparePart) }));

    const combo = screen.getByRole("combobox", { name: dict.choosePart });
    await user.click(combo);
    await user.click(await screen.findByText("Filtr powietrza"));

    await user.click(screen.getByRole("button", { name: dict.addSparePart }));

    expect(await screen.findByText(dict.pickPartSuccess)).toBeInTheDocument();

    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall).toBeDefined();
    expect(postCall?.[0]).toBe("/api/worker/work-orders/10/spare-parts");
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      partId: 5,
      quantity: "1",
      notes: null,
    });

    await user.click(screen.getByRole("button", { name: ui.dialogOk }));
    await waitFor(() =>
      expect(screen.queryByRole("combobox", { name: dict.choosePart })).not.toBeInTheDocument()
    );
  });

  it("po restarcie i zmianie B→A odtwarza pobranie wyłącznie dla A z tym samym kluczem", async () => {
    const url = "/api/worker/work-orders/10/spare-parts";
    const body = JSON.stringify({ partId: 5, quantity: "2", notes: "offline repair" });
    const pending = await preparePartPick("1:2", url, body);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="werkit-offline-owner"]')!;
    meta.content = "1:3";
    const fetchMock = stubPanelFetch();
    const b = renderPanel();
    await screen.findByText("Filtr oleju");
    expect(screen.queryByRole("combobox", { name: dict.choosePart })).not.toBeInTheDocument();
    b.unmount();
    meta.content = "1:2";
    renderPanel();
    await screen.findByRole("combobox", { name: dict.choosePart });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: dict.addSparePart }));
    expect(await screen.findByText(dict.pickPartSuccess)).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post?.[1]?.body).toBe(body);
    expect(new Headers(post?.[1]?.headers).get("Idempotency-Key")).toBe(pending?.operationId);
    expect(new Headers(post?.[1]?.headers).get("X-Werkit-Offline-Owner")).toBe("1:2");
  });

  it("przycisk dodawania bez wybranej części jest zablokowany", async () => {
    const user = userEvent.setup();
    stubPanelFetch();
    renderPanel();

    await screen.findByText("Filtr oleju");
    await user.click(screen.getByRole("button", { name: new RegExp(dict.addSparePart) }));

    expect(screen.getByRole("button", { name: dict.addSparePart })).toBeDisabled();
  });

  it("zwraca część po potwierdzeniu: DELETE i komunikat sukcesu", async () => {
    const user = userEvent.setup();
    const fetchMock = stubPanelFetch();
    renderPanel();

    await screen.findByText("Filtr oleju");
    await user.click(screen.getByTitle(dict.removeSparePart));

    expect(await screen.findByText(dict.returnPartConfirm)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: ui.dialogConfirm }));

    expect(await screen.findByText(dict.returnPartSuccess)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/worker/work-orders/10/spare-parts/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("anulowanie potwierdzenia nie wysyła DELETE", async () => {
    const user = userEvent.setup();
    const fetchMock = stubPanelFetch();
    renderPanel();

    await screen.findByText("Filtr oleju");
    await user.click(screen.getByTitle(dict.removeSparePart));
    await user.click(screen.getByRole("button", { name: ui.modalCancel }));

    const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
    expect(deleteCall).toBeUndefined();
  });
});
