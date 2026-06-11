import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SparePartsTablePanel } from "@/features/admin/dur/SparePartsTablePanel";
import type { SparePart } from "@/types/dur";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

const dict = plDict.dur.spareParts;
const wh = plDict.common.warehouse;

function makePart(overrides: Partial<SparePart> = {}): SparePart {
  return {
    id: 1,
    companyId: 1,
    name: "Filtr oleju",
    catalogNumber: "FO-123",
    manufacturer: "Mann",
    unit: "szt",
    purchasePrice: null,
    description: null,
    minStock: "0",
    location: "Regał A1",
    imageUrl: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    categoryIds: [],
    resourceGroupIds: [],
    stockQuantity: "10",
    ...overrides,
  };
}

const parts: SparePart[] = [
  makePart(),
  makePart({
    id: 2,
    name: "Pasek klinowy",
    catalogNumber: "PK-77",
    manufacturer: "Gates",
    minStock: "5",
    stockQuantity: "2",
    location: "Regał B2",
  }),
];

function makeProps() {
  return {
    dict,
    parts,
    isLoading: false,
    canMutate: true,
    onAddPart: vi.fn(),
    onEditPart: vi.fn(),
    onDeletePart: vi.fn(),
  };
}

describe("SparePartsTablePanel", () => {
  it("renderuje wiersze części z numerem katalogowym, producentem i lokalizacją", () => {
    renderWithProviders(<SparePartsTablePanel {...makeProps()} />);

    expect(screen.getByText("Filtr oleju")).toBeInTheDocument();
    expect(screen.getByText("FO-123")).toBeInTheDocument();
    expect(screen.getByText("Mann")).toBeInTheDocument();
    expect(screen.getByText("Regał A1")).toBeInTheDocument();
    expect(screen.getByText("Pasek klinowy")).toBeInTheDocument();
  });

  it("pokazuje badge niskiego stanu tylko gdy stan jest poniżej minimum", () => {
    renderWithProviders(<SparePartsTablePanel {...makeProps()} />);

    // Tylko "Pasek klinowy" (stan 2 < min 5) ma badge.
    expect(screen.getAllByText(wh.lowStockAlert)).toHaveLength(1);
  });

  it("pokazuje stan ładowania i pusty stan listy", () => {
    const props = makeProps();
    const { rerender } = renderWithProviders(<SparePartsTablePanel {...props} isLoading />);
    expect(screen.getByText(dict.fetching)).toBeInTheDocument();

    rerender(<SparePartsTablePanel {...props} parts={[]} />);
    expect(screen.getByText(dict.empty)).toBeInTheDocument();
  });

  it("filtruje po numerze katalogowym i pokazuje brak wyników wyszukiwania", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SparePartsTablePanel {...makeProps()} />);

    const search = screen.getByRole("searchbox");
    await user.type(search, "PK-77");
    expect(screen.getByText("Pasek klinowy")).toBeInTheDocument();
    expect(screen.queryByText("Filtr oleju")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "nie-istnieje");
    expect(screen.getByText(dict.emptySearch)).toBeInTheDocument();
  });

  it("akcje dodania, edycji, usunięcia i korekty stanu wołają callbacki", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const onAdjustStock = vi.fn();
    renderWithProviders(<SparePartsTablePanel {...props} onAdjustStock={onAdjustStock} />);

    await user.click(screen.getByText(dict.newPart));
    expect(props.onAddPart).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByTitle(dict.editPart)[0]);
    expect(props.onEditPart).toHaveBeenCalledWith(parts[0]);

    await user.click(screen.getAllByTitle(dict.deletePart)[1]);
    expect(props.onDeletePart).toHaveBeenCalledWith(parts[1]);

    await user.click(screen.getAllByRole("button", { name: wh.adjustStock })[0]);
    expect(onAdjustStock).toHaveBeenCalledWith(parts[0]);
  });

  it("bez uprawnień ukrywa przycisk dodawania i kolumnę akcji", () => {
    renderWithProviders(<SparePartsTablePanel {...makeProps()} canMutate={false} />);

    expect(screen.queryByText(dict.newPart)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.table.actions)).not.toBeInTheDocument();
    expect(screen.queryByTitle(dict.editPart)).not.toBeInTheDocument();
  });
});
