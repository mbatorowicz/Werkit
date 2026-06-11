import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import {
  WorkerHistoryList,
  type WorkerHistoryListSession,
} from "@/features/worker/components/WorkerHistoryList";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";
import { formatDict, formatUiDateOnly, formatUiTimeHm } from "@/i18n";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children?: ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

const historyLabels = plDict.worker.history;
const workerClient = plDict.worker.client;

const baseSession: WorkerHistoryListSession = {
  id: 11,
  workOrderId: 42,
  categoryName: "Transport",
  startTime: "2026-06-10T08:00:00.000Z",
  endTime: "2026-06-10T09:30:00.000Z",
  resourceName: "Wywrotka MAN",
};

function renderList(sessions: WorkerHistoryListSession[]) {
  return renderWithProviders(
    <WorkerHistoryList
      sessions={sessions}
      historyLabels={historyLabels}
      workerClient={workerClient}
    />
  );
}

describe("WorkerHistoryList", () => {
  it("renderuje kartę sesji z badge zakończenia, kategorią i zasobem", () => {
    renderList([baseSession]);

    expect(screen.getByText(historyLabels.sessionCompletedBadge)).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Wywrotka MAN")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
  });

  it("pokazuje etykiety czasu start–koniec wg formatów UI", () => {
    renderList([baseSession]);

    const expectedTime = `${formatUiTimeHm(baseSession.startTime)} – ${formatUiTimeHm(
      baseSession.endTime as string
    )}`;
    const expectedDate = formatUiDateOnly(baseSession.startTime);

    expect(screen.getByText(new RegExp(expectedTime))).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(expectedDate)).length).toBeGreaterThan(0);
  });

  it("sesja bez endTime pokazuje myślnik zamiast godziny zakończenia", () => {
    renderList([{ ...baseSession, endTime: null }]);

    const expected = `${formatUiTimeHm(baseSession.startTime)} – —`;
    expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
  });

  it("pusta lista nie renderuje żadnych kart", () => {
    renderList([]);
    expect(screen.queryByText(historyLabels.sessionCompletedBadge)).not.toBeInTheDocument();
  });

  it("brak kategorii pokazuje fallback i18n, a brak workOrderId numer sesji", () => {
    renderList([{ ...baseSession, categoryName: null, workOrderId: null }]);

    expect(screen.getByText(workerClient.noCategoryName)).toBeInTheDocument();
    expect(screen.getByText("#11")).toBeInTheDocument();
  });

  it("klik w kartę otwiera modal szczegółów z linkiem do widoku sesji", async () => {
    const user = userEvent.setup();
    renderList([baseSession]);

    await user.click(screen.getByRole("button", { name: workerClient.orderDetailsOpenCategory }));

    expect(
      await screen.findByText(formatDict(workerClient.orderDetailsTitle, { id: 42 }))
    ).toBeInTheDocument();
    const link = screen.getByText(historyLabels.openSessionDetail).closest("a");
    expect(link).toHaveAttribute("href", "/worker/history/11");
  });
});
