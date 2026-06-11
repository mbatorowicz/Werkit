import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserFormFields, {
  COMBO_NONE,
  emptyUserForm,
  type UserFormState,
} from "@/features/admin/users/UserFormFields";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

// Ten sam kształt słownika co w produkcji (PeopleUserModal): workers bez `org`.
const { org: _org, ...workersFlat } = plDict.admin.workers;
const dict = workersFlat as Record<string, string>;

function makeProps(form: UserFormState = emptyUserForm()) {
  return {
    form,
    editId: null,
    showPassword: false,
    onFormChange: vi.fn(),
    onTogglePassword: vi.fn(),
    dict,
  };
}

describe("UserFormFields", () => {
  it("dla roli worker pokazuje sekcję organizacji i przełączniki uprawnień", () => {
    renderWithProviders(<UserFormFields {...makeProps()} />);

    expect(screen.getByRole("combobox", { name: dict.teamDepartmentLabel })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: dict.teamLabel })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: dict.supervisorLabel })).toBeInTheDocument();
    expect(screen.getByText(dict.canCreateOwnOrdersLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.canEditRouteLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.canCreateCustomersLabel)).toBeInTheDocument();
    // Moduł DUR domyślnie wyłączony.
    expect(screen.queryByText(dict.isDurWorkerLabel)).not.toBeInTheDocument();
  });

  it("dla roli admin ukrywa sekcję organizacji workera", () => {
    const form = { ...emptyUserForm(), role: "admin" };
    renderWithProviders(<UserFormFields {...makeProps(form)} />);

    expect(
      screen.queryByRole("combobox", { name: dict.teamDepartmentLabel })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(dict.canCreateOwnOrdersLabel)).not.toBeInTheDocument();
  });

  it("flagi gpsEnabled i durEnabled sterują widocznością przełączników", () => {
    renderWithProviders(<UserFormFields {...makeProps()} gpsEnabled={false} durEnabled />);

    expect(screen.queryByText(dict.canEditRouteLabel)).not.toBeInTheDocument();
    expect(screen.getByText(dict.isDurWorkerLabel)).toBeInTheDocument();
  });

  it("wpisanie imienia propaguje zmianę przez onFormChange", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<UserFormFields {...props} />);

    await user.type(screen.getByPlaceholderText(dict.fullNamePlaceholder), "J");
    expect(props.onFormChange).toHaveBeenCalledWith({ ...props.form, fullName: "J" });
  });

  it("login jest zapisywany małymi literami", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<UserFormFields {...props} />);

    await user.type(screen.getByPlaceholderText(dict.loginPlaceholder), "A");
    expect(props.onFormChange).toHaveBeenCalledWith({ ...props.form, usernameEmail: "a" });
  });

  it("zmiana roli na admin resetuje uprawnienia i przypisania organizacyjne", async () => {
    const user = userEvent.setup();
    const form: UserFormState = {
      ...emptyUserForm(),
      canCreateOwnOrders: true,
      canEditRoute: true,
      reportsToId: "5",
      departmentId: "2",
      teamId: "3",
    };
    const props = makeProps(form);
    renderWithProviders(<UserFormFields {...props} />);

    await user.selectOptions(screen.getByDisplayValue(dict.roleWorker), "admin");

    expect(props.onFormChange).toHaveBeenCalledWith({
      ...form,
      role: "admin",
      canCreateOwnOrders: false,
      canEditRoute: false,
      canCreateCustomers: false,
      isDurWorker: false,
      reportsToId: COMBO_NONE,
      departmentId: COMBO_NONE,
      teamId: COMBO_NONE,
    });
  });

  it("przełączniki uprawnień odzwierciedlają stan z form", () => {
    // Uwaga: klik w sr-only checkbox opakowany w <label> jest w jsdom
    // podwójnie aktywowany (label forwarding), więc testujemy mapowanie
    // stan -> UI zamiast symulacji kliknięcia.
    const form = { ...emptyUserForm(), canCreateOwnOrders: true };
    renderWithProviders(<UserFormFields {...makeProps(form)} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it("przycisk oka woła onTogglePassword, a etykieta zależy od showPassword", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const { rerender } = renderWithProviders(<UserFormFields {...props} />);

    await user.click(screen.getByRole("button", { name: dict.passwordShow }));
    expect(props.onTogglePassword).toHaveBeenCalledTimes(1);

    rerender(<UserFormFields {...props} showPassword />);
    expect(screen.getByRole("button", { name: dict.passwordHide })).toBeInTheDocument();
  });
});
