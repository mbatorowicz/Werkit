import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerInlineCreateForm } from "@/components/customers/CustomerInlineCreateForm";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

// Mapa (Leaflet) nie działa w jsdom — zastępujemy ją atrapą.
vi.mock("@/features/admin/customers/CustomerMapPicker", () => ({
  default: () => <div data-testid="map-picker" />,
}));

const dict = plDict.admin.customers;

describe("CustomerInlineCreateForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderuje pola formularza i przyciski akcji", () => {
    stubFetch([]);
    renderWithProviders(<CustomerInlineCreateForm onCreated={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(dict.firstNameLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.lastNameLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.phoneLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: dict.create })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: plDict.admin.ui.modalCancel })).toBeInTheDocument();
  });

  it("prop initialLastName wypełnia pole nazwiska", () => {
    stubFetch([]);
    renderWithProviders(
      <CustomerInlineCreateForm initialLastName="Nowak" onCreated={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.getByPlaceholderText(dict.lastNamePlaceholder)).toHaveValue("Nowak");
  });

  it("nie wysyła żądania gdy nazwisko jest puste", async () => {
    const fetchMock = stubFetch([]);
    const user = userEvent.setup();
    renderWithProviders(<CustomerInlineCreateForm onCreated={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: dict.create }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("po wypełnieniu wysyła POST /api/customers i wywołuje onCreated", async () => {
    const fetchMock = stubFetch([
      { url: "/api/customers", method: "POST", json: { customerId: 7 } },
    ]);
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CustomerInlineCreateForm onCreated={onCreated} onCancel={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(dict.firstNamePlaceholder), "Jan");
    await user.type(screen.getByPlaceholderText(dict.lastNamePlaceholder), "Kowalski");
    await user.type(screen.getByPlaceholderText(dict.phonePlaceholder), "123456789");
    await user.type(screen.getByPlaceholderText(dict.streetPlaceholder), "Polna 7");
    await user.type(screen.getByPlaceholderText(dict.cityPlaceholder), "Poznań");
    await user.type(screen.getByPlaceholderText(dict.postalCodePlaceholder), "60-001");
    await user.click(screen.getByRole("button", { name: dict.create }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith({
        id: 7,
        firstName: "Jan",
        lastName: "Kowalski",
        phone: "123456789",
        defaultAddress: "Polna 7\nPoznań\n60-001",
      })
    );

    const call = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/customers"));
    expect(call?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      firstName: "Jan",
      lastName: "Kowalski",
      phone: "123456789",
      defaultAddress: "Polna 7\nPoznań\n60-001",
    });
  });

  it("Enter w polu formularza wysyła zgłoszenie", async () => {
    const fetchMock = stubFetch([
      { url: "/api/customers", method: "POST", json: { customerId: 3 } },
    ]);
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CustomerInlineCreateForm onCreated={onCreated} onCancel={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(dict.lastNamePlaceholder), "Nowak{Enter}");

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalled();
  });

  it("przy błędzie API pokazuje dialog z komunikatem i nie wywołuje onCreated", async () => {
    stubFetch([
      { url: "/api/customers", method: "POST", status: 400, json: { error: "missing_fields" } },
    ]);
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CustomerInlineCreateForm onCreated={onCreated} onCancel={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(dict.lastNamePlaceholder), "Kowalski");
    await user.click(screen.getByRole("button", { name: dict.create }));

    expect(await screen.findByText(plDict.apiErrors.missing_fields)).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("przycisk Anuluj wywołuje onCancel", async () => {
    stubFetch([]);
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CustomerInlineCreateForm onCreated={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.modalCancel }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
