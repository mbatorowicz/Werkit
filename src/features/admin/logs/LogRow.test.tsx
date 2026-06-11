import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogRow } from "@/features/admin/logs/LogRow";
import type { LogItem } from "@/features/admin/logs/logsView";
import { formatDict } from "@/i18n";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

const logsDict = plDict.admin.logs;

function makeLog(overrides: Partial<LogItem> = {}): LogItem {
  return {
    id: 1,
    userId: 7,
    level: "ERROR",
    message: "Błąd zapisu sesji GPS",
    metadata: null,
    createdAt: "2026-01-15T10:30:00.000Z",
    workerName: "Jan Kowalski",
    ...overrides,
  };
}

function makeProps(overrides: Partial<Parameters<typeof LogRow>[0]> = {}) {
  return {
    log: makeLog(),
    logsDict,
    expanded: false,
    onToggleExpanded: vi.fn(),
    ...overrides,
  };
}

describe("LogRow", () => {
  it("renderuje wiadomość, poziom i nazwę pracownika", () => {
    renderWithProviders(<LogRow {...makeProps()} />);

    expect(screen.getByText("Błąd zapisu sesji GPS")).toBeInTheDocument();
    expect(screen.getByText("[ERROR]")).toBeInTheDocument();
    expect(screen.getByText("[Jan Kowalski]")).toBeInTheDocument();
  });

  it("bez metadanych nie pokazuje przycisku rozwijania ani podsumowania", () => {
    renderWithProviders(<LogRow {...makeProps()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(logsDict.showFullPayload)).not.toBeInTheDocument();
  });

  it("dla metadanych pokazuje linię telemetrii z kategorią i statusem HTTP", () => {
    const log = makeLog({
      metadata: { category: "http", status: 500, url: "https://example.com/api" },
    });
    renderWithProviders(<LogRow {...makeProps({ log })} />);

    const httpStatus = formatDict(logsDict.telemetryLine.httpStatus, { status: 500 });
    expect(
      screen.getByText(
        (content) =>
          content.includes(logsDict.logCategoryLabels.http) && content.includes(httpStatus)
      )
    ).toBeInTheDocument();
  });

  it("klik w przycisk rozwijania woła onToggleExpanded", async () => {
    const user = userEvent.setup();
    const props = makeProps({ log: makeLog({ metadata: { status: 500 } }) });
    renderWithProviders(<LogRow {...props} />);

    const toggle = screen.getByRole("button", { name: logsDict.showFullPayload });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(props.onToggleExpanded).toHaveBeenCalledTimes(1);
  });

  it("rozwinięty wiersz pokazuje pełne metadane JSON i etykietę ukrywania", () => {
    const log = makeLog({ metadata: { status: 500, path: "/worker" } });
    renderWithProviders(<LogRow {...makeProps({ log, expanded: true })} />);

    expect(screen.getByRole("button", { name: logsDict.hideFullPayload })).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('"status": 500'))).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('"path": "/worker"'))
    ).toBeInTheDocument();
  });
});
