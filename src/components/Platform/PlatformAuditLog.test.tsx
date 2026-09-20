import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlatformAuditLog } from "@/components/Platform/PlatformAuditLog";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const dict = plDict.platform;

describe("PlatformAuditLog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderuje wiersz dziennika: czas, aktor, firma, akcja", async () => {
    stubFetch([
      {
        url: "/api/platform/audit",
        json: {
          events: [
            {
              id: 1,
              createdAt: "2026-09-15T10:00:00.000Z",
              actorUserId: 9,
              actorName: "Agent PL3",
              companyId: 3,
              companyName: "Margaz",
              action: "company.create",
              targetType: "company",
              targetId: 3,
            },
          ],
        },
      },
      { url: "/api/platform/companies", json: [{ id: 3, name: "Margaz" }] },
    ]);

    renderWithProviders(<PlatformAuditLog dict={dict} />);

    expect(await screen.findByText("Agent PL3")).toBeInTheDocument();
    expect(screen.getAllByText("Margaz").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("company #3")).toBeInTheDocument();
    expect(screen.getByText(dict.auditTitle)).toBeInTheDocument();
  });

  it("pusta lista pokazuje komunikat", async () => {
    stubFetch([
      { url: "/api/platform/audit", json: { events: [] } },
      { url: "/api/platform/companies", json: [] },
    ]);

    renderWithProviders(<PlatformAuditLog dict={dict} />);
    expect(await screen.findByText(dict.auditEmpty)).toBeInTheDocument();
  });

  it("zmiana filtra firmy woła GET z companyId", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/audit", json: { events: [] } },
      { url: "/api/platform/companies", json: [{ id: 3, name: "Margaz" }] },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<PlatformAuditLog dict={dict} />);

    await screen.findByText(dict.auditEmpty);
    await user.selectOptions(screen.getByLabelText(dict.auditFilterCompany), "3");

    await waitFor(() => {
      const called = fetchMock.mock.calls.some(([input]) => String(input).includes("companyId=3"));
      expect(called).toBe(true);
    });
  });
});
