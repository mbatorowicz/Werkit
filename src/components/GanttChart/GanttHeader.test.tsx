import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GanttHeader } from "@/components/GanttChart/GanttHeader";

const dict = {
  groupByWorker: "Pracownicy",
  groupByResource: "Zasoby",
  hourFrom: "Od:",
  hourTo: "Do:",
};

function renderHeader(overrides: Partial<Parameters<typeof GanttHeader>[0]> = {}) {
  const props = {
    groupBy: "WORKER" as const,
    setGroupBy: vi.fn(),
    startHour: 6,
    endHour: 18,
    setStartHour: vi.fn(),
    setEndHour: vi.fn(),
    selectedDateStr: "2026-01-15",
    setSelectedDateStr: vi.fn(),
    onPrevDay: vi.fn(),
    onNextDay: vi.fn(),
    dict,
    ...overrides,
  };
  render(<GanttHeader {...props} />);
  return props;
}

describe("GanttHeader", () => {
  it("renderuje przełącznik grupowania i zakres godzin osi czasu", () => {
    renderHeader();

    expect(screen.getByRole("button", { name: dict.groupByWorker })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: dict.groupByResource })).toBeInTheDocument();
    expect(screen.getByText("Od:")).toBeInTheDocument();
    expect(screen.getByText("Do:")).toBeInTheDocument();

    const [startInput, endInput] = screen.getAllByRole("spinbutton");
    expect(startInput).toHaveValue(6);
    expect(endInput).toHaveValue(18);
  });

  it("klik w przycisk grupowania wywołuje setGroupBy z nową wartością", async () => {
    const user = userEvent.setup();
    const props = renderHeader();

    await user.click(screen.getByRole("button", { name: dict.groupByResource }));
    expect(props.setGroupBy).toHaveBeenCalledWith("MACHINE");

    await user.click(screen.getByRole("button", { name: dict.groupByWorker }));
    expect(props.setGroupBy).toHaveBeenCalledWith("WORKER");
  });

  it("pokazuje wybraną datę i pozwala ją zmienić", () => {
    const props = renderHeader();

    const dateInput = screen.getByDisplayValue("2026-01-15");
    fireEvent.change(dateInput, { target: { value: "2026-01-20" } });

    expect(props.setSelectedDateStr).toHaveBeenCalledWith("2026-01-20");
  });

  it("strzałki dnia wywołują onPrevDay i onNextDay", async () => {
    const user = userEvent.setup();
    const props = renderHeader();

    const buttons = screen.getAllByRole("button");
    // Kolejność: grupowanie (2), poprzedni dzień, następny dzień.
    await user.click(buttons[2]);
    expect(props.onPrevDay).toHaveBeenCalledTimes(1);

    await user.click(buttons[3]);
    expect(props.onNextDay).toHaveBeenCalledTimes(1);
  });

  it("godzina początkowa jest ograniczana do zakresu 0..endHour-1", () => {
    const props = renderHeader();
    const [startInput] = screen.getAllByRole("spinbutton");

    fireEvent.change(startInput, { target: { value: "25" } });
    expect(props.setStartHour).toHaveBeenLastCalledWith(17);

    fireEvent.change(startInput, { target: { value: "-3" } });
    expect(props.setStartHour).toHaveBeenLastCalledWith(0);
  });

  it("godzina końcowa jest ograniczana do zakresu startHour+1..24", () => {
    const props = renderHeader();
    const [, endInput] = screen.getAllByRole("spinbutton");

    fireEvent.change(endInput, { target: { value: "30" } });
    expect(props.setEndHour).toHaveBeenLastCalledWith(24);

    fireEvent.change(endInput, { target: { value: "2" } });
    expect(props.setEndHour).toHaveBeenLastCalledWith(7);
  });
});
