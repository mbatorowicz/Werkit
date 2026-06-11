import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { WorkerOrderDetailsModal } from "@/features/worker/components/WorkerOrderDetailsModal";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";
import { formatDict } from "@/i18n";
import type { WorkerOrderDetailsData } from "@/features/worker/lib/workerOrderDetails";
import type { OrderLabelFieldVisibility } from "@/lib/orderLabelFieldVisibility";

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
const fieldLabels = plDict.admin.orderFields;

const fullVisibility: OrderLabelFieldVisibility = {
  showMode: true,
  showMaterial: true,
  showQuantity: true,
  showCustomer: true,
  showDescription: true,
  descriptionLabel: fieldLabels.description,
};

const baseData: WorkerOrderDetailsData = {
  orderId: 9,
  categoryName: "Transport",
  categoryColor: null,
  fieldVisibility: fullVisibility,
  resourceName: "Wywrotka MAN",
  materialName: "Piasek",
  quantity: "24t",
  customerName: "Jan Nowak",
  description: "Dostawa na budowę",
  dateLabel: "10.06.2026",
  timeLabel: "08:00",
  orderedBy: "Anna Dyspozytor",
  priority: "HIGH",
};

describe("WorkerOrderDetailsModal", () => {
  it("renderuje tytuł, zasób, materiał, ilość, opis i zleceniodawcę", () => {
    renderWithProviders(<WorkerOrderDetailsModal open onClose={vi.fn()} data={baseData} />);

    expect(screen.getByText(formatDict(dict.orderDetailsTitle, { id: 9 }))).toBeInTheDocument();
    expect(screen.getByText("#9")).toBeInTheDocument();
    expect(screen.getByText("Wywrotka MAN")).toBeInTheDocument();
    expect(screen.getByText("Piasek")).toBeInTheDocument();
    expect(screen.getByText("24t")).toBeInTheDocument();
    expect(screen.getByText("Dostawa na budowę")).toBeInTheDocument();
    expect(screen.getByText("Anna Dyspozytor")).toBeInTheDocument();
  });

  it("ukrywa pola wyłączone w fieldVisibility", () => {
    renderWithProviders(
      <WorkerOrderDetailsModal
        open
        onClose={vi.fn()}
        data={{
          ...baseData,
          fieldVisibility: {
            ...fullVisibility,
            showMaterial: false,
            showQuantity: false,
            showCustomer: false,
            showDescription: false,
          },
        }}
      />
    );

    expect(screen.queryByText("Piasek")).not.toBeInTheDocument();
    expect(screen.queryByText("24t")).not.toBeInTheDocument();
    expect(screen.queryByText("Jan Nowak")).not.toBeInTheDocument();
    expect(screen.queryByText("Dostawa na budowę")).not.toBeInTheDocument();
  });

  it("nie renderuje nic gdy data === null", () => {
    const { container } = renderWithProviders(
      <WorkerOrderDetailsModal open onClose={vi.fn()} data={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("nie renderuje nic gdy open === false", () => {
    renderWithProviders(<WorkerOrderDetailsModal open={false} onClose={vi.fn()} data={baseData} />);
    expect(
      screen.queryByText(formatDict(dict.orderDetailsTitle, { id: 9 }))
    ).not.toBeInTheDocument();
  });

  it("przycisk zamknięcia wywołuje onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<WorkerOrderDetailsModal open onClose={onClose} data={baseData} />);

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.closeModal }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pokazuje link do widoku historii gdy podano href i etykietę", () => {
    renderWithProviders(
      <WorkerOrderDetailsModal
        open
        onClose={vi.fn()}
        data={{
          ...baseData,
          historyDetailHref: "/worker/history/11",
          historyDetailLinkLabel: plDict.worker.history.openSessionDetail,
        }}
      />
    );

    const link = screen.getByText(plDict.worker.history.openSessionDetail).closest("a");
    expect(link).toHaveAttribute("href", "/worker/history/11");
  });
});
