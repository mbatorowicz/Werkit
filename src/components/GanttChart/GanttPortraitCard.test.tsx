import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GanttPortraitCard } from "@/components/GanttChart/GanttPortraitCard";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("GanttPortraitCard", () => {
  it("wywołuje onOpen po kliknięciu przycisku", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderWithProviders(
      <GanttPortraitCard
        title="Oś czasu (Gantt)"
        body="Obróć telefon."
        openLabel="Otwórz oś czasu"
        onOpen={onOpen}
      />
    );

    expect(screen.getByText("Oś czasu (Gantt)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Otwórz oś czasu/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
