import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

/** Mały komponent testowy korzystający z hooka useAppDialog. */
function DialogHarness({ onResult }: { onResult: (result: string) => void }) {
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void appAlert({ message: "Komunikat testowy" }).then(() => onResult("alert-zamkniety"));
        }}
      >
        otworz-alert
      </button>
      <button
        type="button"
        onClick={() => {
          void appConfirm({ message: "Na pewno usunąć?", variant: "danger" }).then((ok) =>
            onResult(ok ? "potwierdzono" : "anulowano")
          );
        }}
      >
        otworz-confirm
      </button>
    </div>
  );
}

describe("AppDialogProvider", () => {
  it("alert renderuje tytuł i treść, a OK rozstrzyga Promise", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    renderWithProviders(<DialogHarness onResult={onResult} />);

    await user.click(screen.getByRole("button", { name: "otworz-alert" }));

    expect(await screen.findByText(plDict.admin.ui.dialogAlertTitle)).toBeInTheDocument();
    expect(screen.getByText("Komunikat testowy")).toBeInTheDocument();
    expect(onResult).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.dialogOk }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith("alert-zamkniety"));
    expect(screen.queryByText("Komunikat testowy")).not.toBeInTheDocument();
  });

  it("confirm rozstrzyga true po kliknięciu Potwierdź", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    renderWithProviders(<DialogHarness onResult={onResult} />);

    await user.click(screen.getByRole("button", { name: "otworz-confirm" }));

    expect(await screen.findByText(plDict.admin.ui.dialogConfirmTitle)).toBeInTheDocument();
    expect(screen.getByText("Na pewno usunąć?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.dialogConfirm }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith("potwierdzono"));
  });

  it("confirm rozstrzyga false po kliknięciu Anuluj", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    renderWithProviders(<DialogHarness onResult={onResult} />);

    await user.click(screen.getByRole("button", { name: "otworz-confirm" }));
    await screen.findByText(plDict.admin.ui.dialogConfirmTitle);

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.modalCancel }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith("anulowano"));
    expect(screen.queryByText("Na pewno usunąć?")).not.toBeInTheDocument();
  });

  it("confirm rozstrzyga false po zamknięciu przez X", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    renderWithProviders(<DialogHarness onResult={onResult} />);

    await user.click(screen.getByRole("button", { name: "otworz-confirm" }));
    await screen.findByText(plDict.admin.ui.dialogConfirmTitle);

    await user.click(screen.getByRole("button", { name: plDict.admin.ui.closeModal }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith("anulowano"));
  });

  it("appDialogApiMessage mapuje kod na tekst i18n z fallbackiem", () => {
    const apiErrors = { duplicate: "Taki wpis już istnieje." };
    expect(appDialogApiMessage(apiErrors, "duplicate", "Błąd")).toBe("Taki wpis już istnieje.");
    expect(appDialogApiMessage(apiErrors, "unknown_code", "Błąd")).toBe("unknown_code");
    expect(appDialogApiMessage(apiErrors, null, "Błąd")).toBe("Błąd");
  });
});
