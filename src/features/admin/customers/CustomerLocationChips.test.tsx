import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerLocationChips } from "@/features/admin/customers/CustomerLocationChips";
import type { CustomerLocationRow } from "@/services/CustomerLocationService";
import { renderWithProviders } from "@/test/renderWithProviders";

function makeLocation(overrides: Partial<CustomerLocationRow> = {}): CustomerLocationRow {
  return {
    id: 1,
    customerId: 1,
    label: "Baza główna",
    address: null,
    latitude: "52.2297",
    longitude: "21.0122",
    isDefault: false,
    sortOrder: 0,
    routeWaypoints: [],
    ...overrides,
  };
}

const locations: CustomerLocationRow[] = [
  makeLocation({ id: 1, label: "Baza główna", isDefault: true }),
  makeLocation({ id: 2, label: "Budowa Mokotów" }),
];

function makeProps() {
  return {
    locations,
    selectedId: null,
    isDraftOpen: false,
    defaultBadgeLabel: "Domyślna",
    emptyLabel: "Brak lokalizacji.",
    onSelect: vi.fn(),
  };
}

describe("CustomerLocationChips", () => {
  it("przy pustej liście pokazuje komunikat pustego stanu", () => {
    renderWithProviders(<CustomerLocationChips {...makeProps()} locations={[]} />);

    expect(screen.getByText("Brak lokalizacji.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renderuje chip dla każdej lokalizacji", () => {
    renderWithProviders(<CustomerLocationChips {...makeProps()} />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Budowa Mokotów/ })).toBeInTheDocument();
  });

  it("lokalizacja domyślna ma dopisek z etykietą badge", () => {
    renderWithProviders(<CustomerLocationChips {...makeProps()} />);

    expect(screen.getByRole("button", { name: "Baza główna (Domyślna)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Budowa Mokotów" })).toBeInTheDocument();
  });

  it("klik w chip woła onSelect z pełnym obiektem lokalizacji", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<CustomerLocationChips {...props} />);

    await user.click(screen.getByRole("button", { name: "Budowa Mokotów" }));
    expect(props.onSelect).toHaveBeenCalledWith(locations[1]);
  });
});
