import { describe, expect, it, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GanttFullscreenFrame } from "@/components/GanttChart/GanttFullscreenFrame";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("GanttFullscreenFrame", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("nie renderuje dialogu gdy open=false", () => {
    renderWithProviders(
      <GanttFullscreenFrame open={false} onClose={vi.fn()} showRotateHint={false} rotateHint="hint">
        <p>Treść Gantta</p>
      </GanttFullscreenFrame>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderuje treść, hint obrotu i zamyka się Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <GanttFullscreenFrame open onClose={onClose} showRotateHint rotateHint="Obróć telefon poziomo">
        <button type="button">Nowe zlecenie</button>
      </GanttFullscreenFrame>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Obróć telefon poziomo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nowe zlecenie" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
