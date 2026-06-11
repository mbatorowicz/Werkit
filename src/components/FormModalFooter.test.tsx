import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormModalFooter } from "@/components/FormModalFooter";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

describe("FormModalFooter", () => {
  it("renderuje etykietę zapisu i domyślną etykietę anulowania z i18n", () => {
    renderWithProviders(<FormModalFooter onCancel={vi.fn()} submitLabel="Zapisz zlecenie" />);

    expect(screen.getByRole("button", { name: "Zapisz zlecenie" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: plDict.admin.ui.modalCancel })).toBeInTheDocument();
  });

  it("honoruje własną etykietę anulowania", () => {
    renderWithProviders(
      <FormModalFooter onCancel={vi.fn()} submitLabel="Zapisz" cancelLabel="Wróć" />
    );
    expect(screen.getByRole("button", { name: "Wróć" })).toBeInTheDocument();
  });

  it("klik Anuluj wywołuje onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithProviders(<FormModalFooter onCancel={onCancel} submitLabel="Zapisz" />);

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.modalCancel }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("isSubmitting blokuje przycisk zapisu i pokazuje spinner zamiast etykiety", () => {
    renderWithProviders(<FormModalFooter onCancel={vi.fn()} submitLabel="Zapisz" isSubmitting />);

    expect(screen.queryByRole("button", { name: "Zapisz" })).not.toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    const submit = buttons.find((b) => b.getAttribute("type") === "submit");
    expect(submit).toBeDefined();
    expect(submit).toBeDisabled();
  });

  it("submitDisabled blokuje przycisk zapisu, ale etykieta zostaje", () => {
    renderWithProviders(<FormModalFooter onCancel={vi.fn()} submitLabel="Zapisz" submitDisabled />);
    expect(screen.getByRole("button", { name: "Zapisz" })).toBeDisabled();
  });

  it("hideSubmit ukrywa przycisk zapisu", () => {
    renderWithProviders(<FormModalFooter onCancel={vi.fn()} submitLabel="Zapisz" hideSubmit />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent(plDict.admin.ui.modalCancel);
  });

  it("renderuje slot leading nad przyciskami", () => {
    renderWithProviders(
      <FormModalFooter
        onCancel={vi.fn()}
        submitLabel="Zapisz"
        leading={<button type="button">Usuń wpis</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Usuń wpis" })).toBeInTheDocument();
  });

  it("przycisk zapisu jest powiązany z formularzem przez formId", () => {
    renderWithProviders(
      <FormModalFooter formId="moj-formularz" onCancel={vi.fn()} submitLabel="Zapisz" />
    );
    expect(screen.getByRole("button", { name: "Zapisz" })).toHaveAttribute("form", "moj-formularz");
  });
});
