import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryAdminSection } from "@/features/admin/categories/CategoryAdminSection";
import { getCategoryAdminLabels } from "@/features/admin/categories/labels";
import type { CategoryAdminTreeItem } from "@/features/admin/categories/types";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const labels = getCategoryAdminLabels("workOrders", "pl");

type TestForm = { name: string; parentId: number | null; isGroup: boolean; sortOrder: number };

const items: CategoryAdminTreeItem[] = [
  { id: 1, name: "Maszyny budowlane", parentId: null, isGroup: true, sortOrder: 0 },
  { id: 2, name: "Koparki", parentId: 1, isGroup: false, sortOrder: 0, color: "#10b981" },
];

function makeProps() {
  return {
    variant: "workOrders" as const,
    apiErrors: plDict.apiErrors as Record<string, string>,
    apiErrorFallback: "Błąd zapisu kategorii.",
    items,
    isLoading: false,
    canMutate: true,
    fetchData: vi.fn(async () => {}),
    createEmptyForm: (): TestForm => ({ name: "", parentId: null, isGroup: false, sortOrder: 0 }),
    itemToForm: (item: CategoryAdminTreeItem): TestForm => ({
      name: item.name,
      parentId: item.parentId,
      isGroup: item.isGroup,
      sortOrder: item.sortOrder,
    }),
    renderModal: (ctx: { open: boolean; editId: number | null }) =>
      ctx.open ? <div data-testid="category-modal">edit:{String(ctx.editId)}</div> : null,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CategoryAdminSection", () => {
  it("renderuje tytuł panelu i korzeń drzewa, liść po rozwinięciu grupy", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CategoryAdminSection {...makeProps()} />);

    expect(screen.getByText(labels.panelTitle)).toBeInTheDocument();
    expect(screen.getByText("Maszyny budowlane")).toBeInTheDocument();
    expect(screen.queryByText("Koparki")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("Koparki")).toBeInTheDocument();
  });

  it("pusta lista kategorii pokazuje komunikat pustego stanu", () => {
    renderWithProviders(<CategoryAdminSection {...makeProps()} items={[]} />);
    expect(screen.getByText(labels.empty)).toBeInTheDocument();
  });

  it("przycisk dodawania otwiera modal formularza bez editId", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CategoryAdminSection {...makeProps()} />);

    expect(screen.queryByTestId("category-modal")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: labels.add }));
    expect(screen.getByTestId("category-modal")).toHaveTextContent("edit:null");
  });

  it("klik w wiersz otwiera podgląd z nazwą i typem pozycji", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CategoryAdminSection {...makeProps()} />);

    await user.click(screen.getByText("Maszyny budowlane"));

    expect(screen.getByText(plDict.admin.ui.previewTitle)).toBeInTheDocument();
    expect(screen.getByText(labels.isGroupLabel)).toBeInTheDocument();
    // "Grupa" pojawia się 2x: badge w wierszu drzewa + wartość pola podglądu.
    expect(screen.getAllByText(labels.previewTypeGroup)).toHaveLength(2);
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("edycja z podglądu otwiera modal formularza z id pozycji", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CategoryAdminSection {...makeProps()} />);

    await user.click(screen.getByText("Maszyny budowlane"));
    await user.click(screen.getByRole("button", { name: plDict.admin.machines.editTitle }));

    expect(screen.getByTestId("category-modal")).toHaveTextContent("edit:1");
    expect(screen.queryByText(plDict.admin.ui.previewTitle)).not.toBeInTheDocument();
  });

  it("usunięcie kategorii wymaga potwierdzenia i woła DELETE oraz fetchData", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch([
      { url: "/api/categories/1", method: "DELETE", json: { ok: true } },
    ]);
    const props = makeProps();
    renderWithProviders(<CategoryAdminSection {...props} />);

    const row = screen.getByRole("button", { name: /Maszyny budowlane/ });
    const rowButtons = within(row).getAllByRole("button");
    await user.click(rowButtons[rowButtons.length - 1]);

    expect(await screen.findByText(labels.confirmDelete)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: plDict.admin.ui.dialogConfirm }));

    await waitFor(() => expect(props.fetchData).toHaveBeenCalledTimes(1));
    const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
    expect(deleteCall).toBeDefined();
    expect(String(deleteCall?.[0])).toContain("/api/categories/1");
  });
});
