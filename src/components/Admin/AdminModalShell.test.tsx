import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

function getBackdrop(baseElement: Element): HTMLElement {
  const backdrop = baseElement.querySelector('div[aria-hidden="true"]');
  if (!(backdrop instanceof HTMLElement)) throw new Error("Brak tła modala w DOM");
  return backdrop;
}

describe("AdminModalShell", () => {
  it("przy open=false nie renderuje niczego", () => {
    renderWithProviders(
      <AdminModalShell open={false} onClose={vi.fn()} title="Tytuł modala">
        <p>Treść modala</p>
      </AdminModalShell>
    );

    expect(screen.queryByText("Tytuł modala")).not.toBeInTheDocument();
    expect(screen.queryByText("Treść modala")).not.toBeInTheDocument();
  });

  it("renderuje tytuł i treść przy open=true", () => {
    renderWithProviders(
      <AdminModalShell open onClose={vi.fn()} title="Tytuł modala">
        <p>Treść modala</p>
      </AdminModalShell>
    );

    expect(screen.getByRole("heading", { name: "Tytuł modala" })).toBeInTheDocument();
    expect(screen.getByText("Treść modala")).toBeInTheDocument();
  });

  it("przycisk X (etykieta i18n) wywołuje onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <AdminModalShell open onClose={onClose} title="Tytuł">
        <p>Treść</p>
      </AdminModalShell>
    );

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.closeModal }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("domyślnie klik w tło zamyka modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { baseElement } = renderWithProviders(
      <AdminModalShell open onClose={onClose} title="Tytuł">
        <p>Treść</p>
      </AdminModalShell>
    );

    await user.click(getBackdrop(baseElement));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("z closeOnBackdropClick=false klik w tło NIE zamyka modala", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { baseElement } = renderWithProviders(
      <AdminModalShell open onClose={onClose} title="Tytuł" closeOnBackdropClick={false}>
        <p>Treść</p>
      </AdminModalShell>
    );

    await user.click(getBackdrop(baseElement));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renderuje stopkę przekazaną przez footer", () => {
    renderWithProviders(
      <AdminModalShell
        open
        onClose={vi.fn()}
        title="Tytuł"
        footer={<button type="button">Akcja stopki</button>}
      >
        <p>Treść</p>
      </AdminModalShell>
    );

    expect(screen.getByRole("button", { name: "Akcja stopki" })).toBeInTheDocument();
  });
});
