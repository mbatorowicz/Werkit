import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

const baseProps = {
  tone: "planned" as const,
  orderNo: "ZL-001",
  mode: "Transport",
  machine: "Wywrotka MAN",
};

describe("OrderLabelCard", () => {
  it("renderuje numer zlecenia, kategorię i maszynę z etykietą i18n", () => {
    renderWithProviders(<OrderLabelCard {...baseProps} />);

    expect(screen.getByText("ZL-001")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText(plDict.admin.orderFields.resource)).toBeInTheDocument();
    expect(screen.getByText("Wywrotka MAN")).toBeInTheDocument();
  });

  it("pokazuje materiał, ilość i opis gdy widoczność pól na to pozwala", () => {
    renderWithProviders(
      <OrderLabelCard
        {...baseProps}
        material="Piasek"
        quantity="24 t"
        description="Dostawa na budowę"
      />
    );

    expect(screen.getByText("Piasek")).toBeInTheDocument();
    expect(screen.getByText("24 t")).toBeInTheDocument();
    expect(screen.getByText("Dostawa na budowę")).toBeInTheDocument();
  });

  it("ukrywa pola wyłączone w fieldVisibility", () => {
    renderWithProviders(
      <OrderLabelCard
        {...baseProps}
        material="Piasek"
        quantity="24 t"
        description="Dostawa na budowę"
        fieldVisibility={{
          showMode: true,
          showMaterial: false,
          showQuantity: false,
          showCustomer: false,
          showDescription: false,
          descriptionLabel: plDict.admin.orderFields.description,
        }}
      />
    );

    expect(screen.queryByText("Piasek")).not.toBeInTheDocument();
    expect(screen.queryByText("24 t")).not.toBeInTheDocument();
    expect(screen.queryByText("Dostawa na budowę")).not.toBeInTheDocument();
  });

  it("w układzie teaser klik i Enter wywołują onCardClick", async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    renderWithProviders(
      <OrderLabelCard {...baseProps} layout="teaser" onCardClick={onCardClick} />
    );

    const card = screen.getByRole("button", {
      name: plDict.worker.client.orderDetailsOpenCategory,
    });
    await user.click(card);
    card.focus();
    await user.keyboard("{Enter}");

    expect(onCardClick).toHaveBeenCalledTimes(2);
  });

  it("bez layout=teaser karta nie jest klikalna", () => {
    renderWithProviders(<OrderLabelCard {...baseProps} onCardClick={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("pokazuje zleceniodawcę z etykietą i18n", () => {
    renderWithProviders(<OrderLabelCard {...baseProps} orderedBy="Jan Kowalski" />);
    expect(screen.getByText("Jan Kowalski")).toBeInTheDocument();
  });
});
