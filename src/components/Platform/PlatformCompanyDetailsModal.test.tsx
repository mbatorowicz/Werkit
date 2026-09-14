import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlatformCompanyDetailsModal } from "@/components/Platform/PlatformCompanyDetailsModal";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import { formatDict } from "@/i18n";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const dict = plDict.platform;

const baseRow: CompanyUsageRow = {
  companyId: 7,
  companyName: "Margaz Sp. z o.o.",
  slug: "margaz",
  isActive: true,
  lifecycleStatus: "active",
  planKey: "field_ops",
  internalNote: null,
  userCount: 4,
  workerCount: 3,
  sessionsLast30Days: 17,
  pendingOrders: 2,
  deviceLogsLast7Days: 9,
};

function renderModal(row: CompanyUsageRow = baseRow) {
  const onClose = vi.fn();
  const onChanged = vi.fn(async () => {});
  renderWithProviders(
    <PlatformCompanyDetailsModal row={row} dict={dict} onClose={onClose} onChanged={onChanged} />
  );
  return { onClose, onChanged };
}

describe("PlatformCompanyDetailsModal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pokazuje tytuł z nazwą firmy i cztery zakładki", () => {
    renderModal();

    expect(screen.getByText(`${dict.detailsTitle} — ${baseRow.companyName}`)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: dict.tabData })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: dict.tabFeatures })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: dict.tabAdmins })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: dict.tabMetrics })).toBeInTheDocument();
  });

  it("zakładka Dane: zapis wysyła PATCH z nazwą i slugiem", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/companies/7", method: "PATCH", json: { success: true } },
    ]);
    const user = userEvent.setup();
    const { onChanged } = renderModal();

    const nameInput = screen.getByDisplayValue("Margaz Sp. z o.o.");
    await user.clear(nameInput);
    await user.type(nameInput, "Margaz 2");
    await user.click(screen.getByRole("button", { name: dict.saveChanges }));

    expect(await screen.findByText(dict.updateSuccess)).toBeInTheDocument();
    await waitFor(() => expect(onChanged).toHaveBeenCalled());

    const call = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      name: "Margaz 2",
      slug: "margaz",
      lifecycleStatus: "active",
      internalNote: "",
    });
  });

  it("zakładka Dane: archiwizacja po confirm wysyła PATCH lifecycleStatus archived", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/companies/7", method: "PATCH", json: { success: true } },
    ]);
    const user = userEvent.setup();
    const { onChanged } = renderModal();

    await user.click(screen.getByRole("button", { name: dict.archiveCompany }));
    await user.click(screen.getByRole("button", { name: plDict.admin.ui.dialogConfirm }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ lifecycleStatus: "archived" });
  });

  it("zakładka Administratorzy: pokazuje listę kont i wysyła POST nowego admina", async () => {
    const fetchMock = stubFetch([
      {
        url: "/api/platform/companies/7/users",
        method: "GET",
        json: {
          users: [
            {
              id: 11,
              fullName: "Ewa Viewer",
              usernameEmail: "ewa@firma.pl",
              role: "viewer",
              isActive: true,
              lastLoginAt: null,
            },
          ],
        },
      },
      { url: "/api/platform/companies/7/admin", method: "POST", json: { ok: true } },
    ]);
    const user = userEvent.setup();
    const { onChanged } = renderModal();

    await user.click(screen.getByRole("tab", { name: dict.tabAdmins }));

    expect(
      screen.getByText(formatDict(dict.accountsInOrg, { count: baseRow.userCount }))
    ).toBeInTheDocument();
    expect(await screen.findByText("Ewa Viewer")).toBeInTheDocument();
    expect(screen.getByText(dict.lastLoginNever)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: dict.impersonateAsViewer })).toBeInTheDocument();

    await user.type(screen.getByLabelText(dict.adminName), "Anna Admin");
    await user.type(screen.getByLabelText(dict.adminEmail), "anna@firma.pl");
    await user.type(screen.getByLabelText(dict.adminPassword), "tajne123");
    await user.click(screen.getByRole("button", { name: dict.addAdmin }));

    expect(await screen.findByText(dict.addAdminSuccess)).toBeInTheDocument();
    await waitFor(() => expect(onChanged).toHaveBeenCalled());

    const call = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("/api/platform/companies/7/admin")
    );
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      fullName: "Anna Admin",
      usernameEmail: "anna@firma.pl",
      password: "tajne123",
    });
  });

  it("zakładka Administratorzy: ostrzega gdy firma nie ma adminów/viewerów", async () => {
    stubFetch([{ url: "/api/platform/companies/7/users", method: "GET", json: { users: [] } }]);
    const user = userEvent.setup();
    renderModal({ ...baseRow, userCount: 0 });

    await user.click(screen.getByRole("tab", { name: dict.tabAdmins }));

    expect(await screen.findByText(dict.noAdminYet)).toBeInTheDocument();
  });

  it("zakładka Administratorzy: deaktywacja po confirm wysyła PATCH isActive", async () => {
    const fetchMock = stubFetch([
      {
        url: "/api/platform/companies/7/users",
        method: "GET",
        json: {
          users: [
            {
              id: 11,
              fullName: "Ewa Viewer",
              usernameEmail: "ewa@firma.pl",
              role: "viewer",
              isActive: true,
              lastLoginAt: null,
            },
          ],
        },
      },
      {
        url: "/api/platform/companies/7/users/11",
        method: "PATCH",
        json: { success: true, user: { id: 11, role: "viewer", isActive: false } },
      },
    ]);
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("tab", { name: dict.tabAdmins }));
    expect(await screen.findByText("Ewa Viewer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: dict.deactivateUser }));
    await user.click(screen.getByRole("button", { name: plDict.admin.ui.dialogConfirm }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes("/api/platform/companies/7/users/11") && init?.method === "PATCH"
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ isActive: false });
    });
  });

  it("zakładka Administratorzy: wejdź jako podgląd woła POST impersonation i idzie na /admin", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });

    const fetchMock = stubFetch([
      {
        url: "/api/platform/companies/7/users",
        method: "GET",
        json: {
          users: [
            {
              id: 11,
              fullName: "Ewa Viewer",
              usernameEmail: "ewa@firma.pl",
              role: "viewer",
              isActive: true,
              lastLoginAt: null,
            },
          ],
        },
      },
      { url: "/api/platform/impersonation", method: "POST", json: { success: true } },
    ]);
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("tab", { name: dict.tabAdmins }));
    expect(await screen.findByText("Ewa Viewer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: dict.impersonateAsViewer }));
    const impersonateButtons = screen.getAllByRole("button", { name: dict.impersonateAsViewer });
    await user.click(impersonateButtons[impersonateButtons.length - 1]);
    await user.click(screen.getByRole("button", { name: plDict.admin.ui.dialogConfirm }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input, init]) =>
        String(input).includes("/api/platform/impersonation") && init?.method === "POST"
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
        companyId: 7,
        targetUserId: 11,
      });
    });
    expect(assign).toHaveBeenCalledWith("/admin");
    vi.unstubAllGlobals();
  });

  it("zakładka Wskaźniki: pokazuje liczniki użytkowania", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("tab", { name: dict.tabMetrics }));

    expect(screen.getByText(dict.colSessions30)).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText(dict.colLogs7)).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });
});
