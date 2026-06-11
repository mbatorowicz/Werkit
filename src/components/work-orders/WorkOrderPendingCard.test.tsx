import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { WorkOrderPendingCard } from "@/components/work-orders/WorkOrderPendingCard";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";
import { formatDict } from "@/i18n";
import type { WorkOrder } from "@/types/worker";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children?: ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

const dict = plDict.worker.client;

const baseOrder: WorkOrder = {
  id: 7,
  categoryId: 1,
  categoryName: "Transport",
  taskDescription: "Dostawa piasku na budowę",
  resourceName: "Wywrotka MAN",
  materialName: "Piasek",
  customerName: "Jan Nowak",
  priority: "NORMAL",
  dueDate: null,
  createdAt: "2026-06-10T08:00:00.000Z",
};

describe("WorkOrderPendingCard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderuje numer zlecenia, kategorię i przycisk startu w trybie start", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    renderWithProviders(
      <WorkOrderPendingCard order={baseOrder} dict={dict} mode="start" onStart={onStart} />
    );

    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: new RegExp(dict.startTask) }));
    expect(onStart).toHaveBeenCalledWith(7);
  });

  it("w trybie preview nie pokazuje przycisku startu", () => {
    renderWithProviders(
      <WorkOrderPendingCard order={baseOrder} dict={dict} mode="preview" onStart={vi.fn()} />
    );
    expect(screen.queryByText(dict.startTask)).not.toBeInTheDocument();
  });

  it("acceptError blokuje start i pokazuje komunikat błędu", () => {
    renderWithProviders(
      <WorkOrderPendingCard
        order={baseOrder}
        dict={dict}
        mode="start"
        onStart={vi.fn()}
        acceptError="Konflikt grafiku"
      />
    );
    expect(screen.getByText("Konflikt grafiku")).toBeInTheDocument();
    expect(screen.queryByText(dict.startTask)).not.toBeInTheDocument();
  });

  it("pokazuje etykietę pozycji w kolejce", () => {
    renderWithProviders(
      <WorkOrderPendingCard
        order={baseOrder}
        dict={dict}
        mode="preview"
        positionLabel="1. w kolejce"
      />
    );
    expect(screen.getByText("1. w kolejce")).toBeInTheDocument();
  });

  it("klik w kartę otwiera modal szczegółów zlecenia", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkOrderPendingCard order={baseOrder} dict={dict} mode="preview" />);

    await user.click(screen.getByRole("button", { name: dict.orderDetailsOpenCategory }));

    expect(
      await screen.findByText(formatDict(dict.orderDetailsTitle, { id: 7 }))
    ).toBeInTheDocument();
    // Zasób widoczny i na karcie, i w modalu szczegółów
    expect(screen.getAllByText("Wywrotka MAN").length).toBeGreaterThan(1);
  });

  it("własne zlecenie: pokazuje akcje edycji i usuwa po potwierdzeniu", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch([
      { url: "/api/worker/work-orders/7", method: "DELETE", json: { ok: true } },
    ]);
    const onOrderDeleted = vi.fn();
    renderWithProviders(
      <WorkOrderPendingCard
        order={{ ...baseOrder, createdById: 5 }}
        dict={dict}
        mode="start"
        onStart={vi.fn()}
        currentUserId={5}
        onOrderDeleted={onOrderDeleted}
      />
    );

    expect(screen.getByText(dict.editOrder)).toBeInTheDocument();

    await user.click(screen.getByTitle(dict.deleteOrder));
    expect(await screen.findByText(dict.deleteOwnOrderConfirm)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: plDict.admin.ui.dialogConfirm }));

    expect(await screen.findByText(dict.editOrderDeleted)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: plDict.admin.ui.dialogOk }));

    await waitFor(() => expect(onOrderDeleted).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/worker/work-orders/7",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("cudze zlecenie nie pokazuje akcji edycji/usuwania", () => {
    renderWithProviders(
      <WorkOrderPendingCard
        order={{ ...baseOrder, createdById: 5 }}
        dict={dict}
        mode="start"
        onStart={vi.fn()}
        currentUserId={9}
      />
    );
    expect(screen.queryByText(dict.editOrder)).not.toBeInTheDocument();
    expect(screen.queryByTitle(dict.deleteOrder)).not.toBeInTheDocument();
  });
});
