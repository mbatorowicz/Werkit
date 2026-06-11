import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeatureFlagsSection } from "@/components/Platform/FeatureFlagsSection";
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from "@/types/featureFlags";
import { plDict, renderWithProviders, stubFetch } from "@/test/renderWithProviders";

const dict = plDict.platform.settings;

function flagsResponse(overrides: Partial<FeatureFlags> = {}) {
  return { flags: { ...DEFAULT_FEATURE_FLAGS, ...overrides } };
}

/** Checkboxy w kolejności renderu: [0] moduł GPS, [1] moduł DUR. */
async function findToggles() {
  await screen.findByText(dict.subtitle);
  const checkboxes = screen.getAllByRole("checkbox");
  return { gps: checkboxes[0], dur: checkboxes[1] };
}

describe("FeatureFlagsSection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pobiera flagi GET-em i renderuje przełączniki ze stanem z API", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
    ]);
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { gps, dur } = await findToggles();
    expect(gps).toBeChecked();
    expect(dur).not.toBeChecked();
    expect(screen.getByText(dict.gpsModuleEnabled)).toBeInTheDocument();
    expect(screen.getByText(dict.durEnabledHint)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/platform/feature-flags/5",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("GET z wyłączonym GPS odznacza przełącznik modułu GPS", async () => {
    stubFetch([
      {
        url: "/api/platform/feature-flags/5",
        method: "GET",
        json: flagsResponse({ gpsTrackingEnabled: false }),
      },
    ]);
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { gps } = await findToggles();
    expect(gps).not.toBeChecked();
  });

  it("przełączenie modułu DUR wysyła PUT z patchem i pokazuje komunikat sukcesu", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
      { url: "/api/platform/feature-flags/5", method: "PUT", json: { ok: true } },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { dur } = await findToggles();
    await user.click(dur);

    expect(await screen.findByText(dict.saveSuccess)).toBeInTheDocument();
    expect(dur).toBeChecked();

    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(putCall).toBeDefined();
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({ durEnabled: true });
  });

  it("wyłączenie modułu GPS wysyła PUT ze wszystkimi flagami GPS na false", async () => {
    const fetchMock = stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
      { url: "/api/platform/feature-flags/5", method: "PUT", json: { ok: true } },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { gps } = await findToggles();
    await user.click(gps);

    await screen.findByText(dict.saveSuccess);
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      gpsTrackingEnabled: false,
      mapViewEnabled: false,
      geofencingEnabled: false,
      routePlanningEnabled: false,
      navigationEnabled: false,
    });
  });

  it("przy błędzie PUT wycofuje zmianę flagi i pokazuje komunikat błędu", async () => {
    stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
      { url: "/api/platform/feature-flags/5", method: "PUT", status: 500, json: {} },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { dur } = await findToggles();
    await user.click(dur);

    expect(await screen.findByText(dict.saveError)).toBeInTheDocument();
    // Rollback — DUR wraca do stanu wyjściowego (wyłączony).
    await waitFor(() => expect(dur).not.toBeChecked());
  });

  it("przy błędzie PUT ze znanym kodem pokazuje komunikat z apiErrors", async () => {
    stubFetch([
      { url: "/api/platform/feature-flags/5", method: "GET", json: flagsResponse() },
      {
        url: "/api/platform/feature-flags/5",
        method: "PUT",
        status: 400,
        json: { error: "save_error" },
      },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<FeatureFlagsSection companyId={5} dict={dict} />);

    const { dur } = await findToggles();
    await user.click(dur);

    expect(await screen.findByText(plDict.apiErrors.save_error)).toBeInTheDocument();
  });
});
