import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrdersDispatchItemCard } from "@/components/Admin/Orders/OrdersDispatchItemCard";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";
import type { UnifiedGanttItem } from "@/types/admin";

const ordersDict = plDict.admin.orders;
const workerUiLabels = plDict.worker.client;

const baseItem: UnifiedGanttItem = {
  _type: "ORDER",
  id: 3,
  workOrderId: 12,
  status: "PENDING",
  workerName: "Jan Kowalski",
  resourceName: "Wywrotka MAN",
  categoryName: "Transport",
  categoryColor: null,
  materialName: "Piasek",
  quantityTons: "24",
  taskDescription: "Dostawa na budowę",
  priority: "HIGH",
  orderType: "machine_work",
  createdAt: "2026-06-01T08:00:00.000Z",
  dueDate: "2026-06-02T08:00:00.000Z",
  categoryShowMaterial: true,
  categoryShowCustomer: false,
  categoryShowQuantity: true,
  categoryShowTaskDescription: true,
  hasPhotos: false,
  hasNotes: false,
};

function renderCard(item: UnifiedGanttItem = baseItem, onOpenDetails?: () => void) {
  return renderWithProviders(
    <OrdersDispatchItemCard
      item={item}
      layout="boardPending"
      liveClockMs={Date.parse("2026-06-01T10:00:00.000Z")}
      ordersDict={ordersDict}
      workerUiLabels={workerUiLabels}
      onOpenDetails={onOpenDetails}
    />
  );
}

describe("OrdersDispatchItemCard", () => {
  it("renderuje numer zlecenia, pracownika, kategorię i maszynę", () => {
    renderCard();

    expect(screen.getByText("#12")).toBeInTheDocument();
    expect(screen.getByText("Jan Kowalski")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Wywrotka MAN")).toBeInTheDocument();
  });

  it("pokazuje materiał w zajawce gdy kategoria na to pozwala", () => {
    renderCard();
    expect(screen.getByText("Piasek")).toBeInTheDocument();
  });

  it("bez workOrderId numer karty pochodzi z id pozycji", () => {
    renderCard({ ...baseItem, workOrderId: null });
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("bez nazwy kategorii pokazuje etykietę zastępczą z i18n", () => {
    renderCard({ ...baseItem, categoryName: null });
    expect(screen.getByText(workerUiLabels.noCategoryName)).toBeInTheDocument();
  });

  it("pokazuje kropkę priorytetu dla zlecenia oczekującego", () => {
    renderCard();
    // HIGH → etykieta „ważne” z worker.client
    expect(screen.getByLabelText(workerUiLabels.priorityImportant)).toBeInTheDocument();
  });

  it("klik w kartę wywołuje onOpenDetails", async () => {
    const user = userEvent.setup();
    const onOpenDetails = vi.fn();
    renderCard(baseItem, onOpenDetails);

    await user.click(screen.getByRole("button", { name: workerUiLabels.orderDetailsOpenCategory }));
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it("bez onOpenDetails karta nie jest klikalna", () => {
    renderCard();
    expect(
      screen.queryByRole("button", { name: workerUiLabels.orderDetailsOpenCategory })
    ).not.toBeInTheDocument();
  });
});
