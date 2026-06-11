import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MaterialsTable } from "@/features/admin/materials/MaterialsTable";
import type { MaterialCategory, MaterialRow } from "@/features/admin/materials/types";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

const dict = plDict.admin.materials;
const machDict = plDict.admin.machines;
const wh = plDict.common.warehouse;

const categories: MaterialCategory[] = [
  { id: 1, name: "Kruszywa", parentId: null, isGroup: false, sortOrder: 0, color: "#10b981" },
];

const materials: MaterialRow[] = [
  { id: 11, name: "Piasek płukany", unit: "t", categoryIds: [1], stockQuantity: "120" },
  { id: 12, name: "Cement workowany", unit: "kg", categoryIds: [], stockQuantity: "5" },
];

function makeProps() {
  return {
    dict,
    machDict,
    materials,
    categories,
    isLoading: false,
    canMutate: true,
    onAddMaterial: vi.fn(),
    onEditMaterial: vi.fn(),
    onDeleteMaterial: vi.fn(),
  };
}

describe("MaterialsTable", () => {
  it("renderuje wiersze materiałów z kategorią, jednostką i stanem", () => {
    renderWithProviders(<MaterialsTable {...makeProps()} />);

    expect(screen.getByText("Piasek płukany")).toBeInTheDocument();
    expect(screen.getByText("ID #11")).toBeInTheDocument();
    expect(screen.getByText("Kruszywa")).toBeInTheDocument();
    expect(screen.getByText("120 t")).toBeInTheDocument();
    expect(screen.getByText("Cement workowany")).toBeInTheDocument();
    expect(screen.getByText(machDict.noCategoryBadge)).toBeInTheDocument();
  });

  it("pokazuje stan ładowania i pusty stan bez akcji gdy canMutate=false", () => {
    const props = makeProps();
    const { rerender } = renderWithProviders(<MaterialsTable {...props} isLoading />);
    expect(screen.getByText(dict.fetching)).toBeInTheDocument();

    rerender(<MaterialsTable {...props} materials={[]} canMutate={false} />);
    expect(screen.getByText(dict.noMaterials)).toBeInTheDocument();
    expect(screen.queryByText(dict.addMaterial)).not.toBeInTheDocument();
    expect(screen.queryByText(machDict.management)).not.toBeInTheDocument();
  });

  it("filtruje wiersze przez wyszukiwarkę i pokazuje brak wyników", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MaterialsTable {...makeProps()} />);

    const search = screen.getByRole("searchbox");
    await user.type(search, "piasek");
    expect(screen.getByText("Piasek płukany")).toBeInTheDocument();
    expect(screen.queryByText("Cement workowany")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "xyz-nie-ma");
    expect(screen.getByText(dict.listSearchNoResults)).toBeInTheDocument();
  });

  it("przycisk dodawania i akcje edycji/usunięcia wołają callbacki", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<MaterialsTable {...props} />);

    await user.click(screen.getByText(dict.addMaterial));
    expect(props.onAddMaterial).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByTitle(machDict.editTitle)[0]);
    expect(props.onEditMaterial).toHaveBeenCalledWith(materials[0]);

    await user.click(screen.getAllByTitle(machDict.deleteTitle)[1]);
    expect(props.onDeleteMaterial).toHaveBeenCalledWith(12);
  });

  it("pokazuje badge niskiego stanu i akcję korekty stanu", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const onAdjustStock = vi.fn();
    renderWithProviders(
      <MaterialsTable {...props} onAdjustStock={onAdjustStock} isLowStock={(m) => m.id === 12} />
    );

    expect(screen.getAllByText(wh.lowStock)).toHaveLength(1);

    await user.click(screen.getAllByRole("button", { name: wh.adjustStock })[0]);
    expect(onAdjustStock).toHaveBeenCalledWith(materials[0]);
  });

  it("klik w wiersz otwiera podgląd materiału z danymi", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MaterialsTable {...makeProps()} />);

    await user.click(screen.getByText("Piasek płukany"));

    expect(screen.getByText(plDict.admin.ui.previewTitle)).toBeInTheDocument();
    expect(screen.getByText("#11")).toBeInTheDocument();
    expect(screen.getByText(dict.nameLabel)).toBeInTheDocument();
  });

  it("edycja z podglądu zamyka modal i woła onEditMaterial", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<MaterialsTable {...props} />);

    await user.click(screen.getByText("Piasek płukany"));
    const editButtons = screen.getAllByRole("button", { name: machDict.editTitle });
    await user.click(editButtons[editButtons.length - 1]);

    expect(props.onEditMaterial).toHaveBeenCalledWith(materials[0]);
    expect(screen.queryByText(plDict.admin.ui.previewTitle)).not.toBeInTheDocument();
  });
});
