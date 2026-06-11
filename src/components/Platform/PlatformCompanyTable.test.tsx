import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlatformCompanyTable } from "@/components/Platform/PlatformCompanyTable";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

const dict = plDict.platform;

const baseRow: CompanyUsageRow = {
  companyId: 1,
  companyName: "Margaz Sp. z o.o.",
  slug: "margaz",
  isActive: true,
  userCount: 4,
  workerCount: 3,
  sessionsLast30Days: 17,
  pendingOrders: 2,
  deviceLogsLast7Days: 9,
};

function noopHandlers() {
  return {
    onToggleActive: vi.fn(),
    onShowDetails: vi.fn(),
  };
}

function renderTable(
  rows: CompanyUsageRow[],
  overrides: Partial<Parameters<typeof PlatformCompanyTable>[0]> = {}
) {
  const handlers = noopHandlers();
  renderWithProviders(
    <PlatformCompanyTable rows={rows} dict={dict} {...handlers} {...overrides} />
  );
  return handlers;
}

describe("PlatformCompanyTable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pokazuje komunikat o braku organizacji przy pustej liście", () => {
    renderTable([]);
    expect(screen.getByText(dict.empty)).toBeInTheDocument();
  });

  it("renderuje dane firmy: nazwę, identyfikator, liczniki i status", () => {
    renderTable([baseRow]);

    expect(screen.getByText("Margaz Sp. z o.o.")).toBeInTheDocument();
    expect(screen.getByText("margaz")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText(dict.statusActive)).toBeInTheDocument();
  });

  it("firma zawieszona pokazuje status nieaktywny", () => {
    renderTable([{ ...baseRow, isActive: false }]);
    expect(screen.getByText(dict.statusInactive)).toBeInTheDocument();
  });

  it("klik w status wywołuje onToggleActive z id firmy i bieżącym stanem", async () => {
    const user = userEvent.setup();
    const handlers = renderTable([baseRow]);

    await user.click(screen.getByRole("button", { name: dict.statusActive }));

    expect(handlers.onToggleActive).toHaveBeenCalledWith(1, true);
  });

  it("pigułka statusu jest zablokowana ze spinnerem podczas zmiany statusu", () => {
    renderTable([baseRow], { togglePendingId: 1 });
    expect(screen.getByRole("button", { name: dict.statusActive })).toBeDisabled();
  });

  it("klik w Szczegóły wywołuje onShowDetails z wierszem firmy", async () => {
    const user = userEvent.setup();
    const handlers = renderTable([baseRow]);

    await user.click(screen.getByRole("button", { name: dict.detailsAction }));

    expect(handlers.onShowDetails).toHaveBeenCalledWith(baseRow);
  });
});
