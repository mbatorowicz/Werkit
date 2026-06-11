import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogsFilterBar } from "@/features/admin/logs/LogsFilterBar";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

const logsDict = plDict.admin.logs;

const workers = [
  { id: 1, fullName: "Jan Kowalski" },
  { id: 2, fullName: "Anna Nowak" },
];

function makeProps() {
  return {
    workers,
    logsDict,
    filterUserId: "ALL" as const,
    filterLevel: "ALL",
    filterCategory: "ALL" as const,
    exporting: false,
    exportHint: "Eksport JSON",
    onFilterUserIdChange: vi.fn(),
    onFilterLevelChange: vi.fn(),
    onFilterCategoryChange: vi.fn(),
    onExport: vi.fn(),
    onRefresh: vi.fn(),
  };
}

describe("LogsFilterBar", () => {
  it("renderuje filtry z opcjami pracowników, poziomów i kategorii", () => {
    renderWithProviders(<LogsFilterBar {...makeProps()} />);

    expect(screen.getByRole("option", { name: logsDict.filterAllWorkers })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Jan Kowalski" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Anna Nowak" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: logsDict.filterAllLevels })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: logsDict.logCategoryLabels.gps })
    ).toBeInTheDocument();
  });

  it("zmiana filtra pracownika woła callback z liczbą lub ALL", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<LogsFilterBar {...props} />);

    const [userSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(userSelect, "2");
    expect(props.onFilterUserIdChange).toHaveBeenCalledWith(2);

    await user.selectOptions(userSelect, "ALL");
    expect(props.onFilterUserIdChange).toHaveBeenCalledWith("ALL");
  });

  it("zmiana filtra poziomu woła callback z wartością poziomu", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<LogsFilterBar {...props} />);

    const levelSelect = screen.getAllByRole("combobox")[1];
    await user.selectOptions(levelSelect, "ERROR");
    expect(props.onFilterLevelChange).toHaveBeenCalledWith("ERROR");
  });

  it("zmiana filtra kategorii woła callback z kategorią lub ALL", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<LogsFilterBar {...props} />);

    const categorySelect = screen.getAllByRole("combobox")[2];
    await user.selectOptions(categorySelect, "gps");
    expect(props.onFilterCategoryChange).toHaveBeenCalledWith("gps");

    await user.selectOptions(categorySelect, "ALL");
    expect(props.onFilterCategoryChange).toHaveBeenCalledWith("ALL");
  });

  it("przyciski eksportu i odświeżenia wołają callbacki", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<LogsFilterBar {...props} />);

    await user.click(screen.getByRole("button", { name: logsDict.exportJson }));
    expect(props.onExport).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: logsDict.refresh }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });

  it("podczas eksportu przycisk jest zablokowany i pokazuje stan ładowania", () => {
    renderWithProviders(<LogsFilterBar {...makeProps()} exporting />);

    const exportButton = screen.getByRole("button", { name: logsDict.exportJsonLoading });
    expect(exportButton).toBeDisabled();
    expect(screen.queryByText(logsDict.exportJson)).not.toBeInTheDocument();
  });
});
