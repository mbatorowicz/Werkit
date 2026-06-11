import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlatformCompanyTable } from "@/components/Platform/PlatformCompanyTable";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

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
    onStartEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onSaveEdit: vi.fn(),
    onSetEditName: vi.fn(),
    onSetEditSlug: vi.fn(),
    onRefresh: vi.fn(async () => {}),
    onToggleSettings: vi.fn(),
  };
}

function renderTable(
  rows: CompanyUsageRow[],
  overrides: Partial<Parameters<typeof PlatformCompanyTable>[0]> = {}
) {
  const handlers = noopHandlers();
  renderWithProviders(
    <PlatformCompanyTable
      rows={rows}
      dict={dict}
      editingId={null}
      editName=""
      editSlug=""
      editPending={false}
      settingsOpenId={null}
      {...handlers}
      {...overrides}
    />
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

  it("klik w Edytuj wywołuje onStartEdit z wierszem firmy", async () => {
    const user = userEvent.setup();
    const handlers = renderTable([baseRow]);

    await user.click(screen.getByRole("button", { name: dict.editOrganization }));

    expect(handlers.onStartEdit).toHaveBeenCalledWith(baseRow);
  });

  it("tryb edycji pokazuje inputy oraz akcje Zapisz/Anuluj", async () => {
    const user = userEvent.setup();
    const handlers = renderTable([baseRow], {
      editingId: 1,
      editName: "Margaz",
      editSlug: "margaz",
    });

    const nameInput = screen.getByDisplayValue("Margaz");
    await user.type(nameInput, "!");
    expect(handlers.onSetEditName).toHaveBeenCalledWith("Margaz!");

    await user.click(screen.getByRole("button", { name: dict.saveChanges }));
    expect(handlers.onSaveEdit).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole("button", { name: dict.cancelEdit }));
    expect(handlers.onCancelEdit).toHaveBeenCalledTimes(1);
  });

  it("klik w ikonę ustawień wywołuje onToggleSettings", async () => {
    const user = userEvent.setup();
    const handlers = renderTable([baseRow]);

    await user.click(screen.getByTitle(dict.settings.title));

    expect(handlers.onToggleSettings).toHaveBeenCalledWith(1);
  });

  it("firma bez kont pokazuje formularz dodania admina, który wysyła POST", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/companies/1/admin", method: "POST", json: { ok: true } },
    ]);
    const user = userEvent.setup();
    const handlers = renderTable([{ ...baseRow, userCount: 0 }]);

    expect(screen.getByText(dict.noAdminYet)).toBeInTheDocument();

    await user.type(screen.getByLabelText(dict.adminName), "Anna Admin");
    await user.type(screen.getByLabelText(dict.adminEmail), "anna@firma.pl");
    await user.type(screen.getByLabelText(dict.adminPassword), "tajne123");
    await user.click(screen.getByRole("button", { name: dict.addAdmin }));

    expect(await screen.findByText(dict.addAdminSuccess)).toBeInTheDocument();
    await waitFor(() => expect(handlers.onRefresh).toHaveBeenCalled());

    const call = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("/api/platform/companies/1/admin")
    );
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      fullName: "Anna Admin",
      usernameEmail: "anna@firma.pl",
      password: "tajne123",
    });
  });
});
