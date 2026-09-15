import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlatformDashboard } from "@/components/Platform/PlatformDashboard";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import { plDict, renderWithProviders } from "@/test/renderWithProviders";

const dict = plDict.platform;

function usageRow(
  overrides: Partial<CompanyUsageRow> & Pick<CompanyUsageRow, "companyId" | "companyName" | "slug">
): CompanyUsageRow {
  return {
    isActive: true,
    lifecycleStatus: "active",
    planKey: "field_ops",
    internalNote: null,
    userCount: 1,
    workerCount: 1,
    sessionsLast30Days: 0,
    pendingOrders: 0,
    deviceLogsLast7Days: 0,
    lastAdminLoginAt: null,
    lastWorkerLoginAt: null,
    activeSessionsNow: 0,
    errorLogsLast24h: 0,
    ...overrides,
  };
}

describe("PlatformDashboard filtr archiwum", () => {
  it("domyślnie ukrywa firmy zarchiwizowane", () => {
    renderWithProviders(
      <PlatformDashboard
        initialOverview={[
          usageRow({ companyId: 1, companyName: "Aktywna Sp.", slug: "aktywna" }),
          usageRow({
            companyId: 2,
            companyName: "Archiwum Sp.",
            slug: "archiwum",
            isActive: false,
            lifecycleStatus: "archived",
          }),
        ]}
        dict={dict}
      />
    );

    expect(screen.getByText("Aktywna Sp.")).toBeInTheDocument();
    expect(screen.queryByText("Archiwum Sp.")).not.toBeInTheDocument();
    expect(screen.getByText(dict.hideArchived)).toBeInTheDocument();
  });

  it("odznaczenie filtra pokazuje zarchiwizowane", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PlatformDashboard
        initialOverview={[
          usageRow({ companyId: 1, companyName: "Aktywna Sp.", slug: "aktywna" }),
          usageRow({
            companyId: 2,
            companyName: "Archiwum Sp.",
            slug: "archiwum",
            isActive: false,
            lifecycleStatus: "archived",
          }),
        ]}
        dict={dict}
      />
    );

    await user.click(screen.getByLabelText(dict.hideArchived));
    expect(screen.getByText("Archiwum Sp.")).toBeInTheDocument();
    expect(screen.getByText(dict.statusArchived)).toBeInTheDocument();
  });
});
