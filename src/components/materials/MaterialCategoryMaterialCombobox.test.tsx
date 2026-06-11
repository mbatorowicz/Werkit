import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MaterialCategoryMaterialCombobox,
  type MaterialCategoryMaterialComboboxDict,
} from "@/components/materials/MaterialCategoryMaterialCombobox";
import type { MaterialCategoryRow, MaterialPickerRow } from "@/lib/materialCategoryPicker";
import { renderWithProviders } from "@/test/renderWithProviders";

const comboDict: MaterialCategoryMaterialComboboxDict = {
  chooseCategory: "Wybierz kategorię materiału",
  searchMaterial: "Szukaj materiału",
  noCategories: "Brak kategorii",
  noMaterialsInCategory: "Brak materiałów w tej kategorii",
  clearCategory: "Usuń kategorię",
  clear: "Wyczyść materiał",
  noResults: "Brak wyników",
};

const categories: MaterialCategoryRow[] = [
  { id: 1, name: "Kruszywa", color: "#10b981" },
  { id: 2, name: "Beton", color: null },
];

const materials: MaterialPickerRow[] = [
  { id: 11, name: "Piasek", categoryIds: [1] },
  { id: 12, name: "Żwir", categoryIds: [1] },
  { id: 21, name: "Beton B20", categoryIds: [2] },
];

function Harness({
  onCategoryChange,
  onMaterialChange,
}: {
  onCategoryChange?: (id: string) => void;
  onMaterialChange?: (id: string) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [materialId, setMaterialId] = useState("");
  return (
    <MaterialCategoryMaterialCombobox
      categories={categories}
      materials={materials}
      materialCategoryId={categoryId}
      materialId={materialId}
      onMaterialCategoryChange={(id) => {
        setCategoryId(id);
        onCategoryChange?.(id);
      }}
      onMaterialChange={(id) => {
        setMaterialId(id);
        onMaterialChange?.(id);
      }}
      dict={comboDict}
      aria-label="Materiał"
    />
  );
}

describe("MaterialCategoryMaterialCombobox", () => {
  beforeAll(() => {
    // jsdom nie implementuje scrollIntoView (auto-przewijanie podświetlonej opcji).
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("po fokusie pokazuje listę kategorii (krok 1)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    const input = screen.getByRole("combobox", { name: "Materiał" });
    expect(input).toHaveAttribute("placeholder", comboDict.chooseCategory);

    await user.click(input);

    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Kruszywa")).toBeInTheDocument();
    expect(within(listbox).getByText("Beton")).toBeInTheDocument();
    expect(within(listbox).queryByText("Piasek")).not.toBeInTheDocument();
  });

  it("wybór kategorii pokazuje tag i przechodzi do listy materiałów tej kategorii", async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    renderWithProviders(<Harness onCategoryChange={onCategoryChange} />);

    await user.click(screen.getByRole("combobox", { name: "Materiał" }));
    await user.click(await screen.findByText("Kruszywa"));

    expect(onCategoryChange).toHaveBeenCalledWith("1");
    // Tag wybranej kategorii w polu.
    expect(screen.getByText("Kruszywa")).toBeInTheDocument();

    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Piasek")).toBeInTheDocument();
    expect(within(listbox).getByText("Żwir")).toBeInTheDocument();
    expect(within(listbox).queryByText("Beton B20")).not.toBeInTheDocument();
  });

  it("filtruje materiały po wpisanym zapytaniu i pokazuje pustą etykietę bez wyników", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    const input = screen.getByRole("combobox", { name: "Materiał" });
    await user.click(input);
    await user.click(await screen.findByText("Kruszywa"));

    await user.type(input, "pia");
    let listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Piasek")).toBeInTheDocument();
    expect(within(listbox).queryByText("Żwir")).not.toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "xyz");
    listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText(comboDict.noMaterialsInCategory)).toBeInTheDocument();
  });

  it("nawigacja klawiaturą: strzałki + Enter wybierają kategorię, potem materiał", async () => {
    const user = userEvent.setup();
    const onMaterialChange = vi.fn();
    renderWithProviders(<Harness onMaterialChange={onMaterialChange} />);

    const input = screen.getByRole("combobox", { name: "Materiał" });
    await user.click(input);
    await screen.findByRole("listbox");

    // Strzałka w dół → druga kategoria (Beton), Enter wybiera.
    await user.keyboard("{ArrowDown}{Enter}");
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Beton B20")).toBeInTheDocument();

    // Enter na pierwszym (i jedynym) materiale.
    await user.keyboard("{Enter}");
    expect(onMaterialChange).toHaveBeenLastCalledWith("21");
    expect(input).toHaveValue("Beton B20");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("wpisanie zapytania resetuje podświetlenie na pierwszą pozycję", async () => {
    const user = userEvent.setup();
    const onMaterialChange = vi.fn();
    renderWithProviders(<Harness onMaterialChange={onMaterialChange} />);

    const input = screen.getByRole("combobox", { name: "Materiał" });
    await user.click(input);
    await user.click(await screen.findByText("Kruszywa"));

    // Przesuwamy podświetlenie na drugą pozycję, potem filtr zawęża listę —
    // Enter ma wybrać pierwszy przefiltrowany wynik (reset podświetlenia).
    await user.keyboard("{ArrowDown}");
    await user.type(input, "żwir");
    await user.keyboard("{Enter}");

    expect(onMaterialChange).toHaveBeenLastCalledWith("12");
    expect(input).toHaveValue("Żwir");
  });

  it("przycisk X czyści wybrany materiał i otwiera listę ponownie", async () => {
    const user = userEvent.setup();
    const onMaterialChange = vi.fn();
    renderWithProviders(<Harness onMaterialChange={onMaterialChange} />);

    const input = screen.getByRole("combobox", { name: "Materiał" });
    await user.click(input);
    await user.click(await screen.findByText("Kruszywa"));
    await user.click(within(screen.getByRole("listbox")).getByText("Piasek"));
    expect(input).toHaveValue("Piasek");

    await user.click(screen.getByRole("button", { name: comboDict.clear }));

    expect(onMaterialChange).toHaveBeenLastCalledWith("");
    expect(input).toHaveValue("");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("usunięcie tagu kategorii wraca do kroku wyboru kategorii", async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    renderWithProviders(<Harness onCategoryChange={onCategoryChange} />);

    const input = screen.getByRole("combobox", { name: "Materiał" });
    await user.click(input);
    await user.click(await screen.findByText("Kruszywa"));

    await user.click(screen.getByRole("button", { name: comboDict.clearCategory }));

    expect(onCategoryChange).toHaveBeenLastCalledWith("");
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Kruszywa")).toBeInTheDocument();
    expect(within(listbox).getByText("Beton")).toBeInTheDocument();
  });

  it("Escape zamyka listę rozwijaną", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    const input = screen.getByRole("combobox", { name: "Materiał" });
    await user.click(input);
    await screen.findByRole("listbox");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
