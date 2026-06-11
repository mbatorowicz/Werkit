import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SparePartStockAdjustModal } from "@/features/admin/dur/SparePartStockAdjustModal";
import type { SparePart } from "@/types/dur";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const adj = plDict.common.warehouse.adjustment;

function makePart(overrides: Partial<SparePart> = {}): SparePart {
  return {
    id: 7,
    companyId: 1,
    name: "Filtr oleju",
    catalogNumber: "FO-123",
    manufacturer: "Mann",
    unit: "szt",
    purchasePrice: null,
    description: null,
    minStock: "0",
    location: "A1",
    imageUrl: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    categoryIds: [],
    resourceGroupIds: [],
    stockQuantity: "7",
    ...overrides,
  };
}

function makeProps() {
  return {
    open: true,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SparePartStockAdjustModal", () => {
  it("nie renderuje nic bez wybranej części", () => {
    const { container } = renderWithProviders(
      <SparePartStockAdjustModal {...makeProps()} part={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("przy zmianie części wypełnia ilość stanem i czyści notatki", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const partA = makePart({ id: 1, stockQuantity: "7" });
    const partB = makePart({ id: 2, name: "Pasek klinowy", stockQuantity: "3" });

    const { rerender } = renderWithProviders(<SparePartStockAdjustModal {...props} part={null} />);
    rerender(<SparePartStockAdjustModal {...props} part={partA} />);

    expect(screen.getByText(adj.title)).toBeInTheDocument();
    const quantity = screen.getByPlaceholderText(adj.quantityPlaceholder);
    expect(quantity).toHaveValue("7");

    const notes = screen.getByPlaceholderText(adj.notesPlaceholder);
    await user.type(notes, "Inwentaryzacja");
    expect(notes).toHaveValue("Inwentaryzacja");

    rerender(<SparePartStockAdjustModal {...props} part={partB} />);
    expect(screen.getByPlaceholderText(adj.quantityPlaceholder)).toHaveValue("3");
    expect(screen.getByPlaceholderText(adj.notesPlaceholder)).toHaveValue("");
  });

  it("pokazuje alert przy nieprawidłowej ilości i nie wysyła żądania", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch([]);
    const props = makeProps();
    renderWithProviders(<SparePartStockAdjustModal {...props} part={makePart()} />);

    const quantity = screen.getByPlaceholderText(adj.quantityPlaceholder);
    await user.clear(quantity);
    await user.type(quantity, ",");
    await user.click(screen.getByRole("button", { name: plDict.dur.spareParts.save }));

    expect(await screen.findByText(plDict.dur.apiErrors.invalid_quantity)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it("zapisuje korektę przez PUT /api/dur/inventory i zamyka modal", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch([{ url: "/api/dur/inventory", method: "PUT", json: { ok: true } }]);
    const props = makeProps();
    renderWithProviders(<SparePartStockAdjustModal {...props} part={makePart({ id: 7 })} />);

    const quantity = screen.getByPlaceholderText(adj.quantityPlaceholder);
    await user.type(quantity, "12,5");
    await user.type(screen.getByPlaceholderText(adj.notesPlaceholder), "Korekta po PZ");
    await user.click(screen.getByRole("button", { name: plDict.dur.spareParts.save }));

    await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/dur/inventory");
    expect(init?.method).toBe("PUT");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toEqual({ partId: 7, quantity: "12.5", notes: "Korekta po PZ" });
  });

  it("pokazuje zmapowany komunikat błędu API i nie woła onSaved", async () => {
    const user = userEvent.setup();
    stubFetch([
      {
        url: "/api/dur/inventory",
        method: "PUT",
        status: 400,
        json: { error: "invalid_quantity" },
      },
    ]);
    const props = makeProps();
    renderWithProviders(<SparePartStockAdjustModal {...props} part={makePart()} />);

    await user.type(screen.getByPlaceholderText(adj.quantityPlaceholder), "5");
    await user.click(screen.getByRole("button", { name: plDict.dur.spareParts.save }));

    expect(await screen.findByText(plDict.dur.apiErrors.invalid_quantity)).toBeInTheDocument();
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
