import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrdersDispatchTable } from "@/components/Admin/Orders/OrdersDispatchTable";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";
import type { UnifiedGanttItem } from "@/types/admin";

const ordersDict = plDict.admin.orders;
const archiveDict = plDict.admin.archive;
const workerUiLabels = plDict.worker.client;

function makeItem(overrides: Partial<UnifiedGanttItem>): UnifiedGanttItem {
  return {
    _type: "ORDER",
    id: 1,
    workOrderId: 1,
    status: "PENDING",
    workerName: "Jan Kowalski",
    resourceName: "Wywrotka MAN",
    categoryName: "Transport",
    orderType: "machine_work",
    createdAt: "2026-06-01T08:00:00.000Z",
    dueDate: "2026-06-02T08:00:00.000Z",
    hasPhotos: false,
    hasNotes: false,
    ...overrides,
  };
}

const pendingOrder = makeItem({ id: 1, workOrderId: 11, workerName: "Jan Kowalski" });
const activeSession = makeItem({
  _type: "SESSION",
  id: 2,
  workOrderId: 22,
  status: "IN_PROGRESS",
  workerName: "Anna Nowak",
  startTime: "2026-06-01T09:00:00.000Z",
});
const doneSession = makeItem({
  _type: "SESSION",
  id: 3,
  workOrderId: 33,
  status: "COMPLETED",
  workerName: "Piotr Zieliński",
  startTime: "2026-06-01T06:00:00.000Z",
  endTime: "2026-06-01T07:30:00.000Z",
});

function renderTable(overrides: Partial<Parameters<typeof OrdersDispatchTable>[0]> = {}) {
  const onRowClick = vi.fn();
  const utils = renderWithProviders(
    <OrdersDispatchTable
      ordersDict={ordersDict}
      archiveDict={archiveDict}
      workerUiLabels={workerUiLabels}
      canMutate
      isLoading={false}
      tableColSpan={5}
      tableLimit={10}
      unifiedItems={[pendingOrder, activeSession, doneSession]}
      viewMode="board"
      page={1}
      onRowClick={onRowClick}
      onDeleteWorkOrder={vi.fn(async () => {})}
      onForceCompleteSession={vi.fn(async () => {})}
      onDeleteArchivedSession={vi.fn(async () => {})}
      {...overrides}
    />
  );
  return { onRowClick, ...utils };
}

describe("OrdersDispatchTable", () => {
  it("w stanie ładowania pokazuje komunikat pobierania", () => {
    renderTable({ isLoading: true });
    expect(screen.getByText(ordersDict.fetching)).toBeInTheDocument();
    expect(screen.queryByText("Jan Kowalski")).not.toBeInTheDocument();
  });

  it("bez pozycji pokazuje stan pusty z tytułem i opisem", () => {
    renderTable({ unifiedItems: [] });
    expect(screen.getByText(ordersDict.emptyStateTitle)).toBeInTheDocument();
    expect(screen.getByText(ordersDict.emptyStateDesc)).toBeInTheDocument();
  });

  it("widok tablicy grupuje pozycje w kolumny statusów", () => {
    renderTable();

    expect(screen.getByText(ordersDict.pending)).toBeInTheDocument();
    expect(screen.getByText(archiveDict.inProgress)).toBeInTheDocument();
    expect(screen.getByText(archiveDict.completed)).toBeInTheDocument();

    expect(screen.getByText("Jan Kowalski")).toBeInTheDocument();
    expect(screen.getByText("Anna Nowak")).toBeInTheDocument();
    expect(screen.getByText("Piotr Zieliński")).toBeInTheDocument();
  });

  it("widok tabeli renderuje nagłówek kolumny i wszystkie wiersze", () => {
    renderTable({ viewMode: "table" });

    expect(screen.getByRole("columnheader", { name: ordersDict.workerDate })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4); // nagłówek + 3 pozycje
    expect(screen.getByText("#11")).toBeInTheDocument();
    expect(screen.getByText("#22")).toBeInTheDocument();
    expect(screen.getByText("#33")).toBeInTheDocument();
  });

  it("klik w kartę pozycji wywołuje onRowClick z tą pozycją", async () => {
    const user = userEvent.setup();
    const { onRowClick } = renderTable();

    const cards = screen.getAllByRole("button", {
      name: workerUiLabels.orderDetailsOpenCategory,
    });
    expect(cards).toHaveLength(3);
    await user.click(cards[0]);

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(pendingOrder);
  });

  it("bez canMutate klikalne są tylko sesje (nie zlecenia)", () => {
    renderTable({ canMutate: false });

    const cards = screen.getAllByRole("button", {
      name: workerUiLabels.orderDetailsOpenCategory,
    });
    expect(cards).toHaveLength(2); // tylko SESSION (aktywna + zakończona)
  });

  it("tableLimit ogranicza liczbę pozycji w kolumnie tablicy", () => {
    const manyPending = Array.from({ length: 4 }, (_, i) =>
      makeItem({ id: 100 + i, workOrderId: 100 + i, workerName: `Pracownik ${i + 1}` })
    );
    renderTable({ unifiedItems: manyPending, tableLimit: 2 });

    expect(screen.getByText("Pracownik 1")).toBeInTheDocument();
    expect(screen.getByText("Pracownik 2")).toBeInTheDocument();
    expect(screen.queryByText("Pracownik 3")).not.toBeInTheDocument();
  });
});
